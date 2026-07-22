from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import os
import re
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
import jwt
import bcrypt
from bson import ObjectId
from bson.errors import InvalidId
import base64
import shutil
import httpx
from imagekitio import ImageKit as ImageKitSDK

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Media storage directory (fallback for local files)
MEDIA_DIR = ROOT_DIR / 'media'
MEDIA_DIR.mkdir(exist_ok=True)

# Expo Push Notification URL
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# ImageKit Configuration
IMAGEKIT_PRIVATE_KEY = os.getenv('IMAGEKIT_PRIVATE_KEY', '')
IMAGEKIT_PUBLIC_KEY = os.getenv('IMAGEKIT_PUBLIC_KEY', '')
IMAGEKIT_URL_ENDPOINT = os.getenv('IMAGEKIT_URL_ENDPOINT', '')

imagekit = None  # Initialized after logger

# JWT Configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'dropa-super-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'dropa_db')]

# Create the main app
app = FastAPI(title="Dropa API")

# The frontend always reads `error.response.data.detail` as a plain string
# (see authStore.ts). FastAPI's default handler for Pydantic validation
# failures (422) instead returns `detail` as a *list* of error objects
# ({type, loc, msg, input, ctx}), which crashes React when rendered directly
# as text. Normalize it to a single human-readable string so every error
# response has the same shape.
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    messages = []
    for err in exc.errors():
        loc = ".".join(str(part) for part in err["loc"] if part != "body")
        messages.append(f"{loc}: {err['msg']}" if loc else err["msg"])
    return JSONResponse(status_code=422, content={"detail": "; ".join(messages)})

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize ImageKit after logger
if IMAGEKIT_PRIVATE_KEY:
    try:
        imagekit = ImageKitSDK(private_key=IMAGEKIT_PRIVATE_KEY)
        logger.info("ImageKit initialized successfully")
    except Exception as e:
        logger.error(f"ImageKit init error: {e}")
        imagekit = None
else:
    logger.warning("ImageKit credentials not found, using local storage")

# Helper to convert ObjectId to string
def serialize_doc(doc):
    if doc is None:
        return None
    doc['id'] = str(doc.pop('_id'))
    return doc

# Helper to safely parse a client-supplied id into an ObjectId.
# Without this, a malformed id (e.g. from a tampered URL) raises an
# uncaught bson.errors.InvalidId which bubbles up as a 500 error.
def parse_object_id(id_str: str, field_name: str = "id") -> ObjectId:
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}")

# Helper to build a UserProfile response from a serialized user dict.
# Centralised so every auth/profile endpoint returns the exact same shape
# (previously max_streak / streak_freezes were silently dropped from responses).
def build_user_profile(user: dict) -> "UserProfile":
    return UserProfile(
        id=user['id'],
        email=user['email'],
        username=user['username'],
        bio=user.get('bio', ''),
        profile_picture=user.get('profile_picture'),
        streak=user.get('streak', 0),
        max_streak=user.get('max_streak', user.get('streak', 0)),
        last_drop_date=user.get('last_drop_date'),
        streak_freezes=user.get('streak_freezes', 0),
        friends_count=len(user.get('friends', [])),
        created_at=user['created_at'],
    )

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)  # matches frontend's advertised minimum
    username: str = Field(..., min_length=3, max_length=20)

    @field_validator('username')
    @classmethod
    def username_alnum(cls, v):
        if not re.match(r'^[a-zA-Z0-9_.]+$', v):
            raise ValueError('Username must contain only letters, numbers, "_" or "."')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    id: str
    email: str
    username: str
    bio: Optional[str] = ""
    profile_picture: Optional[str] = None  # base64
    streak: int = 0
    max_streak: int = 0
    last_drop_date: Optional[str] = None
    streak_freezes: int = 0
    friends_count: int = 0
    created_at: str

class UserProfileUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=3, max_length=20)
    bio: Optional[str] = Field(default=None, max_length=300)
    profile_picture: Optional[str] = None  # base64

    @field_validator('username')
    @classmethod
    def username_alnum(cls, v):
        if v is not None and not re.match(r'^[a-zA-Z0-9_.]+$', v):
            raise ValueError('Username must contain only letters, numbers, "_" or "."')
        return v

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

class FriendRequest(BaseModel):
    id: str
    from_user_id: str
    from_username: str
    from_profile_picture: Optional[str] = None
    to_user_id: str
    status: str  # pending, accepted, rejected
    created_at: str

class DropCreate(BaseModel):
    media_data: Optional[str] = None  # base64 (for images)
    media_url: Optional[str] = None   # URL from upload (for videos/large files)
    media_type: str  # image or video
    description: Optional[str] = Field(default="", max_length=500)

    @field_validator('media_type')
    @classmethod
    def media_type_valid(cls, v):
        if v not in ('image', 'video'):
            raise ValueError('media_type must be "image" or "video"')
        return v

    @model_validator(mode='after')
    def media_required(self):
        if not self.media_data and not self.media_url:
            raise ValueError('A drop requires media_data or media_url')
        return self

class Drop(BaseModel):
    id: str
    user_id: str
    username: str
    user_profile_picture: Optional[str] = None
    media_data: str  # base64 or empty
    media_url: Optional[str] = None  # URL for uploaded media
    media_type: str
    description: str
    is_revealed: bool
    reveal_date: str
    likes_count: int = 0
    comments_count: int = 0
    liked_by_user: bool = False
    created_at: str

class Comment(BaseModel):
    id: str
    drop_id: str
    user_id: str
    username: str
    user_profile_picture: Optional[str] = None
    content: str
    created_at: str

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)

    @field_validator('content')
    @classmethod
    def not_blank(cls, v):
        if not v.strip():
            raise ValueError('Comment cannot be blank')
        return v

class Message(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender_username: str
    content: str
    read: bool = False
    created_at: str

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)

    @field_validator('content')
    @classmethod
    def not_blank(cls, v):
        if not v.strip():
            raise ValueError('Message cannot be blank')
        return v

class Conversation(BaseModel):
    id: str
    participants: List[str]
    participant_usernames: List[str]
    participant_pictures: List[Optional[str]]
    last_message: Optional[str] = None
    last_message_time: Optional[str] = None
    unread_count: int = 0

class Notification(BaseModel):
    id: str
    user_id: str
    type: str  # friend_request, like, comment, message, reveal
    title: str
    message: str
    related_id: Optional[str] = None
    read: bool = False
    created_at: str

class PushTokenRegister(BaseModel):
    token: str

class StreakDetails(BaseModel):
    current_streak: int
    max_streak: int
    streak_freezes: int
    last_drop_date: Optional[str] = None
    milestones: List[dict]
    next_milestone: Optional[dict] = None
    days_active_this_week: int
    is_at_risk: bool

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({'_id': ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return serialize_doc(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# ==================== PUSH NOTIFICATION HELPER ====================

async def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
    """Send a push notification to a user via Expo Push API"""
    try:
        user = await db.users.find_one({'_id': ObjectId(user_id)})
        if not user or not user.get('push_token'):
            return
        
        push_token = user['push_token']
        if not push_token.startswith('ExponentPushToken'):
            return
        
        message = {
            "to": push_token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
        }
        
        async with httpx.AsyncClient() as client_http:
            await client_http.post(
                EXPO_PUSH_URL,
                json=message,
                headers={"Content-Type": "application/json"}
            )
    except Exception as e:
        logger.error(f"Push notification error: {e}")

# ==================== IMAGEKIT HELPER ====================

def upload_to_imagekit(file_data, filename: str, folder: str = "/drops") -> dict:
    """Upload a file to ImageKit and return the URL and file_id"""
    if not imagekit:
        return None
    
    try:
        # file_data must be bytes
        if isinstance(file_data, str):
            # If it's a base64 string, decode it
            if file_data.startswith('data:'):
                # Remove data:image/xxx;base64, prefix
                file_data = file_data.split(',', 1)[1]
            file_data = base64.b64decode(file_data)
        
        result = imagekit.files.upload(
            file=file_data,
            file_name=filename,
            folder=folder,
        )
        
        if hasattr(result, 'url') and result.url:
            return {
                'url': result.url,
                'file_id': result.file_id,
                'name': result.name,
            }
        return None
    except Exception as e:
        logger.error(f"ImageKit upload error: {e}")
        return None

# ==================== REVEAL LOGIC ====================

def get_next_reveal_date() -> datetime:
    """Get the next Sunday at 20:00 UTC"""
    now = datetime.now(timezone.utc)
    days_until_sunday = (6 - now.weekday()) % 7
    if days_until_sunday == 0 and now.hour >= 20:
        days_until_sunday = 7
    next_sunday = now + timedelta(days=days_until_sunday)
    return next_sunday.replace(hour=20, minute=0, second=0, microsecond=0)

def is_revealed(reveal_date_str: str) -> bool:
    """Check if a drop should be revealed"""
    reveal_date = datetime.fromisoformat(reveal_date_str.replace('Z', '+00:00'))
    return datetime.now(timezone.utc) >= reveal_date

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({'email': user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists
    existing_username = await db.users.find_one({'username': user_data.username.lower()})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user
    user_doc = {
        'email': user_data.email.lower(),
        'username': user_data.username.lower(),
        'password_hash': hash_password(user_data.password),
        'bio': '',
        'profile_picture': None,
        'streak': 0,
        'last_drop_date': None,
        'friends': [],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    try:
        result = await db.users.insert_one(user_doc)
    except DuplicateKeyError:
        # Backstop against a race between the existence checks above and the
        # insert (two concurrent registrations with the same email/username).
        raise HTTPException(status_code=400, detail="Email or username already taken")
    user_doc['_id'] = result.inserted_id
    user = serialize_doc(user_doc)

    token = create_token(user['id'])

    return TokenResponse(
        access_token=token,
        user=build_user_profile(user)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = serialize_doc(user)
    token = create_token(user['id'])
    
    return TokenResponse(
        access_token=token,
        user=build_user_profile(user)
    )

@api_router.get("/auth/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    return build_user_profile(current_user)

# ==================== PROFILE ENDPOINTS ====================

@api_router.put("/profile", response_model=UserProfile)
async def update_profile(update_data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {}
    
    if update_data.username is not None:
        # Check if username is taken
        existing = await db.users.find_one({
            'username': update_data.username.lower(),
            '_id': {'$ne': ObjectId(current_user['id'])}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        update_fields['username'] = update_data.username.lower()
    
    if update_data.bio is not None:
        update_fields['bio'] = update_data.bio
    
    if update_data.profile_picture is not None:
        # Upload to ImageKit if available
        if imagekit and update_data.profile_picture.startswith('data:'):
            filename = f"avatar_{current_user['id']}.jpg"
            ik_result = upload_to_imagekit(update_data.profile_picture, filename, folder="/avatars")
            if ik_result:
                update_fields['profile_picture'] = ik_result['url']
                logger.info(f"Avatar uploaded to ImageKit: {ik_result['url']}")
            else:
                update_fields['profile_picture'] = update_data.profile_picture
        else:
            update_fields['profile_picture'] = update_data.profile_picture
    
    if update_fields:
        try:
            await db.users.update_one(
                {'_id': ObjectId(current_user['id'])},
                {'$set': update_fields}
            )
        except DuplicateKeyError:
            raise HTTPException(status_code=400, detail="Username already taken")
    
    # Get updated user
    user = await db.users.find_one({'_id': ObjectId(current_user['id'])})
    user = serialize_doc(user)
    
    return build_user_profile(user)

@api_router.get("/profile/{user_id}", response_model=UserProfile)
async def get_profile(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({'_id': parse_object_id(user_id, "user_id")})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user = serialize_doc(user)
    profile = build_user_profile(user)

    # Don't leak another user's email address in their public profile
    if profile.id != current_user['id']:
        profile.email = ""

    return profile

# ==================== FRIENDS ENDPOINTS ====================

@api_router.get("/users/search")
async def search_users(q: str, current_user: dict = Depends(get_current_user)):
    if len(q) < 2:
        return []

    safe_q = re.escape(q.lower())
    users = await db.users.find({
        'username': {'$regex': safe_q, '$options': 'i'},
        '_id': {'$ne': ObjectId(current_user['id'])}
    }).limit(20).to_list(20)
    
    results = []
    for user in users:
        user = serialize_doc(user)
        is_friend = user['id'] in current_user.get('friends', [])
        
        # Check for pending request
        pending_request = await db.friend_requests.find_one({
            '$or': [
                {'from_user_id': current_user['id'], 'to_user_id': user['id'], 'status': 'pending'},
                {'from_user_id': user['id'], 'to_user_id': current_user['id'], 'status': 'pending'}
            ]
        })
        
        results.append({
            'id': user['id'],
            'username': user['username'],
            'profile_picture': user.get('profile_picture'),
            'is_friend': is_friend,
            'request_pending': pending_request is not None
        })
    
    return results

@api_router.post("/friends/request/{user_id}")
async def send_friend_request(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")

    # Check if user exists
    target_user = await db.users.find_one({'_id': parse_object_id(user_id, "user_id")})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already friends
    if user_id in current_user.get('friends', []):
        raise HTTPException(status_code=400, detail="Already friends")
    
    # Check for existing pending request
    existing = await db.friend_requests.find_one({
        '$or': [
            {'from_user_id': current_user['id'], 'to_user_id': user_id, 'status': 'pending'},
            {'from_user_id': user_id, 'to_user_id': current_user['id'], 'status': 'pending'}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Friend request already pending")
    
    # Create request
    request_doc = {
        'from_user_id': current_user['id'],
        'from_username': current_user['username'],
        'from_profile_picture': current_user.get('profile_picture'),
        'to_user_id': user_id,
        'status': 'pending',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.friend_requests.insert_one(request_doc)
    
    # Create notification
    notification_doc = {
        'user_id': user_id,
        'type': 'friend_request',
        'title': 'Nouvelle demande d\'ami',
        'message': f'{current_user["username"]} veut devenir votre ami',
        'related_id': str(result.inserted_id),
        'read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc)
    
    # Send push notification
    await send_push_notification(
        user_id, 
        'Nouvelle demande d\'ami',
        f'{current_user["username"]} veut devenir votre ami',
        {'type': 'friend_request', 'screen': 'friends'}
    )
    
    return {'message': 'Friend request sent'}

@api_router.get("/friends/requests", response_model=List[FriendRequest])
async def get_friend_requests(current_user: dict = Depends(get_current_user)):
    requests = await db.friend_requests.find({
        'to_user_id': current_user['id'],
        'status': 'pending'
    }).to_list(100)
    
    return [
        FriendRequest(
            id=str(req['_id']),
            from_user_id=req['from_user_id'],
            from_username=req['from_username'],
            from_profile_picture=req.get('from_profile_picture'),
            to_user_id=req['to_user_id'],
            status=req['status'],
            created_at=req['created_at']
        )
        for req in requests
    ]

@api_router.post("/friends/accept/{request_id}")
async def accept_friend_request(request_id: str, current_user: dict = Depends(get_current_user)):
    request = await db.friend_requests.find_one({
        '_id': parse_object_id(request_id, "request_id"),
        'to_user_id': current_user['id'],
        'status': 'pending'
    })

    if not request:
        raise HTTPException(status_code=404, detail="Friend request not found")

    # Update request status
    await db.friend_requests.update_one(
        {'_id': ObjectId(request_id)},
        {'$set': {'status': 'accepted'}}
    )
    
    # Add each user to the other's friends list
    await db.users.update_one(
        {'_id': ObjectId(current_user['id'])},
        {'$addToSet': {'friends': request['from_user_id']}}
    )
    await db.users.update_one(
        {'_id': ObjectId(request['from_user_id'])},
        {'$addToSet': {'friends': current_user['id']}}
    )
    
    # Create notification for requester
    notification_doc = {
        'user_id': request['from_user_id'],
        'type': 'friend_accepted',
        'title': 'Demande acceptée',
        'message': f'{current_user["username"]} a accepté votre demande d\'ami',
        'related_id': current_user['id'],
        'read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc)
    
    return {'message': 'Friend request accepted'}

@api_router.post("/friends/reject/{request_id}")
async def reject_friend_request(request_id: str, current_user: dict = Depends(get_current_user)):
    request = await db.friend_requests.find_one({
        '_id': parse_object_id(request_id, "request_id"),
        'to_user_id': current_user['id'],
        'status': 'pending'
    })

    if not request:
        raise HTTPException(status_code=404, detail="Friend request not found")

    await db.friend_requests.update_one(
        {'_id': ObjectId(request_id)},
        {'$set': {'status': 'rejected'}}
    )
    
    return {'message': 'Friend request rejected'}

@api_router.get("/friends")
async def get_friends(current_user: dict = Depends(get_current_user)):
    friend_ids = current_user.get('friends', [])
    if not friend_ids:
        return []
    
    friends = await db.users.find({
        '_id': {'$in': [ObjectId(fid) for fid in friend_ids]}
    }).to_list(1000)
    
    return [
        {
            'id': str(friend['_id']),
            'username': friend['username'],
            'profile_picture': friend.get('profile_picture'),
            'streak': friend.get('streak', 0)
        }
        for friend in friends
    ]

@api_router.delete("/friends/{friend_id}")
async def remove_friend(friend_id: str, current_user: dict = Depends(get_current_user)):
    friend_oid = parse_object_id(friend_id, "friend_id")
    # Remove from both users' friends lists
    await db.users.update_one(
        {'_id': ObjectId(current_user['id'])},
        {'$pull': {'friends': friend_id}}
    )
    await db.users.update_one(
        {'_id': friend_oid},
        {'$pull': {'friends': current_user['id']}}
    )
    
    return {'message': 'Friend removed'}

# ==================== DROPS ENDPOINTS ====================

@api_router.post("/drops", response_model=Drop)
async def create_drop(drop_data: DropCreate, current_user: dict = Depends(get_current_user)):
    reveal_date = get_next_reveal_date()
    
    media_url = drop_data.media_url
    media_data_to_store = ''
    
    # Upload image to ImageKit if base64 provided
    if drop_data.media_data and imagekit:
        filename = f"drop_{uuid.uuid4()}.jpg"
        ik_result = upload_to_imagekit(drop_data.media_data, filename, folder="/drops")
        if ik_result:
            media_url = ik_result['url']
            logger.info(f"Image uploaded to ImageKit: {media_url}")
        else:
            # Fallback: store base64 in MongoDB
            media_data_to_store = drop_data.media_data
            logger.warning("ImageKit upload failed, falling back to base64")
    elif drop_data.media_data:
        # No ImageKit, store base64
        media_data_to_store = drop_data.media_data
    
    drop_doc = {
        'user_id': current_user['id'],
        'username': current_user['username'],
        'user_profile_picture': current_user.get('profile_picture'),
        'media_data': media_data_to_store,
        'media_url': media_url,
        'media_type': drop_data.media_type,
        'description': drop_data.description or '',
        'reveal_date': reveal_date.isoformat(),
        'likes': [],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.drops.insert_one(drop_doc)
    drop_doc['_id'] = result.inserted_id
    
    # Update streak
    today = datetime.now(timezone.utc).date().isoformat()
    last_drop = current_user.get('last_drop_date')
    old_streak = current_user.get('streak', 0)
    new_streak = old_streak
    
    if last_drop:
        last_date = datetime.fromisoformat(last_drop).date()
        today_date = datetime.now(timezone.utc).date()
        diff = (today_date - last_date).days
        
        if diff == 1:
            # Continue streak
            new_streak = old_streak + 1
            update_fields = {'$set': {'last_drop_date': today, 'streak': new_streak}}
            # Update max_streak if needed
            max_streak = current_user.get('max_streak', old_streak)
            if new_streak > max_streak:
                update_fields['$set']['max_streak'] = new_streak
            await db.users.update_one(
                {'_id': ObjectId(current_user['id'])},
                update_fields
            )
        elif diff > 1:
            # Reset streak
            new_streak = 1
            await db.users.update_one(
                {'_id': ObjectId(current_user['id'])},
                {'$set': {'streak': 1, 'last_drop_date': today}}
            )
        else:
            # Same day, no streak change
            new_streak = old_streak
    else:
        # First drop ever
        new_streak = 1
        await db.users.update_one(
            {'_id': ObjectId(current_user['id'])},
            {'$set': {'streak': 1, 'last_drop_date': today, 'max_streak': 1}}
        )
    
    # Check milestone rewards.
    # The award is applied via a single atomic update_one whose filter requires
    # the milestone to be absent from awarded_milestones. MongoDB guarantees
    # single-document updates are atomic, so if two requests for the same user
    # race (e.g. rapid double-tap or a retried request) only one of them can
    # match the filter and actually award the freeze - the other's update_one
    # matches zero documents and is a no-op. This replaces a previous
    # read-then-write check that could double-award under concurrency.
    for milestone in STREAK_MILESTONES:
        if new_streak >= milestone['days']:
            reward = milestone['reward_freezes']
            award_result = await db.users.update_one(
                {
                    '_id': ObjectId(current_user['id']),
                    'awarded_milestones': {'$ne': milestone['days']}
                },
                {
                    '$inc': {'streak_freezes': reward},
                    '$push': {'awarded_milestones': milestone['days']}
                }
            )
            if award_result.modified_count == 0:
                # Already awarded previously (or lost the race) - skip notification.
                continue
            # Create celebration notification
            notif_doc = {
                'user_id': current_user['id'],
                'type': 'milestone',
                'title': f'{milestone["emoji"]} Milestone atteint !',
                'message': f'Bravo ! {milestone["label"]} ({milestone["days"]}j) - Vous gagnez {reward} Streak Freeze{"s" if reward > 1 else ""} !',
                'related_id': None,
                'read': False,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notif_doc)
            # Send push celebration
            await send_push_notification(
                current_user['id'],
                f'{milestone["emoji"]} {milestone["label"]} !',
                f'Streak de {new_streak} jours ! +{reward} Streak Freeze{"s" if reward > 1 else ""}',
                {'type': 'milestone', 'screen': 'streak', 'milestone_days': milestone['days']}
            )
    
    drop = serialize_doc(drop_doc)
    
    return Drop(
        id=drop['id'],
        user_id=drop['user_id'],
        username=drop['username'],
        user_profile_picture=drop.get('user_profile_picture'),
        media_data=drop['media_data'],
        media_url=drop.get('media_url'),
        media_type=drop['media_type'],
        description=drop['description'],
        is_revealed=False,
        reveal_date=drop['reveal_date'],
        likes_count=0,
        comments_count=0,
        liked_by_user=False,
        created_at=drop['created_at']
    )

@api_router.get("/drops/feed", response_model=List[Drop])
async def get_feed(current_user: dict = Depends(get_current_user)):
    # Get friends' drops and own drops
    friend_ids = current_user.get('friends', [])
    user_ids = friend_ids + [current_user['id']]
    
    drops = await db.drops.find({
        'user_id': {'$in': user_ids}
    }).sort('created_at', -1).limit(50).to_list(50)
    
    result = []
    for drop in drops:
        drop = serialize_doc(drop)
        revealed = is_revealed(drop['reveal_date'])
        
        # Get comments count
        comments_count = await db.comments.count_documents({'drop_id': drop['id']})
        
        result.append(Drop(
            id=drop['id'],
            user_id=drop['user_id'],
            username=drop['username'],
            user_profile_picture=drop.get('user_profile_picture'),
            media_data=drop['media_data'] if revealed else '',  # Empty if not revealed
            media_url=drop.get('media_url') if revealed else None,
            media_type=drop['media_type'],
            description=drop['description'] if revealed else '',
            is_revealed=revealed,
            reveal_date=drop['reveal_date'],
            likes_count=len(drop.get('likes', [])),
            comments_count=comments_count,
            liked_by_user=current_user['id'] in drop.get('likes', []),
            created_at=drop['created_at']
        ))
    
    return result

@api_router.get("/drops/user/{user_id}", response_model=List[Drop])
async def get_user_drops(user_id: str, current_user: dict = Depends(get_current_user)):
    # Check if user is friend or self
    if user_id != current_user['id'] and user_id not in current_user.get('friends', []):
        raise HTTPException(status_code=403, detail="Can only view friends' drops")
    
    drops = await db.drops.find({'user_id': user_id}).sort('created_at', -1).to_list(100)
    
    result = []
    for drop in drops:
        drop = serialize_doc(drop)
        revealed = is_revealed(drop['reveal_date'])
        comments_count = await db.comments.count_documents({'drop_id': drop['id']})
        
        result.append(Drop(
            id=drop['id'],
            user_id=drop['user_id'],
            username=drop['username'],
            user_profile_picture=drop.get('user_profile_picture'),
            media_data=drop['media_data'] if revealed else '',
            media_url=drop.get('media_url') if revealed else None,
            media_type=drop['media_type'],
            description=drop['description'] if revealed else '',
            is_revealed=revealed,
            reveal_date=drop['reveal_date'],
            likes_count=len(drop.get('likes', [])),
            comments_count=comments_count,
            liked_by_user=current_user['id'] in drop.get('likes', []),
            created_at=drop['created_at']
        ))
    
    return result

@api_router.post("/drops/{drop_id}/like")
async def like_drop(drop_id: str, current_user: dict = Depends(get_current_user)):
    drop = await db.drops.find_one({'_id': parse_object_id(drop_id, "drop_id")})
    if not drop:
        raise HTTPException(status_code=404, detail="Drop not found")
    
    if not is_revealed(drop['reveal_date']):
        raise HTTPException(status_code=400, detail="Cannot like unrevealed drop")
    
    # Toggle like
    if current_user['id'] in drop.get('likes', []):
        await db.drops.update_one(
            {'_id': ObjectId(drop_id)},
            {'$pull': {'likes': current_user['id']}}
        )
        action = 'unliked'
    else:
        await db.drops.update_one(
            {'_id': ObjectId(drop_id)},
            {'$addToSet': {'likes': current_user['id']}}
        )
        action = 'liked'
        
        # Create notification if liking someone else's drop
        if drop['user_id'] != current_user['id']:
            notification_doc = {
                'user_id': drop['user_id'],
                'type': 'like',
                'title': 'Nouveau like',
                'message': f'{current_user["username"]} a aimé votre Drop',
                'related_id': drop_id,
                'read': False,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification_doc)
            # Send push for like
            await send_push_notification(
                drop['user_id'],
                'Nouveau like ❤️',
                f'{current_user["username"]} a aime votre Drop',
                {'type': 'like', 'screen': 'drop', 'drop_id': drop_id}
            )
    
    return {'action': action}

# ==================== COMMENTS ENDPOINTS ====================

@api_router.post("/drops/{drop_id}/comments", response_model=Comment)
async def create_comment(drop_id: str, comment_data: CommentCreate, current_user: dict = Depends(get_current_user)):
    drop = await db.drops.find_one({'_id': parse_object_id(drop_id, "drop_id")})
    if not drop:
        raise HTTPException(status_code=404, detail="Drop not found")
    
    if not is_revealed(drop['reveal_date']):
        raise HTTPException(status_code=400, detail="Cannot comment on unrevealed drop")
    
    comment_doc = {
        'drop_id': drop_id,
        'user_id': current_user['id'],
        'username': current_user['username'],
        'user_profile_picture': current_user.get('profile_picture'),
        'content': comment_data.content,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.comments.insert_one(comment_doc)
    comment_doc['_id'] = result.inserted_id
    
    # Create notification
    if drop['user_id'] != current_user['id']:
        notification_doc = {
            'user_id': drop['user_id'],
            'type': 'comment',
            'title': 'Nouveau commentaire',
            'message': f'{current_user["username"]} a commenté votre Drop',
            'related_id': drop_id,
            'read': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification_doc)
        # Send push for comment
        await send_push_notification(
            drop['user_id'],
            'Nouveau commentaire 💬',
            f'{current_user["username"]}: {comment_data.content[:50]}',
            {'type': 'comment', 'screen': 'drop', 'drop_id': drop_id}
        )
    
    comment = serialize_doc(comment_doc)
    
    return Comment(
        id=comment['id'],
        drop_id=comment['drop_id'],
        user_id=comment['user_id'],
        username=comment['username'],
        user_profile_picture=comment.get('user_profile_picture'),
        content=comment['content'],
        created_at=comment['created_at']
    )

@api_router.get("/drops/{drop_id}/comments", response_model=List[Comment])
async def get_comments(drop_id: str, current_user: dict = Depends(get_current_user)):
    drop = await db.drops.find_one({'_id': parse_object_id(drop_id, "drop_id")})
    if not drop:
        raise HTTPException(status_code=404, detail="Drop not found")
    
    comments = await db.comments.find({'drop_id': drop_id}).sort('created_at', -1).to_list(100)
    
    return [
        Comment(
            id=str(comment['_id']),
            drop_id=comment['drop_id'],
            user_id=comment['user_id'],
            username=comment['username'],
            user_profile_picture=comment.get('user_profile_picture'),
            content=comment['content'],
            created_at=comment['created_at']
        )
        for comment in comments
    ]

# ==================== MESSAGING ENDPOINTS ====================

@api_router.get("/conversations", response_model=List[Conversation])
async def get_conversations(current_user: dict = Depends(get_current_user)):
    conversations = await db.conversations.find({
        'participants': current_user['id']
    }).sort('last_message_time', -1).to_list(100)
    
    result = []
    for conv in conversations:
        conv = serialize_doc(conv)
        
        # Get unread count
        unread = await db.messages.count_documents({
            'conversation_id': conv['id'],
            'sender_id': {'$ne': current_user['id']},
            'read': False
        })
        
        result.append(Conversation(
            id=conv['id'],
            participants=conv['participants'],
            participant_usernames=conv['participant_usernames'],
            participant_pictures=conv.get('participant_pictures', [None, None]),
            last_message=conv.get('last_message'),
            last_message_time=conv.get('last_message_time'),
            unread_count=unread
        ))
    
    return result

@api_router.post("/conversations/{friend_id}", response_model=Conversation)
async def get_or_create_conversation(friend_id: str, current_user: dict = Depends(get_current_user)):
    # Check if friends
    if friend_id not in current_user.get('friends', []):
        raise HTTPException(status_code=403, detail="Can only message friends")
    
    # Check for existing conversation
    existing = await db.conversations.find_one({
        'participants': {'$all': [current_user['id'], friend_id]}
    })
    
    if existing:
        conv = serialize_doc(existing)
        unread = await db.messages.count_documents({
            'conversation_id': conv['id'],
            'sender_id': {'$ne': current_user['id']},
            'read': False
        })
        return Conversation(
            id=conv['id'],
            participants=conv['participants'],
            participant_usernames=conv['participant_usernames'],
            participant_pictures=conv.get('participant_pictures', [None, None]),
            last_message=conv.get('last_message'),
            last_message_time=conv.get('last_message_time'),
            unread_count=unread
        )
    
    # Get friend info
    friend = await db.users.find_one({'_id': parse_object_id(friend_id, "friend_id")})
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create new conversation
    conv_doc = {
        'participants': [current_user['id'], friend_id],
        'participant_usernames': [current_user['username'], friend['username']],
        'participant_pictures': [current_user.get('profile_picture'), friend.get('profile_picture')],
        'last_message': None,
        'last_message_time': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.conversations.insert_one(conv_doc)
    conv_doc['_id'] = result.inserted_id
    conv = serialize_doc(conv_doc)
    
    return Conversation(
        id=conv['id'],
        participants=conv['participants'],
        participant_usernames=conv['participant_usernames'],
        participant_pictures=conv.get('participant_pictures', [None, None]),
        last_message=conv.get('last_message'),
        last_message_time=conv.get('last_message_time'),
        unread_count=0
    )

@api_router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_messages(conversation_id: str, current_user: dict = Depends(get_current_user)):
    # Verify user is participant
    conv = await db.conversations.find_one({
        '_id': parse_object_id(conversation_id, "conversation_id"),
        'participants': current_user['id']
    })
    
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Mark messages as read
    await db.messages.update_many(
        {
            'conversation_id': conversation_id,
            'sender_id': {'$ne': current_user['id']},
            'read': False
        },
        {'$set': {'read': True}}
    )
    
    messages = await db.messages.find({'conversation_id': conversation_id}).sort('created_at', 1).to_list(500)
    
    return [
        Message(
            id=str(msg['_id']),
            conversation_id=msg['conversation_id'],
            sender_id=msg['sender_id'],
            sender_username=msg['sender_username'],
            content=msg['content'],
            read=msg.get('read', False),
            created_at=msg['created_at']
        )
        for msg in messages
    ]

@api_router.post("/conversations/{conversation_id}/messages", response_model=Message)
async def send_message(conversation_id: str, message_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    # Verify user is participant
    conv = await db.conversations.find_one({
        '_id': parse_object_id(conversation_id, "conversation_id"),
        'participants': current_user['id']
    })
    
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    message_doc = {
        'conversation_id': conversation_id,
        'sender_id': current_user['id'],
        'sender_username': current_user['username'],
        'content': message_data.content,
        'read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.messages.insert_one(message_doc)
    message_doc['_id'] = result.inserted_id
    
    # Update conversation
    await db.conversations.update_one(
        {'_id': ObjectId(conversation_id)},
        {
            '$set': {
                'last_message': message_data.content[:50],
                'last_message_time': message_doc['created_at']
            }
        }
    )
    
    # Create notification for recipient
    recipient_id = [p for p in conv['participants'] if p != current_user['id']][0]
    notification_doc = {
        'user_id': recipient_id,
        'type': 'message',
        'title': 'Nouveau message',
        'message': f'{current_user["username"]}: {message_data.content[:30]}...',
        'related_id': conversation_id,
        'read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc)
    
    # Send push for new message
    await send_push_notification(
        recipient_id,
        f'Message de {current_user["username"]}',
        message_data.content[:80],
        {'type': 'message', 'screen': 'chat', 'conversation_id': conversation_id}
    )
    
    msg = serialize_doc(message_doc)
    
    return Message(
        id=msg['id'],
        conversation_id=msg['conversation_id'],
        sender_id=msg['sender_id'],
        sender_username=msg['sender_username'],
        content=msg['content'],
        read=msg.get('read', False),
        created_at=msg['created_at']
    )

# ==================== NOTIFICATIONS ENDPOINTS ====================

@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find({
        'user_id': current_user['id']
    }).sort('created_at', -1).limit(50).to_list(50)
    
    return [
        Notification(
            id=str(notif['_id']),
            user_id=notif['user_id'],
            type=notif['type'],
            title=notif['title'],
            message=notif['message'],
            related_id=notif.get('related_id'),
            read=notif.get('read', False),
            created_at=notif['created_at']
        )
        for notif in notifications
    ]

@api_router.post("/notifications/read")
async def mark_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {'user_id': current_user['id'], 'read': False},
        {'$set': {'read': True}}
    )
    return {'message': 'Notifications marked as read'}

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({
        'user_id': current_user['id'],
        'read': False
    })
    return {'count': count}

# ==================== PUSH TOKEN ====================

@api_router.post("/push-token")
async def register_push_token(data: PushTokenRegister, current_user: dict = Depends(get_current_user)):
    """Register a push notification token for the current user"""
    await db.users.update_one(
        {'_id': ObjectId(current_user['id'])},
        {'$set': {'push_token': data.token}}
    )
    return {'message': 'Push token registered'}

# ==================== STREAK DETAILS ====================

STREAK_MILESTONES = [
    {'days': 3, 'emoji': '🌱', 'label': 'Debutant', 'color': '#10B981', 'reward_freezes': 1},
    {'days': 7, 'emoji': '🔥', 'label': 'En feu', 'color': '#FF6B35', 'reward_freezes': 2},
    {'days': 14, 'emoji': '⚡', 'label': 'Inarretable', 'color': '#F59E0B', 'reward_freezes': 3},
    {'days': 30, 'emoji': '💎', 'label': 'Diamant', 'color': '#3B82F6', 'reward_freezes': 5},
    {'days': 60, 'emoji': '👑', 'label': 'Legende', 'color': '#8B5CF6', 'reward_freezes': 7},
    {'days': 100, 'emoji': '🏆', 'label': 'Mythique', 'color': '#FFD700', 'reward_freezes': 10},
]

@api_router.get("/streak/details")
async def get_streak_details(current_user: dict = Depends(get_current_user)):
    """Get detailed streak information"""
    user = await db.users.find_one({'_id': ObjectId(current_user['id'])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_streak = user.get('streak', 0)
    max_streak = user.get('max_streak', current_streak)
    streak_freezes = user.get('streak_freezes', 0)
    last_drop_date = user.get('last_drop_date')
    
    # Check if streak is at risk (no drop today and last drop was yesterday)
    today = datetime.now(timezone.utc).date()
    is_at_risk = False
    if last_drop_date:
        last_date = datetime.fromisoformat(last_drop_date).date() if isinstance(last_drop_date, str) else last_drop_date
        diff = (today - last_date).days
        is_at_risk = diff >= 1 and current_streak > 0
    
    # Calculate milestones achieved
    awarded_milestones = user.get('awarded_milestones', [])
    milestones = []
    next_milestone = None
    for ms in STREAK_MILESTONES:
        milestone_data = {
            **ms,
            'achieved': current_streak >= ms['days'],
            'rewarded': ms['days'] in awarded_milestones,
        }
        milestones.append(milestone_data)
        if not next_milestone and current_streak < ms['days']:
            next_milestone = {
                **ms,
                'days_remaining': ms['days'] - current_streak,
                'progress': current_streak / ms['days'],
            }
    
    # Count days active this week
    days_since_monday = today.weekday()
    week_start = today - timedelta(days=days_since_monday)
    week_start_str = week_start.isoformat()
    
    week_drops = await db.drops.find({
        'user_id': current_user['id'],
        'created_at': {'$gte': week_start_str}
    }).to_list(100)
    
    unique_days = set()
    for drop in week_drops:
        try:
            drop_date = datetime.fromisoformat(drop['created_at'].replace('Z', '+00:00')).date()
            unique_days.add(drop_date)
        except (ValueError, KeyError):
            pass
    
    return StreakDetails(
        current_streak=current_streak,
        max_streak=max_streak,
        streak_freezes=streak_freezes,
        last_drop_date=last_drop_date,
        milestones=milestones,
        next_milestone=next_milestone,
        days_active_this_week=len(unique_days),
        is_at_risk=is_at_risk,
    )

@api_router.post("/streak/freeze")
async def use_streak_freeze(current_user: dict = Depends(get_current_user)):
    """Use a streak freeze to save the current streak"""
    user = await db.users.find_one({'_id': ObjectId(current_user['id'])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    freezes = user.get('streak_freezes', 0)
    if freezes <= 0:
        raise HTTPException(status_code=400, detail="Pas de streak freeze disponible")
    
    today = datetime.now(timezone.utc).date().isoformat()
    await db.users.update_one(
        {'_id': ObjectId(current_user['id'])},
        {
            '$inc': {'streak_freezes': -1},
            '$set': {'last_drop_date': today}
        }
    )
    return {'message': 'Streak freeze utilise !', 'remaining_freezes': freezes - 1}

# ==================== WEEKLY SUMMARY ====================

@api_router.get("/weekly-summary")
async def get_weekly_summary(current_user: dict = Depends(get_current_user)):
    """Get the weekly summary for the current user after reveal"""
    now = datetime.now(timezone.utc)
    
    # Calculate the start of the current week (Monday 00:00 UTC)
    days_since_monday = now.weekday()
    week_start = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start_str = week_start.isoformat()
    
    # Get user's drops this week
    user_drops = await db.drops.find({
        'user_id': current_user['id'],
        'created_at': {'$gte': week_start_str}
    }).to_list(100)
    
    drops_count = len(user_drops)
    
    # Calculate total likes and comments on user's drops this week
    total_likes = 0
    total_comments = 0
    best_drop = None
    best_drop_likes = -1
    
    for drop in user_drops:
        drop_id = str(drop['_id'])
        likes_count = len(drop.get('likes', []))
        total_likes += likes_count
        
        comments_count = await db.comments.count_documents({'drop_id': drop_id})
        total_comments += comments_count
        
        if likes_count > best_drop_likes:
            best_drop_likes = likes_count
            revealed = is_revealed(drop['reveal_date'])
            best_drop = {
                'id': drop_id,
                'description': drop.get('description', '') if revealed else '',
                'media_data': drop.get('media_data', '') if revealed else '',
                'media_type': drop.get('media_type', 'image'),
                'media_url': drop.get('media_url'),
                'likes_count': likes_count,
                'comments_count': comments_count,
                'is_revealed': revealed,
                'created_at': drop['created_at']
            }
    
    # Get user streak
    user_data = await db.users.find_one({'_id': ObjectId(current_user['id'])})
    streak = user_data.get('streak', 0) if user_data else 0
    
    # Check if it's a perfect week (7 drops, one per day)
    unique_days = set()
    for drop in user_drops:
        drop_date = datetime.fromisoformat(drop['created_at'].replace('Z', '+00:00')).date()
        unique_days.add(drop_date)
    is_perfect_week = len(unique_days) >= 7
    
    # Friends comparison - get friends' drop counts
    friends_comparison = []
    friend_ids = current_user.get('friends', [])
    for friend_id in friend_ids[:10]:  # Limit to 10 friends
        friend = await db.users.find_one({'_id': ObjectId(friend_id)})
        if friend:
            friend_drops_count = await db.drops.count_documents({
                'user_id': friend_id,
                'created_at': {'$gte': week_start_str}
            })
            friends_comparison.append({
                'username': friend['username'],
                'profile_picture': friend.get('profile_picture'),
                'drops_count': friend_drops_count,
                'streak': friend.get('streak', 0)
            })
    
    # Sort friends by drops count descending
    friends_comparison.sort(key=lambda x: x['drops_count'], reverse=True)
    
    # Determine the achievement message
    if is_perfect_week:
        achievement = "perfect_week"
        achievement_message = "Semaine parfaite ! Tu as poste chaque jour"
    elif drops_count >= 5:
        achievement = "very_active"
        achievement_message = "Super actif ! Tu as ete present presque toute la semaine"
    elif drops_count >= 3:
        achievement = "active"
        achievement_message = "Bien joue ! Tu as ete actif cette semaine"
    elif drops_count >= 1:
        achievement = "starter"
        achievement_message = "Bon debut ! Continue comme ca"
    else:
        achievement = "none"
        achievement_message = "Pas de Drop cette semaine. La prochaine sera la bonne !"
    
    return {
        'drops_count': drops_count,
        'streak': streak,
        'total_likes': total_likes,
        'total_comments': total_comments,
        'best_drop': best_drop,
        'is_perfect_week': is_perfect_week,
        'unique_days': len(unique_days),
        'achievement': achievement,
        'achievement_message': achievement_message,
        'friends_comparison': friends_comparison,
        'week_start': week_start_str,
    }

# ==================== MEDIA UPLOAD ====================

@api_router.post("/upload/media")
async def upload_media(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a media file (image or video) to ImageKit cloud"""
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Type de fichier non supporte: {file.content_type}")
    
    # Max 50MB
    max_size = 50 * 1024 * 1024
    
    # Determine media type
    ext = file.filename.split('.')[-1] if file.filename and '.' in file.filename else 'bin'
    if file.content_type and file.content_type.startswith('video'):
        media_type = 'video'
        ext = ext if ext in ['mp4', 'mov', 'webm'] else 'mp4'
    else:
        media_type = 'image'
        ext = ext if ext in ['jpg', 'jpeg', 'png', 'webp', 'gif'] else 'jpg'
    
    filename = f"{media_type}_{uuid.uuid4()}.{ext}"
    
    # Read file content
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 50MB)")
    
    # Try ImageKit upload first
    if imagekit:
        folder = '/videos' if media_type == 'video' else '/drops'
        ik_result = upload_to_imagekit(file_content, filename, folder=folder)
        if ik_result:
            return {
                'media_url': ik_result['url'],
                'media_type': media_type,
                'filename': ik_result['name'],
                'size': len(file_content),
                'storage': 'imagekit'
            }
    
    # Fallback to local storage
    filepath = MEDIA_DIR / filename
    with open(filepath, 'wb') as f:
        f.write(file_content)
    
    media_url = f"/api/media/{filename}"
    
    return {
        'media_url': media_url,
        'media_type': media_type,
        'filename': filename,
        'size': len(file_content),
        'storage': 'local'
    }

@api_router.get("/media/{filename}")
async def serve_media(filename: str):
    """Serve a media file"""
    from fastapi.responses import FileResponse

    # Reject path traversal attempts (e.g. "..", embedded separators) before
    # touching the filesystem - filename is untrusted user input.
    if not filename or '/' in filename or '\\' in filename or filename in ('.', '..'):
        raise HTTPException(status_code=400, detail="Invalid filename")

    resolved_media_dir = MEDIA_DIR.resolve()
    filepath = (MEDIA_DIR / filename).resolve()
    if resolved_media_dir not in filepath.parents:
        raise HTTPException(status_code=400, detail="Invalid filename")

    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # Determine content type
    ext = filename.split('.')[-1].lower()
    content_types = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        'webp': 'image/webp', 'gif': 'image/gif',
        'mp4': 'video/mp4', 'mov': 'video/quicktime', 'webm': 'video/webm'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    return FileResponse(filepath, media_type=content_type)

# ==================== REVEAL STATUS ====================

@api_router.get("/reveal/status")
async def get_reveal_status(current_user: dict = Depends(get_current_user)):
    next_reveal = get_next_reveal_date()
    now = datetime.now(timezone.utc)
    time_until = next_reveal - now
    
    return {
        'next_reveal': next_reveal.isoformat(),
        'seconds_until_reveal': max(0, int(time_until.total_seconds())),
        'is_reveal_time': time_until.total_seconds() <= 0
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    return {'status': 'healthy', 'timestamp': datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    # Auth is via Bearer tokens (not cookies), so credentials are not needed.
    # A wildcard origin combined with allow_credentials=True is rejected by browsers.
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def create_indexes():
    """Create MongoDB indexes for uniqueness and query performance."""
    await db.users.create_index('email', unique=True)
    await db.users.create_index('username', unique=True)
    await db.friend_requests.create_index([('to_user_id', 1), ('status', 1)])
    await db.friend_requests.create_index([('from_user_id', 1), ('to_user_id', 1), ('status', 1)])
    await db.drops.create_index([('user_id', 1), ('created_at', -1)])
    await db.comments.create_index('drop_id')
    await db.messages.create_index([('conversation_id', 1), ('created_at', 1)])
    await db.conversations.create_index('participants')
    await db.notifications.create_index([('user_id', 1), ('created_at', -1)])

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

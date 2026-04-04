#!/usr/bin/env python3
"""
Additional comprehensive tests for specific review request requirements
"""

import requests
import json
from PIL import Image
import io

BACKEND_URL = "https://sunday-unlock.preview.emergentagent.com/api"
TEST_EMAIL = "test@dropa.com"
TEST_PASSWORD = "Test123!"

def test_specific_requirements():
    """Test the specific requirements from the review request"""
    
    # Login first
    login_response = requests.post(f"{BACKEND_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_response.status_code != 200:
        print("❌ Login failed")
        return False
        
    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    
    print("🔍 Testing specific review requirements...")
    
    # 1. Test GET /api/weekly-summary with JWT auth
    print("\n1. Testing GET /api/weekly-summary")
    response = requests.get(f"{BACKEND_URL}/weekly-summary", headers=headers)
    if response.status_code == 200:
        data = response.json()
        required_fields = [
            'drops_count', 'streak', 'total_likes', 'total_comments', 
            'best_drop', 'is_perfect_week', 'unique_days', 'achievement', 
            'achievement_message', 'friends_comparison', 'week_start'
        ]
        missing = [f for f in required_fields if f not in data]
        if missing:
            print(f"❌ Missing fields: {missing}")
            return False
        print(f"✅ All required fields present: {list(data.keys())}")
    else:
        print(f"❌ Failed with status {response.status_code}")
        return False
    
    # 2. Test POST /api/upload/media with multipart/form-data
    print("\n2. Testing POST /api/upload/media")
    img = Image.new('RGB', (50, 50), color='blue')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    
    files = {'file': ('test.jpg', img_bytes, 'image/jpeg')}
    response = requests.post(f"{BACKEND_URL}/upload/media", files=files, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        required_fields = ['media_url', 'media_type', 'filename', 'size']
        missing = [f for f in required_fields if f not in data]
        if missing:
            print(f"❌ Missing fields: {missing}")
            return False
        print(f"✅ Upload successful: {data}")
        filename = data['filename']
        media_url = data['media_url']
    else:
        print(f"❌ Upload failed with status {response.status_code}: {response.text}")
        return False
    
    # 3. Test GET /api/media/{filename} without auth
    print(f"\n3. Testing GET /api/media/{filename}")
    response = requests.get(f"{BACKEND_URL}/media/{filename}")  # No auth headers
    if response.status_code == 200:
        content_type = response.headers.get('content-type', '')
        if content_type.startswith('image/'):
            print(f"✅ Media served correctly, Content-Type: {content_type}")
        else:
            print(f"❌ Wrong content type: {content_type}")
            return False
    else:
        print(f"❌ Media serve failed with status {response.status_code}")
        return False
    
    # 4. Test POST /api/drops with media_url instead of media_data
    print(f"\n4. Testing POST /api/drops with media_url")
    drop_data = {
        "media_url": media_url,
        "media_type": "video",
        "description": "Test drop with uploaded media URL"
    }
    response = requests.post(f"{BACKEND_URL}/drops", json=drop_data, headers=headers)
    if response.status_code == 200:
        data = response.json()
        if data.get('media_url') == media_url and data.get('media_type') == 'video':
            print(f"✅ Drop created with media_url: {data['id']}")
        else:
            print(f"❌ Drop data mismatch: {data}")
            return False
    else:
        print(f"❌ Drop creation failed with status {response.status_code}: {response.text}")
        return False
    
    # 5. Test existing endpoints still work
    print(f"\n5. Testing existing endpoints")
    
    # Test feed
    response = requests.get(f"{BACKEND_URL}/drops/feed", headers=headers)
    if response.status_code == 200:
        print(f"✅ Feed works: {len(response.json())} drops")
    else:
        print(f"❌ Feed failed: {response.status_code}")
        return False
    
    # Test unread count
    response = requests.get(f"{BACKEND_URL}/notifications/unread-count", headers=headers)
    if response.status_code == 200:
        print(f"✅ Unread count works: {response.json()}")
    else:
        print(f"❌ Unread count failed: {response.status_code}")
        return False
    
    print("\n🎉 All specific requirements tested successfully!")
    return True

if __name__ == "__main__":
    success = test_specific_requirements()
    exit(0 if success else 1)
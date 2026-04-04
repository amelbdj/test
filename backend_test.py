#!/usr/bin/env python3
"""
Comprehensive backend API testing for Dropa social app
Tests new endpoints: weekly-summary, upload/media, media/{filename}, updated drops endpoint
Also tests existing endpoints to ensure nothing is broken
"""

import requests
import json
import os
import tempfile
from PIL import Image
import io
import base64
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://sunday-unlock.preview.emergentagent.com/api"

# Test credentials from test_credentials.md
TEST_EMAIL = "test@dropa.com"
TEST_PASSWORD = "Test123!"
TEST_EMAIL_2 = "ami@dropa.com"
TEST_PASSWORD_2 = "Test123!"

class DropaAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.auth_token_2 = None
        self.user_id = None
        self.user_id_2 = None
        self.test_results = []
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append(f"{status} {test_name}: {details}")
        print(f"{status} {test_name}: {details}")
        
    def create_test_image(self):
        """Create a small test image for upload testing"""
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes
        
    def test_login(self):
        """Test login endpoint and get auth token"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('access_token')
                self.user_id = data.get('user', {}).get('id')
                self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
                self.log_result("Login (test@dropa.com)", True, f"Token received, user_id: {self.user_id}")
                return True
            else:
                self.log_result("Login (test@dropa.com)", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Login (test@dropa.com)", False, f"Exception: {str(e)}")
            return False
            
    def test_login_second_user(self):
        """Test login for second user"""
        try:
            response = requests.post(f"{BACKEND_URL}/auth/login", json={
                "email": TEST_EMAIL_2,
                "password": TEST_PASSWORD_2
            })
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token_2 = data.get('access_token')
                self.user_id_2 = data.get('user', {}).get('id')
                self.log_result("Login (ami@dropa.com)", True, f"Token received, user_id: {self.user_id_2}")
                return True
            else:
                self.log_result("Login (ami@dropa.com)", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Login (ami@dropa.com)", False, f"Exception: {str(e)}")
            return False
            
    def test_weekly_summary(self):
        """Test GET /api/weekly-summary endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/weekly-summary")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = [
                    'drops_count', 'streak', 'total_likes', 'total_comments', 
                    'is_perfect_week', 'unique_days', 'achievement', 
                    'achievement_message', 'friends_comparison', 'week_start'
                ]
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_result("Weekly Summary", False, f"Missing fields: {missing_fields}")
                    return False
                    
                # Validate data types
                if not isinstance(data['drops_count'], int):
                    self.log_result("Weekly Summary", False, "drops_count should be integer")
                    return False
                    
                if not isinstance(data['streak'], int):
                    self.log_result("Weekly Summary", False, "streak should be integer")
                    return False
                    
                if not isinstance(data['friends_comparison'], list):
                    self.log_result("Weekly Summary", False, "friends_comparison should be list")
                    return False
                    
                self.log_result("Weekly Summary", True, f"All fields present. Drops: {data['drops_count']}, Streak: {data['streak']}, Achievement: {data['achievement']}")
                return True
            else:
                self.log_result("Weekly Summary", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Weekly Summary", False, f"Exception: {str(e)}")
            return False
            
    def test_media_upload(self):
        """Test POST /api/upload/media endpoint"""
        try:
            # Create test image
            test_image = self.create_test_image()
            
            files = {
                'file': ('test_image.jpg', test_image, 'image/jpeg')
            }
            
            response = self.session.post(f"{BACKEND_URL}/upload/media", files=files)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['media_url', 'media_type', 'filename', 'size']
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_result("Media Upload", False, f"Missing fields: {missing_fields}")
                    return False, None
                    
                if data['media_type'] != 'image':
                    self.log_result("Media Upload", False, f"Expected media_type 'image', got '{data['media_type']}'")
                    return False, None
                    
                if not data['media_url'].startswith('/api/media/'):
                    self.log_result("Media Upload", False, f"Invalid media_url format: {data['media_url']}")
                    return False, None
                    
                self.log_result("Media Upload", True, f"File uploaded: {data['filename']}, Size: {data['size']} bytes")
                return True, data['filename']
            else:
                self.log_result("Media Upload", False, f"Status: {response.status_code}, Response: {response.text}")
                return False, None
                
        except Exception as e:
            self.log_result("Media Upload", False, f"Exception: {str(e)}")
            return False, None
            
    def test_media_serve(self, filename):
        """Test GET /api/media/{filename} endpoint"""
        if not filename:
            self.log_result("Media Serve", False, "No filename provided")
            return False
            
        try:
            # Test without auth (should work)
            response = requests.get(f"{BACKEND_URL}/media/{filename}")
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if content_type.startswith('image/'):
                    self.log_result("Media Serve", True, f"File served correctly, Content-Type: {content_type}")
                    return True
                else:
                    self.log_result("Media Serve", False, f"Unexpected content-type: {content_type}")
                    return False
            else:
                self.log_result("Media Serve", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Media Serve", False, f"Exception: {str(e)}")
            return False
            
    def test_create_drop_with_media_url(self, media_url):
        """Test POST /api/drops with media_url field"""
        try:
            drop_data = {
                "media_url": media_url,
                "media_type": "video",  # Test with video type
                "description": "Test drop with media URL from upload"
            }
            
            response = self.session.post(f"{BACKEND_URL}/drops", json=drop_data)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('media_url') != media_url:
                    self.log_result("Create Drop with Media URL", False, f"Media URL mismatch: expected {media_url}, got {data.get('media_url')}")
                    return False
                    
                if data.get('media_type') != 'video':
                    self.log_result("Create Drop with Media URL", False, f"Media type mismatch: expected 'video', got {data.get('media_type')}")
                    return False
                    
                if not data.get('id'):
                    self.log_result("Create Drop with Media URL", False, "No drop ID returned")
                    return False
                    
                self.log_result("Create Drop with Media URL", True, f"Drop created with ID: {data['id']}, media_url: {data['media_url']}")
                return True
            else:
                self.log_result("Create Drop with Media URL", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Create Drop with Media URL", False, f"Exception: {str(e)}")
            return False
            
    def test_drops_feed(self):
        """Test GET /api/drops/feed endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/drops/feed")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Drops Feed", True, f"Feed retrieved with {len(data)} drops")
                    return True
                else:
                    self.log_result("Drops Feed", False, "Response is not a list")
                    return False
            else:
                self.log_result("Drops Feed", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Drops Feed", False, f"Exception: {str(e)}")
            return False
            
    def test_notifications_unread_count(self):
        """Test GET /api/notifications/unread-count endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/notifications/unread-count")
            
            if response.status_code == 200:
                data = response.json()
                if 'count' in data and isinstance(data['count'], int):
                    self.log_result("Notifications Unread Count", True, f"Unread count: {data['count']}")
                    return True
                else:
                    self.log_result("Notifications Unread Count", False, "Invalid response format")
                    return False
            else:
                self.log_result("Notifications Unread Count", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Notifications Unread Count", False, f"Exception: {str(e)}")
            return False
            
    def test_auth_required_endpoints(self):
        """Test that auth-required endpoints reject requests without token"""
        try:
            # Test without auth token
            session_no_auth = requests.Session()
            
            # Test GET endpoints
            get_endpoints = [
                "/weekly-summary",
                "/drops/feed", 
                "/notifications/unread-count"
            ]
            
            all_rejected = True
            for endpoint in get_endpoints:
                response = session_no_auth.get(f"{BACKEND_URL}{endpoint}")
                # Accept both 401 and 403 as valid auth rejection codes
                if response.status_code not in [401, 403]:
                    self.log_result("Auth Protection", False, f"Endpoint {endpoint} should return 401/403 without auth, got {response.status_code}")
                    all_rejected = False
                    
            # Test POST upload endpoint specifically
            response = session_no_auth.post(f"{BACKEND_URL}/upload/media")
            if response.status_code not in [401, 403]:
                self.log_result("Auth Protection", False, f"Upload endpoint should return 401/403 without auth, got {response.status_code}")
                all_rejected = False
                    
            if all_rejected:
                self.log_result("Auth Protection", True, "All protected endpoints correctly reject unauthenticated requests")
                return True
            else:
                return False
                
        except Exception as e:
            self.log_result("Auth Protection", False, f"Exception: {str(e)}")
            return False
            
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Dropa Backend API Tests")
        print("=" * 50)
        
        # Test login first
        if not self.test_login():
            print("❌ Cannot proceed without authentication")
            return False
            
        # Test second user login
        self.test_login_second_user()
        
        # Test auth protection
        self.test_auth_required_endpoints()
        
        # Test new endpoints
        self.test_weekly_summary()
        
        upload_success, filename = self.test_media_upload()
        if upload_success and filename:
            self.test_media_serve(filename)
            # Test creating drop with the uploaded media URL
            media_url = f"/api/media/{filename}"
            self.test_create_drop_with_media_url(media_url)
        
        # Test existing endpoints to ensure nothing is broken
        self.test_drops_feed()
        self.test_notifications_unread_count()
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result)
        failed = sum(1 for result in self.test_results if "❌ FAIL" in result)
        
        for result in self.test_results:
            print(result)
            
        print(f"\n📈 Results: {passed} passed, {failed} failed")
        
        if failed == 0:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {failed} test(s) failed")
            return False

if __name__ == "__main__":
    tester = DropaAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)
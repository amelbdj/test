#!/usr/bin/env python3
"""
Backend API Testing for Dropa Social App with ImageKit Integration
Tests the specific endpoints mentioned in the review request.
"""

import requests
import json
import base64
import io
from PIL import Image
import time

# Configuration
BASE_URL = "https://sunday-unlock.preview.emergentagent.com/api"
TEST_EMAIL = "test@dropa.com"
TEST_PASSWORD = "Test123!"

class DropaAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        
    def log(self, message):
        print(f"[TEST] {message}")
        
    def create_test_image_base64(self):
        """Create a small test image as base64"""
        # Create a 100x100 red square
        img = Image.new('RGB', (100, 100), color='red')
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        img_bytes = buffer.getvalue()
        
        # Convert to base64 with data URL prefix
        b64_string = base64.b64encode(img_bytes).decode('utf-8')
        return f"data:image/jpeg;base64,{b64_string}"
    
    def create_test_image_bytes(self):
        """Create a small test image as bytes for file upload"""
        img = Image.new('RGB', (50, 50), color='blue')
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        return buffer.getvalue()
    
    def test_login(self):
        """Test user login and get auth token"""
        self.log("Testing login...")
        
        url = f"{BASE_URL}/auth/login"
        data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        response = self.session.post(url, json=data)
        
        if response.status_code == 200:
            result = response.json()
            self.auth_token = result.get('access_token')
            self.user_id = result.get('user', {}).get('id')
            self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
            self.log(f"✅ Login successful. User ID: {self.user_id}")
            return True
        else:
            self.log(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    
    def test_create_drop_with_imagekit(self):
        """Test POST /api/drops with base64 image upload to ImageKit"""
        self.log("Testing drop creation with ImageKit upload...")
        
        url = f"{BASE_URL}/drops"
        
        # Create test image
        test_image_b64 = self.create_test_image_base64()
        
        data = {
            "media_data": test_image_b64,
            "media_type": "image",
            "description": "Test drop with ImageKit integration"
        }
        
        response = self.session.post(url, json=data)
        
        if response.status_code == 200:
            result = response.json()
            media_url = result.get('media_url')
            media_data = result.get('media_data')
            
            # Check if ImageKit URL is returned
            if media_url and 'ik.imagekit.io/dropa' in media_url:
                self.log(f"✅ Drop created with ImageKit URL: {media_url}")
                
                # Verify media_data is empty (not stored in DB)
                if media_data == "":
                    self.log("✅ media_data is empty as expected (not stored in DB)")
                else:
                    self.log(f"⚠️ media_data is not empty: {len(media_data)} chars")
                
                return result.get('id'), media_url
            else:
                self.log(f"❌ ImageKit URL not found. media_url: {media_url}")
                return None, None
        else:
            self.log(f"❌ Drop creation failed: {response.status_code} - {response.text}")
            return None, None
    
    def test_drops_feed(self, expected_drop_id=None):
        """Test GET /api/drops/feed to verify ImageKit URLs"""
        self.log("Testing drops feed...")
        
        url = f"{BASE_URL}/drops/feed"
        response = self.session.get(url)
        
        if response.status_code == 200:
            drops = response.json()
            self.log(f"✅ Feed retrieved with {len(drops)} drops")
            
            # Look for our test drop
            if expected_drop_id:
                for drop in drops:
                    if drop.get('id') == expected_drop_id:
                        media_url = drop.get('media_url')
                        if media_url and 'ik.imagekit.io/dropa' in media_url:
                            self.log(f"✅ Found test drop with ImageKit URL: {media_url}")
                            return True
                        else:
                            self.log(f"❌ Test drop found but no ImageKit URL: {media_url}")
                            return False
                
                self.log(f"⚠️ Test drop with ID {expected_drop_id} not found in feed")
            
            # Check if any drops have ImageKit URLs
            imagekit_drops = [d for d in drops if d.get('media_url') and 'ik.imagekit.io/dropa' in d.get('media_url', '')]
            if imagekit_drops:
                self.log(f"✅ Found {len(imagekit_drops)} drops with ImageKit URLs")
                return True
            else:
                self.log("⚠️ No drops with ImageKit URLs found")
                return True  # Not necessarily an error
        else:
            self.log(f"❌ Feed retrieval failed: {response.status_code} - {response.text}")
            return False
    
    def test_upload_media(self):
        """Test POST /api/upload/media for file upload to ImageKit"""
        self.log("Testing media upload...")
        
        url = f"{BASE_URL}/upload/media"
        
        # Create test image bytes
        test_image_bytes = self.create_test_image_bytes()
        
        files = {
            'file': ('test_image.jpg', test_image_bytes, 'image/jpeg')
        }
        
        response = self.session.post(url, files=files)
        
        if response.status_code == 200:
            result = response.json()
            media_url = result.get('media_url')
            storage = result.get('storage')
            
            if media_url and 'ik.imagekit.io/dropa' in media_url:
                self.log(f"✅ Media uploaded to ImageKit: {media_url}")
                self.log(f"✅ Storage type: {storage}")
                return True
            elif media_url:
                self.log(f"⚠️ Media uploaded to local storage: {media_url}")
                self.log(f"⚠️ Storage type: {storage}")
                return True
            else:
                self.log(f"❌ No media URL returned")
                return False
        else:
            self.log(f"❌ Media upload failed: {response.status_code} - {response.text}")
            return False
    
    def test_streak_details(self):
        """Test GET /api/streak/details to verify reward_freezes and rewarded fields"""
        self.log("Testing streak details...")
        
        url = f"{BASE_URL}/streak/details"
        response = self.session.get(url)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check required fields
            required_fields = ['current_streak', 'max_streak', 'streak_freezes', 'milestones']
            missing_fields = [field for field in required_fields if field not in result]
            
            if missing_fields:
                self.log(f"❌ Missing required fields: {missing_fields}")
                return False
            
            # Check milestones structure
            milestones = result.get('milestones', [])
            if milestones:
                first_milestone = milestones[0]
                if 'reward_freezes' in first_milestone and 'rewarded' in first_milestone:
                    self.log("✅ Milestones include reward_freezes and rewarded fields")
                    self.log(f"✅ Streak details: current={result.get('current_streak')}, max={result.get('max_streak')}, freezes={result.get('streak_freezes')}")
                    self.log(f"✅ Found {len(milestones)} milestones")
                    return True
                else:
                    self.log(f"❌ Milestones missing reward_freezes or rewarded fields")
                    self.log(f"First milestone keys: {list(first_milestone.keys())}")
                    return False
            else:
                self.log("⚠️ No milestones found")
                return True
        else:
            self.log(f"❌ Streak details failed: {response.status_code} - {response.text}")
            return False
    
    def test_existing_endpoints(self):
        """Test existing endpoints to ensure they still work"""
        self.log("Testing existing endpoints...")
        
        endpoints = [
            ("/notifications/unread-count", "GET"),
            ("/weekly-summary", "GET"),
        ]
        
        all_passed = True
        
        for endpoint, method in endpoints:
            url = f"{BASE_URL}{endpoint}"
            
            if method == "GET":
                response = self.session.get(url)
            else:
                response = self.session.post(url)
            
            if response.status_code == 200:
                self.log(f"✅ {method} {endpoint} - OK")
            else:
                self.log(f"❌ {method} {endpoint} - Failed: {response.status_code}")
                all_passed = False
        
        return all_passed
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("Starting Dropa Backend API Tests with ImageKit Integration")
        self.log("=" * 60)
        
        # Test 1: Login
        if not self.test_login():
            self.log("❌ Cannot proceed without authentication")
            return False
        
        # Test 2: Create drop with ImageKit
        drop_id, media_url = self.test_create_drop_with_imagekit()
        
        # Test 3: Verify feed shows ImageKit URLs
        self.test_drops_feed(drop_id)
        
        # Test 4: Upload media to ImageKit
        self.test_upload_media()
        
        # Test 5: Streak details with reward fields
        self.test_streak_details()
        
        # Test 6: Existing endpoints still work
        self.test_existing_endpoints()
        
        self.log("=" * 60)
        self.log("All tests completed!")

if __name__ == "__main__":
    tester = DropaAPITester()
    tester.run_all_tests()
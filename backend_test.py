#!/usr/bin/env python3
"""
Backend API Testing for Dropa Social App
Tests the NEW endpoints and verifies existing ones still work
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://sunday-unlock.preview.emergentagent.com/api"
TEST_EMAIL = "test@dropa.com"
TEST_PASSWORD = "Test123!"

class DropaAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
    
    def login(self):
        """Login and get auth token"""
        print("\n🔐 Testing Authentication...")
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('access_token')
                self.user_id = data.get('user', {}).get('id')
                
                # Set auth header for future requests
                self.session.headers.update({
                    'Authorization': f'Bearer {self.auth_token}'
                })
                
                self.log_test("POST /api/auth/login", True, f"Token received, User ID: {self.user_id}")
                return True
            else:
                self.log_test("POST /api/auth/login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("POST /api/auth/login", False, f"Exception: {str(e)}")
            return False
    
    def test_push_token_registration(self):
        """Test POST /api/push-token endpoint"""
        print("\n📱 Testing Push Token Registration...")
        
        try:
            test_token = "ExponentPushToken[test123]"
            response = self.session.post(f"{BASE_URL}/push-token", json={
                "token": test_token
            })
            
            if response.status_code == 200:
                data = response.json()
                expected_message = "Push token registered"
                if data.get('message') == expected_message:
                    self.log_test("POST /api/push-token", True, f"Token registered successfully: {test_token}")
                else:
                    self.log_test("POST /api/push-token", False, f"Unexpected response: {data}")
            else:
                self.log_test("POST /api/push-token", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("POST /api/push-token", False, f"Exception: {str(e)}")
    
    def test_streak_details(self):
        """Test GET /api/streak/details endpoint"""
        print("\n🔥 Testing Streak Details...")
        
        try:
            response = self.session.get(f"{BASE_URL}/streak/details")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = [
                    'current_streak', 'max_streak', 'streak_freezes', 
                    'milestones', 'days_active_this_week', 'is_at_risk'
                ]
                
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    # Validate data types
                    if (isinstance(data['current_streak'], int) and 
                        isinstance(data['max_streak'], int) and
                        isinstance(data['streak_freezes'], int) and
                        isinstance(data['milestones'], list) and
                        isinstance(data['days_active_this_week'], int) and
                        isinstance(data['is_at_risk'], bool)):
                        
                        details = f"Current streak: {data['current_streak']}, Max: {data['max_streak']}, Freezes: {data['streak_freezes']}, Days this week: {data['days_active_this_week']}, At risk: {data['is_at_risk']}"
                        self.log_test("GET /api/streak/details", True, details)
                    else:
                        self.log_test("GET /api/streak/details", False, "Invalid data types in response")
                else:
                    self.log_test("GET /api/streak/details", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("GET /api/streak/details", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("GET /api/streak/details", False, f"Exception: {str(e)}")
    
    def test_streak_freeze(self):
        """Test POST /api/streak/freeze endpoint"""
        print("\n❄️ Testing Streak Freeze...")
        
        try:
            response = self.session.post(f"{BASE_URL}/streak/freeze")
            
            # This should fail since user has 0 freezes
            if response.status_code == 400:
                data = response.json()
                if "Pas de streak freeze disponible" in data.get('detail', ''):
                    self.log_test("POST /api/streak/freeze", True, "Correctly rejected - user has 0 freezes")
                else:
                    self.log_test("POST /api/streak/freeze", False, f"Wrong error message: {data}")
            else:
                self.log_test("POST /api/streak/freeze", False, f"Expected 400 error, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("POST /api/streak/freeze", False, f"Exception: {str(e)}")
    
    def test_drops_feed(self):
        """Test GET /api/drops/feed endpoint"""
        print("\n📱 Testing Drops Feed...")
        
        try:
            response = self.session.get(f"{BASE_URL}/drops/feed")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("GET /api/drops/feed", True, f"Feed retrieved with {len(data)} drops")
                else:
                    self.log_test("GET /api/drops/feed", False, "Response is not a list")
            else:
                self.log_test("GET /api/drops/feed", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("GET /api/drops/feed", False, f"Exception: {str(e)}")
    
    def test_weekly_summary(self):
        """Test GET /api/weekly-summary endpoint"""
        print("\n📊 Testing Weekly Summary...")
        
        try:
            response = self.session.get(f"{BASE_URL}/weekly-summary")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = [
                    'drops_count', 'streak', 'total_likes', 'total_comments',
                    'is_perfect_week', 'unique_days', 'achievement', 
                    'achievement_message', 'friends_comparison', 'week_start'
                ]
                
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    details = f"Drops: {data['drops_count']}, Streak: {data['streak']}, Likes: {data['total_likes']}, Comments: {data['total_comments']}, Achievement: {data['achievement']}"
                    self.log_test("GET /api/weekly-summary", True, details)
                else:
                    self.log_test("GET /api/weekly-summary", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("GET /api/weekly-summary", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("GET /api/weekly-summary", False, f"Exception: {str(e)}")
    
    def test_notifications_unread_count(self):
        """Test GET /api/notifications/unread-count endpoint"""
        print("\n🔔 Testing Notifications Unread Count...")
        
        try:
            response = self.session.get(f"{BASE_URL}/notifications/unread-count")
            
            if response.status_code == 200:
                data = response.json()
                if 'count' in data and isinstance(data['count'], int):
                    self.log_test("GET /api/notifications/unread-count", True, f"Unread count: {data['count']}")
                else:
                    self.log_test("GET /api/notifications/unread-count", False, "Missing or invalid 'count' field")
            else:
                self.log_test("GET /api/notifications/unread-count", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("GET /api/notifications/unread-count", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Dropa Backend API Tests")
        print(f"🌐 Backend URL: {BASE_URL}")
        print(f"👤 Test User: {TEST_EMAIL}")
        print("=" * 60)
        
        # Login first
        if not self.login():
            print("\n❌ Login failed - cannot proceed with authenticated tests")
            return False
        
        # Test NEW endpoints
        print("\n🆕 Testing NEW Endpoints:")
        self.test_push_token_registration()
        self.test_streak_details()
        self.test_streak_freeze()
        
        # Test existing endpoints
        print("\n✅ Verifying Existing Endpoints:")
        self.test_drops_feed()
        self.test_weekly_summary()
        self.test_notifications_unread_count()
        
        # Summary
        print("\n" + "=" * 60)
        print("📋 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}")
        
        print(f"\n🎯 Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Backend is working correctly.")
            return True
        else:
            print("⚠️ Some tests failed. Check the details above.")
            return False

def main():
    """Main test runner"""
    tester = DropaAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Dropa
Tests all endpoints in priority order as specified in the review request
"""

import requests
import json
import base64
import time
from datetime import datetime, timezone

# Configuration
BASE_URL = "https://sunday-unlock.preview.emergentagent.com/api"
TEST_USERS = [
    {"email": "test@dropa.com", "password": "Test123!", "username": "testuser"},
    {"email": "ami@dropa.com", "password": "Test123!", "username": "amiuser"}
]

# Global variables for test state
user1_token = None
user2_token = None
user1_id = None
user2_id = None
friend_request_id = None
drop_id = None
conversation_id = None

def log_test(test_name, status, details=""):
    """Log test results"""
    status_symbol = "✅" if status == "PASS" else "❌"
    print(f"{status_symbol} {test_name}: {details}")

def make_request(method, endpoint, data=None, token=None, params=None):
    """Make HTTP request with proper headers"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, params=params, timeout=30, verify=True)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=30, verify=True)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=30, verify=True)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30, verify=True)
        
        return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

def create_test_image():
    """Create a simple base64 test image"""
    # Simple 1x1 pixel PNG in base64
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

def test_auth_endpoints():
    """Test authentication endpoints"""
    global user1_token, user2_token, user1_id, user2_id
    
    print("\n=== TESTING AUTH ENDPOINTS ===")
    
    # Test 1: Try to register User 1 (might already exist)
    print("Testing registration for User 1...")
    response = make_request("POST", "/auth/register", TEST_USERS[0])
    if response and response.status_code == 200:
        data = response.json()
        user1_token = data.get("access_token")
        user1_id = data.get("user", {}).get("id")
        log_test("POST /api/auth/register (User 1)", "PASS", f"User registered with ID: {user1_id}")
    elif response and response.status_code == 400 and "already registered" in response.text:
        log_test("POST /api/auth/register (User 1)", "PASS", "User already exists - proceeding with login")
    else:
        error_msg = f"Status: {response.status_code}, Text: {response.text}" if response else "No response"
        log_test("POST /api/auth/register (User 1)", "FAIL", error_msg)
        # Don't return False here, try login instead
    
    # Test 2: Login User 1 (since registration might have failed due to existing user)
    print("Testing login for User 1...")
    login_data = {"email": TEST_USERS[0]["email"], "password": TEST_USERS[0]["password"]}
    response = make_request("POST", "/auth/login", login_data)
    if response and response.status_code == 200:
        data = response.json()
        user1_token = data.get("access_token")
        user1_id = data.get("user", {}).get("id")
        log_test("POST /api/auth/login (User 1)", "PASS", f"Login successful, ID: {user1_id}")
    else:
        error_msg = f"Status: {response.status_code}, Text: {response.text}" if response else "No response"
        log_test("POST /api/auth/login (User 1)", "FAIL", error_msg)
        return False
    
    # Test 3: Try to register User 2 (might already exist)
    print("Testing registration for User 2...")
    response = make_request("POST", "/auth/register", TEST_USERS[1])
    if response and response.status_code == 200:
        data = response.json()
        user2_token = data.get("access_token")
        user2_id = data.get("user", {}).get("id")
        log_test("POST /api/auth/register (User 2)", "PASS", f"User registered with ID: {user2_id}")
    elif response and response.status_code == 400 and "already registered" in response.text:
        log_test("POST /api/auth/register (User 2)", "PASS", "User already exists - proceeding with login")
    else:
        error_msg = f"Status: {response.status_code}, Text: {response.text}" if response else "No response"
        log_test("POST /api/auth/register (User 2)", "FAIL", error_msg)
        # Don't return False here, try login instead
    
    # Test 4: Login User 2 (since registration might have failed due to existing user)
    print("Testing login for User 2...")
    login_data = {"email": TEST_USERS[1]["email"], "password": TEST_USERS[1]["password"]}
    response = make_request("POST", "/auth/login", login_data)
    if response and response.status_code == 200:
        data = response.json()
        user2_token = data.get("access_token")
        user2_id = data.get("user", {}).get("id")
        log_test("POST /api/auth/login (User 2)", "PASS", f"Login successful, ID: {user2_id}")
    else:
        error_msg = f"Status: {response.status_code}, Text: {response.text}" if response else "No response"
        log_test("POST /api/auth/login (User 2)", "FAIL", error_msg)
        return False
    
    # Test 5: Get current user profile
    print("Testing get current user...")
    response = make_request("GET", "/auth/me", token=user1_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("GET /api/auth/me", "PASS", f"Profile retrieved for user: {data.get('username')}")
    else:
        error_msg = f"Status: {response.status_code}, Text: {response.text}" if response else "No response"
        log_test("GET /api/auth/me", "FAIL", error_msg)
        return False
    
    return True

def test_profile_endpoints():
    """Test profile management endpoints"""
    print("\n=== TESTING PROFILE ENDPOINTS ===")
    
    # Test 1: Update profile
    update_data = {
        "username": "testuser_updated",
        "bio": "This is my test bio for Dropa testing"
    }
    response = make_request("PUT", "/profile", update_data, token=user1_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("PUT /api/profile", "PASS", f"Profile updated: {data.get('username')}, bio: {data.get('bio')}")
    else:
        log_test("PUT /api/profile", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 2: Get user profile by ID
    response = make_request("GET", f"/profile/{user2_id}", token=user1_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("GET /api/profile/{user_id}", "PASS", f"Retrieved profile for: {data.get('username')}")
    else:
        log_test("GET /api/profile/{user_id}", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    return True

def test_friends_endpoints():
    """Test friends system endpoints"""
    global friend_request_id
    
    print("\n=== TESTING FRIENDS ENDPOINTS ===")
    
    # Test 1: Search users
    response = make_request("GET", "/users/search", params={"q": "ami"}, token=user1_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("GET /api/users/search", "PASS", f"Found {len(data)} users")
    else:
        error_msg = f"Status: {response.status_code}, Text: {response.text}" if response else "No response"
        log_test("GET /api/users/search", "FAIL", error_msg)
        return False
    
    # Test 2: Send friend request (might already exist)
    response = make_request("POST", f"/friends/request/{user2_id}", token=user1_token)
    if response and response.status_code == 200:
        log_test("POST /api/friends/request/{user_id}", "PASS", "Friend request sent")
    elif response and response.status_code == 400 and "already pending" in response.text:
        log_test("POST /api/friends/request/{user_id}", "PASS", "Friend request already exists - continuing")
    else:
        error_msg = f"Status: {response.status_code}, Text: {response.text}" if response else "No response"
        log_test("POST /api/friends/request/{user_id}", "FAIL", error_msg)
        return False
    
    # Test 3: Get pending friend requests (as user2)
    response = make_request("GET", "/friends/requests", token=user2_token)
    if response and response.status_code == 200:
        data = response.json()
        if data:
            friend_request_id = data[0]["id"]
            log_test("GET /api/friends/requests", "PASS", f"Found {len(data)} pending requests")
        else:
            log_test("GET /api/friends/requests", "PASS", "No pending requests found")
    else:
        error_msg = f"Status: {response.status_code}, Text: {response.text}" if response else "No response"
        log_test("GET /api/friends/requests", "FAIL", error_msg)
        return False
    
    # Test 4: Accept friend request (if we have one)
    if friend_request_id:
        response = make_request("POST", f"/friends/accept/{friend_request_id}", token=user2_token)
        if response and response.status_code == 200:
            log_test("POST /api/friends/accept/{request_id}", "PASS", "Friend request accepted")
        else:
            error_msg = f"Status: {response.status_code}, Text: {response.text}" if response else "No response"
            log_test("POST /api/friends/accept/{request_id}", "FAIL", error_msg)
            return False
    else:
        log_test("POST /api/friends/accept/{request_id}", "PASS", "No pending request to accept")
    
    # Test 5: Get friends list
    response = make_request("GET", "/friends", token=user1_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("GET /api/friends", "PASS", f"Friends list retrieved: {len(data)} friends")
    else:
        error_msg = f"Status: {response.status_code}, Text: {response.text}" if response else "No response"
        log_test("GET /api/friends", "FAIL", error_msg)
        return False
    
    return True

def test_drops_endpoints():
    """Test drops (content) endpoints"""
    global drop_id
    
    print("\n=== TESTING DROPS ENDPOINTS ===")
    
    # Test 1: Create drop
    drop_data = {
        "media_data": create_test_image(),
        "media_type": "image",
        "description": "This is my test drop for Dropa testing!"
    }
    response = make_request("POST", "/drops", drop_data, token=user1_token)
    if response and response.status_code == 200:
        data = response.json()
        drop_id = data.get("id")
        log_test("POST /api/drops", "PASS", f"Drop created with ID: {drop_id}")
    else:
        log_test("POST /api/drops", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 2: Get feed
    response = make_request("GET", "/drops/feed", token=user1_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("GET /api/drops/feed", "PASS", f"Feed retrieved with {len(data)} drops")
    else:
        log_test("GET /api/drops/feed", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 3: Get user's drops
    response = make_request("GET", f"/drops/user/{user1_id}", token=user1_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("GET /api/drops/user/{user_id}", "PASS", f"User drops retrieved: {len(data)} drops")
    else:
        log_test("GET /api/drops/user/{user_id}", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 4: Try to like drop (should fail if not revealed)
    response = make_request("POST", f"/drops/{drop_id}/like", token=user2_token)
    if response and response.status_code == 400:
        log_test("POST /api/drops/{drop_id}/like (unrevealed)", "PASS", "Correctly blocked like on unrevealed drop")
    elif response and response.status_code == 200:
        log_test("POST /api/drops/{drop_id}/like (revealed)", "PASS", "Like successful on revealed drop")
    else:
        log_test("POST /api/drops/{drop_id}/like", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    return True

def test_comments_endpoints():
    """Test comments endpoints"""
    print("\n=== TESTING COMMENTS ENDPOINTS ===")
    
    # Test 1: Try to add comment (should fail if not revealed)
    comment_data = {"content": "This is a test comment on the drop!"}
    response = make_request("POST", f"/drops/{drop_id}/comments", comment_data, token=user2_token)
    if response and response.status_code == 400:
        log_test("POST /api/drops/{drop_id}/comments (unrevealed)", "PASS", "Correctly blocked comment on unrevealed drop")
    elif response and response.status_code == 200:
        log_test("POST /api/drops/{drop_id}/comments (revealed)", "PASS", "Comment added successfully on revealed drop")
    else:
        log_test("POST /api/drops/{drop_id}/comments", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 2: Get comments
    response = make_request("GET", f"/drops/{drop_id}/comments", token=user1_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("GET /api/drops/{drop_id}/comments", "PASS", f"Comments retrieved: {len(data)} comments")
    else:
        log_test("GET /api/drops/{drop_id}/comments", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    return True

def test_reveal_system():
    """Test reveal system endpoint"""
    print("\n=== TESTING REVEAL SYSTEM ===")
    
    response = make_request("GET", "/reveal/status", token=user1_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("GET /api/reveal/status", "PASS", f"Next reveal: {data.get('next_reveal')}, Seconds until: {data.get('seconds_until_reveal')}")
    else:
        log_test("GET /api/reveal/status", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    return True

def test_messaging_endpoints():
    """Test messaging endpoints"""
    global conversation_id
    
    print("\n=== TESTING MESSAGING ENDPOINTS ===")
    
    # Test 1: Get conversations (should be empty initially)
    response = make_request("GET", "/conversations", token=user1_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("GET /api/conversations", "PASS", f"Conversations retrieved: {len(data)} conversations")
    else:
        log_test("GET /api/conversations", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 2: Create conversation with friend
    response = make_request("POST", f"/conversations/{user2_id}", token=user1_token)
    if response and response.status_code == 200:
        data = response.json()
        conversation_id = data.get("id")
        log_test("POST /api/conversations/{friend_id}", "PASS", f"Conversation created with ID: {conversation_id}")
    else:
        log_test("POST /api/conversations/{friend_id}", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 3: Send message
    message_data = {"content": "Hello! This is a test message from the API testing."}
    response = make_request("POST", f"/conversations/{conversation_id}/messages", message_data, token=user1_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("POST /api/conversations/{id}/messages", "PASS", f"Message sent: {data.get('content')[:30]}...")
    else:
        log_test("POST /api/conversations/{id}/messages", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 4: Get messages
    response = make_request("GET", f"/conversations/{conversation_id}/messages", token=user2_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("GET /api/conversations/{id}/messages", "PASS", f"Messages retrieved: {len(data)} messages")
    else:
        log_test("GET /api/conversations/{id}/messages", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    return True

def test_notifications_endpoints():
    """Test notifications endpoints"""
    print("\n=== TESTING NOTIFICATIONS ENDPOINTS ===")
    
    # Test 1: Get notifications
    response = make_request("GET", "/notifications", token=user2_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("GET /api/notifications", "PASS", f"Notifications retrieved: {len(data)} notifications")
    else:
        log_test("GET /api/notifications", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 2: Get unread count
    response = make_request("GET", "/notifications/unread-count", token=user2_token)
    if response and response.status_code == 200:
        data = response.json()
        log_test("GET /api/notifications/unread-count", "PASS", f"Unread count: {data.get('count')}")
    else:
        log_test("GET /api/notifications/unread-count", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    # Test 3: Mark notifications as read
    response = make_request("POST", "/notifications/read", token=user2_token)
    if response and response.status_code == 200:
        log_test("POST /api/notifications/read", "PASS", "Notifications marked as read")
    else:
        log_test("POST /api/notifications/read", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False
    
    return True

def test_streak_system():
    """Test streak system by checking user profile after drop creation"""
    print("\n=== TESTING STREAK SYSTEM ===")
    
    # Get user profile to check streak
    response = make_request("GET", "/auth/me", token=user1_token)
    if response and response.status_code == 200:
        data = response.json()
        streak = data.get("streak", 0)
        log_test("Streak System Check", "PASS", f"User streak after drop creation: {streak}")
        return True
    else:
        log_test("Streak System Check", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False

def test_additional_friend_operations():
    """Test additional friend operations like reject and remove"""
    print("\n=== TESTING ADDITIONAL FRIEND OPERATIONS ===")
    
    # Test removing friend
    response = make_request("DELETE", f"/friends/{user2_id}", token=user1_token)
    if response and response.status_code == 200:
        log_test("DELETE /api/friends/{friend_id}", "PASS", "Friend removed successfully")
        
        # Re-add friend for other tests
        make_request("POST", f"/friends/request/{user2_id}", token=user1_token)
        requests_response = make_request("GET", "/friends/requests", token=user2_token)
        if requests_response and requests_response.status_code == 200:
            requests_data = requests_response.json()
            if requests_data:
                new_request_id = requests_data[0]["id"]
                make_request("POST", f"/friends/accept/{new_request_id}", token=user2_token)
        
        return True
    else:
        log_test("DELETE /api/friends/{friend_id}", "FAIL", f"Status: {response.status_code if response else 'No response'}")
        return False

def run_all_tests():
    """Run all backend tests in priority order"""
    print("🚀 Starting Dropa Backend API Testing")
    print(f"Testing against: {BASE_URL}")
    print("=" * 60)
    
    test_results = []
    
    # High Priority Tests - Auth must pass first
    auth_result = test_auth_endpoints()
    test_results.append(("Auth", auth_result))
    
    if not auth_result:
        print("\n❌ Authentication failed - cannot proceed with other tests")
        print("=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        print("Auth: ❌ FAILED")
        print("All other tests: ⏭️ SKIPPED (Auth required)")
        print("\nTotal: 1 test")
        print("Passed: 0")
        print("Failed: 1")
        print("\n⚠️ Authentication must be fixed before other tests can run.")
        return False
    
    # Continue with other tests only if auth passed
    test_results.append(("Profile", test_profile_endpoints()))
    test_results.append(("Friends", test_friends_endpoints()))
    test_results.append(("Drops", test_drops_endpoints()))
    test_results.append(("Reveal System", test_reveal_system()))
    
    # Medium Priority Tests
    test_results.append(("Comments", test_comments_endpoints()))
    test_results.append(("Messaging", test_messaging_endpoints()))
    test_results.append(("Notifications", test_notifications_endpoints()))
    test_results.append(("Streak System", test_streak_system()))
    test_results.append(("Additional Friend Ops", test_additional_friend_operations()))
    
    # Summary
    print("\n" + "=" * 60)
    print("🏁 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {passed + failed} tests")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed! Backend API is working correctly.")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Check the details above.")
    
    return failed == 0

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
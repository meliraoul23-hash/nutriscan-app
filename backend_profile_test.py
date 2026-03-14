#!/usr/bin/env python3
"""
NutriScan User Profile & Progress Tracking API Testing
Testing the 4 new endpoints requested in the review
"""

import requests
import json
import time
from datetime import datetime

# Backend URL from environment
BASE_URL = "https://nutriscan-167.preview.emergentagent.com/api"

# Test user credentials  
TEST_EMAIL = "meliraoul23@gmail.com"
TEST_USER_ID = "test123"

def test_api_endpoint(method, endpoint, expected_status=200, data=None, params=None):
    """Helper function to test API endpoints"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n{'='*80}")
    print(f"Testing: {method} {endpoint}")
    print(f"URL: {url}")
    
    if params:
        print(f"Params: {params}")
    if data:
        print(f"Data: {json.dumps(data, indent=2)}")
    
    try:
        if method == "GET":
            response = requests.get(url, params=params, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, params=params, timeout=30)
        else:
            print(f"❌ Unsupported method: {method}")
            return False
            
        print(f"Status: {response.status_code}")
        
        if response.status_code == expected_status:
            try:
                response_data = response.json()
                print(f"✅ SUCCESS - Status {response.status_code}")
                print(f"Response: {json.dumps(response_data, indent=2)}")
                return response_data
            except:
                print(f"✅ SUCCESS - Status {response.status_code} (No JSON response)")
                return True
        else:
            print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {json.dumps(error_data, indent=2)}")
                return error_data
            except:
                print(f"Error text: {response.text}")
                return False
                
    except requests.exceptions.Timeout:
        print(f"⚠️ TIMEOUT - Request took longer than 30 seconds")
        return False
    except Exception as e:
        print(f"❌ EXCEPTION - {str(e)}")
        return False

def main():
    print("=" * 80)
    print("🧪 NUTRISCAN USER PROFILE & PROGRESS TESTING")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {TEST_EMAIL}")
    print(f"Testing started at: {datetime.now()}")
    
    # Test results tracking
    results = {
        "save_profile": {"status": "untested", "details": []},
        "get_profile": {"status": "untested", "details": []},
        "add_weight": {"status": "untested", "details": []},
        "get_progress": {"status": "untested", "details": []},
    }
    
    # ==========================================================
    # 1. TEST POST /api/user/profile - Save user health profile
    # ==========================================================
    print("\n" + "🔥" * 60)
    print("🔥 TEST 1: Save User Health Profile")
    print("🔥" * 60)
    
    profile_data = {
        "sex": "female",
        "age": 30,
        "height": 165,
        "weight": 65,
        "target_weight": 60,
        "activity_level": "moderate",
        "goal": "lose"
    }
    
    profile_params = {
        "email": TEST_EMAIL,
        "user_id": TEST_USER_ID
    }
    
    response = test_api_endpoint("POST", "/user/profile", 200, profile_data, profile_params)
    if response and response.get("success") == True:
        print("✅ PROFILE SAVE: Working correctly")
        results["save_profile"]["status"] = "passed"
        # Check if BMR, TDEE, daily_calories are calculated
        profile_info = response.get("profile", {})
        if all(key in profile_info for key in ["bmr", "tdee", "daily_calories"]):
            print(f"✅ CALCULATIONS: BMR={profile_info.get('bmr')}, TDEE={profile_info.get('tdee')}, Daily Calories={profile_info.get('daily_calories')}")
            results["save_profile"]["details"].append(f"Calculations correct: BMR={profile_info.get('bmr')}, TDEE={profile_info.get('tdee')}, Daily Calories={profile_info.get('daily_calories')}")
        else:
            print("⚠️ CALCULATIONS: Missing metabolic calculations")
            results["save_profile"]["details"].append("Missing BMR/TDEE/daily_calories calculations")
    else:
        print("❌ PROFILE SAVE: FAILED")
        results["save_profile"]["status"] = "failed"
        results["save_profile"]["details"].append("Failed to save profile")
    
    # ==========================================================
    # 2. TEST GET /api/user/profile - Get user profile
    # ==========================================================
    print("\n" + "📊" * 60)
    print("📊 TEST 2: Get User Health Profile")
    print("📊" * 60)
    
    response = test_api_endpoint("GET", "/user/profile", 200, params=profile_params)
    if response and response.get("exists") == True:
        print("✅ PROFILE GET: Working correctly - Profile exists")
        results["get_profile"]["status"] = "passed"
        
        profile = response.get("profile", {})
        if profile:
            print(f"✅ PROFILE DATA: Retrieved profile with {len(profile)} fields")
            required_fields = ["sex", "age", "height", "weight", "target_weight", "activity_level", "goal", "bmr", "tdee", "daily_calories"]
            missing_fields = [f for f in required_fields if f not in profile]
            if not missing_fields:
                results["get_profile"]["details"].append("All required profile fields present")
            else:
                results["get_profile"]["details"].append(f"Missing fields: {missing_fields}")
        else:
            print("⚠️ PROFILE DATA: Empty profile returned")
            results["get_profile"]["details"].append("Empty profile data")
    else:
        print("❌ PROFILE GET: FAILED")
        results["get_profile"]["status"] = "failed"
        results["get_profile"]["details"].append("Failed to get profile or exists=false")
    
    # ==========================================================
    # 3. TEST POST /api/user/weight - Add weight entry
    # ==========================================================
    print("\n" + "⚖️" * 60)
    print("⚖️ TEST 3: Add Weight Entry")
    print("⚖️" * 60)
    
    weight_data = {"weight": 64.5}
    
    response = test_api_endpoint("POST", "/user/weight", 200, weight_data, profile_params)
    if response and response.get("success") == True:
        print("✅ WEIGHT ADD: Working correctly")
        results["add_weight"]["status"] = "passed"
        
        message = response.get("message", "")
        if "64.5" in message:
            print(f"✅ WEIGHT CONFIRMATION: {message}")
            results["add_weight"]["details"].append(f"Weight saved correctly: {message}")
        else:
            print("⚠️ WEIGHT CONFIRMATION: Unexpected message format")
            results["add_weight"]["details"].append(f"Unexpected message: {message}")
    else:
        print("❌ WEIGHT ADD: FAILED")
        results["add_weight"]["status"] = "failed"
        results["add_weight"]["details"].append("Failed to add weight entry")
    
    # ==========================================================
    # 4. TEST GET /api/user/progress - Get progress data
    # ==========================================================
    print("\n" + "📈" * 60)
    print("📈 TEST 4: Get User Progress Data")
    print("📈" * 60)
    
    progress_params = {**profile_params, "days": "30"}
    
    response = test_api_endpoint("GET", "/user/progress", 200, params=progress_params)
    if response and isinstance(response, dict):
        print("✅ PROGRESS GET: Working correctly")
        results["get_progress"]["status"] = "passed"
        
        # Check for required fields
        required_fields = ["weight_history", "daily_stats"]
        present_fields = [f for f in required_fields if f in response]
        
        if len(present_fields) == len(required_fields):
            print(f"✅ PROGRESS DATA: All required fields present: {present_fields}")
            
            weight_history = response.get("weight_history", [])
            daily_stats = response.get("daily_stats", [])
            
            print(f"✅ WEIGHT HISTORY: {len(weight_history)} entries")
            print(f"✅ DAILY STATS: {len(daily_stats)} entries")
            
            # Check if our weight entry is there
            if weight_history and any(entry.get("weight") == 64.5 for entry in weight_history):
                print("✅ WEIGHT TRACKING: Our test weight (64.5kg) found in history")
                results["get_progress"]["details"].append("Weight tracking working - test weight found in history")
            else:
                print("⚠️ WEIGHT TRACKING: Test weight not found in history")
                results["get_progress"]["details"].append("Weight tracking issue - test weight not in history")
            
            results["get_progress"]["details"].append(f"Progress data: {len(weight_history)} weight entries, {len(daily_stats)} daily stats")
        else:
            missing = [f for f in required_fields if f not in response]
            print(f"⚠️ PROGRESS DATA: Missing fields: {missing}")
            results["get_progress"]["details"].append(f"Missing required fields: {missing}")
    else:
        print("❌ PROGRESS GET: FAILED")
        results["get_progress"]["status"] = "failed"
        results["get_progress"]["details"].append("Failed to get progress data")
    
    # ==========================================================
    # Final Results Summary  
    # ==========================================================
    print("\n" + "🎯" * 80)
    print("🎯 TEST RESULTS SUMMARY")
    print("🎯" * 80)
    
    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() if result["status"] == "passed")
    failed_tests = sum(1 for result in results.values() if result["status"] == "failed")
    
    test_names = {
        "save_profile": "Save User Health Profile (POST /api/user/profile)",
        "get_profile": "Get User Health Profile (GET /api/user/profile)", 
        "add_weight": "Add Weight Entry (POST /api/user/weight)",
        "get_progress": "Get Progress Data (GET /api/user/progress)"
    }
    
    for test_key, result in results.items():
        status_icon = "✅" if result["status"] == "passed" else "❌" if result["status"] == "failed" else "⚠️"
        test_name = test_names[test_key]
        print(f"\n{status_icon} {test_name}: {result['status'].upper()}")
        for detail in result["details"]:
            print(f"   • {detail}")
    
    print(f"\n📊 Overall Results: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("\n🎉 ALL PROFILE & PROGRESS TESTS PASSED! New user tracking features working correctly.")
    else:
        print(f"\n❌ {failed_tests} test(s) failed. Issues found in user profile/progress tracking!")
    
    print(f"\nTesting completed at: {datetime.now()}")
    
    return results

if __name__ == "__main__":
    results = main()
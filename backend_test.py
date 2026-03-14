#!/usr/bin/env python3
"""
NutriScan Backend Testing - June 2025 Improvements
Focus on testing double payment protection, caching, and premium features
"""

import requests
import json
import time
import os
from datetime import datetime

# Base URL from environment
BASE_URL = "https://nutriscan-167.preview.emergentagent.com/api"

def test_api_endpoint(method, endpoint, expected_status=200, data=None, headers=None):
    """Helper function to test API endpoints"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n{'='*60}")
    print(f"Testing: {method} {endpoint}")
    print(f"URL: {url}")
    
    if data:
        print(f"Data: {json.dumps(data, indent=2)}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)
        else:
            print(f"❌ Unsupported method: {method}")
            return False
            
        print(f"Status: {response.status_code}")
        
        if response.status_code == expected_status:
            try:
                response_data = response.json()
                print(f"✅ SUCCESS - Status {response.status_code}")
                print(f"Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Not a dict'}")
                return response_data
            except:
                print(f"✅ SUCCESS - Status {response.status_code} (No JSON response)")
                return True
        else:
            print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
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
    print("🧪 NUTRISCAN BACKEND TESTING - JUNE 2025 IMPROVEMENTS")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Testing started at: {datetime.now()}")
    
    # Test results tracking
    results = {
        "double_payment_protection": {"status": "untested", "details": []},
        "product_cache_timeout": {"status": "untested", "details": []},
        "premium_status_check": {"status": "untested", "details": []},
        "rankings_with_images": {"status": "untested", "details": []}
    }
    
    # ==========================================================
    # 1. CRITICAL: Test Double Payment Protection
    # ==========================================================
    print("\n" + "🔥" * 60)
    print("🔥 CRITICAL TEST: Double Payment Protection")
    print("🔥" * 60)
    
    print("\n1️⃣ Testing Premium User (should be blocked)")
    premium_user_data = {
        "plan": "monthly",
        "success_url": "https://test.com",
        "cancel_url": "https://test.com", 
        "user_email": "meliraoul23@gmail.com",
        "user_id": "test123"
    }
    
    response = test_api_endpoint("POST", "/create-checkout-session", 400, premium_user_data)
    if response and "deja" in str(response).lower():
        print("✅ PREMIUM USER PROTECTION: Working correctly - Premium user blocked from duplicate payment")
        results["double_payment_protection"]["status"] = "passed"
        results["double_payment_protection"]["details"].append("Premium user correctly blocked with French error message")
    else:
        print("❌ PREMIUM USER PROTECTION: FAILED - Premium user should be blocked")
        results["double_payment_protection"]["status"] = "failed"
        results["double_payment_protection"]["details"].append("Premium user not properly blocked")
    
    print("\n2️⃣ Testing Non-Premium User (should work)")
    non_premium_data = {
        "plan": "monthly", 
        "success_url": "https://test.com",
        "cancel_url": "https://test.com",
        "user_email": "test@example.com",
        "user_id": "test456"
    }
    
    response = test_api_endpoint("POST", "/create-checkout-session", 200, non_premium_data)
    if response and ("checkout_url" in str(response) or "url" in str(response)):
        print("✅ NON-PREMIUM USER: Working correctly - Checkout session created")
        if results["double_payment_protection"]["status"] != "failed":
            results["double_payment_protection"]["status"] = "passed"
        results["double_payment_protection"]["details"].append("Non-premium user can create checkout session")
    else:
        print("❌ NON-PREMIUM USER: FAILED - Should be able to create checkout")
        results["double_payment_protection"]["status"] = "failed" 
        results["double_payment_protection"]["details"].append("Non-premium user cannot create checkout session")
    
    # ==========================================================
    # 2. Test Product Cache & Timeout Improvements
    # ==========================================================
    print("\n" + "⚡" * 60)
    print("⚡ Product Cache & Timeout Test")
    print("⚡" * 60)
    
    print("\n1️⃣ Testing Nutella Product (3017620422003) - First Call")
    start_time = time.time()
    response1 = test_api_endpoint("GET", "/product/3017620422003", 200)
    first_call_time = time.time() - start_time
    
    if response1 and response1.get("found") == True:
        print(f"✅ FIRST CALL: Success - Health score: {response1.get('health_score')}")
        print(f"⏱️ Time taken: {first_call_time:.2f} seconds")
        results["product_cache_timeout"]["details"].append(f"First call successful: {first_call_time:.2f}s")
        
        print("\n2️⃣ Testing Same Product (Cache Test) - Second Call")
        start_time = time.time()
        response2 = test_api_endpoint("GET", "/product/3017620422003", 200)
        second_call_time = time.time() - start_time
        
        if response2 and response2.get("found") == True:
            print(f"✅ SECOND CALL: Success - Health score: {response2.get('health_score')}")
            print(f"⏱️ Time taken: {second_call_time:.2f} seconds")
            
            if second_call_time < first_call_time * 0.5:  # Cache should be significantly faster
                print("✅ CACHING: Working - Second call is significantly faster")
                results["product_cache_timeout"]["status"] = "passed"
                results["product_cache_timeout"]["details"].append(f"Cache working: {second_call_time:.2f}s vs {first_call_time:.2f}s")
            else:
                print("⚠️ CACHING: May not be working optimally")
                results["product_cache_timeout"]["status"] = "partial"
                results["product_cache_timeout"]["details"].append("Cache performance unclear")
        else:
            print("❌ SECOND CALL: Failed")
            results["product_cache_timeout"]["status"] = "failed"
    else:
        print("❌ FIRST CALL: Failed")
        results["product_cache_timeout"]["status"] = "failed"
        results["product_cache_timeout"]["details"].append("Product endpoint not responding")
    
    print("\n3️⃣ Testing Another Product (3175681851849) - Compotes")
    response3 = test_api_endpoint("GET", "/product/3175681851849", 200)
    if response3 and response3.get("found") == True:
        print(f"✅ COMPOTES: Success - Health score: {response3.get('health_score')}")
        results["product_cache_timeout"]["details"].append("Additional product test successful")
    
    # ==========================================================
    # 3. Test Premium Status Check
    # ==========================================================
    print("\n" + "👑" * 60)
    print("👑 Premium Status Check Test")
    print("👑" * 60)
    
    print("\n1️⃣ Testing Premium User Status")
    premium_response = test_api_endpoint("GET", "/check-premium/meliraoul23@gmail.com", 200)
    if premium_response and premium_response.get("is_premium") == True:
        print("✅ PREMIUM STATUS: Correctly identified as premium")
        results["premium_status_check"]["status"] = "passed"
        results["premium_status_check"]["details"].append(f"Premium user: {premium_response}")
    else:
        print("❌ PREMIUM STATUS: Failed to identify premium user")
        results["premium_status_check"]["status"] = "failed"
        results["premium_status_check"]["details"].append("Premium user not properly identified")
    
    print("\n2️⃣ Testing Non-Premium User Status")
    non_premium_response = test_api_endpoint("GET", "/check-premium/test@example.com", 200)
    if non_premium_response and non_premium_response.get("is_premium") == False:
        print("✅ NON-PREMIUM STATUS: Correctly identified as non-premium")
        if results["premium_status_check"]["status"] != "failed":
            results["premium_status_check"]["status"] = "passed"
        results["premium_status_check"]["details"].append(f"Non-premium user: {non_premium_response}")
    else:
        print("❌ NON-PREMIUM STATUS: Failed to identify non-premium user")
        results["premium_status_check"]["status"] = "failed"
        results["premium_status_check"]["details"].append("Non-premium user not properly identified")
    
    # ==========================================================
    # 4. Test Rankings with Images
    # ==========================================================
    print("\n" + "🏆" * 60)
    print("🏆 Rankings with Images Test")
    print("🏆" * 60)
    
    rankings_response = test_api_endpoint("GET", "/rankings/all", 200)
    if rankings_response and isinstance(rankings_response, list):
        if len(rankings_response) > 0:
            first_product = rankings_response[0]
            if "image_url" in first_product:
                print(f"✅ RANKINGS: Image URLs present - {len(rankings_response)} products")
                print(f"Sample product: {first_product.get('name')} - {first_product.get('image_url')[:50]}...")
                results["rankings_with_images"]["status"] = "passed"
                results["rankings_with_images"]["details"].append(f"Found {len(rankings_response)} products with image URLs")
            else:
                print("❌ RANKINGS: Image URLs missing from products")
                results["rankings_with_images"]["status"] = "failed"
                results["rankings_with_images"]["details"].append("Products missing image_url field")
        else:
            print("⚠️ RANKINGS: Empty response")
            results["rankings_with_images"]["status"] = "failed"
            results["rankings_with_images"]["details"].append("Empty rankings response")
    else:
        print("❌ RANKINGS: Invalid response format")
        results["rankings_with_images"]["status"] = "failed"
        results["rankings_with_images"]["details"].append("Invalid response format")
    
    # ==========================================================
    # Final Results Summary
    # ==========================================================
    print("\n" + "🎯" * 80)
    print("🎯 TEST RESULTS SUMMARY")
    print("🎯" * 80)
    
    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() if result["status"] == "passed")
    failed_tests = sum(1 for result in results.values() if result["status"] == "failed")
    
    for test_name, result in results.items():
        status_icon = "✅" if result["status"] == "passed" else "❌" if result["status"] == "failed" else "⚠️"
        print(f"\n{status_icon} {test_name.replace('_', ' ').title()}: {result['status'].upper()}")
        for detail in result["details"]:
            print(f"   • {detail}")
    
    print(f"\n📊 Overall Results: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("\n🎉 ALL TESTS PASSED! Backend improvements working correctly.")
    elif failed_tests == 0:
        print("\n⚠️ Some tests had partial results. Please review.")
    else:
        print("\n❌ Some critical tests failed. Immediate attention required!")
    
    print(f"\nTesting completed at: {datetime.now()}")
    
    return results

if __name__ == "__main__":
    results = main()
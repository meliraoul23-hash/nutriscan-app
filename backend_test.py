#!/usr/bin/env python3
"""
Backend API Testing for NutriScan - Premium Status Recognition Feature
Testing specific endpoints as requested in review request
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://nutriscan-167.preview.emergentagent.com/api"
PREMIUM_EMAIL = "meliraoul23@gmail.com"
RANDOM_EMAIL = "test@example.com"
TEST_BARCODE = "3017620422003"  # Nutella

def test_premium_status():
    """
    Test 1: GET /api/check-premium/{email} endpoint
    - Test with meliraoul23@gmail.com - should return is_premium: true
    - Test with a random email like test@example.com - should return is_premium: false
    """
    print("\n=== TESTING PREMIUM STATUS RECOGNITION ===")
    
    # Test 1.1: Premium user
    print(f"\n1.1 Testing premium user: {PREMIUM_EMAIL}")
    try:
        response = requests.get(f"{BASE_URL}/check-premium/{PREMIUM_EMAIL}", timeout=10)
        print(f"Response Status: {response.status_code}")
        print(f"Response Content: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Premium user test - Status: {response.status_code}")
            print(f"   is_premium: {data.get('is_premium')}")
            print(f"   subscription_type: {data.get('subscription_type')}")
            
            # Verify structure
            if 'is_premium' in data and 'subscription_type' in data:
                print("✅ Response structure correct - contains is_premium and subscription_type")
                if data.get('is_premium') == True:
                    print("✅ Premium status correctly identified")
                else:
                    print("❌ Expected premium user but got non-premium status")
            else:
                print("❌ Missing required fields in response")
        else:
            print(f"❌ Premium user test failed with status: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Premium user test error: {str(e)}")
    
    # Test 1.2: Non-premium user
    print(f"\n1.2 Testing non-premium user: {RANDOM_EMAIL}")
    try:
        response = requests.get(f"{BASE_URL}/check-premium/{RANDOM_EMAIL}", timeout=10)
        print(f"Response Status: {response.status_code}")
        print(f"Response Content: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Non-premium user test - Status: {response.status_code}")
            print(f"   is_premium: {data.get('is_premium')}")
            print(f"   subscription_type: {data.get('subscription_type')}")
            
            # Verify structure
            if 'is_premium' in data and 'subscription_type' in data:
                print("✅ Response structure correct - contains is_premium and subscription_type")
                if data.get('is_premium') == False:
                    print("✅ Non-premium status correctly identified")
                else:
                    print("❌ Expected non-premium user but got premium status")
            else:
                print("❌ Missing required fields in response")
        else:
            print(f"❌ Non-premium user test failed with status: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Non-premium user test error: {str(e)}")

def test_history_endpoint():
    """
    Test 2: GET /api/history - should return list of scanned products
    """
    print("\n=== TESTING HISTORY ENDPOINT ===")
    
    try:
        response = requests.get(f"{BASE_URL}/history", timeout=10)
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ History endpoint - Status: {response.status_code}")
            print(f"   Number of items: {len(data)}")
            
            if len(data) > 0:
                print(f"   Sample item: {json.dumps(data[0], indent=2)}")
                print("✅ History contains scanned products")
            else:
                print("⚠️  History is empty")
                
        else:
            print(f"❌ History endpoint failed with status: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ History endpoint error: {str(e)}")

def test_healing_foods_endpoint():
    """
    Test 3: GET /api/healing-foods - should return 12 healing foods
    """
    print("\n=== TESTING HEALING FOODS ENDPOINT ===")
    
    try:
        response = requests.get(f"{BASE_URL}/healing-foods", timeout=10)
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Healing foods endpoint - Status: {response.status_code}")
            print(f"   Number of healing foods: {len(data)}")
            
            if len(data) == 12:
                print("✅ Correct number of healing foods (12)")
                if len(data) > 0:
                    print(f"   Sample food: {data[0].get('name', 'No name')}")
            else:
                print(f"❌ Expected 12 healing foods, got {len(data)}")
                
        else:
            print(f"❌ Healing foods endpoint failed with status: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Healing foods endpoint error: {str(e)}")

def test_product_endpoint():
    """
    Test 4: GET /api/product/3017620422003 - should return Nutella product data
    """
    print("\n=== TESTING PRODUCT ENDPOINT ===")
    
    try:
        response = requests.get(f"{BASE_URL}/product/{TEST_BARCODE}", timeout=15)
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Product endpoint - Status: {response.status_code}")
            print(f"   Product found: {data.get('found', False)}")
            print(f"   Product name: {data.get('name', 'No name')}")
            print(f"   Brand: {data.get('brand', 'No brand')}")
            print(f"   Health score: {data.get('health_score', 'No score')}")
            print(f"   Nutri-score: {data.get('nutri_score', 'No nutri-score')}")
            print(f"   NOVA group: {data.get('nova_group', 'No NOVA')}")
            
            if data.get('found') == True:
                print("✅ Nutella product data retrieved successfully")
            else:
                print("❌ Product not found")
                
        else:
            print(f"❌ Product endpoint failed with status: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Product endpoint error: {str(e)}")

def run_all_tests():
    """Run all requested tests"""
    print("🧪 NUTRISCAN BACKEND TESTING - PREMIUM STATUS FOCUS")
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 Base URL: {BASE_URL}")
    
    # Test premium status recognition feature
    test_premium_status()
    
    # Test other endpoints as quick sanity check
    test_history_endpoint()
    test_healing_foods_endpoint()
    test_product_endpoint()
    
    print(f"\n⏰ Testing completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n=== TESTING SUMMARY ===")
    print("✅ = Test passed")
    print("❌ = Test failed")
    print("⚠️  = Test passed with warnings")

if __name__ == "__main__":
    run_all_tests()
#!/usr/bin/env python3
"""
NutriScan Backend API Stabilization Tests
Testing specific endpoints as requested:
1. GET /api/check-premium/{email}
2. POST /api/coach  
3. GET /api/favorites
4. GET /api/health-goals
5. GET /api/product/{barcode}
"""
import httpx
import json
import asyncio
from datetime import datetime
import sys
import os

# Backend URL from frontend .env (production URL)
BACKEND_URL = "https://nutriscan-167.preview.emergentagent.com/api"

# Test data
TEST_EMAIL = "meliraoul23@gmail.com"  # Premium user
TEST_USER_ID = "99FGZkko1AfrV52fcuHUPz6NLyO2"
RANDOM_EMAIL = "random.user@test.com"  # Should be free
NUTELLA_BARCODE = "3017620422003"

class TestResults:
    def __init__(self):
        self.results = []
        self.errors = []
        
    def add_result(self, endpoint, status, message, details=None):
        self.results.append({
            'endpoint': endpoint,
            'status': status,
            'message': message,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
        
    def add_error(self, endpoint, error):
        self.errors.append({
            'endpoint': endpoint,
            'error': str(error),
            'timestamp': datetime.now().isoformat()
        })
        
    def print_summary(self):
        print("\n" + "="*80)
        print("NUTRISCAN BACKEND API STABILIZATION TEST RESULTS")
        print("="*80)
        
        passed = sum(1 for r in self.results if r['status'] == 'PASS')
        failed = sum(1 for r in self.results if r['status'] == 'FAIL')
        
        print(f"Total Tests: {len(self.results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Errors: {len(self.errors)}")
        
        print("\nDETAILED RESULTS:")
        print("-" * 80)
        
        for result in self.results:
            status_symbol = "✅" if result['status'] == 'PASS' else "❌"
            print(f"{status_symbol} {result['endpoint']}")
            print(f"   Status: {result['status']}")
            print(f"   Message: {result['message']}")
            if result['details']:
                print(f"   Details: {result['details']}")
            print()
            
        if self.errors:
            print("ERRORS:")
            print("-" * 80)
            for error in self.errors:
                print(f"❌ {error['endpoint']}: {error['error']}")
            print()

async def test_premium_status_check(client, results):
    """Test GET /api/check-premium/{email}"""
    print("Testing Premium Status Check...")
    
    # Test with premium user email
    try:
        response = await client.get(f"{BACKEND_URL}/check-premium/{TEST_EMAIL}")
        if response.status_code == 200:
            data = response.json()
            if data.get('is_premium') == True:
                results.add_result(
                    f"GET /api/check-premium/{TEST_EMAIL}",
                    "PASS",
                    f"Premium user correctly identified. Response: {data}",
                    data
                )
            else:
                results.add_result(
                    f"GET /api/check-premium/{TEST_EMAIL}",
                    "FAIL",
                    f"Premium user not correctly identified. Expected is_premium=True, got: {data}",
                    data
                )
        else:
            results.add_result(
                f"GET /api/check-premium/{TEST_EMAIL}",
                "FAIL",
                f"HTTP {response.status_code}: {response.text}",
                {"status_code": response.status_code, "response": response.text}
            )
    except Exception as e:
        results.add_error(f"GET /api/check-premium/{TEST_EMAIL}", e)
    
    # Test with random email (should be free)
    try:
        response = await client.get(f"{BACKEND_URL}/check-premium/{RANDOM_EMAIL}")
        if response.status_code == 200:
            data = response.json()
            if data.get('is_premium') == False:
                results.add_result(
                    f"GET /api/check-premium/{RANDOM_EMAIL}",
                    "PASS",
                    f"Free user correctly identified. Response: {data}",
                    data
                )
            else:
                results.add_result(
                    f"GET /api/check-premium/{RANDOM_EMAIL}",
                    "FAIL",
                    f"Free user not correctly identified. Expected is_premium=False, got: {data}",
                    data
                )
        else:
            results.add_result(
                f"GET /api/check-premium/{RANDOM_EMAIL}",
                "FAIL",
                f"HTTP {response.status_code}: {response.text}",
                {"status_code": response.status_code, "response": response.text}
            )
    except Exception as e:
        results.add_error(f"GET /api/check-premium/{RANDOM_EMAIL}", e)

async def test_ai_coach(client, results):
    """Test POST /api/coach"""
    print("Testing AI Coach Endpoint...")
    
    try:
        payload = {
            "message": "Bonjour, comment manger mieux ?"
        }
        
        params = {
            "email": TEST_EMAIL,
            "user_id": TEST_USER_ID
        }
        
        response = await client.post(
            f"{BACKEND_URL}/coach", 
            json=payload,
            params=params
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'response' in data and data['response']:
                results.add_result(
                    "POST /api/coach",
                    "PASS",
                    f"AI Coach responded successfully. Length: {len(data['response'])} characters",
                    {"response_preview": data['response'][:100] + "..." if len(data['response']) > 100 else data['response']}
                )
            else:
                results.add_result(
                    "POST /api/coach",
                    "FAIL",
                    f"AI Coach response missing or empty. Response: {data}",
                    data
                )
        elif response.status_code == 403:
            results.add_result(
                "POST /api/coach",
                "FAIL", 
                f"Premium feature access denied - check premium status for {TEST_EMAIL}",
                {"status_code": response.status_code, "response": response.text}
            )
        else:
            results.add_result(
                "POST /api/coach",
                "FAIL",
                f"HTTP {response.status_code}: {response.text}",
                {"status_code": response.status_code, "response": response.text}
            )
    except Exception as e:
        results.add_error("POST /api/coach", e)

async def test_favorites_endpoint(client, results):
    """Test GET /api/favorites"""
    print("Testing Favorites Endpoint...")
    
    try:
        params = {
            "email": TEST_EMAIL,
            "user_id": TEST_USER_ID
        }
        
        response = await client.get(f"{BACKEND_URL}/favorites", params=params)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                results.add_result(
                    "GET /api/favorites",
                    "PASS",
                    f"Favorites retrieved successfully. Count: {len(data)} items",
                    {"count": len(data), "sample": data[:2] if data else []}
                )
            else:
                results.add_result(
                    "GET /api/favorites",
                    "FAIL",
                    f"Favorites response not a list. Type: {type(data)}, Response: {data}",
                    data
                )
        else:
            results.add_result(
                "GET /api/favorites",
                "FAIL",
                f"HTTP {response.status_code}: {response.text}",
                {"status_code": response.status_code, "response": response.text}
            )
    except Exception as e:
        results.add_error("GET /api/favorites", e)

async def test_health_goals_endpoint(client, results):
    """Test GET /api/health-goals"""
    print("Testing Health Goals Endpoint...")
    
    try:
        params = {
            "email": TEST_EMAIL,
            "user_id": TEST_USER_ID
        }
        
        # Try the endpoint as specified in review request
        response = await client.get(f"{BACKEND_URL}/health-goals", params=params)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                results.add_result(
                    "GET /api/health-goals",
                    "PASS",
                    f"Health goals retrieved successfully. Count: {len(data)} goals",
                    {"count": len(data), "sample": data[:2] if data else []}
                )
            else:
                results.add_result(
                    "GET /api/health-goals",
                    "FAIL",
                    f"Health goals response not a list. Type: {type(data)}, Response: {data}",
                    data
                )
        elif response.status_code == 404:
            # Try alternative endpoint from codebase
            print("  Trying alternative endpoint /api/goals...")
            response = await client.get(f"{BACKEND_URL}/goals", params=params)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    results.add_result(
                        "GET /api/goals (alternative)",
                        "PASS",
                        f"Health goals retrieved from alternative endpoint. Count: {len(data)} goals",
                        {"count": len(data), "sample": data[:2] if data else []}
                    )
                else:
                    results.add_result(
                        "GET /api/goals (alternative)",
                        "FAIL",
                        f"Goals response not a list. Type: {type(data)}, Response: {data}",
                        data
                    )
            else:
                results.add_result(
                    "GET /api/health-goals",
                    "FAIL",
                    f"Both /api/health-goals and /api/goals failed. Status: {response.status_code}, Response: {response.text}",
                    {"status_code": response.status_code, "response": response.text}
                )
        else:
            results.add_result(
                "GET /api/health-goals",
                "FAIL",
                f"HTTP {response.status_code}: {response.text}",
                {"status_code": response.status_code, "response": response.text}
            )
    except Exception as e:
        results.add_error("GET /api/health-goals", e)

async def test_product_scan(client, results):
    """Test GET /api/product/{barcode}"""
    print("Testing Product Scan (Nutella)...")
    
    try:
        response = await client.get(f"{BACKEND_URL}/product/{NUTELLA_BARCODE}")
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ['barcode', 'name', 'brand', 'health_score', 'nutri_score', 'found']
            
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields and data.get('found') == True:
                results.add_result(
                    f"GET /api/product/{NUTELLA_BARCODE}",
                    "PASS",
                    f"Product scan successful. Name: {data.get('name')}, Health Score: {data.get('health_score')}, Nutri-Score: {data.get('nutri_score')}",
                    {
                        "name": data.get('name'),
                        "brand": data.get('brand'),
                        "health_score": data.get('health_score'),
                        "nutri_score": data.get('nutri_score'),
                        "nova_group": data.get('nova_group')
                    }
                )
            else:
                results.add_result(
                    f"GET /api/product/{NUTELLA_BARCODE}",
                    "FAIL",
                    f"Product response missing fields or not found. Missing: {missing_fields}, Found: {data.get('found')}",
                    {"missing_fields": missing_fields, "response_sample": {k: v for k, v in list(data.items())[:5]}}
                )
        else:
            results.add_result(
                f"GET /api/product/{NUTELLA_BARCODE}",
                "FAIL",
                f"HTTP {response.status_code}: {response.text}",
                {"status_code": response.status_code, "response": response.text}
            )
    except Exception as e:
        results.add_error(f"GET /api/product/{NUTELLA_BARCODE}", e)

async def test_basic_connectivity(client, results):
    """Test basic API connectivity"""
    print("Testing Basic API Connectivity...")
    
    try:
        response = await client.get(f"{BACKEND_URL}/")
        
        if response.status_code == 200:
            data = response.json()
            results.add_result(
                "GET /api/",
                "PASS",
                f"API is reachable. Message: {data.get('message', 'No message')}",
                data
            )
        else:
            results.add_result(
                "GET /api/",
                "FAIL",
                f"HTTP {response.status_code}: {response.text}",
                {"status_code": response.status_code, "response": response.text}
            )
    except Exception as e:
        results.add_error("GET /api/", e)

async def main():
    """Main test runner"""
    print("Starting NutriScan Backend API Stabilization Tests...")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Email (Premium): {TEST_EMAIL}")
    print(f"Test User ID: {TEST_USER_ID}")
    print(f"Random Email (Free): {RANDOM_EMAIL}")
    print("-" * 80)
    
    results = TestResults()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Test in specific order as requested
        await test_basic_connectivity(client, results)
        await test_premium_status_check(client, results)
        await test_ai_coach(client, results)
        await test_favorites_endpoint(client, results)
        await test_health_goals_endpoint(client, results)
        await test_product_scan(client, results)
    
    results.print_summary()
    
    # Return exit code based on results
    failed_tests = sum(1 for r in results.results if r['status'] == 'FAIL')
    error_count = len(results.errors)
    
    if failed_tests > 0 or error_count > 0:
        print(f"\n⚠️  TESTING COMPLETED WITH ISSUES: {failed_tests} failed tests, {error_count} errors")
        return 1
    else:
        print(f"\n✅ ALL TESTS PASSED SUCCESSFULLY!")
        return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
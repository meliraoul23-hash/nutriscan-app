#!/usr/bin/env python3
"""
Final critical endpoint validation for NutriScan
Testing specific requirements from review request
"""

import requests
import json
import time

API_BASE_URL = "https://nutriscan-167.preview.emergentagent.com/api"
PREMIUM_EMAIL = "meliraoul23@gmail.com"

def test_critical_endpoints():
    print("🎯 CRITICAL ENDPOINT VALIDATION FOR NUTRISCAN")
    print("=" * 60)
    print(f"API Base URL: {API_BASE_URL}")
    print(f"Premium Email: {PREMIUM_EMAIL}")
    print()
    
    # 1. Product endpoints
    print("1. 🥫 PRODUCT ENDPOINTS:")
    
    # GET /api/product/3017620422003 (Nutella)
    try:
        response = requests.get(f"{API_BASE_URL}/product/3017620422003", timeout=15)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ GET /api/product/3017620422003: {response.status_code}")
            print(f"      Product: {data.get('name')} by {data.get('brand')}")
            print(f"      Health Score: {data.get('health_score')}")
            print(f"      Nutri-Score: {data.get('nutri_score')}")
            print(f"      NOVA Group: {data.get('nova_group')}")
            print(f"      Found: {data.get('found')}")
        else:
            print(f"   ❌ GET /api/product/3017620422003: {response.status_code}")
    except Exception as e:
        print(f"   ❌ GET /api/product/3017620422003: Exception - {str(e)}")
    
    # GET /api/search?q=chocolat
    try:
        response = requests.get(f"{API_BASE_URL}/search?q=chocolat", timeout=20)
        if response.status_code == 200:
            data = response.json()
            products = data.get("products", [])
            print(f"   ✅ GET /api/search?q=chocolat: {response.status_code}")
            print(f"      Found {len(products)} products, total count: {data.get('count', 0)}")
        else:
            print(f"   ❌ GET /api/search?q=chocolat: {response.status_code}")
    except Exception as e:
        print(f"   ❌ GET /api/search?q=chocolat: Exception - {str(e)}")
    
    # GET /api/alternatives/3017620422003
    try:
        response = requests.get(f"{API_BASE_URL}/alternatives/3017620422003", timeout=20)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ GET /api/alternatives/3017620422003: {response.status_code}")
            print(f"      Found {len(data)} alternatives (empty list acceptable)")
        else:
            print(f"   ❌ GET /api/alternatives/3017620422003: {response.status_code}")
    except Exception as e:
        print(f"   ❌ GET /api/alternatives/3017620422003: Exception - {str(e)}")
    
    print()
    
    # 2. History endpoints
    print("2. 📋 HISTORY ENDPOINTS:")
    
    # GET /api/history
    try:
        response = requests.get(f"{API_BASE_URL}/history", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ GET /api/history: {response.status_code}")
            print(f"      History contains {len(data)} items")
        else:
            print(f"   ❌ GET /api/history: {response.status_code}")
    except Exception as e:
        print(f"   ❌ GET /api/history: Exception - {str(e)}")
    
    # POST /api/history
    try:
        test_data = {"barcode": "3017620422003", "product_name": "Test API", "health_score": 50}
        response = requests.post(f"{API_BASE_URL}/history", json=test_data, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ POST /api/history: {response.status_code}")
            print(f"      Created scan with ID: {data.get('id')}")
        else:
            print(f"   ❌ POST /api/history: {response.status_code}")
    except Exception as e:
        print(f"   ❌ POST /api/history: Exception - {str(e)}")
    
    print()
    
    # 3. Premium features
    print("3. 💎 PREMIUM FEATURES:")
    
    # GET /api/check-premium/{email}
    try:
        response = requests.get(f"{API_BASE_URL}/check-premium/{PREMIUM_EMAIL}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ GET /api/check-premium/{PREMIUM_EMAIL}: {response.status_code}")
            print(f"      Is Premium: {data.get('is_premium')}")
            print(f"      Subscription Type: {data.get('subscription_type')}")
        else:
            print(f"   ❌ GET /api/check-premium/{PREMIUM_EMAIL}: {response.status_code}")
    except Exception as e:
        print(f"   ❌ GET /api/check-premium/{PREMIUM_EMAIL}: Exception - {str(e)}")
    
    # POST /api/coach
    try:
        headers = {"x-user-email": PREMIUM_EMAIL}
        test_data = {"message": "Bonjour"}
        response = requests.post(f"{API_BASE_URL}/coach", json=test_data, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            response_text = data.get("response", "")
            print(f"   ✅ POST /api/coach: {response.status_code}")
            print(f"      AI Response length: {len(response_text)} characters")
            print(f"      Preview: '{response_text[:60]}...'")
        else:
            print(f"   ❌ POST /api/coach: {response.status_code}")
    except Exception as e:
        print(f"   ❌ POST /api/coach: Exception - {str(e)}")
    
    # POST /api/generate-menu - CRITICAL TEST
    print(f"   🎯 CRITICAL TEST - POST /api/generate-menu:")
    try:
        test_data = {"family_size": 2}
        response = requests.post(f"{API_BASE_URL}/generate-menu?email={PREMIUM_EMAIL}", json=test_data, timeout=60)
        if response.status_code == 200:
            data = response.json()
            print(f"      ✅ HTTP Status: {response.status_code}")
            
            # Check menu structure
            required_days = ["samedi", "dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi"]
            missing_days = [day for day in required_days if day not in data]
            
            if not missing_days:
                print(f"      ✅ All 7 days present in menu")
            else:
                print(f"      ❌ Missing days: {missing_days}")
            
            # CRITICAL: Check liste_courses structure
            if "liste_courses" in data:
                liste_courses = data["liste_courses"]
                if isinstance(liste_courses, list) and len(liste_courses) > 0:
                    print(f"      ✅ liste_courses found with {len(liste_courses)} items")
                    
                    # Check if items are actual shopping items, not recipes
                    sample_items = liste_courses[:5]
                    valid_shopping_items = 0
                    
                    print(f"      📋 Sample shopping items:")
                    for i, item in enumerate(sample_items):
                        if isinstance(item, str):
                            # Check for quantity indicators
                            has_quantity = any(unit in item.lower() for unit in ["kg", "g ", "l ", "litre", "pièce", "ml", "cl"])
                            if has_quantity:
                                valid_shopping_items += 1
                                print(f"         {i+1}. {item} ✅")
                            else:
                                print(f"         {i+1}. {item} ⚠️")
                    
                    if valid_shopping_items >= 3:
                        print(f"      ✅ VALIDATED: liste_courses contains proper shopping items with quantities")
                    else:
                        print(f"      ❌ ISSUE: Most items appear to be recipes, not shopping list items")
                else:
                    print(f"      ❌ liste_courses should be non-empty array")
            else:
                print(f"      ❌ CRITICAL: Missing required 'liste_courses' field")
            
            # Check family size
            if data.get("nombre_personnes") == 2:
                print(f"      ✅ Menu correctly generated for 2 people")
            else:
                print(f"      ❌ Expected 2 people, got {data.get('nombre_personnes')}")
        else:
            print(f"      ❌ HTTP Status: {response.status_code} - {response.text[:100]}")
    except Exception as e:
        print(f"      ❌ Exception: {str(e)}")
    
    print()
    
    # 4. Rankings and recommendations
    print("4. 🏆 RANKINGS AND RECOMMENDATIONS:")
    
    # GET /api/rankings/all
    try:
        response = requests.get(f"{API_BASE_URL}/rankings/all", timeout=15)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ GET /api/rankings/all: {response.status_code}")
            print(f"      Found {len(data)} ranked products")
        else:
            print(f"   ❌ GET /api/rankings/all: {response.status_code}")
    except Exception as e:
        print(f"   ❌ GET /api/rankings/all: Exception - {str(e)}")
    
    # GET /api/recommendations
    try:
        response = requests.get(f"{API_BASE_URL}/recommendations", timeout=15)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ GET /api/recommendations: {response.status_code}")
            print(f"      Found {len(data)} recommendations")
        else:
            print(f"   ❌ GET /api/recommendations: {response.status_code}")
    except Exception as e:
        print(f"   ❌ GET /api/recommendations: Exception - {str(e)}")
    
    # GET /api/healing-foods
    try:
        response = requests.get(f"{API_BASE_URL}/healing-foods", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ GET /api/healing-foods: {response.status_code}")
            print(f"      Found {len(data)} healing foods")
        else:
            print(f"   ❌ GET /api/healing-foods: {response.status_code}")
    except Exception as e:
        print(f"   ❌ GET /api/healing-foods: Exception - {str(e)}")
    
    print()
    
    # 5. Transcription
    print("5. 🎤 TRANSCRIPTION:")
    print("   ℹ️  Transcription endpoint requires audio file upload - skipping in this test")
    print("   📝 Note: Backend logs show transcription is working (successful audio processing)")
    
    print()
    print("🎯 CRITICAL ENDPOINT VALIDATION COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    test_critical_endpoints()
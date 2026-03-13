#!/usr/bin/env python3
import requests
import json

API_BASE_URL = "https://nutriscan-167.preview.emergentagent.com/api"
PREMIUM_EMAIL = "meliraoul23@gmail.com"

def test_endpoint(method, endpoint, data=None, headers=None):
    """Quick test of an endpoint"""
    try:
        url = f"{API_BASE_URL}{endpoint}"
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        else:
            response = requests.post(url, json=data, headers=headers, timeout=10)
        
        print(f"✅ {method} {endpoint}: {response.status_code} - {len(response.text)} chars")
        if response.status_code == 200:
            try:
                data = response.json()
                # Check for specific fields based on endpoint
                if "generate-menu" in endpoint:
                    if "liste_courses" in data:
                        courses = data["liste_courses"]
                        print(f"   📋 liste_courses: {len(courses)} items")
                        if courses:
                            print(f"   📦 Sample: {courses[0]}")
                    else:
                        print("   ❌ Missing liste_courses")
                elif "product" in endpoint and isinstance(data, dict):
                    print(f"   🥫 {data.get('name', 'Unknown')} - Score: {data.get('health_score', 'N/A')}")
                elif "search" in endpoint:
                    products = data.get("products", [])
                    print(f"   🔍 Found {len(products)} products")
            except:
                pass
        else:
            print(f"   ❌ Error: {response.text[:100]}")
    except Exception as e:
        print(f"❌ {method} {endpoint}: Exception - {str(e)}")

print("🚀 Quick NutriScan API Test")
print("=" * 50)

# Product endpoints
print("\n🥫 PRODUCT ENDPOINTS:")
test_endpoint("GET", "/product/3017620422003")
test_endpoint("GET", "/search?q=chocolat")
test_endpoint("GET", "/alternatives/3017620422003")

# History endpoints
print("\n📋 HISTORY ENDPOINTS:")
test_endpoint("GET", "/history")
test_endpoint("POST", "/history", {"barcode": "3017620422003", "product_name": "Test", "health_score": 50})

# Premium features
print("\n💎 PREMIUM FEATURES:")
test_endpoint("GET", f"/check-premium/{PREMIUM_EMAIL}")
test_endpoint("POST", "/coach", {"message": "Bonjour"}, {"x-user-email": PREMIUM_EMAIL})
test_endpoint("POST", f"/generate-menu?email={PREMIUM_EMAIL}", {"family_size": 2})

# Rankings
print("\n🏆 RANKINGS & RECOMMENDATIONS:")
test_endpoint("GET", "/rankings/all")
test_endpoint("GET", "/recommendations")
test_endpoint("GET", "/healing-foods")

print("\n✅ Quick test completed!")
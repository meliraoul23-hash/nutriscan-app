#!/usr/bin/env python3
"""
NutriScan Backend API Testing Suite V2
Tests all backend endpoints including NEW v2 features for the NutriScan application
"""

import asyncio
import httpx
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env - using production URL
BACKEND_URL = "https://nutriscan-167.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

class NutriScanV2Tester:
    def __init__(self):
        self.passed_tests = 0
        self.failed_tests = 0
        self.test_results = []
        self.auth_token = None
        
    def log_result(self, test_name: str, success: bool, details: str = ""):
        status = f"{Colors.GREEN}✅ PASS{Colors.ENDC}" if success else f"{Colors.RED}❌ FAIL{Colors.ENDC}"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })
        
        if success:
            self.passed_tests += 1
        else:
            self.failed_tests += 1

    async def setup_auth(self, client: httpx.AsyncClient):
        """Setup authentication by logging in"""
        try:
            # First try to register the test user
            register_data = {
                "email": "test@example.com",
                "password": "password123",
                "name": "Test User"
            }
            
            register_response = await client.post(f"{API_BASE}/auth/register", json=register_data)
            
            # Now login to get the token
            login_data = {
                "email": "test@example.com",
                "password": "password123"
            }
            
            login_response = await client.post(f"{API_BASE}/auth/login", json=login_data)
            
            if login_response.status_code == 200:
                data = login_response.json()
                self.auth_token = data.get('token')
                self.log_result("Auth Setup", True, f"Successfully authenticated user")
                return True
            else:
                self.log_result("Auth Setup", False, f"Login failed: Status {login_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Auth Setup", False, f"Exception: {str(e)}")
            return False

    def get_auth_headers(self):
        """Get authorization headers with Bearer token"""
        if self.auth_token:
            return {"Authorization": f"Bearer {self.auth_token}"}
        return {}

    async def test_goal_types(self, client: httpx.AsyncClient):
        """Test GET /api/goals/types - Get available goal types"""
        try:
            response = await client.get(f"{API_BASE}/goals/types")
            
            if response.status_code != 200:
                self.log_result("GET /api/goals/types", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Should return 6 goal types as mentioned in the request
            expected_goals = ["reduce_sugar", "reduce_salt", "reduce_fat", "avoid_additives", "increase_fiber", "increase_protein"]
            
            if not isinstance(data, dict):
                self.log_result("GET /api/goals/types", False, f"Expected dict, got: {type(data)}")
                return False
            
            # Check if all expected goal types are present
            missing_goals = [goal for goal in expected_goals if goal not in data]
            if missing_goals:
                self.log_result("GET /api/goals/types", False, f"Missing goal types: {missing_goals}")
                return False
            
            self.log_result("GET /api/goals/types", True, f"Retrieved {len(data)} goal types: {list(data.keys())}")
            return True
            
        except Exception as e:
            self.log_result("GET /api/goals/types", False, f"Exception: {str(e)}")
            return False

    async def test_create_goal(self, client: httpx.AsyncClient):
        """Test POST /api/goals?goal_type=reduce_sugar - Create a new health goal"""
        try:
            headers = self.get_auth_headers()
            params = {"goal_type": "reduce_sugar", "target_value": 25}
            
            response = await client.post(f"{API_BASE}/goals", params=params, headers=headers)
            
            if response.status_code not in [200, 400]:  # 400 might be "goal already exists"
                self.log_result("POST /api/goals", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            if response.status_code == 400:
                # Check if it's because goal already exists
                if "existe déjà" in data.get('detail', ''):
                    self.log_result("POST /api/goals", True, "Goal already exists (acceptable)")
                    return True
                else:
                    self.log_result("POST /api/goals", False, f"Unexpected 400 error: {data.get('detail')}")
                    return False
            
            # Check response structure for successful creation
            if "message" not in data or "goal" not in data:
                self.log_result("POST /api/goals", False, f"Missing fields in response: {data}")
                return False
            
            goal = data["goal"]
            if goal.get("goal_type") != "reduce_sugar":
                self.log_result("POST /api/goals", False, f"Goal type mismatch: {goal.get('goal_type')}")
                return False
            
            self.log_result("POST /api/goals", True, f"Created goal: {goal.get('goal_type')} with target {goal.get('target_value')}")
            return True
            
        except Exception as e:
            self.log_result("POST /api/goals", False, f"Exception: {str(e)}")
            return False

    async def test_get_user_goals(self, client: httpx.AsyncClient):
        """Test GET /api/goals - Get user's health goals"""
        try:
            headers = self.get_auth_headers()
            
            response = await client.get(f"{API_BASE}/goals", headers=headers)
            
            if response.status_code != 200:
                self.log_result("GET /api/goals", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            if not isinstance(data, list):
                self.log_result("GET /api/goals", False, f"Expected list, got: {type(data)}")
                return False
            
            # Check structure if goals exist
            if len(data) > 0:
                first_goal = data[0]
                required_fields = ['id', 'goal_type', 'target_value', 'current_progress', 'created_at']
                missing_fields = [field for field in required_fields if field not in first_goal]
                
                if missing_fields:
                    self.log_result("GET /api/goals", False, f"Missing fields in goal: {missing_fields}")
                    return False
            
            self.log_result("GET /api/goals", True, f"Retrieved {len(data)} user goals")
            return True
            
        except Exception as e:
            self.log_result("GET /api/goals", False, f"Exception: {str(e)}")
            return False

    async def test_check_product_goals(self, client: httpx.AsyncClient):
        """Test POST /api/goals/check-product/3017620422003 - Check Nutella against goals"""
        try:
            headers = self.get_auth_headers()
            barcode = "3017620422003"  # Nutella barcode
            
            response = await client.post(f"{API_BASE}/goals/check-product/{barcode}", headers=headers)
            
            if response.status_code != 200:
                self.log_result("POST /api/goals/check-product", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Check response structure
            required_fields = ['alerts', 'recommendations']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result("POST /api/goals/check-product", False, f"Missing fields: {missing_fields}")
                return False
            
            if not isinstance(data['alerts'], list) or not isinstance(data['recommendations'], list):
                self.log_result("POST /api/goals/check-product", False, "alerts and recommendations should be lists")
                return False
            
            alerts_count = len(data['alerts'])
            recs_count = len(data['recommendations'])
            
            self.log_result("POST /api/goals/check-product", True, f"Product check completed: {alerts_count} alerts, {recs_count} recommendations")
            return True
            
        except Exception as e:
            self.log_result("POST /api/goals/check-product", False, f"Exception: {str(e)}")
            return False

    async def test_compare_products(self, client: httpx.AsyncClient):
        """Test POST /api/compare - Compare products with body: ["3017620422003", "5000112637922"]"""
        try:
            barcodes = ["3017620422003", "5000112637922"]  # Nutella and Coca-Cola
            
            response = await client.post(f"{API_BASE}/compare", json=barcodes)
            
            if response.status_code != 200:
                self.log_result("POST /api/compare", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Check response structure
            required_fields = ['products', 'best_health_score', 'best_nutri_score', 'lowest_sugar', 'lowest_fat', 'lowest_salt']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result("POST /api/compare", False, f"Missing fields: {missing_fields}")
                return False
            
            products = data['products']
            if not isinstance(products, list) or len(products) < 2:
                self.log_result("POST /api/compare", False, f"Expected at least 2 products, got: {len(products)}")
                return False
            
            # Check product structure
            first_product = products[0]
            product_fields = ['barcode', 'name', 'brand', 'health_score', 'nutri_score', 'nova_group', 'nutrients']
            missing_product_fields = [field for field in product_fields if field not in first_product]
            
            if missing_product_fields:
                self.log_result("POST /api/compare", False, f"Missing product fields: {missing_product_fields}")
                return False
            
            self.log_result("POST /api/compare", True, f"Compared {len(products)} products successfully")
            return True
            
        except Exception as e:
            self.log_result("POST /api/compare", False, f"Exception: {str(e)}")
            return False

    async def test_add_favorite(self, client: httpx.AsyncClient):
        """Test POST /api/favorites/3017620422003 - Add to favorites"""
        try:
            headers = self.get_auth_headers()
            barcode = "3017620422003"  # Nutella barcode
            
            response = await client.post(f"{API_BASE}/favorites/{barcode}", headers=headers)
            
            if response.status_code not in [200, 409]:  # 409 might be "already in favorites"
                self.log_result("POST /api/favorites", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            if "message" not in data:
                self.log_result("POST /api/favorites", False, f"Missing message in response: {data}")
                return False
            
            # Check if product was added or already exists
            message = data["message"].lower()
            if "ajouté" in message or "favoris" in message:
                self.log_result("POST /api/favorites", True, f"Product added to favorites: {data['message']}")
                return True
            else:
                self.log_result("POST /api/favorites", False, f"Unexpected message: {data['message']}")
                return False
            
        except Exception as e:
            self.log_result("POST /api/favorites", False, f"Exception: {str(e)}")
            return False

    async def test_get_favorites(self, client: httpx.AsyncClient):
        """Test GET /api/favorites - Get favorites"""
        try:
            headers = self.get_auth_headers()
            
            response = await client.get(f"{API_BASE}/favorites", headers=headers)
            
            if response.status_code != 200:
                self.log_result("GET /api/favorites", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            if not isinstance(data, list):
                self.log_result("GET /api/favorites", False, f"Expected list, got: {type(data)}")
                return False
            
            # Check structure if favorites exist
            if len(data) > 0:
                first_fav = data[0]
                required_fields = ['id', 'user_id', 'barcode', 'product_name', 'health_score', 'created_at']
                missing_fields = [field for field in required_fields if field not in first_fav]
                
                if missing_fields:
                    self.log_result("GET /api/favorites", False, f"Missing fields in favorite: {missing_fields}")
                    return False
            
            self.log_result("GET /api/favorites", True, f"Retrieved {len(data)} favorite products")
            return True
            
        except Exception as e:
            self.log_result("GET /api/favorites", False, f"Exception: {str(e)}")
            return False

    async def test_remove_favorite(self, client: httpx.AsyncClient):
        """Test DELETE /api/favorites/3017620422003 - Remove from favorites"""
        try:
            headers = self.get_auth_headers()
            barcode = "3017620422003"  # Nutella barcode
            
            response = await client.delete(f"{API_BASE}/favorites/{barcode}", headers=headers)
            
            if response.status_code not in [200, 404]:  # 404 might be "not in favorites"
                self.log_result("DELETE /api/favorites", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            if "message" not in data:
                self.log_result("DELETE /api/favorites", False, f"Missing message in response: {data}")
                return False
            
            message = data["message"].lower()
            if "retiré" in message or "supprimé" in message or "trouvé" in message:
                self.log_result("DELETE /api/favorites", True, f"Favorite removal: {data['message']}")
                return True
            else:
                self.log_result("DELETE /api/favorites", False, f"Unexpected message: {data['message']}")
                return False
            
        except Exception as e:
            self.log_result("DELETE /api/favorites", False, f"Exception: {str(e)}")
            return False

    async def test_subscribe_premium(self, client: httpx.AsyncClient):
        """Test POST /api/subscribe - Upgrade to premium"""
        try:
            headers = self.get_auth_headers()
            
            response = await client.post(f"{API_BASE}/subscribe", headers=headers)
            
            if response.status_code != 200:
                self.log_result("POST /api/subscribe", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Check response structure
            required_fields = ['message', 'subscription_type']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result("POST /api/subscribe", False, f"Missing fields: {missing_fields}")
                return False
            
            if data['subscription_type'] != 'premium':
                self.log_result("POST /api/subscribe", False, f"Expected premium subscription, got: {data['subscription_type']}")
                return False
            
            self.log_result("POST /api/subscribe", True, f"Premium subscription activated: {data['message']}")
            return True
            
        except Exception as e:
            self.log_result("POST /api/subscribe", False, f"Exception: {str(e)}")
            return False

    async def test_subscription_status(self, client: httpx.AsyncClient):
        """Test GET /api/subscription-status - Check subscription status"""
        try:
            headers = self.get_auth_headers()
            
            response = await client.get(f"{API_BASE}/subscription-status", headers=headers)
            
            if response.status_code != 200:
                self.log_result("GET /api/subscription-status", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            # Check response structure
            required_fields = ['subscription_type', 'features']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result("GET /api/subscription-status", False, f"Missing fields: {missing_fields}")
                return False
            
            if not isinstance(data['features'], list):
                self.log_result("GET /api/subscription-status", False, f"Features should be list, got: {type(data['features'])}")
                return False
            
            subscription_type = data['subscription_type']
            features_count = len(data['features'])
            
            self.log_result("GET /api/subscription-status", True, f"Subscription: {subscription_type}, Features: {features_count}")
            return True
            
        except Exception as e:
            self.log_result("GET /api/subscription-status", False, f"Exception: {str(e)}")
            return False

    async def test_delete_goal(self, client: httpx.AsyncClient):
        """Test DELETE /api/goals/{goal_id} - Delete a goal"""
        try:
            headers = self.get_auth_headers()
            
            # First get user goals to find a goal ID to delete
            goals_response = await client.get(f"{API_BASE}/goals", headers=headers)
            
            if goals_response.status_code != 200:
                self.log_result("DELETE /api/goals (setup)", False, "Could not fetch goals for deletion test")
                return False
            
            goals = goals_response.json()
            
            if len(goals) == 0:
                self.log_result("DELETE /api/goals", True, "No goals to delete (acceptable)")
                return True
            
            # Try to delete the first goal
            goal_id = goals[0]['id']
            
            response = await client.delete(f"{API_BASE}/goals/{goal_id}", headers=headers)
            
            if response.status_code not in [200, 404]:
                self.log_result("DELETE /api/goals", False, f"Status: {response.status_code}")
                return False
            
            data = response.json()
            
            if "message" not in data:
                self.log_result("DELETE /api/goals", False, f"Missing message in response: {data}")
                return False
            
            self.log_result("DELETE /api/goals", True, f"Goal deletion: {data['message']}")
            return True
            
        except Exception as e:
            self.log_result("DELETE /api/goals", False, f"Exception: {str(e)}")
            return False

    async def run_all_v2_tests(self):
        """Run all NEW backend V2 tests"""
        print(f"{Colors.BLUE}{Colors.BOLD}🧪 NutriScan Backend API V2 Testing Suite{Colors.ENDC}")
        print(f"{Colors.BLUE}Testing NEW V2 Endpoints at: {API_BASE}{Colors.ENDC}\n")
        
        timeout = httpx.Timeout(30.0)  # 30 second timeout
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            # Setup authentication first
            print(f"{Colors.YELLOW}🔐 Setting up authentication...{Colors.ENDC}")
            auth_success = await self.setup_auth(client)
            print()
            
            if not auth_success:
                print(f"{Colors.RED}❌ Authentication setup failed. Cannot test authenticated endpoints.{Colors.ENDC}")
                return False
            
            # Test all new V2 endpoints
            print(f"{Colors.YELLOW}🎯 Testing Goals System Endpoints...{Colors.ENDC}")
            await self.test_goal_types(client)
            await self.test_create_goal(client)
            await self.test_get_user_goals(client)
            await self.test_check_product_goals(client)
            await self.test_delete_goal(client)
            print()
            
            print(f"{Colors.YELLOW}⚖️ Testing Product Comparison Endpoint...{Colors.ENDC}")
            await self.test_compare_products(client)
            print()
            
            print(f"{Colors.YELLOW}❤️ Testing Favorites System Endpoints...{Colors.ENDC}")
            await self.test_add_favorite(client)
            await self.test_get_favorites(client)
            await self.test_remove_favorite(client)
            print()
            
            print(f"{Colors.YELLOW}💎 Testing Premium Subscription Endpoints...{Colors.ENDC}")
            await self.test_subscribe_premium(client)
            await self.test_subscription_status(client)
            print()
            
        # Print summary
        total_tests = self.passed_tests + self.failed_tests
        pass_rate = (self.passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"{Colors.BOLD}📊 V2 Test Summary:{Colors.ENDC}")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {Colors.GREEN}{self.passed_tests}{Colors.ENDC}")
        print(f"Failed: {Colors.RED}{self.failed_tests}{Colors.ENDC}")
        print(f"Pass Rate: {pass_rate:.1f}%")
        
        if self.failed_tests > 0:
            print(f"\n{Colors.RED}❌ Some V2 tests failed. Check the details above.{Colors.ENDC}")
            return False
        else:
            print(f"\n{Colors.GREEN}✅ All V2 tests passed!{Colors.ENDC}")
            return True

async def main():
    """Main function to run V2 tests"""
    tester = NutriScanV2Tester()
    success = await tester.run_all_v2_tests()
    
    # Return appropriate exit code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
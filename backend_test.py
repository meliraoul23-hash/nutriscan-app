#!/usr/bin/env python3
"""
NutriScan Backend API Testing Suite
Tests all backend endpoints for the NutriScan application
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

class NutriScanTester:
    def __init__(self):
        self.passed_tests = 0
        self.failed_tests = 0
        self.test_results = []
        
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
            
    async def test_health_check(self, client: httpx.AsyncClient):
        """Test GET /api/ - Health check endpoint"""
        try:
            response = await client.get(f"{API_BASE}/")
            
            if response.status_code == 200:
                data = response.json()
                if "NutriScan API" in data.get("message", ""):
                    self.log_result("Health Check", True, f"Status: {response.status_code}, Message: {data['message']}")
                    return True
                else:
                    self.log_result("Health Check", False, f"Unexpected message: {data}")
                    return False
            else:
                self.log_result("Health Check", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Health Check", False, f"Exception: {str(e)}")
            return False
            
    async def test_product_endpoint(self, client: httpx.AsyncClient):
        """Test GET /api/product/{barcode} endpoint"""
        test_cases = [
            {
                'barcode': '3017620422003', 
                'name': 'Nutella Test',
                'expected_low_score': True,  # Nutella should have low health score
                'should_exist': True
            },
            {
                'barcode': '5000112637922', 
                'name': 'Coca-Cola Test',
                'expected_low_score': True,  # Coca-Cola should have low health score
                'should_exist': True
            },
            {
                'barcode': '0000000000000', 
                'name': 'Non-existent Product Test',
                'should_exist': False
            }
        ]
        
        all_passed = True
        
        for test_case in test_cases:
            try:
                barcode = test_case['barcode']
                response = await client.get(f"{API_BASE}/product/{barcode}")
                
                if response.status_code != 200:
                    self.log_result(f"Product API - {test_case['name']}", False, 
                                  f"Status: {response.status_code}")
                    all_passed = False
                    continue
                
                data = response.json()
                
                # Check required fields
                required_fields = ['barcode', 'name', 'brand', 'health_score', 'nutri_score', 
                                 'nova_group', 'additives', 'nutrients', 'pro_tip', 'found']
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_result(f"Product API - {test_case['name']}", False, 
                                  f"Missing fields: {missing_fields}")
                    all_passed = False
                    continue
                
                # Check if product existence matches expectation
                if data['found'] != test_case['should_exist']:
                    self.log_result(f"Product API - {test_case['name']}", False, 
                                  f"Expected found={test_case['should_exist']}, got {data['found']}")
                    all_passed = False
                    continue
                
                if test_case['should_exist']:
                    # Check health score is valid (0-100)
                    health_score = data['health_score']
                    if not (0 <= health_score <= 100):
                        self.log_result(f"Product API - {test_case['name']}", False, 
                                      f"Invalid health score: {health_score}")
                        all_passed = False
                        continue
                    
                    # Check if expected low score products actually have low scores
                    if test_case.get('expected_low_score') and health_score > 60:
                        self.log_result(f"Product API - {test_case['name']}", False, 
                                      f"Expected low health score but got {health_score}")
                        all_passed = False
                        continue
                    
                    details = f"Health Score: {health_score}, Nutri-Score: {data['nutri_score']}, NOVA: {data['nova_group']}"
                    self.log_result(f"Product API - {test_case['name']}", True, details)
                else:
                    # Non-existent product
                    self.log_result(f"Product API - {test_case['name']}", True, 
                                  f"Correctly returned found=False")
                    
            except Exception as e:
                self.log_result(f"Product API - {test_case['name']}", False, f"Exception: {str(e)}")
                all_passed = False
                
        return all_passed
        
    async def test_history_endpoints(self, client: httpx.AsyncClient):
        """Test POST /api/history, GET /api/history, DELETE /api/history"""
        
        # First clear any existing history
        try:
            await client.delete(f"{API_BASE}/history")
        except:
            pass  # Ignore if it fails
            
        all_passed = True
        
        # Test POST /api/history - Save scan
        try:
            scan_data = {
                "barcode": "3017620422003",
                "product_name": "Nutella Hazelnut Spread",
                "brand": "Ferrero",
                "image_url": "https://example.com/nutella.jpg",
                "health_score": 37,
                "nutri_score": "E"
            }
            
            response = await client.post(f"{API_BASE}/history", json=scan_data)
            
            if response.status_code != 200:
                self.log_result("History POST", False, f"Status: {response.status_code}")
                all_passed = False
            else:
                data = response.json()
                required_fields = ['id', 'barcode', 'product_name', 'health_score', 'timestamp']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("History POST", False, f"Missing fields: {missing_fields}")
                    all_passed = False
                else:
                    self.log_result("History POST", True, f"Saved scan with ID: {data['id']}")
                    
        except Exception as e:
            self.log_result("History POST", False, f"Exception: {str(e)}")
            all_passed = False
            
        # Test GET /api/history - Get scan history
        try:
            response = await client.get(f"{API_BASE}/history")
            
            if response.status_code != 200:
                self.log_result("History GET", False, f"Status: {response.status_code}")
                all_passed = False
            else:
                data = response.json()
                if isinstance(data, list):
                    if len(data) >= 1:
                        # Check first item structure
                        first_scan = data[0]
                        required_fields = ['id', 'barcode', 'product_name', 'health_score']
                        missing_fields = [field for field in required_fields if field not in first_scan]
                        
                        if missing_fields:
                            self.log_result("History GET", False, f"Missing fields in scan: {missing_fields}")
                            all_passed = False
                        else:
                            self.log_result("History GET", True, f"Retrieved {len(data)} scan(s)")
                    else:
                        self.log_result("History GET", True, "Retrieved empty history list")
                else:
                    self.log_result("History GET", False, f"Expected list, got: {type(data)}")
                    all_passed = False
                    
        except Exception as e:
            self.log_result("History GET", False, f"Exception: {str(e)}")
            all_passed = False
            
        # Test DELETE /api/history - Clear history
        try:
            response = await client.delete(f"{API_BASE}/history")
            
            if response.status_code != 200:
                self.log_result("History DELETE", False, f"Status: {response.status_code}")
                all_passed = False
            else:
                data = response.json()
                if "message" in data and ("cleared" in data["message"].lower() or "effacé" in data["message"].lower()):
                    self.log_result("History DELETE", True, f"Response: {data['message']}")
                else:
                    self.log_result("History DELETE", False, f"Unexpected response: {data}")
                    all_passed = False
                    
        except Exception as e:
            self.log_result("History DELETE", False, f"Exception: {str(e)}")
            all_passed = False
            
        # Verify history is actually cleared
        try:
            response = await client.get(f"{API_BASE}/history")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) == 0:
                    self.log_result("History Verify Clear", True, "History successfully cleared")
                else:
                    self.log_result("History Verify Clear", False, f"History not cleared: {len(data)} items remain")
                    all_passed = False
            else:
                self.log_result("History Verify Clear", False, f"Could not verify clear: {response.status_code}")
                all_passed = False
        except Exception as e:
            self.log_result("History Verify Clear", False, f"Exception: {str(e)}")
            all_passed = False
            
        return all_passed
        
    async def test_alternatives_endpoint(self, client: httpx.AsyncClient):
        """Test GET /api/alternatives/{barcode}"""
        try:
            # Test with Nutella barcode
            barcode = "3017620422003"
            response = await client.get(f"{API_BASE}/alternatives/{barcode}")
            
            if response.status_code != 200:
                self.log_result("Alternatives API", False, f"Status: {response.status_code}")
                return False
                
            data = response.json()
            
            if not isinstance(data, list):
                self.log_result("Alternatives API", False, f"Expected list, got: {type(data)}")
                return False
                
            # Check structure of alternatives if any exist
            if len(data) > 0:
                first_alt = data[0]
                required_fields = ['barcode', 'name', 'brand', 'health_score', 'nutri_score']
                missing_fields = [field for field in required_fields if field not in first_alt]
                
                if missing_fields:
                    self.log_result("Alternatives API", False, f"Missing fields: {missing_fields}")
                    return False
                    
                self.log_result("Alternatives API", True, f"Found {len(data)} alternative(s)")
            else:
                self.log_result("Alternatives API", True, "No alternatives found (acceptable)")
                
            return True
            
        except Exception as e:
            self.log_result("Alternatives API", False, f"Exception: {str(e)}")
            return False
            
    async def test_healing_foods_endpoint(self, client: httpx.AsyncClient):
        """Test GET /api/healing-foods"""
        try:
            response = await client.get(f"{API_BASE}/healing-foods")
            
            if response.status_code != 200:
                self.log_result("Healing Foods API", False, f"Status: {response.status_code}")
                return False
                
            data = response.json()
            
            if not isinstance(data, list):
                self.log_result("Healing Foods API", False, f"Expected list, got: {type(data)}")
                return False
                
            if len(data) == 0:
                self.log_result("Healing Foods API", False, "No healing foods returned")
                return False
            
            # Check structure of first healing food
            first_food = data[0]
            required_fields = ['name', 'benefits', 'conditions', 'source', 'image']
            missing_fields = [field for field in required_fields if field not in first_food]
            
            if missing_fields:
                self.log_result("Healing Foods API", False, f"Missing fields: {missing_fields}")
                return False
                
            self.log_result("Healing Foods API", True, f"Retrieved {len(data)} healing foods")
            return True
            
        except Exception as e:
            self.log_result("Healing Foods API", False, f"Exception: {str(e)}")
            return False
            
    async def test_additive_endpoint(self, client: httpx.AsyncClient):
        """Test GET /api/additive/{code}"""
        try:
            # Test with E250 (Nitrite de sodium) as specified in requirements
            response = await client.get(f"{API_BASE}/additive/e250")
            
            if response.status_code != 200:
                self.log_result("Additive API", False, f"Status: {response.status_code}")
                return False
                
            data = response.json()
            
            # Check required fields for additive info
            required_fields = ['code', 'name', 'risk', 'description', 'details', 'sources', 'daily_limit']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result("Additive API", False, f"Missing fields: {missing_fields}")
                return False
                
            # Check if the additive is E250 (Nitrite de sodium)
            if data['code'] != 'E250':
                self.log_result("Additive API", False, f"Expected E250, got {data['code']}")
                return False
                
            self.log_result("Additive API", True, f"Retrieved additive info for {data['code']}: {data['name']}")
            return True
            
        except Exception as e:
            self.log_result("Additive API", False, f"Exception: {str(e)}")
            return False
    
    async def test_search_endpoint(self, client: httpx.AsyncClient):
        """Test GET /api/search endpoint"""
        try:
            # Test search with 'chocolat' as specified in requirements
            response = await client.get(f"{API_BASE}/search", params={'q': 'chocolat'})
            
            if response.status_code != 200:
                self.log_result("Search API", False, f"Status: {response.status_code}")
                return False
                
            data = response.json()
            
            # Check response structure
            required_fields = ['products', 'count', 'page', 'page_size']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_result("Search API", False, f"Missing fields: {missing_fields}")
                return False
                
            products = data['products']
            if not isinstance(products, list):
                self.log_result("Search API", False, f"Products should be list, got: {type(products)}")
                return False
            
            # If products found, check structure
            if len(products) > 0:
                first_product = products[0]
                product_required_fields = ['barcode', 'name', 'brand', 'image_url', 'health_score', 'nutri_score']
                missing_product_fields = [field for field in product_required_fields if field not in first_product]
                
                if missing_product_fields:
                    self.log_result("Search API", False, f"Missing product fields: {missing_product_fields}")
                    return False
                    
            self.log_result("Search API", True, f"Search returned {len(products)} products for 'chocolat'")
            return True
            
        except Exception as e:
            self.log_result("Search API", False, f"Exception: {str(e)}")
            return False
    
    async def test_auth_endpoints(self, client: httpx.AsyncClient):
        """Test authentication endpoints - register and login"""
        all_passed = True
        
        # Test user registration
        try:
            register_data = {
                "email": "test@example.com",
                "password": "password123",
                "name": "Test User"
            }
            
            # First try to clear any existing user (ignore errors)
            try:
                login_response = await client.post(f"{API_BASE}/auth/login", json={
                    "email": "test@example.com",
                    "password": "password123"
                })
                # If login succeeds, user already exists, which is fine for testing
                if login_response.status_code == 200:
                    self.log_result("Auth Register", True, "User already exists, proceeding with login test")
                else:
                    # Try registration
                    response = await client.post(f"{API_BASE}/auth/register", json=register_data)
                    
                    if response.status_code != 200:
                        # Check if it's because email already exists
                        error_data = response.json()
                        if "déjà utilisé" in error_data.get('detail', ''):
                            self.log_result("Auth Register", True, "Email already exists (expected)")
                        else:
                            self.log_result("Auth Register", False, f"Status: {response.status_code}, Detail: {error_data}")
                            all_passed = False
                    else:
                        data = response.json()
                        required_fields = ['token', 'user']
                        missing_fields = [field for field in required_fields if field not in data]
                        
                        if missing_fields:
                            self.log_result("Auth Register", False, f"Missing fields: {missing_fields}")
                            all_passed = False
                        else:
                            user_data = data['user']
                            if user_data.get('email') != register_data['email']:
                                self.log_result("Auth Register", False, f"Email mismatch: {user_data.get('email')} != {register_data['email']}")
                                all_passed = False
                            else:
                                self.log_result("Auth Register", True, f"User registered successfully: {user_data['name']}")
            except:
                # Try registration if login fails
                response = await client.post(f"{API_BASE}/auth/register", json=register_data)
                
                if response.status_code != 200:
                    error_data = response.json()
                    if "déjà utilisé" in error_data.get('detail', ''):
                        self.log_result("Auth Register", True, "Email already exists (expected)")
                    else:
                        self.log_result("Auth Register", False, f"Status: {response.status_code}, Detail: {error_data}")
                        all_passed = False
                else:
                    data = response.json()
                    self.log_result("Auth Register", True, f"User registered successfully: {data['user']['name']}")
                
        except Exception as e:
            self.log_result("Auth Register", False, f"Exception: {str(e)}")
            all_passed = False
            
        # Test user login
        try:
            login_data = {
                "email": "test@example.com",
                "password": "password123"
            }
            
            response = await client.post(f"{API_BASE}/auth/login", json=login_data)
            
            if response.status_code != 200:
                self.log_result("Auth Login", False, f"Status: {response.status_code}")
                all_passed = False
            else:
                data = response.json()
                required_fields = ['token', 'user']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Auth Login", False, f"Missing fields: {missing_fields}")
                    all_passed = False
                else:
                    user_data = data['user']
                    if user_data.get('email') != login_data['email']:
                        self.log_result("Auth Login", False, f"Email mismatch: {user_data.get('email')} != {login_data['email']}")
                        all_passed = False
                    else:
                        self.log_result("Auth Login", True, f"User logged in successfully: {user_data['name']}")
                        
        except Exception as e:
            self.log_result("Auth Login", False, f"Exception: {str(e)}")
            all_passed = False
            
        return all_passed
            
    async def run_all_tests(self):
        """Run all backend tests"""
        print(f"{Colors.BLUE}{Colors.BOLD}🧪 NutriScan Backend API Testing Suite{Colors.ENDC}")
        print(f"{Colors.BLUE}Testing Backend URL: {API_BASE}{Colors.ENDC}\n")
        
        timeout = httpx.Timeout(30.0)  # 30 second timeout
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            print(f"{Colors.YELLOW}🔍 Running Health Check...{Colors.ENDC}")
            await self.test_health_check(client)
            print()
            
            print(f"{Colors.YELLOW}🔍 Testing Product Endpoints...{Colors.ENDC}")
            await self.test_product_endpoint(client)
            print()
            
            print(f"{Colors.YELLOW}🔍 Testing History Endpoints...{Colors.ENDC}")
            await self.test_history_endpoints(client)
            print()
            
            print(f"{Colors.YELLOW}🔍 Testing Alternatives Endpoint...{Colors.ENDC}")
            await self.test_alternatives_endpoint(client)
            print()
            
            print(f"{Colors.YELLOW}🔍 Testing Healing Foods Endpoint...{Colors.ENDC}")
            await self.test_healing_foods_endpoint(client)
            print()
            
            print(f"{Colors.YELLOW}🔍 Testing Additive Info Endpoint...{Colors.ENDC}")
            await self.test_additive_endpoint(client)
            print()
            
            print(f"{Colors.YELLOW}🔍 Testing Search Endpoint...{Colors.ENDC}")
            await self.test_search_endpoint(client)
            print()
            
            print(f"{Colors.YELLOW}🔍 Testing Authentication Endpoints...{Colors.ENDC}")
            await self.test_auth_endpoints(client)
            print()
            
        # Print summary
        total_tests = self.passed_tests + self.failed_tests
        pass_rate = (self.passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"{Colors.BOLD}📊 Test Summary:{Colors.ENDC}")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {Colors.GREEN}{self.passed_tests}{Colors.ENDC}")
        print(f"Failed: {Colors.RED}{self.failed_tests}{Colors.ENDC}")
        print(f"Pass Rate: {pass_rate:.1f}%")
        
        if self.failed_tests > 0:
            print(f"\n{Colors.RED}❌ Some tests failed. Check the details above.{Colors.ENDC}")
            return False
        else:
            print(f"\n{Colors.GREEN}✅ All tests passed!{Colors.ENDC}")
            return True

async def main():
    """Main function to run tests"""
    tester = NutriScanTester()
    success = await tester.run_all_tests()
    
    # Return appropriate exit code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
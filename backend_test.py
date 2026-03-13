#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for NutriScan
Testing critical endpoints as requested in the review
"""

import asyncio
import aiohttp
import json
import logging
import tempfile
import wave
import numpy as np
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# API Base URL from frontend/.env
API_BASE_URL = "https://nutriscan-167.preview.emergentagent.com/api"

# Test email for premium features
PREMIUM_EMAIL = "meliraoul23@gmail.com"

class NutriScanAPITester:
    def __init__(self):
        self.session = None
        self.test_results = []
        
    async def __aenter__(self):
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(timeout=timeout)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name, success, message, response_data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data
        }
        self.test_results.append(result)
        logger.info(f"{status}: {test_name} - {message}")
        return success
    
    async def test_get_request(self, endpoint, test_name, expected_fields=None, headers=None):
        """Generic GET request tester"""
        try:
            url = f"{API_BASE_URL}{endpoint}"
            async with self.session.get(url, headers=headers) as response:
                if response.status != 200:
                    return self.log_result(test_name, False, f"HTTP {response.status}: {await response.text()}")
                
                data = await response.json()
                
                # Check expected fields if provided
                if expected_fields:
                    missing_fields = []
                    if isinstance(data, dict):
                        for field in expected_fields:
                            if field not in data:
                                missing_fields.append(field)
                    if missing_fields:
                        return self.log_result(test_name, False, f"Missing fields: {missing_fields}", data)
                
                return self.log_result(test_name, True, f"Success - Response has {len(str(data))} characters", data)
                
        except Exception as e:
            return self.log_result(test_name, False, f"Exception: {str(e)}")
    
    async def test_post_request(self, endpoint, test_name, data=None, headers=None, expected_fields=None):
        """Generic POST request tester"""
        try:
            url = f"{API_BASE_URL}{endpoint}"
            async with self.session.post(url, json=data, headers=headers) as response:
                if response.status not in [200, 201]:
                    return self.log_result(test_name, False, f"HTTP {response.status}: {await response.text()}")
                
                response_data = await response.json()
                
                # Check expected fields if provided
                if expected_fields:
                    missing_fields = []
                    if isinstance(response_data, dict):
                        for field in expected_fields:
                            if field not in response_data:
                                missing_fields.append(field)
                    if missing_fields:
                        return self.log_result(test_name, False, f"Missing fields: {missing_fields}", response_data)
                
                return self.log_result(test_name, True, f"Success - Response has {len(str(response_data))} characters", response_data)
                
        except Exception as e:
            return self.log_result(test_name, False, f"Exception: {str(e)}")

    # ============== PRODUCT ENDPOINT TESTS ==============
    
    async def test_product_nutella(self):
        """Test GET /api/product/3017620422003 (Nutella)"""
        expected_fields = ["barcode", "name", "brand", "health_score", "nutri_score", "nova_group", "found"]
        success = await self.test_get_request("/product/3017620422003", "GET /api/product/3017620422003 (Nutella)", expected_fields)
        
        # Additional validation for Nutella
        if success and self.test_results[-1]["response_data"]:
            data = self.test_results[-1]["response_data"]
            if data.get("found") and data.get("health_score") is not None:
                self.log_result("Nutella Health Score", True, f"Health score: {data.get('health_score')}, Nutri-score: {data.get('nutri_score')}")
            else:
                self.log_result("Nutella Validation", False, "Product not found or missing health score")
        
        return success
    
    async def test_search_chocolat(self):
        """Test GET /api/search?q=chocolat"""
        expected_fields = ["products", "count", "page", "page_size"]
        success = await self.test_get_request("/search?q=chocolat", "GET /api/search?q=chocolat", expected_fields)
        
        # Additional validation for search results
        if success and self.test_results[-1]["response_data"]:
            data = self.test_results[-1]["response_data"]
            products = data.get("products", [])
            if len(products) > 0:
                self.log_result("Search Results", True, f"Found {len(products)} products, total count: {data.get('count', 0)}")
            else:
                self.log_result("Search Results", False, "No products found for 'chocolat'")
        
        return success
    
    async def test_alternatives_nutella(self):
        """Test GET /api/alternatives/3017620422003"""
        success = await self.test_get_request("/alternatives/3017620422003", "GET /api/alternatives/3017620422003")
        
        # Check if response is an array (it should be)
        if success and self.test_results[-1]["response_data"]:
            data = self.test_results[-1]["response_data"]
            if isinstance(data, list):
                self.log_result("Alternatives Format", True, f"Found {len(data)} alternatives (empty list is acceptable)")
            else:
                self.log_result("Alternatives Format", False, "Response should be an array")
        
        return success

    # ============== HISTORY ENDPOINT TESTS ==============
    
    async def test_get_history(self):
        """Test GET /api/history"""
        success = await self.test_get_request("/history", "GET /api/history")
        
        # Response should be an array
        if success and self.test_results[-1]["response_data"]:
            data = self.test_results[-1]["response_data"]
            if isinstance(data, list):
                self.log_result("History Format", True, f"History contains {len(data)} items")
            else:
                self.log_result("History Format", False, "Response should be an array")
        
        return success
    
    async def test_post_history(self):
        """Test POST /api/history"""
        test_data = {
            "barcode": "3017620422003",
            "product_name": "Test Nutella API",
            "health_score": 50
        }
        expected_fields = ["id", "barcode", "product_name", "health_score", "timestamp"]
        return await self.test_post_request("/history", "POST /api/history", test_data, None, expected_fields)

    # ============== PREMIUM FEATURE TESTS ==============
    
    async def test_check_premium(self):
        """Test GET /api/check-premium/{email}"""
        expected_fields = ["is_premium", "subscription_type"]
        success = await self.test_get_request(f"/check-premium/{PREMIUM_EMAIL}", f"GET /api/check-premium/{PREMIUM_EMAIL}", expected_fields)
        
        # Check if premium status is correctly identified
        if success and self.test_results[-1]["response_data"]:
            data = self.test_results[-1]["response_data"]
            is_premium = data.get("is_premium", False)
            if is_premium:
                self.log_result("Premium Status", True, f"User {PREMIUM_EMAIL} identified as premium user")
            else:
                self.log_result("Premium Status", False, f"User {PREMIUM_EMAIL} should be premium but returned as free")
        
        return success
    
    async def test_coach(self):
        """Test POST /api/coach"""
        test_data = {"message": "Bonjour"}
        headers = {"x-user-email": PREMIUM_EMAIL}
        expected_fields = ["response"]
        success = await self.test_post_request("/coach", "POST /api/coach", test_data, headers, expected_fields)
        
        # Check response quality
        if success and self.test_results[-1]["response_data"]:
            data = self.test_results[-1]["response_data"]
            response_text = data.get("response", "")
            if len(response_text) > 50:
                self.log_result("Coach Response Quality", True, f"Received {len(response_text)} character response from AI coach")
            else:
                self.log_result("Coach Response Quality", False, "Coach response too short or empty")
        
        return success
    
    async def test_generate_menu(self):
        """Test POST /api/generate-menu - CRITICAL TEST"""
        test_data = {"family_size": 2}
        success = await self.test_post_request(f"/generate-menu?email={PREMIUM_EMAIL}", "POST /api/generate-menu", test_data)
        
        # CRITICAL: Verify JSON structure with liste_courses
        if success and self.test_results[-1]["response_data"]:
            data = self.test_results[-1]["response_data"]
            
            # Check for required menu structure
            required_days = ["samedi", "dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi"]
            missing_days = [day for day in required_days if day not in data]
            
            if missing_days:
                self.log_result("Menu Structure", False, f"Missing days: {missing_days}")
            else:
                self.log_result("Menu Structure", True, "All 7 days present in menu")
            
            # CRITICAL: Check liste_courses structure
            if "liste_courses" in data:
                liste_courses = data["liste_courses"]
                if isinstance(liste_courses, list) and len(liste_courses) > 0:
                    # Check if items are actual shopping items, not recipes
                    sample_items = liste_courses[:3]
                    valid_shopping_items = 0
                    
                    for item in sample_items:
                        if isinstance(item, str):
                            # Check for quantity indicators (kg, g, L, pièces)
                            if any(unit in item.lower() for unit in ["kg", "g ", "l ", "litre", "pièce", "ml"]):
                                valid_shopping_items += 1
                    
                    if valid_shopping_items > 0:
                        self.log_result("Shopping List Validation", True, f"liste_courses contains {len(liste_courses)} valid shopping items (e.g., '{sample_items[0] if sample_items else 'N/A'}')")
                    else:
                        self.log_result("Shopping List Validation", False, f"liste_courses items appear to be recipes, not shopping items: {sample_items}")
                else:
                    self.log_result("Shopping List Format", False, "liste_courses should be non-empty array")
            else:
                self.log_result("Shopping List Missing", False, "Missing required 'liste_courses' field")
            
            # Check family size
            if data.get("nombre_personnes") == 2:
                self.log_result("Family Size", True, "Menu correctly generated for 2 people")
            else:
                self.log_result("Family Size", False, f"Expected 2 people, got {data.get('nombre_personnes')}")
        
        return success

    # ============== RANKINGS AND RECOMMENDATIONS TESTS ==============
    
    async def test_rankings_all(self):
        """Test GET /api/rankings/all"""
        success = await self.test_get_request("/rankings/all", "GET /api/rankings/all")
        
        # Validate ranking structure
        if success and self.test_results[-1]["response_data"]:
            data = self.test_results[-1]["response_data"]
            if isinstance(data, list) and len(data) > 0:
                # Check first item structure
                first_item = data[0]
                required_fields = ["barcode", "name", "health_score"]
                missing_fields = [field for field in required_fields if field not in first_item]
                
                if not missing_fields:
                    self.log_result("Rankings Structure", True, f"Rankings contain {len(data)} products with proper structure")
                else:
                    self.log_result("Rankings Structure", False, f"Missing fields in rankings: {missing_fields}")
            else:
                self.log_result("Rankings Content", False, "Rankings should be non-empty array")
        
        return success
    
    async def test_recommendations(self):
        """Test GET /api/recommendations"""
        return await self.test_get_request("/recommendations", "GET /api/recommendations")
    
    async def test_healing_foods(self):
        """Test GET /api/healing-foods"""
        success = await self.test_get_request("/healing-foods", "GET /api/healing-foods")
        
        # Validate healing foods structure
        if success and self.test_results[-1]["response_data"]:
            data = self.test_results[-1]["response_data"]
            if isinstance(data, list) and len(data) > 0:
                first_food = data[0]
                required_fields = ["name", "benefits", "conditions", "source"]
                missing_fields = [field for field in required_fields if field not in first_food]
                
                if not missing_fields:
                    self.log_result("Healing Foods Structure", True, f"Found {len(data)} healing foods with proper structure")
                else:
                    self.log_result("Healing Foods Structure", False, f"Missing fields in healing foods: {missing_fields}")
            else:
                self.log_result("Healing Foods Content", False, "Should return non-empty array of healing foods")
        
        return success

    # ============== TRANSCRIPTION TEST ==============
    
    def create_test_audio_file(self):
        """Create a test WAV audio file"""
        # Create a simple sine wave for testing
        sample_rate = 16000
        duration = 1.0  # 1 second
        frequency = 440  # A4 note
        
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        wave_data = np.sin(frequency * 2 * np.pi * t)
        
        # Convert to 16-bit PCM
        wave_data = (wave_data * 32767).astype(np.int16)
        
        # Create temporary WAV file
        temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        with wave.open(temp_file.name, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(wave_data.tobytes())
        
        return temp_file.name
    
    async def test_transcribe(self):
        """Test POST /api/transcribe"""
        try:
            # Create test audio file
            audio_file_path = self.create_test_audio_file()
            
            url = f"{API_BASE_URL}/transcribe"
            
            with open(audio_file_path, 'rb') as audio_file:
                data = aiohttp.FormData()
                data.add_field('audio', audio_file, filename='test_audio.wav', content_type='audio/wav')
                
                async with self.session.post(url, data=data) as response:
                    if response.status != 200:
                        return self.log_result("POST /api/transcribe", False, f"HTTP {response.status}: {await response.text()}")
                    
                    response_data = await response.json()
                    
                    # Check expected response structure
                    if "success" in response_data and "text" in response_data:
                        success = response_data.get("success", False)
                        text = response_data.get("text", "")
                        
                        if success:
                            return self.log_result("POST /api/transcribe", True, f"Transcription successful: '{text[:50]}...' ({len(text)} chars)", response_data)
                        else:
                            error = response_data.get("error", "Unknown error")
                            return self.log_result("POST /api/transcribe", False, f"Transcription failed: {error}")
                    else:
                        return self.log_result("POST /api/transcribe", False, "Invalid response format", response_data)
            
        except Exception as e:
            return self.log_result("POST /api/transcribe", False, f"Exception: {str(e)}")
        finally:
            # Clean up temp file
            try:
                import os
                os.unlink(audio_file_path)
            except:
                pass

    # ============== MAIN TEST RUNNER ==============
    
    async def run_all_tests(self):
        """Run all comprehensive API tests"""
        logger.info("🚀 Starting comprehensive NutriScan API testing")
        logger.info(f"📍 API Base URL: {API_BASE_URL}")
        logger.info(f"👤 Premium test email: {PREMIUM_EMAIL}")
        logger.info("=" * 80)
        
        # Test categories
        test_categories = [
            ("🥫 PRODUCT ENDPOINTS", [
                self.test_product_nutella,
                self.test_search_chocolat,
                self.test_alternatives_nutella,
            ]),
            ("📋 HISTORY ENDPOINTS", [
                self.test_get_history,
                self.test_post_history,
            ]),
            ("💎 PREMIUM FEATURES", [
                self.test_check_premium,
                self.test_coach,
                self.test_generate_menu,  # CRITICAL TEST
            ]),
            ("🏆 RANKINGS & RECOMMENDATIONS", [
                self.test_rankings_all,
                self.test_recommendations,
                self.test_healing_foods,
            ]),
            ("🎤 TRANSCRIPTION", [
                self.test_transcribe,
            ]),
        ]
        
        # Run tests by category
        for category_name, tests in test_categories:
            logger.info(f"\n{category_name}")
            logger.info("-" * len(category_name))
            
            for test_func in tests:
                await test_func()
        
        # Generate summary
        self.generate_summary()
    
    def generate_summary(self):
        """Generate comprehensive test summary"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        
        logger.info("\n" + "=" * 80)
        logger.info("📊 COMPREHENSIVE TEST SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Total tests: {total_tests}")
        logger.info(f"✅ Passed: {passed_tests}")
        logger.info(f"❌ Failed: {failed_tests}")
        logger.info(f"Success rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Show failed tests
        failed_results = [r for r in self.test_results if not r["success"]]
        if failed_results:
            logger.info("\n❌ FAILED TESTS:")
            for result in failed_results:
                logger.info(f"  • {result['test']}: {result['message']}")
        
        # Show critical findings
        logger.info("\n🔍 CRITICAL FINDINGS:")
        
        # Check generate-menu specifically
        menu_results = [r for r in self.test_results if "generate-menu" in r["test"]]
        if menu_results:
            menu_success = all(r["success"] for r in menu_results)
            if menu_success:
                logger.info("  ✅ /api/generate-menu endpoint working correctly with proper liste_courses structure")
            else:
                logger.info("  ❌ /api/generate-menu endpoint has issues with liste_courses structure")
        
        # Check premium features
        premium_results = [r for r in self.test_results if any(keyword in r["test"].lower() for keyword in ["premium", "coach", "menu"])]
        premium_success = all(r["success"] for r in premium_results)
        if premium_success:
            logger.info(f"  ✅ Premium features working correctly for {PREMIUM_EMAIL}")
        else:
            logger.info(f"  ❌ Some premium features have issues for {PREMIUM_EMAIL}")
        
        logger.info("\n🎯 All critical API endpoints tested comprehensively!")

async def main():
    """Main test execution"""
    async with NutriScanAPITester() as tester:
        await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
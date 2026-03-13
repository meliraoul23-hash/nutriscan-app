#!/usr/bin/env python3
"""
NutriScan Voice Transcription Test
Testing specific endpoints as requested in review:
1. POST /api/transcribe - Voice transcription endpoint (CRITICAL)
2. GET /api/product/3017620422003 - Get Nutella product info
3. POST /api/coach - AI Coach endpoint (requires premium user)

Test credentials:
- Premium user email: meliraoul23@gmail.com
- Backend URL: https://nutriscan-167.preview.emergentagent.com/api
"""
import httpx
import json
import asyncio
from datetime import datetime
import sys
import os
import tempfile
import wave

# Backend URL from production
BACKEND_URL = "https://nutriscan-167.preview.emergentagent.com/api"

# Test credentials
PREMIUM_USER_EMAIL = "meliraoul23@gmail.com"
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
        print("NUTRISCAN VOICE TRANSCRIPTION TEST RESULTS")
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
                print(f"   Details: {json.dumps(result['details'], indent=2) if isinstance(result['details'], dict) else str(result['details'])}")
            print()
            
        if self.errors:
            print("ERRORS:")
            print("-" * 80)
            for error in self.errors:
                print(f"❌ {error['endpoint']}: {error['error']}")
            print()

def create_test_audio_file():
    """Create a minimal test audio file for transcription testing"""
    try:
        # Create a simple WAV file with silence (minimal valid audio)
        temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        
        # WAV file parameters
        sample_rate = 16000
        duration = 1  # 1 second
        amplitude = 0  # Silence
        
        # Generate silent audio data
        samples = [amplitude] * (sample_rate * duration)
        
        # Create WAV file
        with wave.open(temp_file.name, 'w') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            
            # Convert samples to bytes
            import struct
            wav_data = b''.join(struct.pack('<h', int(sample * 32767)) for sample in samples)
            wav_file.writeframes(wav_data)
        
        return temp_file.name
    except Exception as e:
        print(f"Error creating test audio file: {e}")
        return None

async def test_voice_transcription(client, results):
    """Test POST /api/transcribe - Voice transcription endpoint (CRITICAL)"""
    print("Testing Voice Transcription Endpoint...")
    
    # Create a test audio file
    audio_file_path = create_test_audio_file()
    
    if not audio_file_path:
        results.add_error("POST /api/transcribe", "Failed to create test audio file")
        return
    
    try:
        # Test with valid audio file
        with open(audio_file_path, 'rb') as audio_file:
            files = {"audio": ("test_audio.wav", audio_file, "audio/wav")}
            response = await client.post(f"{BACKEND_URL}/transcribe", files=files)
            
        print(f"Transcription response status: {response.status_code}")
        print(f"Transcription response text: {response.text[:500]}...")
        
        if response.status_code == 200:
            data = response.json()
            success = data.get('success', False)
            text = data.get('text', '')
            error = data.get('error', '')
            
            # Check response format
            expected_keys = {'success'}
            if success:
                expected_keys.add('text')
            else:
                expected_keys.add('error')
                
            if all(key in data for key in expected_keys):
                results.add_result(
                    "POST /api/transcribe",
                    "PASS",
                    f"Transcription endpoint working. Success: {success}, Text length: {len(text)}, Error: {error}",
                    data
                )
            else:
                results.add_result(
                    "POST /api/transcribe",
                    "FAIL",
                    f"Response missing required keys. Expected keys: {expected_keys}, Got: {list(data.keys())}",
                    data
                )
        else:
            results.add_result(
                "POST /api/transcribe",
                "FAIL",
                f"HTTP {response.status_code}: {response.text[:200]}",
                {"status_code": response.status_code, "response": response.text[:500]}
            )
            
    except Exception as e:
        results.add_error("POST /api/transcribe", str(e))
    finally:
        # Clean up test file
        if audio_file_path and os.path.exists(audio_file_path):
            try:
                os.unlink(audio_file_path)
            except:
                pass

async def test_product_info(client, results):
    """Test GET /api/product/3017620422003 - Get Nutella product info"""
    print("Testing Product Info Endpoint...")
    
    try:
        response = await client.get(f"{BACKEND_URL}/product/{NUTELLA_BARCODE}")
        print(f"Product info response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields for product data
            required_fields = ['barcode', 'name', 'health_score', 'found']
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                health_score = data.get('health_score', 0)
                product_name = data.get('name', '')
                found = data.get('found', False)
                
                results.add_result(
                    f"GET /api/product/{NUTELLA_BARCODE}",
                    "PASS",
                    f"Product info retrieved. Name: '{product_name}', Health Score: {health_score}, Found: {found}",
                    {
                        "name": product_name,
                        "health_score": health_score,
                        "found": found,
                        "barcode": data.get('barcode')
                    }
                )
            else:
                results.add_result(
                    f"GET /api/product/{NUTELLA_BARCODE}",
                    "FAIL",
                    f"Missing required fields: {missing_fields}",
                    data
                )
        else:
            results.add_result(
                f"GET /api/product/{NUTELLA_BARCODE}",
                "FAIL",
                f"HTTP {response.status_code}: {response.text[:200]}",
                {"status_code": response.status_code}
            )
            
    except Exception as e:
        results.add_error(f"GET /api/product/{NUTELLA_BARCODE}", str(e))

async def test_ai_coach(client, results):
    """Test POST /api/coach - AI Coach endpoint (requires premium user)"""
    print("Testing AI Coach Endpoint...")
    
    try:
        headers = {"x-user-email": PREMIUM_USER_EMAIL}
        payload = {"message": "Bonjour coach"}
        
        response = await client.post(
            f"{BACKEND_URL}/coach",
            headers=headers,
            json=payload
        )
        
        print(f"AI Coach response status: {response.status_code}")
        print(f"AI Coach response text length: {len(response.text)}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check for coach response
            if 'response' in data:
                coach_response = data['response']
                response_length = len(coach_response)
                
                results.add_result(
                    "POST /api/coach",
                    "PASS",
                    f"AI Coach responded successfully. Response length: {response_length} characters",
                    {
                        "response_length": response_length,
                        "response_preview": coach_response[:100] + "..." if len(coach_response) > 100 else coach_response
                    }
                )
            else:
                results.add_result(
                    "POST /api/coach",
                    "FAIL",
                    "Response missing 'response' field",
                    data
                )
        elif response.status_code == 403:
            results.add_result(
                "POST /api/coach",
                "FAIL",
                "Access forbidden - user not premium or authentication failed",
                {"status_code": response.status_code, "response": response.text}
            )
        else:
            results.add_result(
                "POST /api/coach",
                "FAIL",
                f"HTTP {response.status_code}: {response.text[:200]}",
                {"status_code": response.status_code}
            )
            
    except Exception as e:
        results.add_error("POST /api/coach", str(e))

async def main():
    """Run all voice transcription and verification tests"""
    print("Starting NutriScan Voice Transcription Tests...")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Premium user email: {PREMIUM_USER_EMAIL}")
    print("-" * 80)
    
    results = TestResults()
    
    # Create HTTP client with timeout
    timeout = httpx.Timeout(120.0, connect=30.0)
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        # Test critical voice transcription endpoint
        await test_voice_transcription(client, results)
        
        # Test verification endpoints
        await test_product_info(client, results)
        await test_ai_coach(client, results)
    
    # Print results
    results.print_summary()
    
    # Return exit code based on results
    failed_tests = sum(1 for r in results.results if r['status'] == 'FAIL')
    return 0 if failed_tests == 0 and len(results.errors) == 0 else 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        sys.exit(1)
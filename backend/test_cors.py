"""Test CORS configuration"""
import requests

# Test from different localhost ports
ports = [5173, 5174, 5175, 5176, 3000]

for port in ports:
    origin = f"http://localhost:{port}"
    print(f"\nTesting from {origin}:")
    
    try:
        response = requests.post(
            "http://localhost:8000/api/auth/login",
            json={"email": "admin@civicfix.example", "password": "admin123"},
            headers={"Origin": origin}
        )
        
        # Check if CORS headers are present
        cors_header = response.headers.get('Access-Control-Allow-Origin', 'NOT SET')
        print(f"  Status: {response.status_code}")
        print(f"  CORS Header: {cors_header}")
        
        if response.status_code == 200:
            print(f"  ✅ SUCCESS - Login works from {origin}")
        else:
            print(f"  ❌ FAILED - Status {response.status_code}")
            
    except Exception as e:
        print(f"  ❌ ERROR: {e}")

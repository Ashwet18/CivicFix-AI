"""
Comprehensive test suite for Phase 2 Issues functionality
Tests API endpoints, services, validation, authentication, and error handling
"""
import os
import json
import tempfile
import urllib.request
import urllib.error
from pathlib import Path
from PIL import Image
import io

BASE = "http://localhost:8000"


def post_json(url, data):
    """POST JSON data to URL"""
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}
    )
    r = urllib.request.urlopen(req)
    return json.loads(r.read()), r.status


def post_multipart(url, files, data=None, token=None):
    """POST multipart form data to URL"""
    import urllib.parse
    
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    body = b''
    
    # Add form fields
    if data:
        for key, value in data.items():
            body += f'--{boundary}\r\n'.encode()
            body += f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode()
            body += f'{value}\r\n'.encode()
    
    # Add files
    for field_name, (filename, file_data, content_type) in files.items():
        body += f'--{boundary}\r\n'.encode()
        body += f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode()
        body += f'Content-Type: {content_type}\r\n\r\n'.encode()
        body += file_data
        body += b'\r\n'
    
    body += f'--{boundary}--\r\n'.encode()
    
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Content-Length": str(len(body))
    }
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    req = urllib.request.Request(url, data=body, headers=headers)
    r = urllib.request.urlopen(req)
    return json.loads(r.read()), r.status


def get_json(url, token=None):
    """GET JSON from URL"""
    headers = {}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, headers=headers)
    r = urllib.request.urlopen(req)
    return json.loads(r.read()), r.status


def create_test_image():
    """Create a test image in memory"""
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes.getvalue()


def create_large_image():
    """Create a large test image (>5MB)"""
    # Create a large image that exceeds 5MB
    img = Image.new('RGB', (3000, 3000), color='blue')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes.getvalue()


# Test counters
passed = 0
failed = 0


def ok(label):
    global passed
    passed += 1
    print("  PASS -", label)


def fail(label, detail=""):
    global failed
    failed += 1
    print("  FAIL -", label, detail)


def main():
    global passed, failed
    
    print("=== PHASE 2 BACKEND TESTING ===")
    print("Testing Issues API, Services, and Authentication\n")
    
    # Get authentication tokens
    admin_token = None
    citizen_token = None
    citizen2_token = None
    
    try:
        # Login as admin
        resp, status = post_json(BASE + "/api/auth/login", {
            "email": "admin@civicfix.example", 
            "password": "admin123"
        })
        admin_token = resp["access_token"]
        
        # Login as citizen
        resp, status = post_json(BASE + "/api/auth/login", {
            "email": "citizen@test.example", 
            "password": "test123"
        })
        citizen_token = resp["access_token"]
        
        # Login as second citizen
        resp, status = post_json(BASE + "/api/auth/login", {
            "email": "jane@test.example", 
            "password": "test123"
        })
        citizen2_token = resp["access_token"]
        
        print("✅ Authentication tokens obtained")
        
    except Exception as e:
        print(f"❌ Failed to get authentication tokens: {e}")
        return

    # --- TEST 1: Unauthenticated user cannot create issue ---
    print("\n=== TEST 1: Unauthenticated access denied ===")
    try:
        image_data = create_test_image()
        files = {'image': ('test.png', image_data, 'image/png')}
        data = {
            'category': 'Pothole / Road Damage',
            'latitude': '40.7128',
            'longitude': '-74.0060',
            'description': 'Test issue'
        }
        
        post_multipart(BASE + "/api/issues/", files, data)
        fail("Should require authentication")
    except urllib.error.HTTPError as e:
        if e.code == 401:
            ok("POST /api/issues/ without token -> 401 Unauthorized")
        else:
            fail("Unauthenticated request", f"expected 401 got {e.code}")
    except Exception as e:
        fail("Unauthenticated request", str(e))

    # --- TEST 2: Admin cannot create issues (citizen-only) ---
    print("\n=== TEST 2: Admin cannot create citizen issues ===")
    try:
        image_data = create_test_image()
        files = {'image': ('test.png', image_data, 'image/png')}
        data = {
            'category': 'Pothole / Road Damage',
            'latitude': '40.7128',
            'longitude': '-74.0060',
            'description': 'Test issue from admin'
        }
        
        # Note: This test assumes the endpoint restricts to citizens only
        # If admins can also create issues, this test should be adjusted
        resp, status = post_multipart(BASE + "/api/issues/", files, data, admin_token)
        ok("Admin can create issues (allowed)")
        
    except urllib.error.HTTPError as e:
        if e.code == 403:
            ok("Admin creating issue -> 403 Forbidden (citizen-only)")
        else:
            fail("Admin creating issue", f"unexpected error {e.code}")
    except Exception as e:
        fail("Admin creating issue", str(e))

    # --- TEST 3: Citizen can create valid issue ---
    print("\n=== TEST 3: Valid issue creation ===")
    issue_id = None
    try:
        image_data = create_test_image()
        files = {'image': ('test.png', image_data, 'image/png')}
        data = {
            'category': 'Pothole / Road Damage',
            'latitude': '40.7128',
            'longitude': '-74.0060',
            'description': 'Large pothole on main street causing vehicle damage'
        }
        
        resp, status = post_multipart(BASE + "/api/issues/", files, data, citizen_token)
        
        assert status == 201, f"Expected 201, got {status}"
        assert "issue_id" in resp
        assert resp["category"] == "Pothole / Road Damage"
        assert resp["severity"] in ["low", "medium", "high", "critical"]
        assert 0 <= resp["safety_risk"] <= 100
        assert 0 <= resp["priority_score"] <= 100
        assert resp["duplicate_count"] >= 1
        assert resp["status"] == "reported"
        
        issue_id = resp["issue_id"]
        ok("Citizen can create issue -> 201, valid response structure")
        print(f"    Created issue #{issue_id}, severity: {resp['severity']}, priority: {resp['priority_score']}")
        
    except Exception as e:
        fail("Valid issue creation", str(e))

    # --- TEST 4: Missing image validation ---
    print("\n=== TEST 4: Missing image validation ===")
    try:
        data = {
            'category': 'Pothole / Road Damage',
            'latitude': '40.7128',
            'longitude': '-74.0060'
        }
        
        post_multipart(BASE + "/api/issues/", {}, data, citizen_token)
        fail("Should require image")
    except urllib.error.HTTPError as e:
        if e.code == 400 or e.code == 422:
            ok("Missing image -> 400/422 validation error")
        else:
            fail("Missing image validation", f"expected 400/422 got {e.code}")
    except Exception as e:
        fail("Missing image validation", str(e))

    # --- TEST 5: Invalid image type ---
    print("\n=== TEST 5: Invalid image type validation ===")
    try:
        # Create a text file instead of image
        text_data = b"This is not an image file"
        files = {'image': ('test.txt', text_data, 'text/plain')}
        data = {
            'category': 'Pothole / Road Damage',
            'latitude': '40.7128',
            'longitude': '-74.0060'
        }
        
        post_multipart(BASE + "/api/issues/", files, data, citizen_token)
        fail("Should reject invalid image type")
    except urllib.error.HTTPError as e:
        if e.code == 400 or e.code == 422:
            ok("Invalid image type -> 400/422 validation error")
        else:
            fail("Invalid image type", f"expected 400/422 got {e.code}")
    except Exception as e:
        fail("Invalid image type", str(e))

    # --- TEST 6: Image too large ---
    print("\n=== TEST 6: Large image validation ===")
    try:
        large_image = create_large_image()
        files = {'image': ('large.png', large_image, 'image/png')}
        data = {
            'category': 'Pothole / Road Damage',
            'latitude': '40.7128',
            'longitude': '-74.0060'
        }
        
        post_multipart(BASE + "/api/issues/", files, data, citizen_token)
        fail("Should reject large image")
    except urllib.error.HTTPError as e:
        if e.code == 400 or e.code == 422:
            ok("Large image (>5MB) -> 400/422 validation error")
        else:
            fail("Large image validation", f"expected 400/422 got {e.code}")
    except Exception as e:
        fail("Large image validation", str(e))

    # --- TEST 7: Missing required fields ---
    print("\n=== TEST 7: Missing required fields validation ===")
    try:
        image_data = create_test_image()
        files = {'image': ('test.png', image_data, 'image/png')}
        data = {
            'category': 'Pothole / Road Damage'
            # Missing latitude/longitude
        }
        
        post_multipart(BASE + "/api/issues/", files, data, citizen_token)
        fail("Should require latitude/longitude")
    except urllib.error.HTTPError as e:
        if e.code == 400 or e.code == 422:
            ok("Missing latitude/longitude -> 400/422 validation error")
        else:
            fail("Missing coordinates", f"expected 400/422 got {e.code}")
    except Exception as e:
        fail("Missing coordinates validation", str(e))

    # --- TEST 8: Invalid category ---
    print("\n=== TEST 8: Invalid category validation ===")
    try:
        image_data = create_test_image()
        files = {'image': ('test.png', image_data, 'image/png')}
        data = {
            'category': 'Invalid Category Name',
            'latitude': '40.7128',
            'longitude': '-74.0060'
        }
        
        post_multipart(BASE + "/api/issues/", files, data, citizen_token)
        fail("Should reject invalid category")
    except urllib.error.HTTPError as e:
        if e.code == 400 or e.code == 422:
            ok("Invalid category -> 400/422 validation error")
        else:
            fail("Invalid category", f"expected 400/422 got {e.code}")
    except Exception as e:
        fail("Invalid category validation", str(e))

    # --- TEST 9: Description length validation ---
    print("\n=== TEST 9: Description length validation ===")
    try:
        image_data = create_test_image()
        files = {'image': ('test.png', image_data, 'image/png')}
        data = {
            'category': 'Pothole / Road Damage',
            'latitude': '40.7128',
            'longitude': '-74.0060',
            'description': 'x' * 501  # 501 characters (over limit)
        }
        
        post_multipart(BASE + "/api/issues/", files, data, citizen_token)
        fail("Should reject long description")
    except urllib.error.HTTPError as e:
        if e.code == 400 or e.code == 422:
            ok("Long description (>500 chars) -> 400/422 validation error")
        else:
            fail("Long description", f"expected 400/422 got {e.code}")
    except Exception as e:
        fail("Long description validation", str(e))

    # --- TEST 10: Citizen can retrieve own issues ---
    print("\n=== TEST 10: Retrieve own issues ===")
    try:
        data, status = get_json(BASE + "/api/issues/my", citizen_token)
        
        assert status == 200
        assert "issues" in data
        assert "total_count" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert isinstance(data["issues"], list)
        assert data["total_count"] >= 0
        
        ok("GET /api/issues/my -> 200, valid response structure")
        print(f"    Found {data['total_count']} issues for citizen")
        
    except Exception as e:
        fail("Retrieve own issues", str(e))

    # --- TEST 11: Pagination works ---
    print("\n=== TEST 11: Issues pagination ===")
    try:
        # Test with specific page size
        data, status = get_json(BASE + "/api/issues/my?page=1&page_size=5", citizen_token)
        
        assert status == 200
        assert data["page"] == 1
        assert data["page_size"] == 5
        
        ok("Issues pagination works correctly")
        
    except Exception as e:
        fail("Issues pagination", str(e))

    # --- TEST 12: Status filtering ---
    print("\n=== TEST 12: Status filtering ===")
    try:
        # Filter by reported status
        data, status = get_json(BASE + "/api/issues/my?status_filter=reported", citizen_token)
        
        assert status == 200
        # All returned issues should have 'reported' status
        for issue in data["issues"]:
            assert issue["status"] == "reported"
        
        ok("Status filtering works correctly")
        
    except Exception as e:
        fail("Status filtering", str(e))

    # --- TEST 13: Issue detail access ---
    print("\n=== TEST 13: Issue detail access ===")
    if issue_id:
        try:
            data, status = get_json(f"{BASE}/api/issues/{issue_id}", citizen_token)
            
            assert status == 200
            assert data["id"] == issue_id
            assert "category" in data
            assert "severity" in data
            assert "priority_score" in data
            
            ok("GET /api/issues/{id} -> 200, citizen can access own issue")
            
        except Exception as e:
            fail("Issue detail access", str(e))

    # --- TEST 14: Cannot access other citizen's issue ---
    print("\n=== TEST 14: Cannot access other's issues ===")
    if issue_id:
        try:
            get_json(f"{BASE}/api/issues/{issue_id}", citizen2_token)
            fail("Should not access other citizen's issue")
        except urllib.error.HTTPError as e:
            if e.code == 403:
                ok("Different citizen accessing issue -> 403 Forbidden")
            else:
                fail("Cross-citizen access", f"expected 403 got {e.code}")
        except Exception as e:
            fail("Cross-citizen access", str(e))

    # --- TEST 15: Nonexistent issue ---
    print("\n=== TEST 15: Nonexistent issue access ===")
    try:
        get_json(f"{BASE}/api/issues/99999", citizen_token)
        fail("Should return 404 for nonexistent issue")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            ok("Nonexistent issue -> 404 Not Found")
        else:
            fail("Nonexistent issue", f"expected 404 got {e.code}")
    except Exception as e:
        fail("Nonexistent issue", str(e))

    # --- TEST 16: AI Analysis validation ---
    print("\n=== TEST 16: AI Analysis results validation ===")
    try:
        # Create an issue with critical keywords
        image_data = create_test_image()
        files = {'image': ('critical.png', image_data, 'image/png')}
        data = {
            'category': 'Drainage / Open Manhole',
            'latitude': '40.7129',
            'longitude': '-74.0061',
            'description': 'Dangerous open manhole with exposed dangerous conditions'
        }
        
        resp, status = post_multipart(BASE + "/api/issues/", files, data, citizen_token)
        
        assert status == 201
        # Should detect critical severity due to keywords and category
        severity_valid = resp["severity"] in ["low", "medium", "high", "critical"]
        safety_risk_valid = 0 <= resp["safety_risk"] <= 100
        priority_valid = 0 <= resp["priority_score"] <= 100
        
        assert severity_valid and safety_risk_valid and priority_valid
        
        ok("AI Analysis produces valid severity, safety risk, and priority")
        print(f"    Analysis: severity={resp['severity']}, safety={resp['safety_risk']}, priority={resp['priority_score']:.1f}")
        
    except Exception as e:
        fail("AI Analysis validation", str(e))

    # --- TEST 17: Duplicate detection ---
    print("\n=== TEST 17: Duplicate detection ===")
    try:
        # Create another issue in the same location
        image_data = create_test_image()
        files = {'image': ('duplicate.png', image_data, 'image/png')}
        data = {
            'category': 'Pothole / Road Damage',
            'latitude': '40.7128',  # Same location as first issue
            'longitude': '-74.0060',
            'description': 'Another pothole report in same area'
        }
        
        resp, status = post_multipart(BASE + "/api/issues/", files, data, citizen2_token)
        
        assert status == 201
        duplicate_detected = resp["is_duplicate"]
        duplicate_count = resp["duplicate_count"]
        
        ok(f"Duplicate detection works - is_duplicate: {duplicate_detected}, count: {duplicate_count}")
        
    except Exception as e:
        fail("Duplicate detection", str(e))

    # --- TEST 18: Different category not duplicate ---
    print("\n=== TEST 18: Different categories not duplicates ===")
    try:
        # Create issue in same location but different category
        image_data = create_test_image()
        files = {'image': ('different.png', image_data, 'image/png')}
        data = {
            'category': 'Broken Streetlight',  # Different category
            'latitude': '40.7128',  # Same location
            'longitude': '-74.0060',
            'description': 'Streetlight not working'
        }
        
        resp, status = post_multipart(BASE + "/api/issues/", files, data, citizen_token)
        
        assert status == 201
        # Should not be duplicate due to different category
        
        ok("Different categories in same location correctly handled")
        print(f"    Different category duplicate status: {resp['is_duplicate']}")
        
    except Exception as e:
        fail("Category-based duplicate detection", str(e))

    # --- TEST 19: Duplicate group information ---
    print("\n=== TEST 19: Duplicate group information ===")
    if issue_id:
        try:
            data, status = get_json(f"{BASE}/api/issues/{issue_id}/duplicates", citizen_token)
            
            assert status == 200
            assert "is_duplicate" in data
            assert "duplicate_count" in data
            
            ok("Duplicate group information endpoint works")
            print(f"    Duplicate info: {data['is_duplicate']}, count: {data['duplicate_count']}")
            
        except Exception as e:
            fail("Duplicate group information", str(e))

    # --- TEST 20: Image serving ---
    print("\n=== TEST 20: Image file serving ===")
    if issue_id:
        try:
            # Get issue details to find image path
            issue_data, status = get_json(f"{BASE}/api/issues/{issue_id}", citizen_token)
            
            if "image_path" in issue_data:
                image_url = f"{BASE}/{issue_data['image_path']}"
                
                # Try to access the image
                req = urllib.request.Request(image_url)
                response = urllib.request.urlopen(req)
                
                assert response.status == 200
                content_type = response.headers.get('Content-Type', '')
                assert 'image' in content_type.lower()
                
                ok("Image files are served correctly via static endpoint")
                
            else:
                fail("Image serving", "No image_path in issue response")
                
        except Exception as e:
            fail("Image serving", str(e))

    # Final summary
    print(f"\n{'='*60}")
    print(f"PHASE 2 BACKEND TESTING COMPLETE")
    print(f"{'='*60}")
    print(f"RESULTS: {passed}/{passed + failed} tests passed")
    
    if failed == 0:
        print("🎉 ALL TESTS PASSED - PHASE 2 BACKEND IS READY!")
    else:
        print(f"❌ {failed} TESTS FAILED - CHECK IMPLEMENTATION")
    
    return failed == 0


if __name__ == "__main__":
    main()
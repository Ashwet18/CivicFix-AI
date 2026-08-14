"""
Phase 1 auth verification script.
Run with: venv\Scripts\python.exe test_auth.py
"""
import urllib.request
import urllib.error
import json
import sys

BASE = "http://localhost:8000"


def post_json(url, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}
    )
    r = urllib.request.urlopen(req)
    return json.loads(r.read()), r.status


def get_json(url, token=None):
    headers = {}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, headers=headers)
    r = urllib.request.urlopen(req)
    return json.loads(r.read()), r.status


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


# --- TEST 1: health check ---
print("=== TEST 1: Health check ===")
try:
    data, status = get_json(BASE + "/api/health")
    assert status == 200
    assert data["status"] == "ok"
    ok("GET /api/health -> 200, status=ok")
except Exception as e:
    fail("GET /api/health", str(e))

# --- TEST 2: Admin login ---
print("=== TEST 2: Admin login ===")
admin_token = None
try:
    resp, status = post_json(
        BASE + "/api/auth/login",
        {"email": "admin@civicfix.example", "password": "admin123"},
    )
    assert status == 200
    assert "access_token" in resp
    assert resp["token_type"] == "bearer"
    admin_token = resp["access_token"]
    ok("POST /api/auth/login (admin) -> 200, token issued")
    print("    token:", admin_token[:40] + "...")
except Exception as e:
    fail("Admin login", str(e))

# --- TEST 3: Admin /me ---
print("=== TEST 3: Admin /me ===")
try:
    me, status = get_json(BASE + "/api/auth/me", admin_token)
    assert status == 200
    assert me["email"] == "admin@civicfix.example"
    assert me["role"] == "admin"
    ok("GET /api/auth/me (admin) -> 200, role=admin, email correct")
    print("    id={} email={} role={}".format(me["id"], me["email"], me["role"]))
except Exception as e:
    fail("Admin /me", str(e))

# --- TEST 4: Citizen login ---
print("=== TEST 4: Citizen login ===")
citizen_token = None
try:
    resp, status = post_json(
        BASE + "/api/auth/login",
        {"email": "citizen@test.example", "password": "test123"},
    )
    assert status == 200
    assert "access_token" in resp
    citizen_token = resp["access_token"]
    ok("POST /api/auth/login (citizen) -> 200, token issued")
    print("    token:", citizen_token[:40] + "...")
except Exception as e:
    fail("Citizen login", str(e))

# --- TEST 5: Citizen /me ---
print("=== TEST 5: Citizen /me ===")
try:
    me, status = get_json(BASE + "/api/auth/me", citizen_token)
    assert status == 200
    assert me["email"] == "citizen@test.example"
    assert me["role"] == "citizen"
    ok("GET /api/auth/me (citizen) -> 200, role=citizen, email correct")
    print("    id={} email={} role={}".format(me["id"], me["email"], me["role"]))
except Exception as e:
    fail("Citizen /me", str(e))

# --- TEST 6: Wrong password rejected ---
print("=== TEST 6: Wrong password rejected ===")
try:
    post_json(
        BASE + "/api/auth/login",
        {"email": "admin@civicfix.example", "password": "wrongpassword"},
    )
    fail("Wrong password should return 401")
except urllib.error.HTTPError as e:
    if e.code == 401:
        ok("Wrong password -> 401 Unauthorized")
    else:
        fail("Wrong password", "expected 401 got " + str(e.code))
except Exception as e:
    fail("Wrong password", str(e))

# --- TEST 7: No token rejected ---
print("=== TEST 7: No token rejected ===")
try:
    get_json(BASE + "/api/auth/me", token=None)
    fail("No token should return 401")
except urllib.error.HTTPError as e:
    if e.code == 401:
        ok("No token -> 401 Unauthorized")
    else:
        fail("No token", "expected 401 got " + str(e.code))
except Exception as e:
    fail("No token", str(e))

# --- TEST 8: Admin token cannot be used for citizen-only future routes (role check) ---
print("=== TEST 8: Role field is correct in token payload ===")
try:
    import base64
    # Decode JWT payload (second segment, no verification needed for inspection)
    payload_b64 = admin_token.split(".")[1]
    # Add padding
    payload_b64 += "=" * (4 - len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(payload_b64))
    assert payload["sub"] == "admin@civicfix.example"
    assert payload["role"] == "admin"
    ok("JWT payload contains correct sub and role for admin")
    print("    sub={} role={}".format(payload["sub"], payload["role"]))
except Exception as e:
    fail("JWT payload check", str(e))

# --- Summary ---
print()
print("=" * 50)
print("RESULTS: {}/{} tests passed".format(passed, passed + failed))
if failed == 0:
    print("ALL TESTS PASSED")
else:
    print("SOME TESTS FAILED - see above")
    sys.exit(1)

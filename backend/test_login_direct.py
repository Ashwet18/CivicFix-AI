"""Direct login test to diagnose authentication issue"""
from database import SessionLocal
from models import User
from auth import verify_password, authenticate_user

db = SessionLocal()

# Test 1: Check if users exist
print("=== Test 1: Users in Database ===")
users = db.query(User).all()
for u in users:
    print(f"  {u.email} - role: {u.role}")

# Test 2: Get admin user
print("\n=== Test 2: Admin User Details ===")
admin = db.query(User).filter(User.email == "admin@civicfix.example").first()
if admin:
    print(f"Admin found: {admin.email}")
    print(f"Role: {admin.role}")
    print(f"Hash preview: {admin.hashed_password[:50]}...")
else:
    print("ADMIN USER NOT FOUND!")

# Test 3: Password verification
print("\n=== Test 3: Password Verification ===")
if admin:
    test_passwords = ["admin123", "test123", "Admin123", "admin"]
    for pwd in test_passwords:
        result = verify_password(pwd, admin.hashed_password)
        print(f"  Password '{pwd}': {result}")

# Test 4: Authenticate function
print("\n=== Test 4: authenticate_user Function ===")
auth_result = authenticate_user(db, "admin@civicfix.example", "admin123")
if auth_result:
    print(f"  Authentication SUCCESS: {auth_result.email}")
else:
    print("  Authentication FAILED")

# Test 5: Citizen user
print("\n=== Test 5: Citizen User Test ===")
citizen = db.query(User).filter(User.email == "citizen@test.example").first()
if citizen:
    print(f"Citizen found: {citizen.email}")
    result = verify_password("test123", citizen.hashed_password)
    print(f"  Password 'test123': {result}")

db.close()

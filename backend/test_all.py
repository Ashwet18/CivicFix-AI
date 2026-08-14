"""
Comprehensive test runner for Phase 2 CivicFix AI Backend
Runs authentication, services, and issues API tests
"""
import subprocess
import sys
import time
import urllib.request
import urllib.error


def check_server_running():
    """Check if the backend server is running"""
    try:
        response = urllib.request.urlopen("http://localhost:8000/api/health")
        return response.status == 200
    except:
        return False


def wait_for_server(max_wait=30):
    """Wait for server to be ready"""
    print("⏳ Waiting for server to be ready...")
    
    for i in range(max_wait):
        if check_server_running():
            print("✅ Server is ready!")
            return True
        time.sleep(1)
        if i % 5 == 0 and i > 0:
            print(f"   Still waiting... ({i}s)")
    
    return False


def run_test_file(test_file, description):
    """Run a specific test file"""
    print(f"\n{'='*60}")
    print(f"RUNNING: {description}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(
            [sys.executable, test_file],
            capture_output=False,
            text=True,
            cwd="."
        )
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Failed to run {test_file}: {e}")
        return False


def main():
    """Run all Phase 2 tests"""
    print("🚀 PHASE 2 COMPREHENSIVE TESTING")
    print("=" * 50)
    print("Testing all backend functionality for Phase 2")
    print("- Authentication (Phase 1)")
    print("- Backend Services (AI, Priority, Duplicates)")
    print("- Issues API (Create, Read, Validation)")
    print("- File Upload and Storage")
    print("- Error Handling and Security")
    print()
    
    # Check if server is running
    if not check_server_running():
        print("❌ Backend server is not running!")
        print("Please start the server first:")
        print("  cd backend")
        print("  python -m uvicorn main:app --reload --port 8000")
        print()
        return False
    
    print("✅ Backend server detected at http://localhost:8000")
    
    # Wait for server to be fully ready
    if not wait_for_server():
        print("❌ Server not responding to health checks")
        return False
    
    # Test results
    all_passed = True
    test_results = {}
    
    # Run Phase 1 authentication tests
    print(f"\n{'🔐 AUTHENTICATION TESTS (Phase 1 Verification)'}")
    auth_passed = run_test_file("test_auth.py", "Authentication & JWT Tests")
    test_results["Authentication"] = auth_passed
    all_passed = all_passed and auth_passed
    
    # Run service unit tests
    print(f"\n{'⚙️ SERVICE UNIT TESTS'}")
    services_passed = run_test_file("test_services.py", "AI Analysis, Priority & Duplicate Detection Services")
    test_results["Services"] = services_passed
    all_passed = all_passed and services_passed
    
    # Run issues API integration tests
    print(f"\n{'📋 ISSUES API INTEGRATION TESTS'}")
    issues_passed = run_test_file("test_issues.py", "Issues API, File Upload & Validation Tests")
    test_results["Issues API"] = issues_passed
    all_passed = all_passed and issues_passed
    
    # Final summary
    print(f"\n{'='*60}")
    print("🏁 FINAL TEST RESULTS")
    print(f"{'='*60}")
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:25} {status}")
    
    print(f"{'='*60}")
    
    if all_passed:
        print("🎉 ALL TESTS PASSED! PHASE 2 IS READY FOR DEPLOYMENT!")
        print()
        print("✨ What's working:")
        print("  ✓ JWT Authentication & Authorization")
        print("  ✓ Rule-based AI Analysis (no ML libraries)")
        print("  ✓ Priority Scoring Algorithm") 
        print("  ✓ GPS-based Duplicate Detection")
        print("  ✓ Secure Image Upload & Validation")
        print("  ✓ Issues CRUD API with proper authorization")
        print("  ✓ Form Validation & Error Handling")
        print("  ✓ Database Integration & Migrations")
        print()
        print("🚀 Ready for frontend integration testing!")
        
    else:
        failed_tests = [name for name, result in test_results.items() if not result]
        print(f"❌ TESTS FAILED: {', '.join(failed_tests)}")
        print()
        print("🔧 Please check the implementation and fix issues before proceeding.")
    
    print(f"{'='*60}")
    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
"""
Unit tests for Phase 2 backend services
Tests AI Analysis, Priority Calculation, and Duplicate Detection services
"""
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

# Add the backend directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from services.ai_analysis_service import AIAnalysisService
from services.priority_service import PriorityService
from services.duplicate_detection_service import DuplicateDetectionService

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


def test_ai_analysis_service():
    """Test AI Analysis Service functionality"""
    print("\n=== AI ANALYSIS SERVICE TESTS ===")
    
    ai_service = AIAnalysisService()
    
    # Test 1: Basic analysis
    try:
        result = ai_service.analyze_issue(
            category="Pothole / Road Damage",
            description="Small pothole on side street",
            image_path="/fake/path/image.jpg"
        )
        
        assert isinstance(result, dict)
        assert "category" in result
        assert "severity" in result
        assert "safety_risk" in result
        assert "analysis_notes" in result
        assert result["category"] == "Pothole / Road Damage"
        assert result["severity"] in ["low", "medium", "high", "critical"]
        assert 0 <= result["safety_risk"] <= 100
        
        ok("Basic AI analysis returns valid structure")
        
    except Exception as e:
        fail("Basic AI analysis", str(e))
    
    # Test 2: Critical keyword detection
    try:
        result = ai_service.analyze_issue(
            category="Drainage / Open Manhole",
            description="Dangerous open manhole causing accident risk",
            image_path="/fake/path/image.jpg"
        )
        
        # Should detect high/critical severity due to keywords
        assert result["severity"] in ["high", "critical"]
        assert result["safety_risk"] > 50  # Should be higher risk
        
        ok("Critical keywords properly detected and escalate severity")
        
    except Exception as e:
        fail("Critical keyword detection", str(e))
    
    # Test 3: Category confidence
    try:
        result = ai_service.analyze_issue(
            category="Other",
            description="Something is broken",
            image_path="/fake/path/image.jpg"
        )
        
        # "Other" category should have lower confidence
        assert result["category_confidence"] < 90
        
        result2 = ai_service.analyze_issue(
            category="Pothole / Road Damage",
            description="Large pothole",
            image_path="/fake/path/image.jpg"
        )
        
        # Specific category should have higher confidence
        assert result2["category_confidence"] >= 90
        
        ok("Category confidence varies appropriately")
        
    except Exception as e:
        fail("Category confidence", str(e))
    
    # Test 4: Empty description handling
    try:
        result = ai_service.analyze_issue(
            category="Broken Streetlight",
            description="",
            image_path="/fake/path/image.jpg"
        )
        
        # Should use category defaults
        assert result["severity"] == "medium"  # Default for streetlight
        assert result["category_confidence"] == 90
        
        ok("Empty description uses category defaults")
        
    except Exception as e:
        fail("Empty description handling", str(e))


def test_priority_service():
    """Test Priority Service functionality"""
    print("\n=== PRIORITY SERVICE TESTS ===")
    
    priority_service = PriorityService()
    
    # Test 1: Basic priority calculation
    try:
        score = priority_service.calculate_priority(
            severity="medium",
            safety_risk=50,
            duplicate_count=1,
            created_at=datetime.now(timezone.utc)
        )
        
        assert isinstance(score, float)
        assert 0 <= score <= 100
        
        ok("Basic priority calculation returns valid score")
        print(f"    Medium/50/1 duplicate score: {score:.2f}")
        
    except Exception as e:
        fail("Basic priority calculation", str(e))
    
    # Test 2: Critical severity increases priority
    try:
        medium_score = priority_service.calculate_priority(
            severity="medium", safety_risk=50, duplicate_count=0
        )
        
        critical_score = priority_service.calculate_priority(
            severity="critical", safety_risk=50, duplicate_count=0
        )
        
        assert critical_score > medium_score
        
        ok("Critical severity increases priority score")
        print(f"    Medium: {medium_score:.2f}, Critical: {critical_score:.2f}")
        
    except Exception as e:
        fail("Severity impact on priority", str(e))
    
    # Test 3: Duplicates increase priority
    try:
        single_score = priority_service.calculate_priority(
            severity="medium", safety_risk=50, duplicate_count=1
        )
        
        multiple_score = priority_service.calculate_priority(
            severity="medium", safety_risk=50, duplicate_count=5
        )
        
        assert multiple_score > single_score
        
        ok("Multiple duplicates increase priority score")
        print(f"    1 duplicate: {single_score:.2f}, 5 duplicates: {multiple_score:.2f}")
        
    except Exception as e:
        fail("Duplicate impact on priority", str(e))
    
    # Test 4: Age affects priority
    try:
        from datetime import timedelta
        
        new_score = priority_service.calculate_priority(
            severity="medium", 
            safety_risk=50, 
            duplicate_count=0,
            created_at=datetime.now(timezone.utc)
        )
        
        old_score = priority_service.calculate_priority(
            severity="medium", 
            safety_risk=50, 
            duplicate_count=0,
            created_at=datetime.now(timezone.utc) - timedelta(days=30)
        )
        
        assert old_score > new_score
        
        ok("Older issues get higher priority scores")
        print(f"    New: {new_score:.2f}, 30 days old: {old_score:.2f}")
        
    except Exception as e:
        fail("Age impact on priority", str(e))
    
    # Test 5: Priority categories
    try:
        low_score = 25
        medium_score = 50
        high_score = 75
        critical_score = 95
        
        assert priority_service.get_priority_category(low_score) == "Low"
        assert priority_service.get_priority_category(medium_score) == "Medium"
        assert priority_service.get_priority_category(high_score) == "High"
        assert priority_service.get_priority_category(critical_score) == "Critical"
        
        ok("Priority category mapping works correctly")
        
    except Exception as e:
        fail("Priority category mapping", str(e))


def test_duplicate_detection_service():
    """Test Duplicate Detection Service functionality"""
    print("\n=== DUPLICATE DETECTION SERVICE TESTS ===")
    
    # Note: These tests don't use real database connections
    # They test the distance calculation and logic
    
    duplicate_service = DuplicateDetectionService()
    
    # Test 1: Distance calculation
    try:
        # Test Haversine distance calculation
        # Distance between NYC coordinates (should be small)
        distance = duplicate_service._calculate_distance(
            40.7128, -74.0060,  # NYC coordinates
            40.7129, -74.0061   # Slightly different
        )
        
        assert isinstance(distance, float)
        assert distance > 0
        assert distance < 200  # Should be less than 200 meters
        
        ok("Haversine distance calculation works")
        print(f"    Distance between close coordinates: {distance:.2f}m")
        
    except Exception as e:
        fail("Distance calculation", str(e))
    
    # Test 2: Detection radius
    try:
        # Test within detection radius (50m)
        close_distance = duplicate_service._calculate_distance(
            40.7128, -74.0060,
            40.71282, -74.00602  # Very close (should be <50m)
        )
        
        far_distance = duplicate_service._calculate_distance(
            40.7128, -74.0060,
            40.7138, -74.0070  # Further apart (should be >50m)
        )
        
        assert close_distance <= 50
        assert far_distance > 50
        
        ok("Detection radius logic works correctly")
        print(f"    Close: {close_distance:.1f}m, Far: {far_distance:.1f}m")
        
    except Exception as e:
        fail("Detection radius logic", str(e))
    
    # Test 3: Large distance calculation
    try:
        # Distance between NYC and LA (should be large)
        distance = duplicate_service._calculate_distance(
            40.7128, -74.0060,  # NYC
            34.0522, -118.2437  # LA
        )
        
        # Should be roughly 3900km = 3,900,000m
        assert distance > 3500000  # At least 3500km
        assert distance < 4500000  # Less than 4500km
        
        ok("Long distance calculation is reasonable")
        print(f"    NYC to LA distance: {distance/1000:.0f}km")
        
    except Exception as e:
        fail("Long distance calculation", str(e))


def main():
    """Run all service tests"""
    global passed, failed
    
    print("=== PHASE 2 SERVICE TESTING ===")
    print("Testing AI Analysis, Priority, and Duplicate Detection Services\n")
    
    # Run all test suites
    test_ai_analysis_service()
    test_priority_service()
    test_duplicate_detection_service()
    
    # Final summary
    print(f"\n{'='*60}")
    print(f"SERVICE TESTING COMPLETE")
    print(f"{'='*60}")
    print(f"RESULTS: {passed}/{passed + failed} tests passed")
    
    if failed == 0:
        print("🎉 ALL SERVICE TESTS PASSED!")
    else:
        print(f"❌ {failed} SERVICE TESTS FAILED")
    
    return failed == 0


if __name__ == "__main__":
    main()
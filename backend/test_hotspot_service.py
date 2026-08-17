"""
Tests for Civic Hotspot Detection Service
"""
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import User, Issue
from services.hotspot_service import HotspotService


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_hotspots.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db():
    """Create test database"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(db):
    """Create test user"""
    user = User(
        email="test@example.com",
        hashed_password="hashed",
        full_name="Test User",
        role="citizen"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_haversine_distance():
    """Test Haversine distance calculation"""
    # New York City coordinates
    nyc_lat, nyc_lng = 40.7128, -74.0060
    
    # Point 1km north of NYC (approximately)
    north_lat = nyc_lat + 0.009  # ~1km
    
    distance = HotspotService.haversine_distance(
        nyc_lat, nyc_lng,
        north_lat, nyc_lng
    )
    
    # Should be approximately 1km (allowing for some variation due to Earth curvature)
    assert 0.9 < distance < 1.1


def test_calculate_center():
    """Test geographic center calculation"""
    coordinates = [
        (40.7128, -74.0060),  # NYC
        (40.7589, -73.9851),  # Times Square
        (40.6782, -73.9442),  # Brooklyn
    ]
    
    center_lat, center_lon = HotspotService.calculate_center(coordinates)
    
    # Center should be roughly in the middle
    assert 40.68 < center_lat < 40.76
    assert -74.01 < center_lon < -73.94


def test_detect_hotspots_no_issues(db, test_user):
    """Test hotspot detection with no issues"""
    hotspots = HotspotService.detect_hotspots(db)
    
    assert len(hotspots) == 0


def test_detect_hotspots_insufficient_cluster(db, test_user):
    """Test that clusters smaller than min_hotspot_size are not returned"""
    # Create only 2 nearby issues (default min is 3)
    base_lat, base_lng = 40.7128, -74.0060
    
    for i in range(2):
        issue = Issue(
            user_id=test_user.id,
            category="Pothole / Road Damage",
            severity="medium",
            status="reported",
            priority_score=50,
            latitude=base_lat + (i * 0.001),  # Very close together
            longitude=base_lng,
            image_path="uploads/test.jpg",
            created_at=datetime.now(timezone.utc)
        )
        db.add(issue)
    
    db.commit()
    
    hotspots = HotspotService.detect_hotspots(db, min_hotspot_size=3)
    
    assert len(hotspots) == 0


def test_detect_hotspots_single_cluster(db, test_user):
    """Test detection of a single hotspot cluster"""
    base_lat, base_lng = 40.7128, -74.0060
    
    # Create 4 issues very close together (within 200m)
    for i in range(4):
        issue = Issue(
            user_id=test_user.id,
            category="Pothole / Road Damage",
            severity="high" if i == 0 else "medium",
            status="reported",
            priority_score=70 if i == 0 else 50,
            latitude=base_lat + (i * 0.0005),  # ~50m apart (very close)
            longitude=base_lng,
            image_path=f"uploads/test{i}.jpg",
            created_at=datetime.now(timezone.utc)
        )
        db.add(issue)
    
    db.commit()
    
    hotspots = HotspotService.detect_hotspots(db, radius_km=0.5, min_hotspot_size=3)
    
    # Should create at least one hotspot with all 4 issues
    assert len(hotspots) >= 1
    assert hotspots[0].issue_count == 4
    assert len(hotspots[0].categories) >= 1
    assert hotspots[0].highest_civic_impact > 0
    assert hotspots[0].average_civic_impact > 0


def test_detect_hotspots_multiple_clusters(db, test_user):
    """Test detection of multiple separate hotspot clusters"""
    # Cluster 1: NYC area
    nyc_lat, nyc_lng = 40.7128, -74.0060
    for i in range(3):
        issue = Issue(
            user_id=test_user.id,
            category="Pothole / Road Damage",
            severity="medium",
            status="reported",
            priority_score=50,
            latitude=nyc_lat + (i * 0.001),
            longitude=nyc_lng,
            image_path=f"uploads/nyc{i}.jpg",
            created_at=datetime.now(timezone.utc)
        )
        db.add(issue)
    
    # Cluster 2: Far away (5km north)
    north_lat = nyc_lat + 0.045  # ~5km
    for i in range(3):
        issue = Issue(
            user_id=test_user.id,
            category="Broken Streetlight",
            severity="low",
            status="reported",
            priority_score=30,
            latitude=north_lat + (i * 0.001),
            longitude=nyc_lng,
            image_path=f"uploads/north{i}.jpg",
            created_at=datetime.now(timezone.utc)
        )
        db.add(issue)
    
    db.commit()
    
    hotspots = HotspotService.detect_hotspots(db, radius_km=0.5, min_hotspot_size=3)
    
    assert len(hotspots) == 2
    assert all(h.issue_count == 3 for h in hotspots)


def test_detect_hotspots_category_diversity(db, test_user):
    """Test that hotspots track multiple categories"""
    base_lat, base_lng = 40.7128, -74.0060
    
    categories = [
        "Pothole / Road Damage",
        "Pothole / Road Damage",
        "Broken Streetlight",
        "Drainage / Open Manhole"
    ]
    
    for i, category in enumerate(categories):
        issue = Issue(
            user_id=test_user.id,
            category=category,
            severity="medium",
            status="reported",
            priority_score=50,
            latitude=base_lat + (i * 0.001),
            longitude=base_lng,
            image_path=f"uploads/test{i}.jpg",
            created_at=datetime.now(timezone.utc)
        )
        db.add(issue)
    
    db.commit()
    
    hotspots = HotspotService.detect_hotspots(db, radius_km=0.5, min_hotspot_size=3)
    
    assert len(hotspots) == 1
    assert len(hotspots[0].categories) == 3  # 3 unique categories
    # Most frequent category should be first
    assert hotspots[0].categories[0] == "Pothole / Road Damage"


def test_detect_hotspots_critical_count(db, test_user):
    """Test that critical issue count is tracked correctly"""
    base_lat, base_lng = 40.7128, -74.0060
    
    severities = ["critical", "critical", "high", "medium"]
    
    for i, severity in enumerate(severities):
        issue = Issue(
            user_id=test_user.id,
            category="Pothole / Road Damage",
            severity=severity,
            status="reported",
            priority_score=80 if severity == "critical" else 50,
            latitude=base_lat + (i * 0.001),
            longitude=base_lng,
            image_path=f"uploads/test{i}.jpg",
            created_at=datetime.now(timezone.utc)
        )
        db.add(issue)
    
    db.commit()
    
    hotspots = HotspotService.detect_hotspots(db, radius_km=0.5, min_hotspot_size=3)
    
    assert len(hotspots) == 1
    assert hotspots[0].critical_issue_count == 2


def test_detect_hotspots_status_summary(db, test_user):
    """Test that status summary is correctly calculated"""
    base_lat, base_lng = 40.7128, -74.0060
    
    statuses = ["reported", "reported", "assigned", "in_progress"]
    
    for i, status in enumerate(statuses):
        issue = Issue(
            user_id=test_user.id,
            category="Pothole / Road Damage",
            severity="medium",
            status=status,
            priority_score=50,
            latitude=base_lat + (i * 0.001),
            longitude=base_lng,
            image_path=f"uploads/test{i}.jpg",
            created_at=datetime.now(timezone.utc)
        )
        db.add(issue)
    
    db.commit()
    
    hotspots = HotspotService.detect_hotspots(db, radius_km=0.5, min_hotspot_size=3)
    
    assert len(hotspots) == 1
    assert hotspots[0].status_summary["reported"] == 2
    assert hotspots[0].status_summary["assigned"] == 1
    assert hotspots[0].status_summary["in_progress"] == 1


def test_detect_hotspots_exclude_resolved(db, test_user):
    """Test that resolved issues are excluded by default"""
    base_lat, base_lng = 40.7128, -74.0060
    
    # Create 3 reported issues and 2 resolved
    for i in range(5):
        issue = Issue(
            user_id=test_user.id,
            category="Pothole / Road Damage",
            severity="medium",
            status="resolved" if i < 2 else "reported",
            priority_score=50,
            latitude=base_lat + (i * 0.001),
            longitude=base_lng,
            image_path=f"uploads/test{i}.jpg",
            created_at=datetime.now(timezone.utc),
            resolved_at=datetime.now(timezone.utc) if i < 2 else None
        )
        db.add(issue)
    
    db.commit()
    
    # Without including resolved
    hotspots = HotspotService.detect_hotspots(db, min_hotspot_size=3, include_resolved=False)
    assert len(hotspots) == 1
    assert hotspots[0].issue_count == 3
    
    # With including resolved
    hotspots_all = HotspotService.detect_hotspots(db, min_hotspot_size=3, include_resolved=True)
    assert len(hotspots_all) == 1
    assert hotspots_all[0].issue_count == 5


def test_detect_hotspots_sorted_by_impact(db, test_user):
    """Test that hotspots are sorted by highest civic impact descending"""
    # Cluster 1: High severity issues
    base_lat1, base_lng = 40.7128, -74.0060
    for i in range(3):
        issue = Issue(
            user_id=test_user.id,
            category="Drainage / Open Manhole",
            severity="critical",
            status="reported",
            priority_score=90,
            latitude=base_lat1 + (i * 0.001),
            longitude=base_lng,
            description="Near hospital emergency entrance",
            image_path=f"uploads/critical{i}.jpg",
            created_at=datetime.now(timezone.utc) - timedelta(days=5)
        )
        db.add(issue)
    
    # Cluster 2: Lower severity issues (far away)
    base_lat2 = base_lat1 + 0.05  # ~5km away
    for i in range(3):
        issue = Issue(
            user_id=test_user.id,
            category="Broken Streetlight",
            severity="low",
            status="reported",
            priority_score=30,
            latitude=base_lat2 + (i * 0.001),
            longitude=base_lng,
            image_path=f"uploads/low{i}.jpg",
            created_at=datetime.now(timezone.utc)
        )
        db.add(issue)
    
    db.commit()
    
    hotspots = HotspotService.detect_hotspots(db, radius_km=0.5, min_hotspot_size=3)
    
    assert len(hotspots) == 2
    # First hotspot should have higher civic impact
    assert hotspots[0].highest_civic_impact > hotspots[1].highest_civic_impact


def test_get_hotspot_by_id(db, test_user):
    """Test retrieving a specific hotspot by ID"""
    base_lat, base_lng = 40.7128, -74.0060
    
    # Create a cluster
    for i in range(4):
        issue = Issue(
            user_id=test_user.id,
            category="Pothole / Road Damage",
            severity="medium",
            status="reported",
            priority_score=50,
            latitude=base_lat + (i * 0.001),
            longitude=base_lng,
            image_path=f"uploads/test{i}.jpg",
            created_at=datetime.now(timezone.utc)
        )
        db.add(issue)
    
    db.commit()
    
    # Get all hotspots first
    hotspots = HotspotService.detect_hotspots(db, min_hotspot_size=3)
    assert len(hotspots) == 1
    
    hotspot_id = hotspots[0].hotspot_id
    
    # Retrieve by ID
    retrieved = HotspotService.get_hotspot_by_id(db, hotspot_id)
    
    assert retrieved is not None
    assert retrieved.hotspot_id == hotspot_id
    assert retrieved.issue_count == 4


def test_hotspot_id_format(db, test_user):
    """Test that hotspot IDs follow the expected format"""
    base_lat, base_lng = 40.7128, -74.0060
    
    for i in range(3):
        issue = Issue(
            user_id=test_user.id,
            category="Pothole / Road Damage",
            severity="medium",
            status="reported",
            priority_score=50,
            latitude=base_lat + (i * 0.001),
            longitude=base_lng,
            image_path=f"uploads/test{i}.jpg",
            created_at=datetime.now(timezone.utc)
        )
        db.add(issue)
    
    db.commit()
    
    hotspots = HotspotService.detect_hotspots(db, min_hotspot_size=3)
    
    assert len(hotspots) == 1
    # Hotspot ID should start with "HS-"
    assert hotspots[0].hotspot_id.startswith("HS-")
    # Should contain issue ID
    assert hotspots[0].hotspot_id.replace("HS-", "").isdigit()


def test_configurable_radius(db, test_user):
    """Test hotspot detection with different radius values"""
    base_lat, base_lng = 40.7128, -74.0060
    
    # Create issues 1km apart
    for i in range(3):
        issue = Issue(
            user_id=test_user.id,
            category="Pothole / Road Damage",
            severity="medium",
            status="reported",
            priority_score=50,
            latitude=base_lat + (i * 0.009),  # ~1km apart
            longitude=base_lng,
            image_path=f"uploads/test{i}.jpg",
            created_at=datetime.now(timezone.utc)
        )
        db.add(issue)
    
    db.commit()
    
    # Small radius - should not cluster
    hotspots_small = HotspotService.detect_hotspots(db, radius_km=0.5, min_hotspot_size=3)
    assert len(hotspots_small) == 0
    
    # Large radius - should cluster
    hotspots_large = HotspotService.detect_hotspots(db, radius_km=2.0, min_hotspot_size=3)
    assert len(hotspots_large) == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

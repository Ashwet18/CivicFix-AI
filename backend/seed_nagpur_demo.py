"""
Seed Nagpur Demo Data for CivicFix AI Hackathon Presentation

IMPORTANT: This creates SYNTHETIC/DEMO data for presentation purposes only.
Coordinates are approximate and for demonstration only.
Does NOT represent actual traffic density or real reported civic problems.
"""
import os
import sys
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import shutil

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Base
from models import User, Issue, DuplicateGroup
from services.priority_service import PriorityService

# Initialize priority service
priority_service = PriorityService()

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./civicfix.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Demo user (admin for creating demo issues)
DEMO_USER_EMAIL = "demo@civicfix.nagpur"

# Nagpur approximate coordinates (for demonstration only)
NAGPUR_AREAS = {
    # HOTSPOT 1: Sitabuldi / Central Nagpur (6-7 issues)
    "sitabuldi_central": {
        "name": "Sitabuldi Central",
        "center": (21.1458, 79.0882),
        "radius": 0.008,  # ~800m for clustering
        "count": 7
    },
    # HOTSPOT 2: Dharampeth / Seminary Hills (4-5 issues)
    "dharampeth": {
        "name": "Dharampeth",
        "center": (21.1350, 79.0700),
        "radius": 0.006,
        "count": 5
    },
    # HOTSPOT 3: Medical Square (4-5 issues)
    "medical_square": {
        "name": "Medical Square",
        "center": (21.1450, 79.0950),
        "radius": 0.005,
        "count": 4
    },
    # HOTSPOT 4: Manish Nagar / Wardha Road (4-5 issues)
    "manish_nagar": {
        "name": "Manish Nagar",
        "center": (21.1000, 79.0900),
        "radius": 0.006,
        "count": 4
    }
}

# Demo issues configuration (SYNTHETIC DATA for demonstration)
DEMO_ISSUES = [
    # ========== HOTSPOT 1: SITABULDI CENTRAL (7 issues) ==========
    {
        "area": "sitabuldi_central",
        "offset": (0.0005, 0.0005),
        "category": "Drainage / Open Manhole",
        "severity": "critical",
        "description": "Dangerous open manhole near Chitnis Park entrance. Immediate safety hazard for pedestrians and two-wheelers during evening hours.",
        "status": "reported",
        "department": None,
        "days_ago": 2,
        "context": {"nearby": "school", "road_type": "major_road"}
    },
    {
        "area": "sitabuldi_central",
        "offset": (0.001, 0.0008),
        "category": "Pothole / Road Damage",
        "severity": "high",
        "description": "Multiple deep potholes on main road creating danger for vehicles. Water accumulation during rain.",
        "status": "assigned",
        "department": "Roads & Infrastructure",
        "days_ago": 3,
        "context": {"nearby": "market", "road_type": "arterial_road"}
    },
    {
        "area": "sitabuldi_central",
        "offset": (0.0015, 0.001),
        "category": "Pothole / Road Damage",
        "severity": "high",
        "description": "Large pothole near Sitabuldi Fort junction causing traffic congestion.",
        "status": "reported",
        "department": None,
        "days_ago": 1,
        "context": {"nearby": "major_intersection", "road_type": "highway"}
    },
    {
        "area": "sitabuldi_central",
        "offset": (0.002, 0.0012),
        "category": "Damaged Traffic Sign",
        "severity": "medium",
        "description": "Traffic sign board damaged and not visible. Safety concern for commuters.",
        "status": "reported",
        "department": None,
        "days_ago": 5,
        "context": {"nearby": "major_intersection", "road_type": "main_road"}
    },
    {
        "area": "sitabuldi_central",
        "offset": (0.0008, 0.0015),
        "category": "Pothole / Road Damage",
        "severity": "medium",
        "description": "Road surface damage near commercial area. Requires urgent repair.",
        "status": "in_progress",
        "department": "Roads & Infrastructure",
        "days_ago": 7,
        "context": {"nearby": "market", "road_type": "main_road"}
    },
    {
        "area": "sitabuldi_central",
        "offset": (0.0012, 0.0018),
        "category": "Drainage / Open Manhole",
        "severity": "high",
        "description": "Open manhole cover missing near bus stop. High pedestrian traffic area.",
        "status": "assigned",
        "department": "Drainage / Water",
        "days_ago": 4,
        "context": {"nearby": "bus_stop", "road_type": "main_road"}
    },
    {
        "area": "sitabuldi_central",
        "offset": (0.0018, 0.0008),
        "category": "Road Obstruction",
        "severity": "medium",
        "description": "Construction material blocking road partially. Causing traffic issues.",
        "status": "reported",
        "department": None,
        "days_ago": 2,
        "context": {"nearby": "residential_area", "road_type": "local_street"}
    },
    
    # ========== HOTSPOT 2: DHARAMPETH (5 issues) ==========
    {
        "area": "dharampeth",
        "offset": (0.0005, 0.0005),
        "category": "Drainage Blockage",
        "severity": "high",
        "description": "Severe drainage blockage causing water logging in Seminary Hills area during monsoon.",
        "status": "assigned",
        "department": "Drainage / Water",
        "days_ago": 6,
        "context": {"nearby": "residential_area", "road_type": "collector_road"}
    },
    {
        "area": "dharampeth",
        "offset": (0.001, 0.0008),
        "category": "Pothole / Road Damage",
        "severity": "medium",
        "description": "Pothole on Dharampeth road affecting daily commute. Needs filling.",
        "status": "reported",
        "department": None,
        "days_ago": 3,
        "context": {"nearby": "residential_area", "road_type": "main_road"}
    },
    {
        "area": "dharampeth",
        "offset": (0.0012, 0.001),
        "category": "Broken Streetlight",
        "severity": "medium",
        "description": "Multiple streetlights not functioning on Seminary Hills road. Safety concern during night.",
        "status": "in_progress",
        "department": "Electrical / Street Lighting",
        "days_ago": 10,
        "context": {"nearby": "residential_area", "road_type": "local_street"}
    },
    {
        "area": "dharampeth",
        "offset": (0.0015, 0.0012),
        "category": "Pothole / Road Damage",
        "severity": "low",
        "description": "Minor road damage near residential colony. Requires attention.",
        "status": "reported",
        "department": None,
        "days_ago": 8,
        "context": {"nearby": "residential_area", "road_type": "side_street"}
    },
    {
        "area": "dharampeth",
        "offset": (0.0008, 0.0015),
        "category": "Water Leakage",
        "severity": "medium",
        "description": "Water pipeline leakage near Dharampeth causing water wastage.",
        "status": "resolved",
        "department": "Drainage / Water",
        "days_ago": 15,
        "resolved": True,
        "resolution": "Pipeline repaired and water supply restored. Leak fixed successfully.",
        "context": {"nearby": "residential_area", "road_type": "local_street"}
    },
    
    # ========== HOTSPOT 3: MEDICAL SQUARE (4 issues) ==========
    {
        "area": "medical_square",
        "offset": (0.0005, 0.0005),
        "category": "Drainage / Open Manhole",
        "severity": "critical",
        "description": "Open manhole near Medical Square hospital junction. Critical safety hazard for emergency vehicles and patients.",
        "status": "reported",
        "department": None,
        "days_ago": 1,
        "context": {"nearby": "hospital", "road_type": "major_intersection"}
    },
    {
        "area": "medical_square",
        "offset": (0.0008, 0.0008),
        "category": "Pothole / Road Damage",
        "severity": "high",
        "description": "Deep pothole near medical college affecting ambulance movement.",
        "status": "assigned",
        "department": "Roads & Infrastructure",
        "days_ago": 2,
        "context": {"nearby": "hospital", "road_type": "arterial_road"}
    },
    {
        "area": "medical_square",
        "offset": (0.001, 0.001),
        "category": "Garbage Overflow",
        "severity": "medium",
        "description": "Garbage bin overflowing near Medical Square. Hygiene concern for healthcare area.",
        "status": "in_progress",
        "department": "Sanitation",
        "days_ago": 4,
        "context": {"nearby": "hospital", "road_type": "main_road"}
    },
    {
        "area": "medical_square",
        "offset": (0.0012, 0.0006),
        "category": "Drainage Blockage",
        "severity": "medium",
        "description": "Drainage system blocked near medical area. Water accumulation issue.",
        "status": "resolved",
        "department": "Drainage / Water",
        "days_ago": 12,
        "resolved": True,
        "resolution": "Drainage cleaned and blockage removed. System functioning normally.",
        "context": {"nearby": "hospital", "road_type": "main_road"}
    },
    
    # ========== HOTSPOT 4: MANISH NAGAR / WARDHA ROAD (4 issues) ==========
    {
        "area": "manish_nagar",
        "offset": (0.0005, 0.0005),
        "category": "Pothole / Road Damage",
        "severity": "high",
        "description": "Severe road damage on Wardha Road near Manish Nagar. Major commuter route affected.",
        "status": "assigned",
        "department": "Roads & Infrastructure",
        "days_ago": 3,
        "context": {"nearby": "residential_area", "road_type": "highway"}
    },
    {
        "area": "manish_nagar",
        "offset": (0.0008, 0.0008),
        "category": "Water Leakage",
        "severity": "medium",
        "description": "Water pipeline leak on Wardha Road causing water wastage and road damage.",
        "status": "in_progress",
        "department": "Drainage / Water",
        "days_ago": 5,
        "context": {"nearby": "market", "road_type": "main_road"}
    },
    {
        "area": "manish_nagar",
        "offset": (0.001, 0.001),
        "category": "Broken Streetlight",
        "severity": "low",
        "description": "Streetlight not working near Manish Nagar colony entrance.",
        "status": "reported",
        "department": None,
        "days_ago": 7,
        "context": {"nearby": "residential_area", "road_type": "local_street"}
    },
    {
        "area": "manish_nagar",
        "offset": (0.0012, 0.0006),
        "category": "Road Obstruction",
        "severity": "low",
        "description": "Minor road obstruction due to parked vehicles. Needs traffic management.",
        "status": "resolved",
        "department": "Traffic / Signage",
        "days_ago": 14,
        "resolved": True,
        "resolution": "No-parking signs installed. Obstruction removed.",
        "context": {"nearby": "market", "road_type": "local_street"}
    },
    
    # ========== STANDALONE ISSUES (not in hotspots) ==========
    {
        "area": None,
        "coords": (21.1650, 79.0600),  # Kamptee Road area
        "category": "Damaged Footpath",
        "severity": "low",
        "description": "Footpath tiles broken near Kamptee Road. Minor pedestrian inconvenience.",
        "status": "reported",
        "department": None,
        "days_ago": 9,
        "context": {"nearby": "residential_area", "road_type": "side_street"}
    },
    {
        "area": None,
        "coords": (21.1250, 79.1100),  # Hingna Road area
        "category": "Broken Streetlight",
        "severity": "low",
        "description": "Single streetlight not functioning on Hingna Road residential area.",
        "status": "resolved",
        "department": "Electrical / Street Lighting",
        "days_ago": 20,
        "resolved": True,
        "resolution": "Streetlight bulb replaced and tested. Now functioning properly.",
        "context": {"nearby": "residential_area", "road_type": "local_street"}
    },
]


def create_demo_user(db):
    """Create or get demo user for seeding"""
    demo_user = db.query(User).filter(User.email == DEMO_USER_EMAIL).first()
    
    if not demo_user:
        from auth import get_password_hash
        demo_user = User(
            email=DEMO_USER_EMAIL,
            hashed_password=get_password_hash("demo123"),
            full_name="Nagpur Demo User",
            role="citizen"
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
        print(f"✓ Created demo user: {DEMO_USER_EMAIL}")
    else:
        print(f"✓ Using existing demo user: {DEMO_USER_EMAIL}")
    
    return demo_user


def create_demo_image():
    """Create a placeholder demo image if needed"""
    os.makedirs("uploads", exist_ok=True)
    demo_image_path = "uploads/demo_nagpur.jpg"
    
    if not os.path.exists(demo_image_path):
        # Create a simple placeholder (copy from existing or create minimal file)
        # For now, just create an empty file - in production, use actual placeholder
        with open(demo_image_path, 'w') as f:
            f.write("")
    
    return demo_image_path


def seed_nagpur_demo():
    """Seed Nagpur demonstration data"""
    db = SessionLocal()
    
    try:
        # Check if demo data already exists
        existing_demo = db.query(Issue).filter(Issue.is_demo == 1).count()
        if existing_demo > 0:
            print(f"⚠ Found {existing_demo} existing demo issues.")
            response = input("Delete and recreate? (y/n): ")
            if response.lower() == 'y':
                db.query(Issue).filter(Issue.is_demo == 1).delete()
                db.commit()
                print("✓ Deleted existing demo data")
            else:
                print("Cancelled. Run reset_nagpur_demo.py first.")
                return
        
        print("\n" + "="*60)
        print("SEEDING NAGPUR DEMO DATA FOR HACKATHON PRESENTATION")
        print("="*60)
        print("\n⚠  IMPORTANT: This is SYNTHETIC/DEMO data for demonstration only")
        print("   Coordinates are approximate and do NOT represent:")
        print("   - Actual traffic density")
        print("   - Real reported civic problems")
        print("   - Live government/municipal data\n")
        
        # Create demo user
        demo_user = create_demo_user(db)
        
        # Create demo image
        demo_image_path = create_demo_image()
        
        created_issues = []
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        status_counts = {}
        category_counts = {}
        
        print(f"\nCreating {len(DEMO_ISSUES)} demo issues...\n")
        
        for idx, issue_config in enumerate(DEMO_ISSUES, 1):
            # Calculate coordinates
            if issue_config["area"]:
                area = NAGPUR_AREAS[issue_config["area"]]
                lat = area["center"][0] + issue_config["offset"][0]
                lng = area["center"][1] + issue_config["offset"][1]
            else:
                lat, lng = issue_config["coords"]
            
            # Calculate creation date
            created_at = datetime.now(timezone.utc) - timedelta(days=issue_config["days_ago"])
            
            # Calculate safety risk score based on category and context
            safety_risk = 50  # Default medium
            if issue_config["severity"] == "critical":
                safety_risk = 90
            elif issue_config["severity"] == "high":
                safety_risk = 75
            elif issue_config["severity"] == "medium":
                safety_risk = 50
            else:
                safety_risk = 25
            
            # Calculate priority score
            priority_score = priority_service.calculate_priority(
                severity=issue_config["severity"],
                safety_risk=safety_risk,
                duplicate_count=0,
                created_at=created_at
            )
            
            # Create issue
            issue = Issue(
                user_id=demo_user.id,
                category=issue_config["category"],
                severity=issue_config["severity"],
                description=issue_config["description"],
                status=issue_config["status"],
                priority_score=priority_score,
                latitude=lat,
                longitude=lng,
                image_path=demo_image_path,
                ai_category_confidence=92.5,
                ai_severity_confidence=88.0,
                ai_analysis_notes=f"AI classified as {issue_config['category']} with {issue_config['severity']} severity.",
                assigned_department=issue_config["department"],
                is_demo=1,  # Mark as demo data
                created_at=created_at,
                updated_at=created_at
            )
            
            # Handle assigned status
            if issue_config["status"] in ["assigned", "in_progress"]:
                issue.assigned_at = created_at + timedelta(hours=2)
            
            # Handle resolved status
            if issue_config.get("resolved"):
                issue.resolved_at = created_at + timedelta(days=issue_config["days_ago"] - 2)
                issue.resolution_notes = issue_config["resolution"]
                issue.status = "resolved"
            
            db.add(issue)
            db.flush()  # Get the ID
            
            created_issues.append(issue)
            severity_counts[issue_config["severity"]] += 1
            status_counts[issue_config["status"]] = status_counts.get(issue_config["status"], 0) + 1
            category_counts[issue_config["category"]] = category_counts.get(issue_config["category"], 0) + 1
            
            area_name = NAGPUR_AREAS[issue_config["area"]]["name"] if issue_config["area"] else "Standalone"
            print(f"  {idx:2d}. [{issue_config['severity']:8s}] {issue_config['category']:30s} - {area_name}")
        
        db.commit()
        
        print("\n" + "="*60)
        print("DEMO DATA CREATED SUCCESSFULLY")
        print("="*60)
        print(f"\n📊 Summary:")
        print(f"   Total Issues: {len(created_issues)}")
        print(f"\n   Severity Distribution:")
        print(f"     Critical: {severity_counts['critical']}")
        print(f"     High:     {severity_counts['high']}")
        print(f"     Medium:   {severity_counts['medium']}")
        print(f"     Low:      {severity_counts['low']}")
        print(f"\n   Status Distribution:")
        for status, count in sorted(status_counts.items()):
            print(f"     {status.capitalize():15s}: {count}")
        print(f"\n   Top Categories:")
        for category, count in sorted(category_counts.items(), key=lambda x: -x[1])[:5]:
            print(f"     {category:30s}: {count}")
        print(f"\n✓ Demo data is marked with is_demo=1")
        print(f"✓ Real user data (is_demo=0) is preserved")
        print(f"\n🗺️  Geographic Hotspots (will be detected by clustering algorithm):")
        for key, area in NAGPUR_AREAS.items():
            print(f"   • {area['name']}: ~{area['count']} issues")
        print(f"\n🎯 Next Steps:")
        print(f"   1. Start the backend: uvicorn main:app --reload")
        print(f"   2. Login as admin: admin@civicfix.example / admin123")
        print(f"   3. View Admin Dashboard → Civic Hotspots")
        print(f"   4. View Admin Map → See geographic clusters")
        print(f"   5. Click individual issues → See Civic Impact Analysis")
        print(f"\n✨ Ready for hackathon presentation!\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_nagpur_demo()

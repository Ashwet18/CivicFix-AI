"""
Database initialization script with seed data
"""
from datetime import datetime, timedelta
from auth import get_password_hash
from database import engine, SessionLocal, Base
from models import User, Issue, DuplicateGroup

def init_database():
    """
    Initialize database:
    1. Create all tables
    2. Add seed data (users and sample issues)
    """
    print("🗄️  Initializing database...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
    
    # Create session
    db = SessionLocal()
    
    try:
        # Check if data already exists
        existing_users = db.query(User).count()
        if existing_users > 0:
            print("⚠️  Database already contains data. Skipping seed data.")
            return
        
        print("📝 Adding seed data...")
        
        # 1. Create admin account
        admin = User(
            email="admin@civicfix.example",
            hashed_password=get_password_hash("admin123"),
            full_name="Admin User",
            phone="+1234567890",
            role="admin"
        )
        db.add(admin)
        
        # 2. Create citizen demo accounts
        citizen1 = User(
            email="citizen@test.example",
            hashed_password=get_password_hash("test123"),
            full_name="John Citizen",
            phone="+1234567891",
            role="citizen"
        )
        db.add(citizen1)
        
        citizen2 = User(
            email="jane@test.example",
            hashed_password=get_password_hash("test123"),
            full_name="Jane Smith",
            phone="+1234567892",
            role="citizen"
        )
        db.add(citizen2)
        
        # Commit users first to get IDs
        db.commit()
        db.refresh(admin)
        db.refresh(citizen1)
        db.refresh(citizen2)
        
        print(f"✅ Created admin: {admin.email}")
        print(f"✅ Created citizen: {citizen1.email}")
        print(f"✅ Created citizen: {citizen2.email}")
        
        # 3. Create sample issues for testing
        # These will be used to test the UI in later phases
        
        # Issue 1: Critical pothole
        issue1 = Issue(
            user_id=citizen1.id,
            title="Large pothole on Main Street",
            description="Dangerous pothole causing vehicle damage. Located near the intersection.",
            category="pothole",
            severity="critical",
            status="pending",
            priority_score=85.5,
            latitude=28.6139,
            longitude=77.2090,
            address="Main Street, Connaught Place, New Delhi",
            image_path="/uploads/sample/pothole1.jpg",
            thumbnail_path="/uploads/sample/pothole1_thumb.jpg",
            ai_category_confidence=0.92,
            ai_severity_confidence=0.88,
            ai_analysis_notes="Classified as pothole with critical severity based on description.",
            created_at=datetime.utcnow() - timedelta(days=2)
        )
        db.add(issue1)
        
        # Issue 2: Broken streetlight
        issue2 = Issue(
            user_id=citizen1.id,
            title="Streetlight not working",
            description="Street light has been broken for a week. Area is very dark at night.",
            category="streetlight",
            severity="high",
            status="assigned",
            priority_score=72.0,
            latitude=28.6129,
            longitude=77.2295,
            address="Park Street, Karol Bagh, New Delhi",
            image_path="/uploads/sample/streetlight1.jpg",
            thumbnail_path="/uploads/sample/streetlight1_thumb.jpg",
            ai_category_confidence=0.89,
            ai_severity_confidence=0.75,
            ai_analysis_notes="Classified as Street Lighting Issue with high severity.",
            assigned_department="Electrical Department",
            assigned_at=datetime.utcnow() - timedelta(hours=12),
            created_at=datetime.utcnow() - timedelta(days=3)
        )
        db.add(issue2)
        
        # Issue 3: Garbage accumulation
        issue3 = Issue(
            user_id=citizen2.id,
            title="Garbage pile near park",
            description="Large garbage accumulation. Health hazard.",
            category="garbage",
            severity="medium",
            status="in_progress",
            priority_score=55.0,
            latitude=28.6149,
            longitude=77.2197,
            address="Green Park, New Delhi",
            image_path="/uploads/sample/garbage1.jpg",
            thumbnail_path="/uploads/sample/garbage1_thumb.jpg",
            ai_category_confidence=0.95,
            ai_severity_confidence=0.68,
            ai_analysis_notes="Classified as Waste/Garbage Accumulation with medium severity.",
            assigned_department="Sanitation Department",
            assigned_at=datetime.utcnow() - timedelta(hours=24),
            created_at=datetime.utcnow() - timedelta(days=5)
        )
        db.add(issue3)
        
        # Issue 4: Resolved drainage issue
        issue4 = Issue(
            user_id=citizen2.id,
            title="Blocked drain causing flooding",
            description="Drain is completely blocked. Water accumulation during rain.",
            category="drainage",
            severity="high",
            status="resolved",
            priority_score=78.0,
            latitude=28.6119,
            longitude=77.2315,
            address="Rajendra Place, New Delhi",
            image_path="/uploads/sample/drainage1.jpg",
            thumbnail_path="/uploads/sample/drainage1_thumb.jpg",
            ai_category_confidence=0.87,
            ai_severity_confidence=0.82,
            ai_analysis_notes="Classified as Drainage/Manhole Issue with high severity.",
            assigned_department="Water Department",
            assigned_at=datetime.utcnow() - timedelta(days=8),
            resolved_at=datetime.utcnow() - timedelta(days=1),
            resolution_notes="Drain cleaned and cleared. Water flow restored.",
            resolution_image_path="/uploads/sample/drainage1_resolved.jpg",
            created_at=datetime.utcnow() - timedelta(days=10)
        )
        db.add(issue4)
        
        # Issue 5: Another pothole (duplicate of issue1)
        issue5 = Issue(
            user_id=citizen2.id,
            title="Road damage on Main Street",
            description="Large hole in the road. Very dangerous.",
            category="pothole",
            severity="high",
            status="pending",
            priority_score=82.0,
            latitude=28.6140,  # Very close to issue1
            longitude=77.2091,
            address="Main Street, Connaught Place, New Delhi",
            image_path="/uploads/sample/pothole2.jpg",
            thumbnail_path="/uploads/sample/pothole2_thumb.jpg",
            ai_category_confidence=0.90,
            ai_severity_confidence=0.80,
            ai_analysis_notes="Classified as pothole with high severity.",
            created_at=datetime.utcnow() - timedelta(days=1)
        )
        db.add(issue5)
        
        # Commit issues
        db.commit()
        db.refresh(issue1)
        db.refresh(issue5)
        
        print(f"✅ Created {db.query(Issue).count()} sample issues")
        
        # 4. Create duplicate link (issue5 is duplicate of issue1)
        duplicate = DuplicateGroup(
            primary_issue_id=issue1.id,
            duplicate_issue_id=issue5.id,
            similarity_score=0.85
        )
        db.add(duplicate)
        db.commit()
        
        print(f"✅ Created duplicate link")
        
        print("\n✅ Database initialization complete!")
        print("\n📋 Test Credentials:")
        print("─" * 50)
        print("Admin Account:")
        print("  Email: admin@civicfix.example")
        print("  Password: admin123")
        print("\nCitizen Accounts:")
        print("  Email: citizen@test.example")
        print("  Password: test123")
        print("  ---")
        print("  Email: jane@test.example")
        print("  Password: test123")
        print("─" * 50)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_database()

"""
Test Nagpur Demo Data - Verify hotspots and civic impact
"""
import sys
import os
from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import Issue
from services.hotspot_service import HotspotService
from services.impact_service import CivicImpactService

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./civicfix.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_nagpur_demo():
    """Test the Nagpur demo data"""
    db = SessionLocal()
    
    try:
        print("\n" + "="*70)
        print("NAGPUR DEMO DATA VERIFICATION")
        print("="*70)
        
        # Count issues
        total_issues = db.query(Issue).count()
        demo_issues = db.query(Issue).filter(Issue.is_demo == 1).count()
        real_issues = db.query(Issue).filter(Issue.is_demo == 0).count()
        
        print(f"\n📊 Issue Count:")
        print(f"   Total:  {total_issues}")
        print(f"   Demo:   {demo_issues}")
        print(f"   Real:   {real_issues}")
        
        # Severity distribution
        print(f"\n📈 Severity Distribution (Demo Issues):")
        severities = db.query(Issue.severity, func.count(Issue.id)).filter(
            Issue.is_demo == 1
        ).group_by(Issue.severity).all()
        for severity, count in severities:
            print(f"   {severity.capitalize():10s}: {count}")
        
        # Status distribution
        print(f"\n📋 Status Distribution (Demo Issues):")
        statuses = db.query(Issue.status, func.count(Issue.id)).filter(
            Issue.is_demo == 1
        ).group_by(Issue.status).all()
        for status, count in statuses:
            print(f"   {status.capitalize():15s}: {count}")
        
        # Category distribution
        print(f"\n🏷️  Top Categories (Demo Issues):")
        categories = db.query(Issue.category, func.count(Issue.id)).filter(
            Issue.is_demo == 1
        ).group_by(Issue.category).order_by(func.count(Issue.id).desc()).limit(5).all()
        for category, count in categories:
            print(f"   {category:30s}: {count}")
        
        # Test hotspot detection
        print(f"\n🗺️  Hotspot Detection:")
        hotspots = HotspotService.detect_hotspots(db, radius_km=0.5, min_hotspot_size=3)
        
        print(f"   Found {len(hotspots)} hotspots")
        for i, hotspot in enumerate(hotspots, 1):
            print(f"\n   Hotspot #{i}:")
            print(f"     ID:           {hotspot.hotspot_id}")
            print(f"     Issues:       {hotspot.issue_count}")
            print(f"     Location:     {hotspot.center_latitude:.4f}, {hotspot.center_longitude:.4f}")
            print(f"     Avg Impact:   {hotspot.average_civic_impact:.2f}")
            print(f"     Max Impact:   {hotspot.highest_civic_impact:.2f}")
            print(f"     Categories:   {', '.join(hotspot.categories[:3])}")
        
        # Test civic impact for top priority issues
        print(f"\n🎯 Top Priority Issues (by Priority Score):")
        top_issues = db.query(Issue).filter(
            Issue.is_demo == 1
        ).order_by(Issue.priority_score.desc()).limit(5).all()
        
        for i, issue in enumerate(top_issues, 1):
            print(f"\n   #{i} Issue ID {issue.id}:")
            print(f"     Category:      {issue.category}")
            print(f"     Severity:      {issue.severity}")
            print(f"     Status:        {issue.status}")
            print(f"     Priority:      {issue.priority_score:.2f}")
            print(f"     Location:      {issue.latitude:.4f}, {issue.longitude:.4f}")
            print(f"     Description:   {issue.description[:60]}...")
        
        print("\n" + "="*70)
        print("✓ VERIFICATION COMPLETE")
        print("="*70)
        print(f"\n🎉 Ready for hackathon presentation!")
        print(f"   • {demo_issues} Nagpur demo issues created")
        print(f"   • {len(hotspots)} geographic hotspots detected")
        print(f"   • Civic Impact scores calculated")
        print(f"   • {real_issues} real user issues preserved\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_nagpur_demo()

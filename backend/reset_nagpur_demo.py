"""
Reset Nagpur Demo Data

SAFE deletion of ONLY demo data (is_demo=1).
Preserves all genuine citizen-submitted issues (is_demo=0).
"""
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import Issue

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./civicfix.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def reset_demo_data():
    """Safely delete ONLY demo data (is_demo=1)"""
    db = SessionLocal()
    
    try:
        # Count demo vs real issues before deletion
        demo_count = db.query(Issue).filter(Issue.is_demo == 1).count()
        real_count = db.query(Issue).filter(Issue.is_demo == 0).count()
        
        print("\n" + "="*60)
        print("RESET NAGPUR DEMO DATA")
        print("="*60)
        print(f"\n📊 Current Database Status:")
        print(f"   Demo Issues (is_demo=1):  {demo_count}")
        print(f"   Real Issues (is_demo=0):  {real_count}")
        print(f"   Total:                     {demo_count + real_count}")
        
        if demo_count == 0:
            print(f"\n✓ No demo data found. Nothing to delete.")
            return
        
        print(f"\n⚠  WARNING: About to delete {demo_count} demo issues")
        print(f"   Real user data will be PRESERVED")
        
        response = input(f"\nProceed with deletion? (y/n): ")
        
        if response.lower() != 'y':
            print("Cancelled.")
            return
        
        # Delete ONLY demo issues
        deleted = db.query(Issue).filter(Issue.is_demo == 1).delete()
        db.commit()
        
        # Verify real data is intact
        remaining_real = db.query(Issue).filter(Issue.is_demo == 0).count()
        remaining_demo = db.query(Issue).filter(Issue.is_demo == 1).count()
        
        print(f"\n✓ Deletion Complete")
        print(f"   Deleted:                {deleted} demo issues")
        print(f"   Remaining Real Issues:  {remaining_real}")
        print(f"   Remaining Demo Issues:  {remaining_demo}")
        
        if remaining_real != real_count:
            print(f"\n❌ ERROR: Real issue count changed!")
            print(f"   Expected: {real_count}, Got: {remaining_real}")
        else:
            print(f"\n✓ All real user data preserved intact")
        
        print(f"\n🎯 Next: Run 'python seed_nagpur_demo.py' to create fresh demo data\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    reset_demo_data()

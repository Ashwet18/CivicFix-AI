"""
Database migration script for Phase 3 changes
Adds admin_notes field to issues table
"""
import sqlite3
from pathlib import Path

def migrate_database():
    """Apply Phase 3 database changes"""
    db_path = Path("civicfix.db")
    
    if not db_path.exists():
        print("Database not found. Please run init_db.py first.")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔄 Starting Phase 3 database migration...")
        
        # Check if admin_notes column exists
        cursor.execute("PRAGMA table_info(issues)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if "admin_notes" not in columns:
            print("📝 Adding admin_notes column to issues table...")
            cursor.execute("""
                ALTER TABLE issues 
                ADD COLUMN admin_notes TEXT
            """)
            print("✅ admin_notes column added")
        else:
            print("✅ admin_notes column already exists")
        
        conn.commit()
        print("✅ Phase 3 migration completed successfully!")
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Migration failed: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()

"""
Database migration script for Phase 2 changes
Adds duplicate_group_id to issues table and updates duplicate_groups structure
"""
import sqlite3
from pathlib import Path

def migrate_database():
    """Apply Phase 2 database changes"""
    db_path = Path("civicfix.db")
    
    if not db_path.exists():
        print("Database not found. Please run init_db.py first.")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔄 Starting Phase 2 database migration...")
        
        # Check if duplicate_group_id column exists
        cursor.execute("PRAGMA table_info(issues)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if "duplicate_group_id" not in columns:
            print("📝 Adding duplicate_group_id column to issues table...")
            cursor.execute("""
                ALTER TABLE issues 
                ADD COLUMN duplicate_group_id INTEGER 
                REFERENCES duplicate_groups(id)
            """)
        else:
            print("✅ duplicate_group_id column already exists")
        
        # Update default status from 'pending' to 'reported'
        print("📝 Updating issue status values...")
        cursor.execute("UPDATE issues SET status = 'reported' WHERE status = 'pending'")
        
        # Check if duplicate_groups table needs restructuring
        cursor.execute("PRAGMA table_info(duplicate_groups)")
        dup_columns = [column[1] for column in cursor.fetchall()]
        
        if "duplicate_issue_id" in dup_columns:
            print("📝 Restructuring duplicate_groups table...")
            
            # Create new table structure
            cursor.execute("""
                CREATE TABLE duplicate_groups_new (
                    id INTEGER PRIMARY KEY,
                    primary_issue_id INTEGER NOT NULL REFERENCES issues(id),
                    issue_count INTEGER NOT NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Migrate existing data (if any)
            cursor.execute("""
                INSERT INTO duplicate_groups_new (id, primary_issue_id, issue_count, created_at)
                SELECT id, primary_issue_id, 2, created_at 
                FROM duplicate_groups
            """)
            
            # Drop old table and rename new one
            cursor.execute("DROP TABLE duplicate_groups")
            cursor.execute("ALTER TABLE duplicate_groups_new RENAME TO duplicate_groups")
            
            print("✅ duplicate_groups table restructured")
        else:
            print("✅ duplicate_groups table already has correct structure")
        
        conn.commit()
        print("✅ Phase 2 migration completed successfully!")
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Migration failed: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
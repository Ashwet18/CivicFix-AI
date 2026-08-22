"""
Database migration: Add is_demo flag to issues table
"""
import sqlite3
import os

def migrate():
    """Add is_demo column to issues table if it doesn't exist"""
    db_path = "civicfix.db"
    
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found. Skipping migration.")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(issues)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_demo' in columns:
            print("Column 'is_demo' already exists. Skipping migration.")
        else:
            # Add the is_demo column
            cursor.execute("""
                ALTER TABLE issues 
                ADD COLUMN is_demo INTEGER DEFAULT 0 NOT NULL
            """)
            conn.commit()
            print("✓ Added 'is_demo' column to issues table")
            print("  Default value: 0 (all existing issues are real)")
        
    except Exception as e:
        print(f"Migration error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("Starting database migration...")
    migrate()
    print("Migration complete.")

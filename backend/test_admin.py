"""
Test suite for Phase 3: Admin Dashboard functionality
Tests admin authorization, issue management, status workflows, and resolution evidence
"""

import pytest
import os
import io
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

from main import app
from database import Base, get_db
from models import User, Issue, IssueHistory

# Test database setup
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_admin.db"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Fixtures
@pytest.fixture(scope="function")
def client():
    """Create TestClient for each test"""
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="function", autouse=True)
def setup_database():
    """Create fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    try:
        if os.path.exists("test_admin.db"):
            os.remove("test_admin.db")
    except PermissionError:
        pass  # File still in use, will be cleaned up later

@pytest.fixture
def admin_user(client):
    """Create admin user and return credentials"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "admin@test.com",
            "password": "adminpass123",
            "full_name": "Admin User",
            "role": "admin"
        }
    )
    assert response.status_code == 201
    
    # Login to get token
    login_response = client.post(
        "/api/auth/login",
        json={"email": "admin@test.com", "password": "adminpass123"}
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    return {"email": "admin@test.com", "token": token}

@pytest.fixture
def citizen_user(client):
    """Create citizen user and return credentials"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "citizen@test.com",
            "password": "citizenpass123",
            "full_name": "Citizen User"
        }
    )
    assert response.status_code == 201
    
    # Login to get token
    login_response = client.post(
        "/api/auth/login",
        json={"email": "citizen@test.com", "password": "citizenpass123"}
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    return {"email": "citizen@test.com", "token": token}

@pytest.fixture
def sample_issue(client, citizen_user):
    """Create a sample issue for testing"""
    # Create test image
    image_content = b"fake image content"
    
    response = client.post(
        "/api/issues/",
        headers={"Authorization": f"Bearer {citizen_user['token']}"},
        data={
            "latitude": 40.7128,
            "longitude": -74.0060,
            "description": "Test pothole on main street"
        },
        files={"image": ("test.jpg", io.BytesIO(image_content), "image/jpeg")}
    )
    
    assert response.status_code == 200
    return response.json()


class TestAdminAuthorization:
    """Test admin-only authorization requirements"""
    
    def test_admin_dashboard_requires_admin(self, client, citizen_user):
        """Citizens should get 403 when accessing admin dashboard"""
        response = client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {citizen_user['token']}"}
        )
        assert response.status_code == 403
        assert "admin" in response.json()["detail"].lower()
    
    def test_admin_dashboard_requires_auth(self, client):
        """Unauthenticated requests should get 401"""
        response = client.get("/api/admin/dashboard")
        assert response.status_code == 401
    
    def test_admin_dashboard_success(self, client, admin_user):
        """Admin user should access dashboard successfully"""
        response = client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_user['token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_issues" in data
        assert "critical_issues" in data
    
    def test_admin_issues_list_requires_admin(self, client, citizen_user):
        """Citizens should get 403 when accessing admin issues list"""
        response = client.get(
            "/api/admin/issues",
            headers={"Authorization": f"Bearer {citizen_user['token']}"}
        )
        assert response.status_code == 403
    
    def test_admin_issue_detail_requires_admin(self, client, citizen_user, sample_issue):
        """Citizens should get 403 when accessing admin issue detail"""
        issue_id = sample_issue["issue_id"]
        response = client.get(
            f"/api/admin/issues/{issue_id}",
            headers={"Authorization": f"Bearer {citizen_user['token']}"}
        )
        assert response.status_code == 403
    
    def test_status_update_requires_admin(self, client, citizen_user, sample_issue):
        """Citizens should get 403 when updating issue status"""
        issue_id = sample_issue["issue_id"]
        response = client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {citizen_user['token']}"},
            json={"new_status": "in_progress"}
        )
        assert response.status_code == 403
    
    def test_department_assignment_requires_admin(self, client, citizen_user, sample_issue):
        """Citizens should get 403 when assigning department"""
        issue_id = sample_issue["issue_id"]
        response = client.patch(
            f"/api/admin/issues/{issue_id}/department",
            headers={"Authorization": f"Bearer {citizen_user['token']}"},
            json={"department": "Roads & Infrastructure"}
        )
        assert response.status_code == 403
    
    def test_resolution_requires_admin(self, client, citizen_user, sample_issue):
        """Citizens should get 403 when marking issue as resolved"""
        issue_id = sample_issue["issue_id"]
        response = client.post(
            f"/api/admin/issues/{issue_id}/resolution",
            headers={"Authorization": f"Bearer {citizen_user['token']}"},
            data={"resolution_notes": "Fixed the issue"}
        )
        assert response.status_code == 403


class TestStatusWorkflow:
    """Test status transition validation and workflows"""
    
    def test_assign_department_transitions_to_assigned(self, client, admin_user, sample_issue):
        """Assigning department should auto-transition status to 'assigned'"""
        issue_id = sample_issue["issue_id"]
        
        # Assign department
        response = client.patch(
            f"/api/admin/issues/{issue_id}/department",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"department": "Roads & Infrastructure"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["assigned_department"] == "Roads & Infrastructure"
        assert data["status"] == "assigned"
        assert data["assigned_at"] is not None
    
    def test_status_transition_reported_to_assigned(self, client, admin_user, sample_issue):
        """Should allow transition from reported to assigned"""
        issue_id = sample_issue["issue_id"]
        
        response = client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"new_status": "assigned", "notes": "Assigning to team"}
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "assigned"
    
    def test_status_transition_assigned_to_in_progress(self, client, admin_user, sample_issue):
        """Should allow transition from assigned to in_progress"""
        issue_id = sample_issue["issue_id"]
        
        # First assign
        client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"new_status": "assigned"}
        )
        
        # Then move to in_progress
        response = client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"new_status": "in_progress", "notes": "Work started"}
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "in_progress"
    
    def test_status_transition_in_progress_to_resolved(self, client, admin_user, sample_issue):
        """Should allow transition from in_progress to resolved"""
        issue_id = sample_issue["issue_id"]
        
        # Move to in_progress
        client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"new_status": "assigned"}
        )
        client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"new_status": "in_progress"}
        )
        
        # Then resolve
        response = client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"new_status": "resolved", "notes": "Issue fixed"}
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "resolved"
    
    def test_invalid_status_transition_rejected(self, client, admin_user, sample_issue):
        """Should reject invalid status transitions"""
        issue_id = sample_issue["issue_id"]
        
        # Try to jump from reported to resolved (invalid)
        response = client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"new_status": "resolved"}
        )
        
        assert response.status_code == 400
        assert "transition" in response.json()["detail"].lower()
    
    def test_cannot_transition_from_resolved(self, client, admin_user, sample_issue):
        """Should not allow status changes once issue is resolved"""
        issue_id = sample_issue["issue_id"]
        
        # Move to resolved
        client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"new_status": "assigned"}
        )
        client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"new_status": "in_progress"}
        )
        client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"new_status": "resolved"}
        )
        
        # Try to change status from resolved
        response = client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"new_status": "in_progress"}
        )
        
        assert response.status_code == 400
        assert "resolved" in response.json()["detail"].lower()


class TestResolutionEvidence:
    """Test resolution evidence upload and validation"""
    
    def test_resolve_issue_with_notes_only(self, client, admin_user, sample_issue):
        """Should allow resolution with notes only (no image)"""
        issue_id = sample_issue["issue_id"]
        
        response = client.post(
            f"/api/admin/issues/{issue_id}/resolution",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            data={"resolution_notes": "Pothole has been filled with asphalt"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "resolved"
        assert data["resolution_notes"] == "Pothole has been filled with asphalt"
        assert data["resolved_at"] is not None
    
    def test_resolve_issue_with_image(self, client, admin_user, sample_issue):
        """Should allow resolution with notes and image"""
        issue_id = sample_issue["issue_id"]
        
        image_content = b"resolution image content"
        
        response = client.post(
            f"/api/admin/issues/{issue_id}/resolution",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            data={"resolution_notes": "Issue fixed - see photo"},
            files={"resolution_image": ("resolved.jpg", io.BytesIO(image_content), "image/jpeg")}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "resolved"
        assert data["resolution_notes"] == "Issue fixed - see photo"
        assert data["resolution_image_path"] is not None
        assert data["resolved_at"] is not None
    
    def test_resolution_requires_notes(self, client, admin_user, sample_issue):
        """Should reject resolution without notes"""
        issue_id = sample_issue["issue_id"]
        
        response = client.post(
            f"/api/admin/issues/{issue_id}/resolution",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            data={}
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_resolution_validates_image_type(self, client, admin_user, sample_issue):
        """Should reject non-image files for resolution"""
        issue_id = sample_issue["issue_id"]
        
        # Try to upload a text file
        response = client.post(
            f"/api/admin/issues/{issue_id}/resolution",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            data={"resolution_notes": "Fixed it"},
            files={"resolution_image": ("doc.txt", io.BytesIO(b"text content"), "text/plain")}
        )
        
        assert response.status_code == 400
        assert "image" in response.json()["detail"].lower()


class TestIssueHistory:
    """Test that status changes create history records"""
    
    def test_status_change_creates_history(self, client, admin_user, sample_issue):
        """Status changes should create history entries"""
        issue_id = sample_issue["issue_id"]
        
        # Change status
        client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"new_status": "assigned", "notes": "Test note"}
        )
        
        # Get issue detail with history
        response = client.get(
            f"/api/admin/issues/{issue_id}",
            headers={"Authorization": f"Bearer {admin_user['token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        assert len(data["history"]) >= 1
        
        history_entry = data["history"][0]
        assert history_entry["old_status"] == "reported"
        assert history_entry["new_status"] == "assigned"
        assert history_entry["notes"] == "Test note"
    
    def test_multiple_status_changes_create_multiple_history(self, client, admin_user, sample_issue):
        """Multiple status changes should create multiple history entries"""
        issue_id = sample_issue["issue_id"]
        
        # Make multiple status changes
        client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"new_status": "assigned", "notes": "First change"}
        )
        
        client.patch(
            f"/api/admin/issues/{issue_id}/status",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"new_status": "in_progress", "notes": "Second change"}
        )
        
        # Get history
        response = client.get(
            f"/api/admin/issues/{issue_id}",
            headers={"Authorization": f"Bearer {admin_user['token']}"}
        )
        
        assert response.status_code == 200
        history = response.json()["history"]
        assert len(history) >= 2


class TestAdminNotes:
    """Test admin internal notes functionality"""
    
    def test_add_admin_note(self, client, admin_user, sample_issue):
        """Should allow admins to add internal notes"""
        issue_id = sample_issue["issue_id"]
        
        response = client.post(
            f"/api/admin/issues/{issue_id}/notes",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"note": "Internal note: contacted contractor"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "admin_notes" in data
        assert "contacted contractor" in data["admin_notes"]
        assert admin_user["email"] in data["admin_notes"]  # Should include admin email
    
    def test_multiple_admin_notes_are_appended(self, client, admin_user, sample_issue):
        """Multiple admin notes should be appended with timestamps"""
        issue_id = sample_issue["issue_id"]
        
        # Add first note
        client.post(
            f"/api/admin/issues/{issue_id}/notes",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"note": "First note"}
        )
        
        # Add second note
        response = client.post(
            f"/api/admin/issues/{issue_id}/notes",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"note": "Second note"}
        )
        
        assert response.status_code == 200
        admin_notes = response.json()["admin_notes"]
        assert "First note" in admin_notes
        assert "Second note" in admin_notes
    
    def test_citizen_cannot_see_admin_notes(self, client, admin_user, citizen_user, sample_issue):
        """Admin notes should not be visible to citizens"""
        issue_id = sample_issue["issue_id"]
        
        # Admin adds note
        client.post(
            f"/api/admin/issues/{issue_id}/notes",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"note": "Secret internal note"}
        )
        
        # Citizen views their issue
        response = client.get(
            f"/api/issues/{issue_id}",
            headers={"Authorization": f"Bearer {citizen_user['token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        # admin_notes field should not be present or should be None in citizen view
        assert "admin_notes" not in data or data.get("admin_notes") is None


class TestDepartmentAssignment:
    """Test department assignment functionality"""
    
    def test_assign_valid_department(self, client, admin_user, sample_issue):
        """Should assign valid department successfully"""
        issue_id = sample_issue["issue_id"]
        
        response = client.patch(
            f"/api/admin/issues/{issue_id}/department",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"department": "Roads & Infrastructure"}
        )
        
        assert response.status_code == 200
        assert response.json()["assigned_department"] == "Roads & Infrastructure"
    
    def test_assign_invalid_department_rejected(self, client, admin_user, sample_issue):
        """Should reject invalid department names"""
        issue_id = sample_issue["issue_id"]
        
        response = client.patch(
            f"/api/admin/issues/{issue_id}/department",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"department": "Invalid Department Name"}
        )
        
        assert response.status_code == 400
        assert "department" in response.json()["detail"].lower()
    
    def test_reassign_department(self, client, admin_user, sample_issue):
        """Should allow changing department assignment"""
        issue_id = sample_issue["issue_id"]
        
        # First assignment
        client.patch(
            f"/api/admin/issues/{issue_id}/department",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"department": "Roads & Infrastructure"}
        )
        
        # Reassignment
        response = client.patch(
            f"/api/admin/issues/{issue_id}/department",
            headers={"Authorization": f"Bearer {admin_user['token']}"},
            json={"department": "Electrical / Street Lighting"}
        )
        
        assert response.status_code == 200
        assert response.json()["assigned_department"] == "Electrical / Street Lighting"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

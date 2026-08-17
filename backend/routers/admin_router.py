"""
Admin API endpoints - Dashboard, issue management, status updates, resolution
"""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from auth import get_current_user
from database import get_db
from models import User, Issue, IssueHistory
from schemas import (
    AdminDashboardStats, IssueStatusUpdate, IssueDepartmentUpdate,
    IssueAdminNote, IssueListResponse, AdminIssueDetailResponse,
    IssueHistoryResponse, IssueResponse
)
from services.file_service import FileService
from services.impact_service import CivicImpactService, CivicImpactResult
from services.hotspot_service import HotspotService, Hotspot

router = APIRouter(prefix="/api/admin", tags=["Admin"])

# Initialize file service
file_service = FileService()

# Valid departments
VALID_DEPARTMENTS = {
    "Roads & Infrastructure",
    "Electrical / Street Lighting",
    "Sanitation",
    "Drainage / Water",
    "Traffic / Signage",
    "Parks & Public Spaces",
    "Other"
}

# Valid status values and allowed transitions
VALID_STATUSES = {"reported", "assigned", "in_progress", "resolved"}
STATUS_TRANSITIONS = {
    "reported": {"assigned"},
    "assigned": {"in_progress", "reported"},
    "in_progress": {"resolved", "assigned"},
    "resolved": set()  # Cannot transition from resolved
}


def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to require admin role"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user


@router.get("/dashboard", response_model=AdminDashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics for admin.
    Requires admin authentication.
    """
    # Total issues
    total_issues = db.query(Issue).count()
    
    # Critical issues (severity = critical)
    critical_issues = db.query(Issue).filter(
        Issue.severity == "critical",
        Issue.status != "resolved"
    ).count()
    
    # High priority issues (priority_score >= 60)
    high_priority_issues = db.query(Issue).filter(
        Issue.priority_score >= 60,
        Issue.status != "resolved"
    ).count()
    
    # Status counts
    pending_issues = db.query(Issue).filter(Issue.status == "reported").count()
    in_progress_issues = db.query(Issue).filter(Issue.status == "in_progress").count()
    resolved_issues = db.query(Issue).filter(Issue.status == "resolved").count()
    
    # Issues by category
    category_stats = db.query(
        Issue.category,
        func.count(Issue.id).label("count")
    ).group_by(Issue.category).all()
    
    issues_by_category = {cat: count for cat, count in category_stats}
    
    # Issues by status
    status_stats = db.query(
        Issue.status,
        func.count(Issue.id).label("count")
    ).group_by(Issue.status).all()
    
    issues_by_status = {status: count for status, count in status_stats}
    
    # Average resolution time
    resolved = db.query(Issue).filter(
        Issue.status == "resolved",
        Issue.resolved_at.isnot(None)
    ).all()
    
    avg_resolution_time = None
    if resolved:
        total_hours = sum(
            (issue.resolved_at - issue.created_at).total_seconds() / 3600
            for issue in resolved
            if issue.resolved_at and issue.created_at
        )
        avg_resolution_time = round(total_hours / len(resolved), 2)
    
    return AdminDashboardStats(
        total_issues=total_issues,
        critical_issues=critical_issues,
        high_priority_issues=high_priority_issues,
        pending_issues=pending_issues,
        in_progress_issues=in_progress_issues,
        resolved_issues=resolved_issues,
        issues_by_category=issues_by_category,
        issues_by_status=issues_by_status,
        average_resolution_time_hours=avg_resolution_time
    )


@router.get("/issues", response_model=IssueListResponse)
def get_all_issues(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    severity_filter: Optional[str] = None,
    priority_min: Optional[float] = None,
    priority_max: Optional[float] = None,
    search: Optional[str] = None,
    sort_by: str = Query("priority", enum=["priority", "created_at", "severity"]),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get all issues with filtering, search, and pagination.
    Admin only. Default sort by priority descending.
    """
    # Build query
    query = db.query(Issue)
    
    # Apply filters
    if status_filter:
        query = query.filter(Issue.status == status_filter)
    
    if category_filter:
        query = query.filter(Issue.category == category_filter)
    
    if severity_filter:
        query = query.filter(Issue.severity == severity_filter)
    
    if priority_min is not None:
        query = query.filter(Issue.priority_score >= priority_min)
    
    if priority_max is not None:
        query = query.filter(Issue.priority_score <= priority_max)
    
    # Apply search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Issue.id == int(search) if search.isdigit() else False) |
            Issue.category.ilike(search_term) |
            Issue.description.ilike(search_term)
        )
    
    # Get total count
    total_count = query.count()
    
    # Apply sorting
    if sort_by == "priority":
        sort_column = Issue.priority_score
    elif sort_by == "created_at":
        sort_column = Issue.created_at
    elif sort_by == "severity":
        # Custom sort for severity: critical > high > medium > low
        sort_column = case(
            (Issue.severity == "critical", 4),
            (Issue.severity == "high", 3),
            (Issue.severity == "medium", 2),
            (Issue.severity == "low", 1),
            else_=0
        )
    else:
        sort_column = Issue.priority_score
    
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Apply pagination
    offset = (page - 1) * page_size
    issues = query.offset(offset).limit(page_size).all()
    
    # Calculate pagination info
    total_pages = (total_count + page_size - 1) // page_size
    
    return IssueListResponse(
        issues=issues,
        total_count=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/issues/{issue_id}", response_model=AdminIssueDetailResponse)
def get_issue_detail(
    issue_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get detailed issue information for admin.
    Includes history and reporter information.
    """
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    # Get reporter information
    reporter = db.query(User).filter(User.id == issue.user_id).first()
    
    # Convert to dict and add additional fields
    issue_dict = {
        **{c.name: getattr(issue, c.name) for c in issue.__table__.columns},
        "history": issue.history,
        "reporter_email": reporter.email if reporter else None
    }
    
    return AdminIssueDetailResponse(**issue_dict)


@router.patch("/issues/{issue_id}/status")
def update_issue_status(
    issue_id: int,
    status_update: IssueStatusUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Update issue status with validation.
    Creates history entry for the change.
    """
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    new_status = status_update.new_status.lower()
    
    # Validate status value
    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"
        )
    
    # Validate status transition
    if issue.status not in STATUS_TRANSITIONS:
        raise HTTPException(status_code=400, detail=f"Invalid current status: {issue.status}")
    
    allowed_transitions = STATUS_TRANSITIONS[issue.status]
    if new_status != issue.status and new_status not in allowed_transitions:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{issue.status}' to '{new_status}'. Allowed: {', '.join(allowed_transitions) if allowed_transitions else 'none (resolved is final)'}"
        )
    
    # Create history entry
    history_entry = IssueHistory(
        issue_id=issue_id,
        changed_by_user_id=current_user.id,
        old_status=issue.status,
        new_status=new_status,
        notes=status_update.notes,
        created_at=datetime.now(timezone.utc)
    )
    
    db.add(history_entry)
    
    # Update issue
    old_status = issue.status
    issue.status = new_status
    issue.updated_at = datetime.now(timezone.utc)
    
    # Set assigned_at if transitioning to assigned
    if new_status == "assigned" and old_status == "reported":
        issue.assigned_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(issue)
    
    return {
        "message": "Status updated successfully",
        "issue_id": issue_id,
        "old_status": old_status,
        "new_status": new_status
    }


@router.patch("/issues/{issue_id}/department")
def assign_department(
    issue_id: int,
    department_update: IssueDepartmentUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Assign issue to a department.
    """
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    # Validate department
    if department_update.department not in VALID_DEPARTMENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid department. Must be one of: {', '.join(VALID_DEPARTMENTS)}"
        )
    
    issue.assigned_department = department_update.department
    issue.updated_at = datetime.now(timezone.utc)
    
    # If not yet assigned, update status
    if issue.status == "reported":
        issue.status = "assigned"
        issue.assigned_at = datetime.now(timezone.utc)
        
        # Create history entry
        history_entry = IssueHistory(
            issue_id=issue_id,
            changed_by_user_id=current_user.id,
            old_status="reported",
            new_status="assigned",
            notes=f"Assigned to {department_update.department}",
            created_at=datetime.now(timezone.utc)
        )
        db.add(history_entry)
    
    db.commit()
    db.refresh(issue)
    
    return {
        "message": "Department assigned successfully",
        "issue_id": issue_id,
        "department": department_update.department,
        "status": issue.status
    }


@router.post("/issues/{issue_id}/notes")
def add_admin_note(
    issue_id: int,
    note_data: IssueAdminNote,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Add internal admin note to an issue.
    """
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    # Append note with timestamp and admin email
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    new_note = f"[{timestamp}] {current_user.email}: {note_data.note}"
    
    if issue.admin_notes:
        issue.admin_notes += f"\n\n{new_note}"
    else:
        issue.admin_notes = new_note
    
    issue.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(issue)
    
    return {
        "message": "Admin note added successfully",
        "issue_id": issue_id
    }


@router.post("/issues/{issue_id}/resolution")
async def resolve_issue(
    issue_id: int,
    resolution_notes: str = Form(...),
    resolution_image: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Mark issue as resolved with evidence.
    Requires resolution notes and optionally a resolution image.
    """
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    # Validate current status allows resolution
    if issue.status not in ["in_progress", "assigned"]:
        raise HTTPException(
            status_code=400,
            detail="Issue must be 'assigned' or 'in_progress' before resolving"
        )
    
    # Upload resolution image if provided
    resolution_image_path = None
    if resolution_image:
        try:
            # Use file service to validate and save
            full_path, relative_path = await file_service.validate_and_save_issue_image(
                resolution_image, issue_id
            )
            resolution_image_path = relative_path
        except HTTPException as e:
            raise HTTPException(status_code=400, detail=f"Resolution image error: {e.detail}")
    
    # Create history entry
    history_entry = IssueHistory(
        issue_id=issue_id,
        changed_by_user_id=current_user.id,
        old_status=issue.status,
        new_status="resolved",
        notes=f"Resolved: {resolution_notes}",
        created_at=datetime.now(timezone.utc)
    )
    db.add(history_entry)
    
    # Update issue
    issue.status = "resolved"
    issue.resolution_notes = resolution_notes
    if resolution_image_path:
        issue.resolution_image_path = resolution_image_path
    issue.resolved_at = datetime.now(timezone.utc)
    issue.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(issue)
    
    return {
        "message": "Issue marked as resolved",
        "issue_id": issue_id,
        "resolution_notes": resolution_notes,
        "has_resolution_image": resolution_image_path is not None
    }


@router.get("/issues/map/unresolved")
def get_unresolved_issues_for_map(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get all unresolved issues for map display.
    Returns minimal information needed for markers.
    """
    issues = db.query(Issue).filter(Issue.status != "resolved").all()
    
    return {
        "issues": [
            {
                "id": issue.id,
                "latitude": issue.latitude,
                "longitude": issue.longitude,
                "category": issue.category,
                "severity": issue.severity,
                "priority_score": issue.priority_score,
                "status": issue.status,
                "created_at": issue.created_at.isoformat()
            }
            for issue in issues
        ]
    }


@router.get("/issues/{issue_id}/civic-impact", response_model=CivicImpactResult)
def get_issue_civic_impact(
    issue_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Calculate and return civic impact score for an issue.
    This is separate from the operational Priority Score.
    """
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    # For MVP, we use demo contextual values based on issue category and location
    # These would be replaced with real data integration in production
    
    # Calculate safety risk from severity (0-100 scale)
    severity_to_safety_risk = {
        "low": 25,
        "medium": 50,
        "high": 75,
        "critical": 95
    }
    safety_risk = severity_to_safety_risk.get(issue.severity.lower(), 50)
    
    # Determine road type based on category (demo logic)
    road_type = "main_road"  # Default
    if "Highway" in (issue.category or ""):
        road_type = "highway"
    elif "Street" in (issue.category or ""):
        road_type = "local_street"
    elif any(x in (issue.category or "") for x in ["Pothole", "Road"]):
        road_type = "arterial_road"
    
    # Determine nearby locations based on description/context (demo logic)
    nearby_locations = []
    description_lower = (issue.description or "").lower()
    if any(word in description_lower for word in ["school", "children", "students"]):
        nearby_locations.append("school")
    if any(word in description_lower for word in ["hospital", "clinic", "medical"]):
        nearby_locations.append("hospital")
    if any(word in description_lower for word in ["intersection", "crossroad", "junction"]):
        nearby_locations.append("major_intersection")
    if any(word in description_lower for word in ["market", "shop", "store", "commercial"]):
        nearby_locations.append("market")
    if any(word in description_lower for word in ["bus", "transit", "public transport"]):
        nearby_locations.append("bus_stop")
    
    # Default to residential area if no specific location identified
    if not nearby_locations:
        nearby_locations = ["residential_area"]
    
    # Count duplicate reports (for citizen signal)
    # In production, this would query actual duplicate detection
    duplicate_count = 1  # Default single report
    if issue.duplicate_group_id:
        # Count issues in same duplicate group
        duplicate_count = db.query(Issue).filter(
            Issue.duplicate_group_id == issue.duplicate_group_id
        ).count()
    
    # Calculate civic impact
    impact_result = CivicImpactService.calculate_civic_impact(
        severity=issue.severity,
        safety_risk=safety_risk,
        created_at=issue.created_at,
        duplicate_count=duplicate_count,
        road_type=road_type,
        area_type="residential",  # Could be enhanced with geolocation data
        nearby_locations=nearby_locations
    )
    
    return impact_result


@router.get("/hotspots", response_model=List[Hotspot])
def get_civic_hotspots(
    radius_km: float = Query(0.5, ge=0.1, le=5.0, description="Clustering radius in kilometers"),
    min_size: int = Query(3, ge=2, le=10, description="Minimum issues to form a hotspot"),
    include_resolved: bool = Query(False, description="Include resolved issues in clustering"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Detect and return civic hotspots (geographic clusters of related issues).
    
    Returns hotspots sorted by highest civic impact (descending).
    """
    hotspots = HotspotService.detect_hotspots(
        db=db,
        radius_km=radius_km,
        min_hotspot_size=min_size,
        include_resolved=include_resolved
    )
    
    return hotspots


@router.get("/hotspots/{hotspot_id}", response_model=Hotspot)
def get_hotspot_detail(
    hotspot_id: str,
    radius_km: float = Query(0.5, ge=0.1, le=5.0),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get details for a specific hotspot.
    """
    hotspot = HotspotService.get_hotspot_by_id(db, hotspot_id, radius_km)
    
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    
    return hotspot

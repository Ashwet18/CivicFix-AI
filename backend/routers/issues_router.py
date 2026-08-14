"""
Issues API endpoints - Create, retrieve, and manage civic issues
"""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User, Issue
from schemas import (
    IssueResponse, IssueCreateResponse, IssueListResponse
)
from services.ai_analysis_service import AIAnalysisService
from services.priority_service import PriorityService
from services.duplicate_detection_service import DuplicateDetectionService
from services.file_service import FileService

router = APIRouter(prefix="/api/issues", tags=["Issues"])

# Initialize services
ai_service = AIAnalysisService()
priority_service = PriorityService()
duplicate_service = DuplicateDetectionService()
file_service = FileService()


@router.post("/", response_model=IssueCreateResponse, status_code=201)
async def create_issue(
    image: UploadFile = File(...),
    category: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    description: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new civic issue with image upload.
    Requires citizen authentication.
    
    Args:
        image: Required image file (JPG, PNG, WEBP, max 5MB)
        category: Issue category
        latitude: GPS latitude
        longitude: GPS longitude
        description: Optional description (max 500 chars)
        address: Optional human-readable address
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Issue creation response with analysis results
    """
    # Validate description length
    if description and len(description) > 500:
        raise HTTPException(
            status_code=400,
            detail="Description cannot exceed 500 characters"
        )
    
    # Validate category
    valid_categories = {
        "Pothole / Road Damage",
        "Broken Streetlight", 
        "Garbage / Waste",
        "Drainage / Open Manhole",
        "Damaged Footpath",
        "Damaged Traffic Sign",
        "Water Leakage",
        "Other"
    }
    
    if category not in valid_categories:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}"
        )
    
    try:
        # Create issue record first (without image path)
        new_issue = Issue(
            user_id=current_user.id,
            category=category,
            description=description,
            latitude=latitude,
            longitude=longitude,
            address=address,
            status="reported",
            severity="medium",  # Will be updated by AI analysis
            priority_score=0.0,  # Will be calculated
            image_path="",  # Will be updated after file upload
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        db.add(new_issue)
        db.flush()  # Get the ID without committing
        
        # Save uploaded image with issue ID
        try:
            full_path, relative_path = await file_service.validate_and_save_issue_image(
                image, new_issue.id
            )
            new_issue.image_path = relative_path
            
        except HTTPException:
            # Clean up issue if image upload fails
            db.rollback()
            raise
        
        # Run AI analysis
        ai_analysis = ai_service.analyze_issue(
            category=category,
            description=description,
            image_path=full_path
        )
        
        # Update issue with AI analysis results
        new_issue.severity = ai_analysis["severity"]
        new_issue.ai_category_confidence = ai_analysis["category_confidence"]
        new_issue.ai_severity_confidence = ai_analysis["severity_confidence"]
        new_issue.ai_analysis_notes = ai_analysis["analysis_notes"]
        
        # Check for duplicates
        is_duplicate, duplicate_group_id, duplicate_count = duplicate_service.process_duplicate_detection(
            new_issue, db
        )
        
        # Calculate priority score
        priority_score = priority_service.calculate_priority(
            severity=new_issue.severity,
            safety_risk=ai_analysis["safety_risk"],
            duplicate_count=duplicate_count - 1,  # Subtract 1 as this issue is included
            created_at=new_issue.created_at
        )
        new_issue.priority_score = priority_score
        
        # If duplicate detected, update existing issues' priority scores
        if is_duplicate and duplicate_group_id:
            # Get all issues in the duplicate group
            group_issues = db.query(Issue).filter(
                Issue.duplicate_group_id == duplicate_group_id
            ).all()
            
            # Recalculate priority for all issues in group
            for issue in group_issues:
                if issue.id != new_issue.id:  # Don't recalculate for the new issue
                    updated_priority = priority_service.recalculate_priority_for_duplicates(
                        original_severity=issue.severity,
                        original_safety_risk=ai_analysis["safety_risk"],  # Use same safety risk
                        new_duplicate_count=duplicate_count - 1,
                        original_created_at=issue.created_at
                    )
                    issue.priority_score = updated_priority
                    issue.updated_at = datetime.now(timezone.utc)
        
        # Commit all changes
        db.commit()
        db.refresh(new_issue)
        
        return IssueCreateResponse(
            issue_id=new_issue.id,
            category=new_issue.category,
            severity=new_issue.severity,
            safety_risk=ai_analysis["safety_risk"],
            priority_score=new_issue.priority_score,
            duplicate_count=duplicate_count,
            status=new_issue.status,
            ai_analysis_notes=new_issue.ai_analysis_notes or "",
            is_duplicate=is_duplicate,
            duplicate_group_id=duplicate_group_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create issue: {str(e)}"
        )


@router.get("/my", response_model=IssueListResponse)
def get_my_issues(
    page: int = 1,
    page_size: int = 20,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get issues belonging to the current user.
    
    Args:
        page: Page number (1-based)
        page_size: Items per page (max 100)
        status_filter: Optional status filter
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Paginated list of user's issues
    """
    # Validate pagination
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 20
    
    # Build query
    query = db.query(Issue).filter(Issue.user_id == current_user.id)
    
    # Apply status filter if provided
    if status_filter:
        valid_statuses = {"reported", "assigned", "in_progress", "resolved"}
        if status_filter.lower() in valid_statuses:
            query = query.filter(Issue.status == status_filter.lower())
    
    # Get total count for pagination
    total_count = query.count()
    
    # Apply pagination and ordering (newest first)
    offset = (page - 1) * page_size
    issues = query.order_by(Issue.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Calculate pagination info
    total_pages = (total_count + page_size - 1) // page_size
    
    return IssueListResponse(
        issues=issues,
        total_count=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{issue_id}", response_model=IssueResponse)
def get_issue_detail(
    issue_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information for a specific issue.
    Citizens can only access their own issues.
    
    Args:
        issue_id: Issue ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Detailed issue information
    """
    # Get issue
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    
    if not issue:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )
    
    # Check authorization - citizens can only see their own issues
    if current_user.role == "citizen" and issue.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Access denied. You can only view your own issues."
        )
    
    return issue


# Additional endpoint for duplicate group information
@router.get("/{issue_id}/duplicates")
def get_issue_duplicates(
    issue_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get duplicate group information for an issue.
    
    Args:
        issue_id: Issue ID
        current_user: Authenticated user
        db: Database session
        
    Returns:
        Duplicate group information
    """
    # Get issue and check access
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    if current_user.role == "citizen" and issue.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get duplicate group info
    duplicate_info = duplicate_service.get_duplicate_group_info(issue_id, db)
    
    if not duplicate_info:
        return {"is_duplicate": False, "duplicate_count": 1}
    
    return {
        "is_duplicate": True,
        "duplicate_group_id": duplicate_info["duplicate_group_id"],
        "primary_issue_id": duplicate_info["primary_issue_id"],
        "duplicate_count": duplicate_info["total_count"],
        "is_primary": duplicate_info["is_primary"],
        "created_at": duplicate_info["created_at"]
    }
"""
Pydantic schemas for request/response validation
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str
    role: str = "citizen"  # Default to citizen


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


# Issue schemas (expanded for Phase 2)
class IssueCreate(BaseModel):
    category: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None


class IssueResponse(BaseModel):
    id: int
    user_id: int
    title: Optional[str] = None
    description: Optional[str] = None
    category: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    severity: str
    status: str
    priority_score: float
    image_path: str
    thumbnail_path: Optional[str] = None
    ai_category_confidence: Optional[float] = None
    ai_severity_confidence: Optional[float] = None
    ai_analysis_notes: Optional[str] = None
    assigned_department: Optional[str] = None
    duplicate_group_id: Optional[int] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    resolution_image_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class IssueCreateResponse(BaseModel):
    """Response for issue creation with analysis results"""
    issue_id: int
    category: str
    severity: str
    safety_risk: int
    priority_score: float
    duplicate_count: int
    status: str
    ai_analysis_notes: str
    is_duplicate: bool
    duplicate_group_id: Optional[int] = None


class IssueListResponse(BaseModel):
    """Response for issue list with pagination"""
    issues: List[IssueResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int


# Health check
class HealthResponse(BaseModel):
    status: str
    message: str
    version: str


# Admin schemas (Phase 3)
class AdminDashboardStats(BaseModel):
    """Dashboard statistics"""
    total_issues: int
    critical_issues: int
    high_priority_issues: int
    pending_issues: int
    in_progress_issues: int
    resolved_issues: int
    issues_by_category: dict
    issues_by_status: dict
    average_resolution_time_hours: Optional[float] = None


class IssueStatusUpdate(BaseModel):
    """Update issue status"""
    new_status: str
    notes: Optional[str] = None


class IssueDepartmentUpdate(BaseModel):
    """Assign issue to department"""
    department: str


class IssueAdminNote(BaseModel):
    """Add admin note to issue"""
    note: str


class IssueResolution(BaseModel):
    """Mark issue as resolved with evidence"""
    resolution_notes: str


class IssueHistoryResponse(BaseModel):
    """Issue status history entry"""
    id: int
    issue_id: int
    changed_by_user_id: Optional[int]
    old_status: Optional[str]
    new_status: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class AdminIssueDetailResponse(IssueResponse):
    """Extended issue response for admin with additional fields"""
    admin_notes: Optional[str] = None
    assigned_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    resolution_image_path: Optional[str] = None
    history: List[IssueHistoryResponse] = []
    reporter_email: Optional[str] = None
    
    class Config:
        from_attributes = True


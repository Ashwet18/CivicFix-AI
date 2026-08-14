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


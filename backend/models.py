"""
SQLAlchemy database models
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    """User model for citizens and admins"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    phone = Column(String(20))
    role = Column(String(20), nullable=False)  # 'citizen' or 'admin'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    issues = relationship("Issue", back_populates="user")


class Issue(Base):
    """Issue model for civic problems"""
    __tablename__ = "issues"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Basic info
    title = Column(String(255))
    description = Column(Text)
    category = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False)  # 'low', 'medium', 'high', 'critical'
    status = Column(String(20), nullable=False, default='reported', index=True)  # 'reported', 'assigned', 'in_progress', 'resolved'
    priority_score = Column(Float, nullable=False, index=True)
    
    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(Text)
    
    # Images
    image_path = Column(String(500), nullable=False)
    thumbnail_path = Column(String(500))
    
    # AI Analysis
    ai_category_confidence = Column(Float)
    ai_severity_confidence = Column(Float)
    ai_analysis_notes = Column(Text)
    
    # Duplicate tracking
    duplicate_group_id = Column(Integer, ForeignKey("duplicate_groups.id"), index=True)
    
    # Assignment
    assigned_department = Column(String(100))
    assigned_at = Column(DateTime)
    
    # Resolution
    resolved_at = Column(DateTime)
    resolution_notes = Column(Text)
    resolution_image_path = Column(String(500))
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="issues")
    duplicate_group = relationship("DuplicateGroup", back_populates="issues")
    history = relationship("IssueHistory", back_populates="issue")


class DuplicateGroup(Base):
    """Groups duplicate issue reports together"""
    __tablename__ = "duplicate_groups"
    
    id = Column(Integer, primary_key=True, index=True)
    primary_issue_id = Column(Integer, nullable=False, index=True)  # Remove FK constraint to avoid circular ref
    issue_count = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships - let SQLAlchemy handle the foreign key relationship through Issue.duplicate_group_id
    issues = relationship("Issue", foreign_keys="Issue.duplicate_group_id", back_populates="duplicate_group")


class IssueHistory(Base):
    """Tracks status changes and updates to issues"""
    __tablename__ = "issue_history"
    
    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False, index=True)
    changed_by_user_id = Column(Integer, ForeignKey("users.id"))
    old_status = Column(String(20))
    new_status = Column(String(20))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    issue = relationship("Issue", back_populates="history")
    changed_by = relationship("User")

"""
Priority Service - Calculate issue priority scores
Formula: Severity (40%) + Safety Risk (30%) + Duplicate Count (20%) + Age (10%)
"""
from datetime import datetime, timezone
from typing import Optional


class PriorityService:
    """
    Calculates priority scores for civic issues based on multiple factors.
    Priority score ranges from 0-100 with higher scores indicating higher priority.
    """
    
    def __init__(self):
        # Severity score mappings (0-100)
        self.severity_scores = {
            "critical": 100,
            "high": 75,
            "medium": 50,
            "low": 25
        }
        
        # Weight percentages (must sum to 100)
        self.weights = {
            "severity": 0.40,      # 40%
            "safety_risk": 0.30,   # 30%
            "duplicate_count": 0.20, # 20%
            "age": 0.10            # 10%
        }
    
    def calculate_priority(
        self,
        severity: str,
        safety_risk: int,
        duplicate_count: int = 0,
        created_at: Optional[datetime] = None
    ) -> float:
        """
        Calculate priority score for an issue.
        
        Args:
            severity: Severity level ("low", "medium", "high", "critical")
            safety_risk: Safety risk score (0-100)
            duplicate_count: Number of duplicate reports (0+)
            created_at: Issue creation timestamp (defaults to now)
            
        Returns:
            Priority score (0-100)
        """
        # Severity component (0-100)
        severity_score = self.severity_scores.get(severity.lower(), 25)
        
        # Safety risk component (already 0-100)
        safety_score = max(0, min(100, safety_risk))
        
        # Duplicate count component (0-100)
        # More duplicates = higher priority (logarithmic scaling)
        if duplicate_count <= 0:
            duplicate_score = 0
        elif duplicate_count == 1:
            duplicate_score = 20
        elif duplicate_count <= 3:
            duplicate_score = 40
        elif duplicate_count <= 5:
            duplicate_score = 60
        elif duplicate_count <= 10:
            duplicate_score = 80
        else:
            duplicate_score = 100
        
        # Age component (0-100)
        age_score = self._calculate_age_score(created_at or datetime.now(timezone.utc))
        
        # Calculate weighted priority
        priority = (
            (severity_score * self.weights["severity"]) +
            (safety_score * self.weights["safety_risk"]) +
            (duplicate_score * self.weights["duplicate_count"]) +
            (age_score * self.weights["age"])
        )
        
        return round(priority, 2)
    
    def _calculate_age_score(self, created_at: datetime) -> float:
        """
        Calculate age component score. 
        Newer issues get higher priority initially (0 for brand new).
        Score increases over time as issues remain unresolved.
        
        Args:
            created_at: Issue creation timestamp
            
        Returns:
            Age score (0-100)
        """
        now = datetime.now(timezone.utc)
        
        # Ensure created_at is timezone-aware
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        
        # Calculate age in hours
        age_delta = now - created_at
        age_hours = age_delta.total_seconds() / 3600
        
        # Age scoring (logarithmic increase)
        if age_hours <= 0:
            return 0  # Brand new issue
        elif age_hours <= 24:  # 0-24 hours
            return min(10, age_hours * 0.4)  # 0-10 points
        elif age_hours <= 168:  # 1-7 days
            return min(30, 10 + (age_hours - 24) * 0.14)  # 10-30 points
        elif age_hours <= 720:  # 1-30 days
            return min(60, 30 + (age_hours - 168) * 0.05)  # 30-60 points
        elif age_hours <= 2160:  # 1-90 days
            return min(85, 60 + (age_hours - 720) * 0.017)  # 60-85 points
        else:  # 90+ days
            return min(100, 85 + (age_hours - 2160) * 0.001)  # 85-100 points
    
    def recalculate_priority_for_duplicates(
        self,
        original_severity: str,
        original_safety_risk: int,
        new_duplicate_count: int,
        original_created_at: datetime
    ) -> float:
        """
        Recalculate priority when duplicate count changes.
        Used when new duplicate reports are linked to an existing issue.
        
        Args:
            original_severity: Original issue severity
            original_safety_risk: Original safety risk score
            new_duplicate_count: Updated duplicate count
            original_created_at: Original issue creation time
            
        Returns:
            Updated priority score
        """
        return self.calculate_priority(
            severity=original_severity,
            safety_risk=original_safety_risk,
            duplicate_count=new_duplicate_count,
            created_at=original_created_at
        )
    
    def get_priority_category(self, priority_score: float) -> str:
        """
        Convert numeric priority score to category label.
        
        Args:
            priority_score: Priority score (0-100)
            
        Returns:
            Priority category string
        """
        if priority_score >= 80:
            return "Critical"
        elif priority_score >= 60:
            return "High"
        elif priority_score >= 40:
            return "Medium"
        else:
            return "Low"
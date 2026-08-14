"""
Duplicate Detection Service - Find similar issues using GPS and category matching
No ML libraries, uses Haversine distance and category comparison
"""
import math
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from models import Issue, DuplicateGroup


class DuplicateDetectionService:
    """
    Detects duplicate civic issues using:
    1. Haversine distance (50m radius)
    2. Category matching
    3. Optional: Image hash comparison (future enhancement)
    """
    
    def __init__(self, detection_radius_meters: int = 50):
        """
        Initialize duplicate detection service.
        
        Args:
            detection_radius_meters: Maximum distance for duplicate detection (default: 50m)
        """
        self.detection_radius = detection_radius_meters
    
    def find_duplicates(
        self,
        latitude: float,
        longitude: float,
        category: str,
        db: Session,
        exclude_issue_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Find potential duplicate issues near the given location.
        Only considers unresolved issues (status != 'resolved').
        
        Args:
            latitude: Issue latitude
            longitude: Issue longitude  
            category: Issue category
            db: Database session
            exclude_issue_id: Optional issue ID to exclude from search
            
        Returns:
            List of potential duplicate issues with distances
        """
        # Get unresolved issues within detection radius
        nearby_issues = self._get_nearby_issues(
            latitude, longitude, db, exclude_issue_id
        )
        
        duplicates = []
        
        for issue in nearby_issues:
            # Calculate exact distance
            distance = self._calculate_distance(
                latitude, longitude,
                issue.latitude, issue.longitude
            )
            
            # Check if within radius and same category
            if distance <= self.detection_radius and issue.category == category:
                duplicates.append({
                    "issue_id": issue.id,
                    "distance_meters": round(distance, 2),
                    "category": issue.category,
                    "severity": issue.severity,
                    "created_at": issue.created_at,
                    "duplicate_group_id": issue.duplicate_group_id
                })
        
        # Sort by distance (closest first)
        duplicates.sort(key=lambda x: x["distance_meters"])
        
        return duplicates
    
    def process_duplicate_detection(
        self,
        new_issue: Issue,
        db: Session
    ) -> Tuple[bool, Optional[int], int]:
        """
        Process duplicate detection for a new issue.
        Links to existing duplicate group or creates new one if duplicates found.
        
        Args:
            new_issue: Newly created issue
            db: Database session
            
        Returns:
            Tuple of (is_duplicate, duplicate_group_id, total_count_in_group)
        """
        # Find potential duplicates
        duplicates = self.find_duplicates(
            new_issue.latitude,
            new_issue.longitude,
            new_issue.category,
            db,
            exclude_issue_id=new_issue.id
        )
        
        if not duplicates:
            # No duplicates found
            return False, None, 1
        
        # Get the closest duplicate
        closest_duplicate = duplicates[0]
        
        # Check if closest duplicate is already in a group
        existing_issue = db.query(Issue).filter(
            Issue.id == closest_duplicate["issue_id"]
        ).first()
        
        if existing_issue and existing_issue.duplicate_group_id:
            # Join existing duplicate group
            duplicate_group_id = existing_issue.duplicate_group_id
            new_issue.duplicate_group_id = duplicate_group_id
            
            # Update duplicate group count
            duplicate_group = db.query(DuplicateGroup).filter(
                DuplicateGroup.id == duplicate_group_id
            ).first()
            
            if duplicate_group:
                duplicate_group.issue_count += 1
                total_count = duplicate_group.issue_count
            else:
                total_count = 2  # Fallback
                
        else:
            # Create new duplicate group
            duplicate_group = DuplicateGroup(
                primary_issue_id=existing_issue.id,
                issue_count=2,  # Original + new issue
                created_at=new_issue.created_at
            )
            db.add(duplicate_group)
            db.flush()  # Get the ID
            
            # Link both issues to the group
            existing_issue.duplicate_group_id = duplicate_group.id
            new_issue.duplicate_group_id = duplicate_group.id
            
            duplicate_group_id = duplicate_group.id
            total_count = 2
        
        db.commit()
        
        return True, duplicate_group_id, total_count
    
    def _get_nearby_issues(
        self,
        latitude: float,
        longitude: float,
        db: Session,
        exclude_issue_id: Optional[int] = None
    ) -> List[Issue]:
        """
        Get issues within a rough bounding box for initial filtering.
        Uses simple lat/lon bounds before precise distance calculation.
        
        Args:
            latitude: Center latitude
            longitude: Center longitude
            db: Database session
            exclude_issue_id: Issue ID to exclude
            
        Returns:
            List of nearby issues
        """
        # Calculate rough bounding box (approximately 2x detection radius)
        # 1 degree latitude ≈ 111km, longitude varies by latitude
        lat_delta = (self.detection_radius * 2) / 111000  # Convert meters to degrees
        lon_delta = lat_delta / math.cos(math.radians(latitude))
        
        # Build query
        query = db.query(Issue).filter(
            Issue.status != "resolved",  # Only unresolved issues
            Issue.latitude.between(latitude - lat_delta, latitude + lat_delta),
            Issue.longitude.between(longitude - lon_delta, longitude + lon_delta)
        )
        
        if exclude_issue_id:
            query = query.filter(Issue.id != exclude_issue_id)
        
        return query.all()
    
    def _calculate_distance(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        Calculate Haversine distance between two GPS coordinates.
        
        Args:
            lat1, lon1: First coordinate pair
            lat2, lon2: Second coordinate pair
            
        Returns:
            Distance in meters
        """
        # Earth radius in meters
        R = 6371000
        
        # Convert to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        # Haversine formula
        a = (
            math.sin(delta_lat / 2) ** 2 +
            math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    def get_duplicate_group_info(
        self,
        issue_id: int,
        db: Session
    ) -> Optional[Dict[str, Any]]:
        """
        Get duplicate group information for an issue.
        
        Args:
            issue_id: Issue ID
            db: Database session
            
        Returns:
            Dictionary with duplicate group info or None
        """
        issue = db.query(Issue).filter(Issue.id == issue_id).first()
        
        if not issue or not issue.duplicate_group_id:
            return None
        
        duplicate_group = db.query(DuplicateGroup).filter(
            DuplicateGroup.id == issue.duplicate_group_id
        ).first()
        
        if not duplicate_group:
            return None
        
        # Get all issues in the group
        group_issues = db.query(Issue).filter(
            Issue.duplicate_group_id == duplicate_group.id
        ).order_by(Issue.created_at).all()
        
        return {
            "duplicate_group_id": duplicate_group.id,
            "primary_issue_id": duplicate_group.primary_issue_id,
            "total_count": duplicate_group.issue_count,
            "created_at": duplicate_group.created_at,
            "issue_ids": [issue.id for issue in group_issues],
            "is_primary": issue.id == duplicate_group.primary_issue_id
        }
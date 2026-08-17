"""
Civic Hotspot Detection Service
Identifies geographic clusters of related civic issues using existing GPS and duplicate detection infrastructure.
"""
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from math import radians, cos, sin, asin, sqrt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import Issue
from services.impact_service import CivicImpactService


class Hotspot(BaseModel):
    """Geographic cluster of related civic issues"""
    hotspot_id: str
    center_latitude: float
    center_longitude: float
    issue_count: int
    issue_ids: List[int]
    categories: List[str]
    highest_civic_impact: float
    average_civic_impact: float
    critical_issue_count: int
    status_summary: Dict[str, int]


class HotspotService:
    """Service for detecting and analyzing civic hotspots"""
    
    # Default clustering radius in kilometers
    DEFAULT_RADIUS_KM = 0.5  # 500 meters
    
    # Minimum issues to form a hotspot
    MIN_HOTSPOT_SIZE = 3
    
    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great circle distance between two points on Earth.
        Returns distance in kilometers.
        
        Args:
            lat1, lon1: First point coordinates
            lat2, lon2: Second point coordinates
            
        Returns:
            Distance in kilometers
        """
        # Convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        # Radius of Earth in kilometers
        r = 6371
        
        return c * r
    
    @staticmethod
    def calculate_center(coordinates: List[Tuple[float, float]]) -> Tuple[float, float]:
        """
        Calculate the geographic center (centroid) of a set of coordinates.
        
        Args:
            coordinates: List of (latitude, longitude) tuples
            
        Returns:
            Tuple of (center_latitude, center_longitude)
        """
        if not coordinates:
            return (0.0, 0.0)
        
        # Simple arithmetic mean for small geographic areas
        avg_lat = sum(lat for lat, _ in coordinates) / len(coordinates)
        avg_lon = sum(lon for _, lon in coordinates) / len(coordinates)
        
        return (avg_lat, avg_lon)
    
    @staticmethod
    def calculate_civic_impact_for_issue(
        issue: Issue,
        db: Session
    ) -> float:
        """
        Calculate civic impact score for a single issue.
        
        Args:
            issue: Issue model instance
            db: Database session
            
        Returns:
            Civic impact score (0-100)
        """
        # Map severity to safety risk
        severity_to_safety_risk = {
            "low": 25,
            "medium": 50,
            "high": 75,
            "critical": 95
        }
        safety_risk = severity_to_safety_risk.get(issue.severity.lower(), 50)
        
        # Determine road type from category
        road_type = "main_road"
        if "Highway" in (issue.category or ""):
            road_type = "highway"
        elif "Street" in (issue.category or ""):
            road_type = "local_street"
        elif any(x in (issue.category or "") for x in ["Pothole", "Road"]):
            road_type = "arterial_road"
        
        # Extract nearby locations from description
        nearby_locations = []
        description_lower = (issue.description or "").lower()
        if any(word in description_lower for word in ["school", "children", "students"]):
            nearby_locations.append("school")
        if any(word in description_lower for word in ["hospital", "clinic", "medical"]):
            nearby_locations.append("hospital")
        if any(word in description_lower for word in ["intersection", "crossroad", "junction"]):
            nearby_locations.append("major_intersection")
        
        if not nearby_locations:
            nearby_locations = ["residential_area"]
        
        # Count duplicates
        duplicate_count = 1
        if issue.duplicate_group_id:
            duplicate_count = db.query(Issue).filter(
                Issue.duplicate_group_id == issue.duplicate_group_id
            ).count()
        
        # Calculate impact
        result = CivicImpactService.calculate_civic_impact(
            severity=issue.severity,
            safety_risk=safety_risk,
            created_at=issue.created_at,
            duplicate_count=duplicate_count,
            road_type=road_type,
            area_type="residential",
            nearby_locations=nearby_locations
        )
        
        return result.civic_impact_score
    
    @classmethod
    def detect_hotspots(
        cls,
        db: Session,
        radius_km: float = DEFAULT_RADIUS_KM,
        min_hotspot_size: int = MIN_HOTSPOT_SIZE,
        include_resolved: bool = False
    ) -> List[Hotspot]:
        """
        Detect geographic hotspots of civic issues.
        
        Uses a simple clustering algorithm:
        1. Find all unresolved issues
        2. For each issue, find nearby issues within radius
        3. Group issues that share proximity
        4. Calculate metrics for each hotspot
        
        Args:
            db: Database session
            radius_km: Clustering radius in kilometers
            min_hotspot_size: Minimum issues to form a hotspot
            include_resolved: Whether to include resolved issues
            
        Returns:
            List of Hotspot objects sorted by civic impact (descending)
        """
        # Get all issues
        query = db.query(Issue)
        if not include_resolved:
            query = query.filter(Issue.status != "resolved")
        
        issues = query.all()
        
        if len(issues) < min_hotspot_size:
            return []
        
        # Track which issues have been clustered
        clustered_issue_ids = set()
        hotspots = []
        
        # Simple clustering: for each unclustered issue, find nearby issues
        for seed_issue in issues:
            if seed_issue.id in clustered_issue_ids:
                continue
            
            # Find all issues within radius
            cluster = [seed_issue]
            cluster_ids = {seed_issue.id}
            
            for candidate_issue in issues:
                if candidate_issue.id in cluster_ids:
                    continue
                
                # Calculate distance from seed issue
                distance = cls.haversine_distance(
                    seed_issue.latitude,
                    seed_issue.longitude,
                    candidate_issue.latitude,
                    candidate_issue.longitude
                )
                
                if distance <= radius_km:
                    cluster.append(candidate_issue)
                    cluster_ids.add(candidate_issue.id)
            
            # Only create hotspot if cluster is large enough
            if len(cluster) >= min_hotspot_size:
                # Calculate hotspot metrics
                coordinates = [(i.latitude, i.longitude) for i in cluster]
                center_lat, center_lon = cls.calculate_center(coordinates)
                
                # Get unique categories (sorted by frequency)
                category_counts = {}
                for issue in cluster:
                    cat = issue.category
                    category_counts[cat] = category_counts.get(cat, 0) + 1
                
                categories = sorted(
                    category_counts.keys(),
                    key=lambda c: category_counts[c],
                    reverse=True
                )
                
                # Calculate civic impact scores
                impact_scores = []
                for issue in cluster:
                    try:
                        score = cls.calculate_civic_impact_for_issue(issue, db)
                        impact_scores.append(score)
                    except Exception:
                        # If impact calculation fails, use priority score as fallback
                        impact_scores.append(issue.priority_score)
                
                highest_impact = max(impact_scores) if impact_scores else 0
                average_impact = sum(impact_scores) / len(impact_scores) if impact_scores else 0
                
                # Count critical issues
                critical_count = sum(1 for i in cluster if i.severity == "critical")
                
                # Status summary
                status_summary = {}
                for issue in cluster:
                    status = issue.status
                    status_summary[status] = status_summary.get(status, 0) + 1
                
                # Create hotspot
                hotspot = Hotspot(
                    hotspot_id=f"HS-{seed_issue.id}",
                    center_latitude=center_lat,
                    center_longitude=center_lon,
                    issue_count=len(cluster),
                    issue_ids=[i.id for i in cluster],
                    categories=categories,
                    highest_civic_impact=round(highest_impact, 2),
                    average_civic_impact=round(average_impact, 2),
                    critical_issue_count=critical_count,
                    status_summary=status_summary
                )
                
                hotspots.append(hotspot)
                
                # Mark these issues as clustered
                clustered_issue_ids.update(cluster_ids)
        
        # Sort hotspots by highest civic impact (descending)
        hotspots.sort(key=lambda h: h.highest_civic_impact, reverse=True)
        
        return hotspots
    
    @classmethod
    def get_hotspot_by_id(
        cls,
        db: Session,
        hotspot_id: str,
        radius_km: float = DEFAULT_RADIUS_KM
    ) -> Optional[Hotspot]:
        """
        Retrieve a specific hotspot by ID.
        
        Args:
            db: Database session
            hotspot_id: Hotspot identifier (format: HS-{issue_id})
            radius_km: Clustering radius in kilometers
            
        Returns:
            Hotspot object or None if not found
        """
        # Extract seed issue ID from hotspot_id
        try:
            seed_id = int(hotspot_id.replace("HS-", ""))
        except ValueError:
            return None
        
        # Re-detect hotspots and find the matching one
        hotspots = cls.detect_hotspots(db, radius_km=radius_km)
        
        for hotspot in hotspots:
            if hotspot.hotspot_id == hotspot_id:
                return hotspot
        
        return None


# Convenience function for easy import
def detect_hotspots(db: Session, **kwargs) -> List[Hotspot]:
    """Convenience function to detect civic hotspots"""
    return HotspotService.detect_hotspots(db, **kwargs)

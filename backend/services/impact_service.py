"""
Civic Impact Engine
Calculates explainable civic impact scores for issues based on multiple factors.

This is separate from the operational Priority Score and focuses on estimated public impact.
"""
from datetime import datetime, timezone
from typing import Dict, Optional
from pydantic import BaseModel


class ImpactComponents(BaseModel):
    """Individual components that contribute to civic impact"""
    hazard_score: float  # 0-100, weighted 35%
    exposure_score: float  # 0-100, weighted 30%
    location_criticality_score: float  # 0-100, weighted 15%
    citizen_signal_score: float  # 0-100, weighted 10%
    age_score: float  # 0-100, weighted 10%


class CivicImpactResult(BaseModel):
    """Complete civic impact analysis result"""
    civic_impact_score: float  # 0-100
    impact_level: str  # CRITICAL, HIGH, MEDIUM, LOW
    hazard_score: float
    exposure_score: float
    location_criticality_score: float
    citizen_signal_score: float
    age_score: float


# Location type criticality ratings (0-100)
LOCATION_CRITICALITY = {
    "school": 95,
    "hospital": 100,
    "major_intersection": 85,
    "market": 75,
    "bus_stop": 70,
    "residential_area": 60,
    "normal_road": 40,
    "unknown": 30
}

# Public exposure ratings based on road type/area (0-100)
# These are demo values - in production, would integrate with traffic/footfall data
PUBLIC_EXPOSURE_RATINGS = {
    "highway": 95,
    "main_road": 85,
    "arterial_road": 80,
    "collector_road": 70,
    "local_street": 60,
    "residential_street": 50,
    "side_street": 40,
    "alley": 30,
    "unknown": 50  # Default moderate exposure
}


class CivicImpactService:
    """Service for calculating civic impact scores"""
    
    # Component weights (must sum to 100%)
    WEIGHTS = {
        "hazard": 0.35,
        "exposure": 0.30,
        "location": 0.15,
        "citizen": 0.10,
        "age": 0.10
    }
    
    @staticmethod
    def calculate_hazard_score(severity: str, safety_risk: int) -> float:
        """
        Calculate hazard/safety risk score (35% weight)
        
        Uses existing severity and safety_risk values.
        
        Args:
            severity: Issue severity (low, medium, high, critical)
            safety_risk: Existing safety risk score (0-100)
            
        Returns:
            Hazard score (0-100)
        """
        # Severity base scores
        severity_scores = {
            "low": 25,
            "medium": 50,
            "high": 75,
            "critical": 100
        }
        
        severity_score = severity_scores.get(severity.lower(), 50)
        
        # Combine severity and safety_risk with 60/40 split
        hazard_score = (severity_score * 0.6) + (safety_risk * 0.4)
        
        return min(100, max(0, hazard_score))
    
    @staticmethod
    def calculate_exposure_score(
        road_type: Optional[str] = None,
        area_type: Optional[str] = None,
        estimated_daily_exposure: Optional[int] = None
    ) -> float:
        """
        Calculate public exposure score (30% weight)
        
        For MVP, uses road type and area type as proxies for exposure.
        In production, would integrate with actual traffic/pedestrian data.
        
        Args:
            road_type: Type of road (highway, main_road, etc.)
            area_type: Type of area (commercial, residential, etc.)
            estimated_daily_exposure: Estimated people exposed per day (optional)
            
        Returns:
            Exposure score (0-100)
        """
        # If actual exposure data provided, use it
        if estimated_daily_exposure is not None:
            # Scale: 0-1000 people = 0-100 score (logarithmic for better scaling)
            import math
            if estimated_daily_exposure <= 0:
                return 0
            # Log scale: 10 people = 30, 100 = 60, 1000 = 90, 10000 = 100
            score = min(100, (math.log10(estimated_daily_exposure + 1) / 4) * 100)
            return score
        
        # Otherwise use road type and area type
        road_score = PUBLIC_EXPOSURE_RATINGS.get(
            road_type.lower() if road_type else "unknown",
            50
        )
        
        # Area type modifier
        area_modifiers = {
            "commercial": 1.2,
            "downtown": 1.3,
            "industrial": 0.9,
            "residential": 1.0,
            "suburban": 0.8,
            "rural": 0.6
        }
        
        modifier = area_modifiers.get(
            area_type.lower() if area_type else "residential",
            1.0
        )
        
        exposure_score = road_score * modifier
        
        return min(100, max(0, exposure_score))
    
    @staticmethod
    def calculate_location_criticality_score(
        nearby_locations: list[str]
    ) -> float:
        """
        Calculate location criticality score (15% weight)
        
        Based on proximity to critical facilities.
        
        Args:
            nearby_locations: List of nearby location types
                             (school, hospital, major_intersection, etc.)
            
        Returns:
            Location criticality score (0-100)
        """
        if not nearby_locations:
            return LOCATION_CRITICALITY["unknown"]
        
        # Take the maximum criticality from nearby locations
        max_criticality = 0
        for location in nearby_locations:
            criticality = LOCATION_CRITICALITY.get(
                location.lower(),
                LOCATION_CRITICALITY["unknown"]
            )
            max_criticality = max(max_criticality, criticality)
        
        return max_criticality
    
    @staticmethod
    def calculate_citizen_signal_score(duplicate_count: int) -> float:
        """
        Calculate citizen signal score (10% weight)
        
        Based on number of duplicate reports (citizen engagement).
        
        Args:
            duplicate_count: Number of duplicate/similar reports
            
        Returns:
            Citizen signal score (0-100)
        """
        if duplicate_count <= 1:
            return 10  # Single report, minimal signal
        
        # Logarithmic scale for duplicate reports
        # 2 reports = 40, 5 = 70, 10 = 85, 20+ = 100
        import math
        score = 10 + (math.log10(duplicate_count) * 45)
        
        return min(100, max(10, score))
    
    @staticmethod
    def calculate_age_score(created_at: datetime) -> float:
        """
        Calculate age score (10% weight)
        
        Older unresolved issues score higher.
        
        Args:
            created_at: Issue creation timestamp
            
        Returns:
            Age score (0-100)
        """
        now = datetime.now(timezone.utc)
        
        # Handle timezone-naive datetimes
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        
        age_hours = (now - created_at).total_seconds() / 3600
        
        # Scoring scale:
        # 0-6 hours = 10 points (very new)
        # 6-24 hours = 20-40 points (new)
        # 1-3 days = 40-60 points (moderate)
        # 3-7 days = 60-80 points (aging)
        # 7+ days = 80-100 points (old)
        
        if age_hours < 6:
            score = 10
        elif age_hours < 24:
            score = 20 + ((age_hours - 6) / 18) * 20
        elif age_hours < 72:  # 3 days
            score = 40 + ((age_hours - 24) / 48) * 20
        elif age_hours < 168:  # 7 days
            score = 60 + ((age_hours - 72) / 96) * 20
        else:
            # Cap at 100 for issues older than 7 days
            score = min(100, 80 + ((age_hours - 168) / 168) * 20)
        
        return score
    
    @classmethod
    def calculate_civic_impact(
        cls,
        severity: str,
        safety_risk: int,
        created_at: datetime,
        duplicate_count: int = 1,
        road_type: Optional[str] = None,
        area_type: Optional[str] = None,
        nearby_locations: Optional[list[str]] = None,
        estimated_daily_exposure: Optional[int] = None
    ) -> CivicImpactResult:
        """
        Calculate complete civic impact score with all components.
        
        Args:
            severity: Issue severity (low, medium, high, critical)
            safety_risk: Existing safety risk score (0-100)
            created_at: Issue creation timestamp
            duplicate_count: Number of duplicate reports
            road_type: Type of road (for exposure calculation)
            area_type: Type of area (for exposure calculation)
            nearby_locations: List of nearby critical locations
            estimated_daily_exposure: Estimated people exposed per day
            
        Returns:
            CivicImpactResult with score and all components
        """
        # Calculate individual component scores
        hazard_score = cls.calculate_hazard_score(severity, safety_risk)
        exposure_score = cls.calculate_exposure_score(
            road_type, area_type, estimated_daily_exposure
        )
        location_score = cls.calculate_location_criticality_score(
            nearby_locations or []
        )
        citizen_score = cls.calculate_citizen_signal_score(duplicate_count)
        age_score = cls.calculate_age_score(created_at)
        
        # Calculate weighted civic impact score
        civic_impact_score = (
            hazard_score * cls.WEIGHTS["hazard"] +
            exposure_score * cls.WEIGHTS["exposure"] +
            location_score * cls.WEIGHTS["location"] +
            citizen_score * cls.WEIGHTS["citizen"] +
            age_score * cls.WEIGHTS["age"]
        )
        
        # Determine impact level
        if civic_impact_score >= 90:
            impact_level = "CRITICAL"
        elif civic_impact_score >= 75:
            impact_level = "HIGH"
        elif civic_impact_score >= 50:
            impact_level = "MEDIUM"
        else:
            impact_level = "LOW"
        
        return CivicImpactResult(
            civic_impact_score=round(civic_impact_score, 2),
            impact_level=impact_level,
            hazard_score=round(hazard_score, 2),
            exposure_score=round(exposure_score, 2),
            location_criticality_score=round(location_score, 2),
            citizen_signal_score=round(citizen_score, 2),
            age_score=round(age_score, 2)
        )


# Convenience function for easy import
def calculate_civic_impact(**kwargs) -> CivicImpactResult:
    """Convenience function to calculate civic impact"""
    return CivicImpactService.calculate_civic_impact(**kwargs)

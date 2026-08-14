"""
AI Analysis Service - Rule-based civic issue analysis
No ML libraries, uses keyword matching and category profiles
"""
import re
from typing import Dict, Any, Optional
from pathlib import Path


class AIAnalysisService:
    """
    Rule-based AI analysis for civic issues.
    Analyzes category, description, and image path to determine:
    - Category confidence
    - Severity level
    - Safety risk score
    - Analysis notes
    """
    
    def __init__(self):
        # Category default severities
        self.category_defaults = {
            "Pothole / Road Damage": "medium",
            "Broken Streetlight": "medium", 
            "Garbage / Waste": "low",
            "Drainage / Open Manhole": "high",
            "Damaged Footpath": "low",
            "Damaged Traffic Sign": "medium",
            "Water Leakage": "medium",
            "Other": "low"
        }
        
        # Category safety risk profiles (0-100)
        self.safety_profiles = {
            "Pothole / Road Damage": 60,
            "Broken Streetlight": 45,
            "Garbage / Waste": 20,
            "Drainage / Open Manhole": 85,
            "Damaged Footpath": 40,
            "Damaged Traffic Sign": 70,
            "Water Leakage": 30,
            "Other": 25
        }
        
        # Severity keywords (order matters - check critical first)
        self.severity_keywords = {
            "critical": [
                "open manhole", "exposed manhole", "missing cover",
                "accident", "collapsed", "exposed wire", "dangerous",
                "emergency", "hazard", "fatal", "death", "injury"
            ],
            "high": [
                "large", "major", "blocked", "broken", "urgent", 
                "heavy", "severe", "significant", "completely",
                "impassable", "unsafe", "risk"
            ],
            "medium": [
                "damaged", "cracked", "leaking", "moderate",
                "noticeable", "concerning", "needs attention"
            ],
            "low": [
                "minor", "small", "slight", "little", "tiny",
                "cosmetic", "surface"
            ]
        }
    
    def analyze_issue(self, category: str, description: Optional[str], image_path: str) -> Dict[str, Any]:
        """
        Analyze a civic issue and return analysis results.
        
        Args:
            category: Selected issue category
            description: Optional text description
            image_path: Path to uploaded image (stored for future ML)
            
        Returns:
            Dictionary with analysis results
        """
        # Category confidence - assume user selection is mostly accurate
        category_confidence = 90 if category != "Other" else 70
        
        # Analyze severity from description
        detected_severity = self._analyze_severity(description or "", category)
        severity_confidence = self._get_severity_confidence(description or "", detected_severity)
        
        # Calculate safety risk
        base_safety = self.safety_profiles.get(category, 25)
        safety_risk = self._calculate_safety_risk(base_safety, detected_severity, description or "")
        
        # Generate analysis notes
        analysis_notes = self._generate_analysis_notes(category, detected_severity, description or "")
        
        return {
            "category": category,
            "category_confidence": category_confidence,
            "severity": detected_severity,
            "severity_confidence": severity_confidence,
            "safety_risk": safety_risk,
            "analysis_notes": analysis_notes
        }
    
    def _analyze_severity(self, description: str, category: str) -> str:
        """
        Analyze severity based on description keywords and category defaults.
        
        Args:
            description: Issue description text
            category: Issue category
            
        Returns:
            Severity level: "low", "medium", "high", or "critical"
        """
        if not description.strip():
            return self.category_defaults.get(category, "low")
        
        description_lower = description.lower()
        
        # Check for severity keywords (critical first, then high, medium, low)
        for severity_level in ["critical", "high", "medium", "low"]:
            keywords = self.severity_keywords[severity_level]
            for keyword in keywords:
                if keyword in description_lower:
                    return severity_level
        
        # No keyword match - use category default
        return self.category_defaults.get(category, "low")
    
    def _get_severity_confidence(self, description: str, detected_severity: str) -> int:
        """
        Calculate confidence score for severity detection.
        
        Args:
            description: Issue description text
            detected_severity: Detected severity level
            
        Returns:
            Confidence score (0-100)
        """
        if not description.strip():
            return 60  # Moderate confidence for category-based defaults
        
        description_lower = description.lower()
        keyword_matches = 0
        
        # Count matching keywords for detected severity
        for keyword in self.severity_keywords.get(detected_severity, []):
            if keyword in description_lower:
                keyword_matches += 1
        
        # More matches = higher confidence
        if keyword_matches >= 2:
            return 95
        elif keyword_matches == 1:
            return 80
        else:
            return 65  # Category default with description present
    
    def _calculate_safety_risk(self, base_safety: int, severity: str, description: str) -> int:
        """
        Calculate safety risk score based on category, severity, and keywords.
        
        Args:
            base_safety: Base safety score for category
            severity: Detected severity level
            description: Issue description
            
        Returns:
            Safety risk score (0-100)
        """
        # Severity multipliers
        severity_multipliers = {
            "critical": 1.4,
            "high": 1.2,
            "medium": 1.0,
            "low": 0.8
        }
        
        multiplier = severity_multipliers.get(severity, 1.0)
        safety_risk = int(base_safety * multiplier)
        
        # Boost for specific danger keywords
        danger_keywords = [
            "accident", "injury", "dangerous", "hazard", "unsafe",
            "emergency", "blocked road", "traffic", "pedestrian"
        ]
        
        description_lower = description.lower()
        for keyword in danger_keywords:
            if keyword in description_lower:
                safety_risk = min(100, safety_risk + 10)
        
        return max(0, min(100, safety_risk))
    
    def _generate_analysis_notes(self, category: str, severity: str, description: str) -> str:
        """
        Generate human-readable analysis notes.
        
        Args:
            category: Issue category
            severity: Detected severity
            description: Issue description
            
        Returns:
            Analysis notes string
        """
        notes = [f"Classified as {severity} severity {category.lower()}."]
        
        # Add severity-specific notes
        if severity == "critical":
            notes.append("Immediate attention required due to safety concerns.")
        elif severity == "high":
            notes.append("Requires prompt attention to prevent escalation.")
        elif severity == "medium":
            notes.append("Should be addressed within normal maintenance schedule.")
        else:
            notes.append("Low priority maintenance item.")
        
        # Add category-specific notes
        category_notes = {
            "Pothole / Road Damage": "May cause vehicle damage or accidents.",
            "Broken Streetlight": "Reduces visibility and public safety.",
            "Garbage / Waste": "Affects community cleanliness and health.",
            "Drainage / Open Manhole": "Serious safety hazard requiring immediate action.",
            "Damaged Footpath": "May cause pedestrian injuries.",
            "Damaged Traffic Sign": "Compromises traffic safety and navigation.",
            "Water Leakage": "May cause property damage or infrastructure issues.",
            "Other": "Requires manual assessment for appropriate action."
        }
        
        if category in category_notes:
            notes.append(category_notes[category])
        
        # Check for specific keywords in description
        if description:
            description_lower = description.lower()
            if any(word in description_lower for word in ["children", "school", "playground"]):
                notes.append("Located near area frequented by children - elevated priority.")
            if any(word in description_lower for word in ["elderly", "disabled", "wheelchair"]):
                notes.append("Accessibility concerns noted.")
            if any(word in description_lower for word in ["main road", "highway", "busy"]):
                notes.append("High traffic area - increased urgency.")
        
        return " ".join(notes)
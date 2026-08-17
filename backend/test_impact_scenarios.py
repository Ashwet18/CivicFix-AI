"""
Manual test scenarios for Civic Impact Engine
Tests 5 different real-world scenarios
"""
from datetime import datetime, timedelta, timezone
from services.impact_service import calculate_civic_impact


def print_result(scenario_name, result):
    """Pretty print impact result"""
    print(f"\n{'='*70}")
    print(f"SCENARIO: {scenario_name}")
    print(f"{'='*70}")
    print(f"CIVIC IMPACT SCORE: {result.civic_impact_score:.2f}/100")
    print(f"IMPACT LEVEL: {result.impact_level}")
    print(f"\nComponent Breakdown:")
    print(f"  Hazard Score (35%):           {result.hazard_score:.2f}")
    print(f"  Exposure Score (30%):         {result.exposure_score:.2f}")
    print(f"  Location Criticality (15%):   {result.location_criticality_score:.2f}")
    print(f"  Citizen Signal (10%):         {result.citizen_signal_score:.2f}")
    print(f"  Age Score (10%):              {result.age_score:.2f}")
    print(f"{'='*70}\n")


# Scenario 1: Critical open manhole on busy highway
print("\n" + "="*70)
print("TESTING 5 DIFFERENT CIVIC IMPACT SCENARIOS")
print("="*70)

scenario1 = calculate_civic_impact(
    severity="critical",
    safety_risk=100,
    created_at=datetime.now(timezone.utc) - timedelta(hours=6),
    duplicate_count=12,
    road_type="highway",
    area_type="commercial",
    nearby_locations=["major_intersection"]
)
print_result("Critical Open Manhole on Highway", scenario1)

# Scenario 2: Pothole near elementary school
scenario2 = calculate_civic_impact(
    severity="medium",
    safety_risk=65,
    created_at=datetime.now(timezone.utc) - timedelta(days=4),
    duplicate_count=8,
    road_type="local_street",
    area_type="residential",
    nearby_locations=["school"]
)
print_result("Pothole Near Elementary School (4 days old, 8 reports)", scenario2)

# Scenario 3: Broken streetlight downtown
scenario3 = calculate_civic_impact(
    severity="high",
    safety_risk=75,
    created_at=datetime.now(timezone.utc) - timedelta(days=10),
    duplicate_count=15,
    road_type="main_road",
    area_type="downtown",
    nearby_locations=["major_intersection", "bus_stop"]
)
print_result("Broken Streetlight Downtown (10 days old, 15 reports)", scenario3)

# Scenario 4: Minor drainage issue in residential area
scenario4 = calculate_civic_impact(
    severity="low",
    safety_risk=20,
    created_at=datetime.now(timezone.utc) - timedelta(hours=8),
    duplicate_count=1,
    road_type="residential_street",
    area_type="residential",
    nearby_locations=["residential_area"]
)
print_result("Minor Drainage Issue in Quiet Residential Area", scenario4)

# Scenario 5: Damaged sidewalk near hospital
scenario5 = calculate_civic_impact(
    severity="medium",
    safety_risk=55,
    created_at=datetime.now(timezone.utc) - timedelta(days=2),
    duplicate_count=5,
    road_type="main_road",
    area_type="commercial",
    nearby_locations=["hospital"]
)
print_result("Damaged Sidewalk Near Hospital (2 days old, 5 reports)", scenario5)

# Summary comparison
print("\n" + "="*70)
print("SUMMARY COMPARISON")
print("="*70)
scenarios = [
    ("Highway Manhole", scenario1),
    ("School Pothole", scenario2),
    ("Downtown Streetlight", scenario3),
    ("Residential Drainage", scenario4),
    ("Hospital Sidewalk", scenario5)
]

scenarios_sorted = sorted(scenarios, key=lambda x: x[1].civic_impact_score, reverse=True)

print(f"\n{'Rank':<6} {'Scenario':<30} {'Score':<10} {'Level':<12}")
print("-" * 70)
for i, (name, result) in enumerate(scenarios_sorted, 1):
    print(f"{i:<6} {name:<30} {result.civic_impact_score:<10.2f} {result.impact_level:<12}")

print("\n" + "="*70)
print("KEY INSIGHTS:")
print("="*70)
print("1. Hazard Score (35%): Highest weight - safety is paramount")
print("2. Exposure Score (30%): High-traffic areas score higher")
print("3. Location Criticality (15%): Near schools/hospitals increases impact")
print("4. Citizen Signal (10%): Multiple reports amplify urgency")
print("5. Age Score (10%): Older unresolved issues score higher")
print("\nAll scores are calculated dynamically - no hardcoded final scores.")
print("="*70)

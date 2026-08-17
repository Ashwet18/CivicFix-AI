/**
 * Generate dynamic civic impact explanation based on actual score values
 */

export interface CivicImpactData {
  civic_impact_score: number;
  impact_level: string;
  hazard_score: number;
  exposure_score: number;
  location_criticality_score: number;
  citizen_signal_score: number;
  age_score: number;
}

/**
 * Generate human-readable explanation from civic impact scores
 */
export function generateCivicImpactExplanation(impact: CivicImpactData): string {
  const reasons: string[] = [];
  
  // Analyze hazard/safety component
  if (impact.hazard_score >= 75) {
    reasons.push('presents a high safety risk');
  } else if (impact.hazard_score >= 50) {
    reasons.push('poses a moderate safety concern');
  } else if (impact.hazard_score >= 25) {
    reasons.push('has some safety implications');
  }
  
  // Analyze public exposure component
  if (impact.exposure_score >= 75) {
    reasons.push('affects a high-traffic area');
  } else if (impact.exposure_score >= 50) {
    reasons.push('is in a moderately trafficked location');
  }
  
  // Analyze location criticality
  if (impact.location_criticality_score >= 85) {
    reasons.push('is near critical infrastructure (hospital/school)');
  } else if (impact.location_criticality_score >= 70) {
    reasons.push('is located near important public facilities');
  } else if (impact.location_criticality_score >= 60) {
    reasons.push('is in a residential area');
  }
  
  // Analyze citizen signal
  if (impact.citizen_signal_score >= 70) {
    reasons.push('has multiple citizen reports indicating significant community concern');
  } else if (impact.citizen_signal_score >= 40) {
    reasons.push('has received multiple reports from citizens');
  }
  
  // Analyze age
  if (impact.age_score >= 80) {
    reasons.push('has been unresolved for an extended period');
  } else if (impact.age_score >= 60) {
    reasons.push('has been pending for several days');
  }
  
  // Build the explanation sentence
  let explanation = '';
  
  if (impact.impact_level === 'CRITICAL') {
    explanation = 'Critical civic impact because this issue ';
  } else if (impact.impact_level === 'HIGH') {
    explanation = 'High civic impact because this issue ';
  } else if (impact.impact_level === 'MEDIUM') {
    explanation = 'Moderate civic impact as this issue ';
  } else {
    explanation = 'Lower civic impact as this issue ';
  }
  
  // Join reasons with proper grammar
  if (reasons.length === 0) {
    explanation += 'requires standard attention.';
  } else if (reasons.length === 1) {
    explanation += reasons[0] + '.';
  } else if (reasons.length === 2) {
    explanation += reasons[0] + ' and ' + reasons[1] + '.';
  } else {
    const lastReason = reasons.pop();
    explanation += reasons.join(', ') + ', and ' + lastReason + '.';
  }
  
  return explanation;
}

/**
 * Get recommended action based on impact level
 */
export function getRecommendedAction(impactLevel: string): string {
  switch (impactLevel) {
    case 'CRITICAL':
      return 'Immediate inspection and intervention recommended. This issue requires urgent attention to minimize public risk.';
    case 'HIGH':
      return 'Prioritize for early departmental action. Schedule intervention within 24-48 hours.';
    case 'MEDIUM':
      return 'Schedule for routine intervention. Address within normal departmental workflow.';
    case 'LOW':
      return 'Monitor and address during routine maintenance cycles. No immediate action required.';
    default:
      return 'Review and assess for appropriate action timeline.';
  }
}

/**
 * Get color classes for impact level badge
 */
export function getImpactLevelColor(impactLevel: string): string {
  switch (impactLevel) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'LOW':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Get color for progress bar based on score value
 */
export function getProgressBarColor(score: number, maxScore: number): string {
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= 75) {
    return 'bg-red-500';
  } else if (percentage >= 50) {
    return 'bg-orange-500';
  } else if (percentage >= 25) {
    return 'bg-yellow-500';
  } else {
    return 'bg-green-500';
  }
}

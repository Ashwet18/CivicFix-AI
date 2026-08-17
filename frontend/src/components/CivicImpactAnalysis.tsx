import { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, Info } from 'lucide-react';
import {
  CivicImpactData,
  generateCivicImpactExplanation,
  getRecommendedAction,
  getImpactLevelColor,
  getProgressBarColor
} from '../utils/civicImpactExplanation';

interface CivicImpactAnalysisProps {
  issueId: number;
}

interface ComponentScore {
  label: string;
  score: number;
  maxScore: number;
  description: string;
}

export default function CivicImpactAnalysis({ issueId }: CivicImpactAnalysisProps) {
  const [impact, setImpact] = useState<CivicImpactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCivicImpact();
  }, [issueId]);

  const fetchCivicImpact = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/admin/issues/${issueId}/civic-impact`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch civic impact data');
      }

      const data = await response.json();
      setImpact(data);
    } catch (err: any) {
      console.error('Failed to load civic impact:', err);
      setError(err.message || 'Failed to load civic impact analysis');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !impact) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">
              Civic Impact Analysis Unavailable
            </h3>
            <p className="text-sm text-yellow-800">
              {error || 'Unable to calculate civic impact at this time.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const components: ComponentScore[] = [
    {
      label: 'Hazard / Safety',
      score: impact.hazard_score,
      maxScore: 35,
      description: 'Based on severity and safety risk assessment'
    },
    {
      label: 'Public Exposure',
      score: impact.exposure_score,
      maxScore: 30,
      description: 'Estimated number of people affected'
    },
    {
      label: 'Location Criticality',
      score: impact.location_criticality_score,
      maxScore: 15,
      description: 'Proximity to critical facilities'
    },
    {
      label: 'Citizen Signal',
      score: impact.citizen_signal_score,
      maxScore: 10,
      description: 'Community engagement and duplicate reports'
    },
    {
      label: 'Issue Age',
      score: impact.age_score,
      maxScore: 10,
      description: 'Time elapsed since issue was reported'
    }
  ];

  const explanation = generateCivicImpactExplanation(impact);
  const recommendedAction = getRecommendedAction(impact.impact_level);
  const impactColorClass = getImpactLevelColor(impact.impact_level);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md border-2 border-blue-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
          Civic Impact Analysis
        </h3>
        <div className="flex items-center text-xs text-gray-600">
          <Info className="w-4 h-4 mr-1" />
          <span>Decision Support Tool</span>
        </div>
      </div>

      {/* Overall Score */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm text-gray-600 mb-1">Civic Impact Score</p>
            <p className="text-4xl font-bold text-gray-900">
              {Math.round(impact.civic_impact_score)}
              <span className="text-2xl text-gray-500">/100</span>
            </p>
          </div>
          <div>
            <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${impactColorClass}`}>
              {impact.impact_level}
            </span>
          </div>
        </div>
        
        {/* Overall progress bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor(
                impact.civic_impact_score,
                100
              )}`}
              style={{ width: `${Math.min(impact.civic_impact_score, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
        <h4 className="font-semibold text-gray-900 mb-4">Impact Components</h4>
        <div className="space-y-4">
          {components.map((component, index) => {
            // Calculate weighted contribution to final score
            const weightPercentage = (component.maxScore / 100) * 100;
            const componentContribution = (component.score / 100) * component.maxScore;
            const progressPercentage = (componentContribution / component.maxScore) * 100;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 text-sm">
                        {component.label}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        {componentContribution.toFixed(1)}/{component.maxScore}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{component.description}</p>
                  </div>
                </div>
                
                {/* Component progress bar */}
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(
                        componentContribution,
                        component.maxScore
                      )}`}
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                  <span className="absolute right-0 -top-1 text-xs text-gray-500 font-medium">
                    {weightPercentage}% weight
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Explanation */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border-l-4 border-blue-500">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Info className="w-5 h-5 mr-2 text-blue-600" />
          Analysis Explanation
        </h4>
        <p className="text-gray-700 leading-relaxed">{explanation}</p>
      </div>

      {/* Recommended Action */}
      <div className={`rounded-lg p-6 shadow-sm border-l-4 ${
        impact.impact_level === 'CRITICAL' ? 'bg-red-50 border-red-500' :
        impact.impact_level === 'HIGH' ? 'bg-orange-50 border-orange-500' :
        impact.impact_level === 'MEDIUM' ? 'bg-yellow-50 border-yellow-500' :
        'bg-green-50 border-green-500'
      }`}>
        <h4 className="font-semibold text-gray-900 mb-3">Recommended Action</h4>
        <p className={`leading-relaxed ${
          impact.impact_level === 'CRITICAL' ? 'text-red-900' :
          impact.impact_level === 'HIGH' ? 'text-orange-900' :
          impact.impact_level === 'MEDIUM' ? 'text-yellow-900' :
          'text-green-900'
        }`}>
          {recommendedAction}
        </p>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        <p className="text-xs text-gray-600 italic">
          <strong>Note:</strong> This civic impact analysis is a decision support tool to help 
          prioritize resource allocation. Final decisions should incorporate additional context, 
          departmental expertise, and operational constraints.
        </p>
      </div>
    </div>
  );
}

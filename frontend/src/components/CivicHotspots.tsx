import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, MapPin, AlertTriangle, Eye } from 'lucide-react';

interface Hotspot {
  hotspot_id: string;
  center_latitude: number;
  center_longitude: number;
  issue_count: number;
  issue_ids: number[];
  categories: string[];
  highest_civic_impact: number;
  average_civic_impact: number;
  critical_issue_count: number;
  status_summary: Record<string, number>;
}

interface CivicHotspotsProps {
  maxDisplay?: number;
}

export default function CivicHotspots({ maxDisplay = 5 }: CivicHotspotsProps) {
  const navigate = useNavigate();
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHotspots();
  }, []);

  const fetchHotspots = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/admin/hotspots', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch hotspots');
      }

      const data = await response.json();
      setHotspots(data);
    } catch (err: any) {
      console.error('Failed to load hotspots:', err);
      setError(err.message || 'Failed to load civic hotspots');
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (score: number): string => {
    if (score >= 90) return 'text-red-600 bg-red-50 border-red-300';
    if (score >= 75) return 'text-orange-600 bg-orange-50 border-orange-300';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-300';
    return 'text-green-600 bg-green-50 border-green-300';
  };

  const getImpactLabel = (score: number): string => {
    if (score >= 90) return 'CRITICAL';
    if (score >= 75) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    return 'LOW';
  };

  const viewHotspotOnMap = (hotspot: Hotspot) => {
    // Navigate to map with center on hotspot
    navigate(`/admin/map?lat=${hotspot.center_latitude}&lng=${hotspot.center_longitude}&zoom=15`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center mb-4">
          <Flame className="w-5 h-5 text-orange-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Civic Hotspots</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (hotspots.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center mb-4">
          <Flame className="w-5 h-5 text-orange-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Civic Hotspots</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          <MapPin className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No hotspots detected</p>
          <p className="text-xs mt-1">Hotspots form when 3+ issues cluster geographically</p>
        </div>
      </div>
    );
  }

  const displayHotspots = hotspots.slice(0, maxDisplay);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Flame className="w-5 h-5 text-orange-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Civic Hotspots</h2>
          {hotspots.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
              {hotspots.length}
            </span>
          )}
        </div>
        {hotspots.length > maxDisplay && (
          <button
            onClick={() => navigate('/admin/map')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All →
          </button>
        )}
      </div>

      <div className="space-y-3">
        {displayHotspots.map((hotspot, index) => {
          const impactColor = getImpactColor(hotspot.highest_civic_impact);
          const impactLabel = getImpactLabel(hotspot.highest_civic_impact);
          const primaryCategory = hotspot.categories[0] || 'Multiple Categories';

          return (
            <div
              key={hotspot.hotspot_id}
              className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-2 border-orange-200 hover:border-orange-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-bold text-gray-900 text-lg">
                      HOTSPOT #{index + 1}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold border-2 ${impactColor}`}>
                      {impactLabel}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 font-medium">{primaryCategory}</p>
                  {hotspot.categories.length > 1 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      +{hotspot.categories.length - 1} more {hotspot.categories.length === 2 ? 'category' : 'categories'}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-white rounded p-2 text-center border">
                  <p className="text-2xl font-bold text-orange-600">{hotspot.issue_count}</p>
                  <p className="text-xs text-gray-600">Related Reports</p>
                </div>
                <div className="bg-white rounded p-2 text-center border">
                  <p className="text-2xl font-bold text-red-600">{hotspot.critical_issue_count}</p>
                  <p className="text-xs text-gray-600">Critical</p>
                </div>
                <div className="bg-white rounded p-2 text-center border">
                  <p className="text-2xl font-bold text-blue-600">{Math.round(hotspot.highest_civic_impact)}</p>
                  <p className="text-xs text-gray-600">Max Impact</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  {hotspot.center_latitude.toFixed(4)}, {hotspot.center_longitude.toFixed(4)}
                </div>
                <button
                  onClick={() => viewHotspotOnMap(hotspot)}
                  className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View on Map
                </button>
              </div>

              {/* Status breakdown */}
              {hotspot.status_summary && Object.keys(hotspot.status_summary).length > 0 && (
                <div className="mt-3 pt-3 border-t border-orange-200">
                  <div className="flex space-x-2 text-xs">
                    {Object.entries(hotspot.status_summary).map(([status, count]) => (
                      <span key={status} className="text-gray-600">
                        <span className="font-medium capitalize">{status.replace('_', ' ')}</span>: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hotspots.length > displayHotspots.length && (
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/admin/map')}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            +{hotspots.length - displayHotspots.length} more hotspots • View on map
          </button>
        </div>
      )}
    </div>
  );
}

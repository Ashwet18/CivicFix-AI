import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUnresolvedIssuesForMap } from '../services/api';
import Map from '../components/Map';
import { MapIssue } from '../types';
import {
  ArrowLeft,
  AlertCircle,
  MapPin,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle,
  Flame
} from 'lucide-react';

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

// Priority-based marker colors
const PRIORITY_COLORS = {
  critical: '#DC2626', // red-600
  high: '#EA580C',     // orange-600
  medium: '#D97706',   // amber-600
  low: '#16A34A'       // green-600
};

const SEVERITY_COLORS = {
  critical: 'text-red-600 bg-red-50 border-red-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  low: 'text-green-600 bg-green-50 border-green-200'
};

const STATUS_COLORS = {
  reported: 'bg-blue-100 text-blue-800',
  assigned: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800'
};

export default function AdminMapPage() {
  console.log('AdminMapPage component rendering');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<MapIssue | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [showHotspots, setShowHotspots] = useState(true);
  const [initialMapCenter, setInitialMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [initialMapZoom, setInitialMapZoom] = useState<number>(12);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedHotspot || selectedIssue) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedHotspot, selectedIssue]);

  // Redirect non-admins
  useEffect(() => {
    console.log('AdminMapPage auth check:', { user, role: user?.role });
    if (!user || user.role !== 'admin') {
      console.log('Redirecting to login - not authenticated as admin');
      navigate('/login');
    }
  }, [user, navigate]);

  // Load unresolved issues and hotspots
  const loadIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      // Fetch both issues and hotspots
      const [issuesData, hotspotsResponse] = await Promise.all([
        getUnresolvedIssuesForMap(),
        fetch('http://localhost:8000/api/admin/hotspots', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      // Extract issues array from response object
      const issuesArray = issuesData.issues || [];
      setIssues(issuesArray);
      
      if (hotspotsResponse.ok) {
        const hotspotsData = await hotspotsResponse.json();
        setHotspots(hotspotsData);
      }
      
      // Set initial map center only once
      if (!initialMapCenter && issuesArray.length > 0) {
        const urlLat = searchParams.get('lat');
        const urlLng = searchParams.get('lng');
        const urlZoom = searchParams.get('zoom');
        
        const center = (urlLat && urlLng)
          ? { lat: parseFloat(urlLat), lng: parseFloat(urlLng) }
          : {
              lat: issuesArray.reduce((sum: number, i: any) => sum + i.latitude, 0) / issuesArray.length,
              lng: issuesArray.reduce((sum: number, i: any) => sum + i.longitude, 0) / issuesArray.length
            };
        
        setInitialMapCenter(center);
        setInitialMapZoom(urlZoom ? parseInt(urlZoom) : 12);
      }
      
    } catch (err: any) {
      console.error('Failed to load map data:', err);
      if (err.response?.status === 403) {
        setError('Admin access required');
        navigate('/login');
      } else {
        setError('Failed to load issues for map');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  // Get priority category from score
  const getPriorityCategory = (score: number): 'critical' | 'high' | 'medium' | 'low' => {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

  // Get unique categories
  const uniqueCategories = Array.from(new Set((issues || []).map(i => i.category))).sort();

  // Filter issues
  const filteredIssues = (issues || []).filter(issue => {
    if (severityFilter && issue.severity !== severityFilter) return false;
    if (categoryFilter && issue.category !== categoryFilter) return false;
    
    if (priorityFilter) {
      const priorityCat = getPriorityCategory(issue.priority_score);
      if (priorityCat !== priorityFilter) return false;
    }
    
    return true;
  });

  // Get issues that are NOT part of any hotspot
  const hotspotIssueIds = new Set(hotspots.flatMap(h => h.issue_ids));
  const standaloneIssues = filteredIssues.filter(issue => !hotspotIssueIds.has(issue.id));

  // Create map markers for standalone issues with priority-based colors
  const issueMarkers = standaloneIssues.map(issue => {
    const priorityCat = getPriorityCategory(issue.priority_score);
    
    return {
      id: issue.id.toString(),
      position: { lat: issue.latitude, lng: issue.longitude },
      title: `#${issue.id} - ${issue.category}`,
      type: 'issue' as const,
      color: PRIORITY_COLORS[priorityCat],
      priority: priorityCat,
      onClick: () => setSelectedIssue(issue)
    };
  });

  // Create map markers for hotspots (distinct visual style)
  const hotspotMarkers = showHotspots ? hotspots.map(hotspot => ({
    id: hotspot.hotspot_id,
    position: { lat: hotspot.center_latitude, lng: hotspot.center_longitude },
    title: `Hotspot: ${hotspot.issue_count} issues`,
    type: 'hotspot' as const,
    color: '#F97316', // orange-500
    size: 'large' as const,
    onClick: () => {
      console.log('Hotspot clicked:', hotspot.hotspot_id);
      setSelectedHotspot(hotspot);
    },
    disablePopup: true
  })) : [];

  const markers = [...issueMarkers, ...hotspotMarkers];

  // Count by priority
  const priorityCounts = {
    critical: filteredIssues.filter(i => getPriorityCategory(i.priority_score) === 'critical').length,
    high: filteredIssues.filter(i => getPriorityCategory(i.priority_score) === 'high').length,
    medium: filteredIssues.filter(i => getPriorityCategory(i.priority_score) === 'medium').length,
    low: filteredIssues.filter(i => getPriorityCategory(i.priority_score) === 'low').length
  };

  // Active filter count
  const activeFilters = [severityFilter, categoryFilter, priorityFilter].filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </button>
            
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <MapPin className="w-8 h-8 mr-3 text-blue-600" />
              Issue Map
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                showFilters || activeFilters > 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFilters > 0 && (
                <span className="ml-2 bg-white text-blue-600 text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>

            <button
              onClick={loadIssues}
              className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Priority Legend */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Map Legend</h3>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showHotspots}
                onChange={(e) => setShowHotspots(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Show Hotspots</span>
            </label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {showHotspots && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center border-2 border-orange-700">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-medium">Hotspot</span>
                  <span className="text-xs text-gray-600 block">({hotspots.length})</span>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.critical }}></div>
              <div>
                <span className="text-sm font-medium">Critical</span>
                <span className="text-xs text-gray-600 block">({priorityCounts.critical})</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.high }}></div>
              <div>
                <span className="text-sm font-medium">High</span>
                <span className="text-xs text-gray-600 block">({priorityCounts.high})</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.medium }}></div>
              <div>
                <span className="text-sm font-medium">Medium</span>
                <span className="text-xs text-gray-600 block">({priorityCounts.medium})</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.low }}></div>
              <div>
                <span className="text-sm font-medium">Low</span>
                <span className="text-xs text-gray-600 block">({priorityCounts.low})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              {activeFilters > 0 && (
                <button
                  onClick={() => {
                    setSeverityFilter('');
                    setCategoryFilter('');
                    setPriorityFilter('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity
                </label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-900">
            Showing <span className="font-semibold">{filteredIssues.length}</span> unresolved issue{filteredIssues.length !== 1 ? 's' : ''}
            {activeFilters > 0 && ` (${activeFilters} filter${activeFilters !== 1 ? 's' : ''} active)`}
          </p>
        </div>

        {/* Map Container */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {filteredIssues.length === 0 || !initialMapCenter ? (
            <div className="p-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {!initialMapCenter ? 'Loading map...' : 'No Unresolved Issues'}
              </h3>
              <p className="text-gray-600">
                {activeFilters > 0 && initialMapCenter
                  ? 'Try adjusting your filters to see more issues.'
                  : !initialMapCenter
                  ? 'Please wait...'
                  : 'All issues have been resolved!'}
              </p>
            </div>
          ) : (
            <Map
              key="admin-map-fixed"
              center={initialMapCenter}
              zoom={initialMapZoom}
              height="600px"
              markers={markers}
              interactive={true}
            />
          )}
        </div>

        {/* Selected Issue Popup */}
        {selectedIssue && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    Issue #{selectedIssue.id}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedIssue.status as keyof typeof STATUS_COLORS]}`}>
                      {selectedIssue.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${SEVERITY_COLORS[selectedIssue.severity as keyof typeof SEVERITY_COLORS]}`}>
                      {selectedIssue.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Image */}
                <img
                  src={`http://localhost:8000/${selectedIssue.image_path}`}
                  alt={`Issue ${selectedIssue.id}`}
                  className="w-full h-64 object-cover rounded-lg border"
                />

                {/* Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-medium text-gray-900">{selectedIssue.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Priority Score</p>
                    <p className="font-medium text-gray-900">
                      {Math.round(selectedIssue.priority_score)} ({getPriorityCategory(selectedIssue.priority_score).toUpperCase()})
                    </p>
                  </div>
                </div>

                {selectedIssue.description && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Description</p>
                    <p className="text-gray-900">{selectedIssue.description}</p>
                  </div>
                )}

                {selectedIssue.assigned_department && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Assigned Department</p>
                    <p className="font-medium text-gray-900">{selectedIssue.assigned_department}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-1">Location</p>
                  <p className="text-gray-900 font-mono text-sm">
                    {selectedIssue.latitude.toFixed(6)}, {selectedIssue.longitude.toFixed(6)}
                  </p>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => navigate(`/admin/issues/${selectedIssue.id}`)}
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Full Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected Hotspot Popup */}
        {selectedHotspot && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedHotspot(null);
              }
            }}
            style={{ pointerEvents: 'auto' }}
          >
            <div 
              className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1 flex items-center">
                    <Flame className="w-6 h-6 text-orange-600 mr-2" />
                    Civic Hotspot
                  </h3>
                  <p className="text-sm text-gray-600">{selectedHotspot.hotspot_id}</p>
                </div>
                <button
                  onClick={() => setSelectedHotspot(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
                    <p className="text-3xl font-bold text-orange-600">{selectedHotspot.issue_count}</p>
                    <p className="text-sm text-gray-600">Related Issues</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                    <p className="text-3xl font-bold text-red-600">{selectedHotspot.critical_issue_count}</p>
                    <p className="text-sm text-gray-600">Critical</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
                    <p className="text-3xl font-bold text-blue-600">{Math.round(selectedHotspot.highest_civic_impact)}</p>
                    <p className="text-sm text-gray-600">Max Impact</p>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Issue Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedHotspot.categories.map((cat, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Status Summary */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Status Breakdown</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedHotspot.status_summary).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between bg-gray-50 rounded p-2">
                        <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <p className="text-sm text-gray-600 mb-1">Center Location</p>
                  <p className="text-gray-900 font-mono text-sm">
                    {selectedHotspot.center_latitude.toFixed(6)}, {selectedHotspot.center_longitude.toFixed(6)}
                  </p>
                </div>

                {/* Issue IDs */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Included Issues</p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {selectedHotspot.issue_ids.map(issueId => (
                      <button
                        key={issueId}
                        onClick={() => navigate(`/admin/issues/${issueId}`)}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                      >
                        #{issueId}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedHotspot(null)}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<MapIssue | null>(null);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load unresolved issues
  const loadIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getUnresolvedIssuesForMap();
      setIssues(data);
      
    } catch (err: any) {
      console.error('Failed to load map issues:', err);
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
  const uniqueCategories = Array.from(new Set(issues.map(i => i.category))).sort();

  // Filter issues
  const filteredIssues = issues.filter(issue => {
    if (severityFilter && issue.severity !== severityFilter) return false;
    if (categoryFilter && issue.category !== categoryFilter) return false;
    
    if (priorityFilter) {
      const priorityCat = getPriorityCategory(issue.priority_score);
      if (priorityCat !== priorityFilter) return false;
    }
    
    return true;
  });

  // Create map markers with priority-based colors
  const markers = filteredIssues.map(issue => {
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

  // Calculate map center (average of all issue positions)
  const mapCenter = filteredIssues.length > 0
    ? {
        lat: filteredIssues.reduce((sum, i) => sum + i.latitude, 0) / filteredIssues.length,
        lng: filteredIssues.reduce((sum, i) => sum + i.longitude, 0) / filteredIssues.length
      }
    : { lat: 40.7128, lng: -74.0060 }; // Default to NYC

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
          <h3 className="font-semibold text-gray-900 mb-3">Priority Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.critical }}></div>
              <span className="text-sm font-medium">Critical Priority</span>
              <span className="text-xs text-gray-600">({priorityCounts.critical})</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.high }}></div>
              <span className="text-sm font-medium">High Priority</span>
              <span className="text-xs text-gray-600">({priorityCounts.high})</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.medium }}></div>
              <span className="text-sm font-medium">Medium Priority</span>
              <span className="text-xs text-gray-600">({priorityCounts.medium})</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: PRIORITY_COLORS.low }}></div>
              <span className="text-sm font-medium">Low Priority</span>
              <span className="text-xs text-gray-600">({priorityCounts.low})</span>
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
          {filteredIssues.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Unresolved Issues
              </h3>
              <p className="text-gray-600">
                {activeFilters > 0 
                  ? 'Try adjusting your filters to see more issues.'
                  : 'All issues have been resolved!'}
              </p>
            </div>
          ) : (
            <Map
              center={mapCenter}
              zoom={12}
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
      </div>
    </div>
  );
}

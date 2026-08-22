import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAdminDashboard, getAdminIssues } from '../services/api';
import { AdminDashboardStats, Issue } from '../types';
import CivicHotspots from '../components/CivicHotspots';
import {
  LayoutDashboard,
  AlertTriangle,
  TrendingUp,
  Clock,
  RefreshCw,
  CheckCircle,
  BarChart3,
  Eye,
  MapPin,
  Flame,
  AlertCircle,
  Activity
} from 'lucide-react';

const SEVERITY_COLORS = {
  critical: 'text-red-600 bg-red-50 border-red-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  low: 'text-green-600 bg-green-50 border-green-200'
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [highPriorityIssues, setHighPriorityIssues] = useState<Issue[]>([]);
  const [hotspotCount, setHotspotCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      const [dashboardData, issuesData, hotspotsResponse] = await Promise.all([
        getAdminDashboard(),
        getAdminIssues(1, 5, { sortBy: 'priority', sortOrder: 'desc' }),
        fetch('http://localhost:8000/api/admin/hotspots', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setStats(dashboardData);
      setHighPriorityIssues(issuesData.issues);
      
      if (hotspotsResponse.ok) {
        const hotspotsData = await hotspotsResponse.json();
        setHotspotCount(hotspotsData.length);
      }
      
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      if (err.response?.status === 403) {
        setError('Admin access required');
        navigate('/login');
      } else {
        setError('Failed to load dashboard data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-lg p-6 border h-32"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-lg font-semibold text-red-900 mb-2">{error || 'Failed to load dashboard'}</h2>
            <button
              onClick={loadDashboard}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with City Branding */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                  <LayoutDashboard className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                    Nagpur Civic Overview
                  </h1>
                  <p className="text-gray-600 text-sm md:text-base">Real-time civic issue monitoring and management</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/admin/map')}
                className="flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl font-medium"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Map View
              </button>
              <button
                onClick={() => navigate('/admin/issues')}
                className="flex items-center px-5 py-2.5 bg-white text-gray-700 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-all font-medium"
              >
                <Eye className="w-4 h-4 mr-2" />
                All Issues
              </button>
              <button
                onClick={loadDashboard}
                className="flex items-center px-5 py-2.5 bg-white text-gray-700 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Key Insights Alert Section */}
        {stats && (stats.critical_issues > 0 || stats.high_priority_issues > 0 || hotspotCount > 0) && (
          <div className="mb-8 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Dashboard Insights</h3>
                <div className="space-y-2">
                  {hotspotCount > 0 && (
                    <div className="flex items-center space-x-2">
                      <Flame className="w-5 h-5 text-orange-600" />
                      <span className="text-gray-800 font-medium">
                        <span className="text-orange-700 font-bold">{hotspotCount}</span> Civic Hotspot{hotspotCount !== 1 ? 's' : ''} detected requiring coordinated response
                      </span>
                    </div>
                  )}
                  {stats.critical_issues > 0 && (
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-gray-800 font-medium">
                        <span className="text-red-700 font-bold">{stats.critical_issues}</span> Critical issue{stats.critical_issues !== 1 ? 's' : ''} require immediate attention
                      </span>
                    </div>
                  )}
                  {stats.high_priority_issues > 0 && (
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                      <span className="text-gray-800 font-medium">
                        <span className="text-orange-700 font-bold">{stats.high_priority_issues}</span> High-priority issue{stats.high_priority_issues !== 1 ? 's' : ''} currently active
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6 mb-8">
          {/* Total Issues */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                <LayoutDashboard className="w-7 h-7 text-blue-600" />
              </div>
              <span className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">{stats.total_issues}</span>
              <h3 className="text-xs md:text-sm font-medium text-gray-600">Total Issues</h3>
            </div>
          </div>

          {/* Critical Issues - Prominent */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.critical_issues}</span>
              <h3 className="text-xs md:text-sm font-medium text-white">Critical</h3>
            </div>
          </div>

          {/* High Priority - Prominent */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl md:text-4xl font-bold text-white mb-1">{stats.high_priority_issues}</span>
              <h3 className="text-xs md:text-sm font-medium text-white">High Priority</h3>
            </div>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-yellow-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center mb-3">
                <Clock className="w-7 h-7 text-yellow-600" />
              </div>
              <span className="text-3xl md:text-4xl font-bold text-yellow-600 mb-1">{stats.pending_issues}</span>
              <h3 className="text-xs md:text-sm font-medium text-gray-600">Pending</h3>
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-purple-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                <RefreshCw className="w-7 h-7 text-purple-600" />
              </div>
              <span className="text-3xl md:text-4xl font-bold text-purple-600 mb-1">{stats.in_progress_issues}</span>
              <h3 className="text-xs md:text-sm font-medium text-gray-600">In Progress</h3>
            </div>
          </div>

          {/* Resolved */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-green-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <span className="text-3xl md:text-4xl font-bold text-green-600 mb-1">{stats.resolved_issues}</span>
              <h3 className="text-xs md:text-sm font-medium text-gray-600">Resolved</h3>
            </div>
          </div>
        </div>

        {/* Civic Hotspots Section - Prominent Position */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-t-xl px-6 py-4">
            <div className="flex items-center space-x-3">
              <Flame className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">Civic Hotspots</h2>
              {hotspotCount > 0 && (
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold text-white">
                  {hotspotCount} Active
                </span>
              )}
            </div>
          </div>
          <div className="bg-white rounded-b-xl shadow-lg border-2 border-orange-200 border-t-0">
            <CivicHotspots maxDisplay={4} />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Issues by Category */}
          <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
            <div className="flex items-center mb-6">
              <BarChart3 className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-bold text-gray-900">Issues by Category</h2>
            </div>
            {Object.keys(stats.issues_by_category).length === 0 ? (
              <p className="text-gray-500 text-center py-8">No category data available</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(stats.issues_by_category)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, count]) => {
                    const percentage = ((count / stats.total_issues) * 100).toFixed(1);
                    return (
                      <div key={category} className="group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                            {category}
                          </span>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-lg font-bold text-gray-900">{count}</span>
                            <span className="text-xs font-medium text-gray-500">({percentage}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Issues by Status */}
          <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
            <div className="flex items-center mb-6">
              <BarChart3 className="w-6 h-6 text-purple-600 mr-3" />
              <h2 className="text-xl font-bold text-gray-900">Issues by Status</h2>
            </div>
            {Object.keys(stats.issues_by_status).length === 0 ? (
              <p className="text-gray-500 text-center py-8">No status data available</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(stats.issues_by_status)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => {
                    const statusColors: Record<string, { bg: string; text: string }> = {
                      reported: { bg: 'from-blue-500 to-blue-600', text: 'text-blue-700' },
                      assigned: { bg: 'from-yellow-500 to-yellow-600', text: 'text-yellow-700' },
                      in_progress: { bg: 'from-purple-500 to-purple-600', text: 'text-purple-700' },
                      resolved: { bg: 'from-green-500 to-green-600', text: 'text-green-700' }
                    };
                    
                    const colors = statusColors[status] || { bg: 'from-gray-500 to-gray-600', text: 'text-gray-700' };
                    const percentage = ((count / stats.total_issues) * 100).toFixed(1);
                    
                    return (
                      <div key={status} className="group">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-semibold capitalize group-hover:opacity-80 transition-opacity ${colors.text}`}>
                            {status.replace('_', ' ')}
                          </span>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-lg font-bold text-gray-900">{count}</span>
                            <span className="text-xs font-medium text-gray-500">({percentage}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={`bg-gradient-to-r ${colors.bg} h-3 rounded-full transition-all duration-500 ease-out`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
            
            {stats.average_resolution_time_hours && stats.average_resolution_time_hours > 0 && (
              <div className="mt-6 pt-6 border-t-2 border-gray-100">
                <div className="flex items-center justify-between bg-green-50 rounded-lg p-4">
                  <span className="text-sm font-medium text-gray-700">Average Resolution Time</span>
                  <span className="text-2xl font-bold text-green-600">
                    {stats.average_resolution_time_hours.toFixed(1)}h
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Priority Issues */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Top Priority Issues</h2>
            </div>
            <button
              onClick={() => navigate('/admin/issues?sort=priority')}
              className="text-sm text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-all"
            >
              View All →
            </button>
          </div>
          
          {highPriorityIssues.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <p className="text-gray-600 font-medium">No high priority issues at the moment</p>
              <p className="text-sm text-gray-500 mt-1">Great job keeping the city safe!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {highPriorityIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg hover:from-blue-50 hover:to-white border-2 border-gray-100 hover:border-blue-300 transition-all cursor-pointer group"
                  onClick={() => navigate(`/admin/issues/${issue.id}`)}
                >
                  <img
                    src={`http://localhost:8000/${issue.image_path}`}
                    alt={`Issue ${issue.id}`}
                    className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-400 transition-all shadow-sm"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,' + btoa(`
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="#E5E7EB">
                          <rect width="100" height="100" fill="#F3F4F6"/>
                          <text x="50" y="50" text-anchor="middle" dy=".3em" fill="#9CA3AF" font-size="12">No Image</text>
                        </svg>
                      `);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-bold text-gray-900 text-lg">#{issue.id}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${SEVERITY_COLORS[issue.severity as keyof typeof SEVERITY_COLORS]}`}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold capitalize">
                        {issue.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-base font-semibold text-gray-800 mb-1">{issue.category}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1 text-orange-500" />
                        Priority: <span className="font-bold ml-1">{Math.round(issue.priority_score)}</span>
                      </span>
                      {issue.assigned_department && (
                        <span className="hidden md:inline">→ {issue.assigned_department}</span>
                      )}
                    </div>
                  </div>
                  <button className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

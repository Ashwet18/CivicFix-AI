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
  MapPin
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
      
      const [dashboardData, issuesData] = await Promise.all([
        getAdminDashboard(),
        getAdminIssues(1, 5, { sortBy: 'priority', sortOrder: 'desc' })
      ]);
      
      setStats(dashboardData);
      setHighPriorityIssues(issuesData.issues);
      
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Monitor and manage civic issues</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/admin/issues')}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Eye className="w-4 h-4 mr-2" />
                View All Issues
              </button>
              <button
                onClick={() => navigate('/admin/map')}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Map View
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Issues */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-3xl font-bold text-gray-900">{stats.total_issues}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Total Issues</h3>
          </div>

          {/* Critical Issues */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-3xl font-bold text-red-600">{stats.critical_issues}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Critical Issues</h3>
          </div>

          {/* High Priority */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-3xl font-bold text-orange-600">{stats.high_priority_issues}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">High Priority</h3>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-3xl font-bold text-yellow-600">{stats.pending_issues}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Pending</h3>
          </div>

          {/* In Progress */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-3xl font-bold text-purple-600">{stats.in_progress_issues}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">In Progress</h3>
          </div>

          {/* Resolved */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-3xl font-bold text-green-600">{stats.resolved_issues}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Resolved</h3>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Issues by Category */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <BarChart3 className="w-5 h-5 text-gray-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Issues by Category</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(stats.issues_by_category).map(([category, count]) => (
                <div key={category} className="flex items-center">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{category}</span>
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(count / stats.total_issues) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Issues by Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <BarChart3 className="w-5 h-5 text-gray-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Issues by Status</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(stats.issues_by_status).map(([status, count]) => {
                const statusColors: Record<string, string> = {
                  reported: 'bg-blue-600',
                  assigned: 'bg-yellow-600',
                  in_progress: 'bg-purple-600',
                  resolved: 'bg-green-600'
                };
                
                return (
                  <div key={status} className="flex items-center">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {status.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${statusColors[status] || 'bg-gray-600'} h-2 rounded-full transition-all`}
                          style={{ width: `${(count / stats.total_issues) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {stats.average_resolution_time_hours && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  Average Resolution Time: <strong>{stats.average_resolution_time_hours.toFixed(1)} hours</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Civic Hotspots Section */}
        <div className="mb-8">
          <CivicHotspots maxDisplay={3} />
        </div>

        {/* High Priority Issues */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">High Priority Issues</h2>
            <button
              onClick={() => navigate('/admin/issues?sort=priority')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All →
            </button>
          </div>
          
          {highPriorityIssues.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No high priority issues at the moment</p>
          ) : (
            <div className="space-y-3">
              {highPriorityIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/issues/${issue.id}`)}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <img
                      src={`http://localhost:8000/${issue.image_path}`}
                      alt={`Issue ${issue.id}`}
                      className="w-16 h-16 object-cover rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,' + btoa(`
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="#E5E7EB">
                            <rect width="100" height="100" fill="#F3F4F6"/>
                          </svg>
                        `);
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">#{issue.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_COLORS[issue.severity as keyof typeof SEVERITY_COLORS]}`}>
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{issue.category}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Priority: {Math.round(issue.priority_score)} • {issue.status}
                      </p>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800">
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

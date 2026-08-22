import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyIssues } from '../services/api';
import { Issue, IssueListResponse, ISSUE_STATUSES } from '../types';
import { 
  Calendar, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw
} from 'lucide-react';

const STATUS_COLORS = {
  reported: 'bg-blue-100 text-blue-800 border-blue-200',
  assigned: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
  in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
  resolved: 'bg-green-100 text-green-800 border-green-200'
};

const STATUS_ICONS = {
  reported: Clock,
  assigned: Users,
  in_progress: RefreshCw,
  resolved: CheckCircle
};

const SEVERITY_COLORS = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  critical: 'text-red-600'
};

export default function MyIssuesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Redirect non-citizens
  useEffect(() => {
    if (!user || user.role !== 'citizen') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load issues
  const loadIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: IssueListResponse = await getMyIssues(
        currentPage, 
        pageSize, 
        statusFilter || undefined
      );
      
      setIssues(response.issues);
      setTotalPages(response.total_pages);
      setTotalCount(response.total_count);
      
    } catch (err: any) {
      console.error('Failed to load issues:', err);
      setError('Failed to load your issues. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter]);

  // Load issues on mount and when filters change
  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  // Handle status filter change
  const handleStatusFilterChange = useCallback((status: string) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filtering
  }, []);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  // Navigate to issue detail
  const viewIssueDetail = useCallback((issueId: number) => {
    navigate(`/issues/${issueId}`);
  }, [navigate]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get priority color
  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'text-red-600 font-bold';
    if (score >= 60) return 'text-orange-600 font-semibold';
    if (score >= 40) return 'text-yellow-600 font-medium';
    return 'text-green-600';
  };

  // Get status display
  const getStatusDisplay = (status: string) => {
    const formatted = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    return formatted;
  };

  if (loading && issues.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg p-6 border">
                  <div className="flex space-x-4">
                    <div className="w-20 h-20 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Issues</h1>
          <p className="text-gray-600">
            Track the status of your reported civic issues and view progress updates.
          </p>
        </div>

        {/* Filters and Stats */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Status Filter */}
            <div className="flex items-center space-x-3">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {ISSUE_STATUSES.map(status => (
                  <option key={status} value={status}>
                    {getStatusDisplay(status)}
                  </option>
                ))}
              </select>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-6 text-sm">
              <div className="text-gray-600">
                <span className="font-medium text-gray-900">{totalCount}</span> total issues
              </div>
              {statusFilter && (
                <div className="text-gray-600">
                  <span className="font-medium text-gray-900">{issues.length}</span> {getStatusDisplay(statusFilter).toLowerCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-700">{error}</p>
              <button
                onClick={loadIssues}
                className="ml-auto text-red-600 hover:text-red-800 font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Issues List */}
        {issues.length === 0 && !loading ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {statusFilter ? `No ${getStatusDisplay(statusFilter).toLowerCase()} issues` : 'No issues reported yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {statusFilter 
                ? `You don't have any issues with "${getStatusDisplay(statusFilter)}" status.`
                : "Start by reporting your first civic issue to help improve your community."
              }
            </p>
            <button
              onClick={() => navigate('/report')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Report New Issue
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map((issue) => {
              const StatusIcon = STATUS_ICONS[issue.status as keyof typeof STATUS_ICONS];
              
              return (
                <div
                  key={issue.id}
                  className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      {/* Issue Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={`http://localhost:8000/${issue.image_path}`}
                          alt={`Issue ${issue.id}`}
                          className="w-24 h-24 object-cover rounded-lg border"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,' + btoa(`
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="#E5E7EB">
                                <rect width="100" height="100" fill="#F3F4F6"/>
                                <text x="50" y="50" text-anchor="middle" dy="0.35em" font-size="12" fill="#9CA3AF">No Image</text>
                              </svg>
                            `);
                          }}
                        />
                      </div>

                      {/* Issue Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {issue.category}
                            </h3>
                            <p className="text-sm text-gray-600">Issue #{issue.id}</p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[issue.status as keyof typeof STATUS_COLORS]}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {getStatusDisplay(issue.status)}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        {issue.description && (
                          <p className="text-gray-700 mb-3 line-clamp-2">
                            {issue.description}
                          </p>
                        )}

                        {/* Metadata */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          <div className="flex items-center text-gray-600">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            <span className={`font-medium ${SEVERITY_COLORS[issue.severity as keyof typeof SEVERITY_COLORS]}`}>
                              {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-gray-600">
                            <span className={getPriorityColor(issue.priority_score)}>
                              Priority: {Math.round(issue.priority_score)}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-gray-600">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}</span>
                          </div>
                          
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>{formatDate(issue.created_at)}</span>
                          </div>
                        </div>

                        {/* AI Analysis Preview */}
                        {issue.ai_analysis_notes && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-sm text-blue-800">
                              <strong>AI Analysis:</strong> {issue.ai_analysis_notes.split('.')[0]}...
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => viewIssueDetail(issue.id)}
                          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} issues
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && issues.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading issues...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
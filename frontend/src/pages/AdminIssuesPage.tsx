import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAdminIssues } from '../services/api';
import { Issue, IssueListResponse, ISSUE_CATEGORIES, ISSUE_STATUSES, SEVERITY_LEVELS } from '../types';
import {
  Search,
  Filter,
  SlidersHorizontal,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Calendar,
  MapPin,
  X
} from 'lucide-react';

const SEVERITY_COLORS = {
  low: 'text-green-600 bg-green-50 border-green-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  critical: 'text-red-600 bg-red-50 border-red-200'
};

const STATUS_COLORS = {
  reported: 'bg-blue-100 text-blue-800 border-blue-200',
  assigned: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
  resolved: 'bg-green-100 text-green-800 border-green-200'
};

export default function AdminIssuesPage() {
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
  const pageSize = 20;
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [priorityMin, setPriorityMin] = useState<string>('');
  const [priorityMax, setPriorityMax] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load issues
  const loadIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = {
        sortBy,
        sortOrder
      };
      
      if (statusFilter) filters.status = statusFilter;
      if (categoryFilter) filters.category = categoryFilter;
      if (severityFilter) filters.severity = severityFilter;
      if (priorityMin) filters.priorityMin = parseFloat(priorityMin);
      if (priorityMax) filters.priorityMax = parseFloat(priorityMax);
      if (searchQuery) filters.search = searchQuery;
      
      const response: IssueListResponse = await getAdminIssues(
        currentPage,
        pageSize,
        filters
      );
      
      setIssues(response.issues);
      setTotalPages(response.total_pages);
      setTotalCount(response.total_count);
      
    } catch (err: any) {
      console.error('Failed to load issues:', err);
      if (err.response?.status === 403) {
        setError('Admin access required');
        navigate('/login');
      } else {
        setError('Failed to load issues. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, categoryFilter, severityFilter, priorityMin, priorityMax, searchQuery, sortBy, sortOrder, navigate]);

  // Load on mount and when filters change
  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setStatusFilter('');
    setCategoryFilter('');
    setSeverityFilter('');
    setPriorityMin('');
    setPriorityMax('');
    setSearchQuery('');
    setCurrentPage(1);
  }, []);

  // Get active filter count
  const activeFilterCount = [statusFilter, categoryFilter, severityFilter, priorityMin, priorityMax, searchQuery].filter(Boolean).length;

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get priority color
  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'text-red-600 font-bold';
    if (score >= 60) return 'text-orange-600 font-semibold';
    if (score >= 40) return 'text-yellow-600 font-medium';
    return 'text-green-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Issue Management</h1>
          <p className="text-gray-600">View and manage all reported civic issues</p>
        </div>

        {/* Search and Filters Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by ID, category, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center px-4 py-2 rounded-md border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-');
                setSortBy(newSortBy);
                setSortOrder(newSortOrder as 'asc' | 'desc');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="priority-desc">Priority: High to Low</option>
              <option value="priority-asc">Priority: Low to High</option>
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="severity-desc">Severity: High to Low</option>
            </select>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  {ISSUE_STATUSES.map(status => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {ISSUE_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Severities</option>
                  {SEVERITY_LEVELS.map(severity => (
                    <option key={severity} value={severity}>
                      {severity.charAt(0).toUpperCase() + severity.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Priority</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={priorityMin}
                  onChange={(e) => setPriorityMin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Priority</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={priorityMax}
                  onChange={(e) => setPriorityMax(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            Showing {issues.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} issues
          </p>
        </div>

        {/* Loading State */}
        {loading && issues.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
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
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-lg font-semibold text-red-900 mb-2">{error}</h2>
            <button
              onClick={loadIssues}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              Try Again
            </button>
          </div>
        ) : issues.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center">
            <Filter className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No issues found</h3>
            <p className="text-gray-600 mb-4">
              {activeFilterCount > 0
                ? 'Try adjusting your filters to see more results'
                : 'No issues have been reported yet'
              }
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Issues List */}
            <div className="space-y-4">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/admin/issues/${issue.id}`)}
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
                              </svg>
                            `);
                          }}
                        />
                      </div>

                      {/* Issue Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg font-semibold text-gray-900">#{issue.id}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[issue.status as keyof typeof STATUS_COLORS]}`}>
                                {issue.status.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_COLORS[issue.severity as keyof typeof SEVERITY_COLORS]}`}>
                                {issue.severity.toUpperCase()}
                              </span>
                            </div>
                            <h3 className="text-base font-medium text-gray-900 mb-1">
                              {issue.category}
                            </h3>
                          </div>
                          
                          <div className="text-right">
                            <div className={`text-lg font-bold ${getPriorityColor(issue.priority_score)}`}>
                              {Math.round(issue.priority_score)}
                            </div>
                            <div className="text-xs text-gray-500">Priority</div>
                          </div>
                        </div>

                        {issue.description && (
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {issue.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(issue.created_at)}
                          </div>
                          {issue.assigned_department && (
                            <div className="flex items-center">
                              <span className="font-medium">Dept:</span>
                              <span className="ml-1">{issue.assigned_department}</span>
                            </div>
                          )}
                          {issue.duplicate_group_id && (
                            <div className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                              Has Duplicates
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/issues/${issue.id}`);
                          }}
                          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                
                <div className="flex space-x-2">
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
                        className={`px-4 py-2 text-sm font-medium rounded-md ${
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
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

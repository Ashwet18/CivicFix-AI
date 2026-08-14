import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getIssueDetail, getIssueDuplicates } from '../services/api';
import { Issue, DuplicateInfo } from '../types';
import Map from '../components/Map';
import { 
  ArrowLeft,
  Calendar,
  MapPin,
  AlertTriangle,
  Shield,
  TrendingUp,
  Users,
  Brain,
  Clock,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Share2
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
  low: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50'
};

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [issue, setIssue] = useState<Issue | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Redirect non-citizens
  useEffect(() => {
    if (!user || user.role !== 'citizen') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load issue details
  const loadIssueDetail = useCallback(async () => {
    if (!id) {
      setError('Invalid issue ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const [issueResponse, duplicateResponse] = await Promise.all([
        getIssueDetail(parseInt(id)),
        getIssueDuplicates(parseInt(id)).catch(() => ({ is_duplicate: false, duplicate_count: 1 }))
      ]);
      
      setIssue(issueResponse);
      setDuplicateInfo(duplicateResponse);
      
    } catch (err: any) {
      console.error('Failed to load issue:', err);
      if (err.response?.status === 404) {
        setError('Issue not found');
      } else if (err.response?.status === 403) {
        setError('You can only view your own issues');
      } else {
        setError('Failed to load issue details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load data on mount
  useEffect(() => {
    loadIssueDetail();
  }, [loadIssueDetail]);

  // Copy coordinates to clipboard
  const copyCoordinates = useCallback(async () => {
    if (!issue) return;
    
    const coords = `${issue.latitude}, ${issue.longitude}`;
    try {
      await navigator.clipboard.writeText(coords);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = coords;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  }, [issue]);

  // Share issue (if Web Share API is available)
  const shareIssue = useCallback(async () => {
    if (!issue) return;
    
    const shareData = {
      title: `Civic Issue: ${issue.category}`,
      text: `Issue #${issue.id} - ${issue.category}${issue.description ? ': ' + issue.description : ''}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Issue URL copied to clipboard');
      } catch (err) {
        alert('Share not supported on this browser');
      }
    }
  }, [issue]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get priority color and label
  const getPriorityInfo = (score: number) => {
    if (score >= 80) return { color: 'text-red-600 bg-red-50 border-red-200', label: 'Critical' };
    if (score >= 60) return { color: 'text-orange-600 bg-orange-50 border-orange-200', label: 'High' };
    if (score >= 40) return { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Medium' };
    return { color: 'text-green-600 bg-green-50 border-green-200', label: 'Low' };
  };

  // Get status display
  const getStatusDisplay = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="bg-white rounded-lg p-6 space-y-4">
              <div className="flex space-x-4">
                <div className="w-32 h-32 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => navigate('/my-issues')}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Issues
          </button>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-lg font-semibold text-red-900 mb-2">{error}</h2>
            <div className="space-x-4">
              <button
                onClick={loadIssueDetail}
                className="text-red-600 hover:text-red-800 font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/my-issues')}
                className="text-gray-600 hover:text-gray-800"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!issue) return null;

  const StatusIcon = STATUS_ICONS[issue.status as keyof typeof STATUS_ICONS];
  const priorityInfo = getPriorityInfo(issue.priority_score);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Navigation */}
        <button
          onClick={() => navigate('/my-issues')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Issues
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Issue Image */}
            <div className="flex-shrink-0">
              <img
                src={`http://localhost:8000/${issue.image_path}`}
                alt={`Issue ${issue.id}`}
                className="w-48 h-48 object-cover rounded-lg border shadow-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="#E5E7EB">
                      <rect width="200" height="200" fill="#F3F4F6"/>
                      <text x="100" y="100" text-anchor="middle" dy="0.35em" font-size="16" fill="#9CA3AF">No Image</text>
                    </svg>
                  `);
                }}
              />
            </div>

            {/* Issue Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{issue.category}</h1>
                  <p className="text-gray-600">Issue #{issue.id}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[issue.status as keyof typeof STATUS_COLORS]}`}>
                    <StatusIcon className="w-4 h-4 mr-2" />
                    {getStatusDisplay(issue.status)}
                  </span>
                  <button
                    onClick={shareIssue}
                    className="flex items-center justify-center px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition-colors"
                  >
                    <Share2 className="w-4 h-4 mr-1" />
                    Share
                  </button>
                </div>
              </div>

              {/* Description */}
              {issue.description && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{issue.description}</p>
                </div>
              )}

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-3 rounded-lg border ${SEVERITY_COLORS[issue.severity as keyof typeof SEVERITY_COLORS]}`}>
                  <div className="flex items-center mb-1">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Severity</span>
                  </div>
                  <p className="font-semibold capitalize">{issue.severity}</p>
                </div>

                <div className={`p-3 rounded-lg border ${priorityInfo.color}`}>
                  <div className="flex items-center mb-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Priority</span>
                  </div>
                  <p className="font-semibold">{priorityInfo.label} ({Math.round(issue.priority_score)})</p>
                </div>

                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg border border-purple-200">
                  <div className="flex items-center mb-1">
                    <Shield className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Safety Risk</span>
                  </div>
                  <p className="font-semibold">{issue.ai_category_confidence || 'N/A'}</p>
                </div>

                {duplicateInfo && duplicateInfo.is_duplicate && (
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200">
                    <div className="flex items-center mb-1">
                      <Users className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">Duplicates</span>
                    </div>
                    <p className="font-semibold">{duplicateInfo.duplicate_count} reports</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
          
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Coordinates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Coordinates</p>
                  <p className="font-mono text-lg">{issue.latitude.toFixed(6)}, {issue.longitude.toFixed(6)}</p>
                </div>
                <button
                  onClick={copyCoordinates}
                  className={`flex items-center px-3 py-1 rounded transition-colors ${
                    copiedCoords 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  {copiedCoords ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {issue.address && (
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-gray-900">{issue.address}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">Reported On</p>
                <p className="text-gray-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  {formatDate(issue.created_at)}
                </p>
              </div>

              {issue.updated_at !== issue.created_at && (
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="text-gray-900">{formatDate(issue.updated_at)}</p>
                </div>
              )}
            </div>

            {/* Map */}
            <div>
              <Map
                center={{ lat: issue.latitude, lng: issue.longitude }}
                zoom={16}
                height="300px"
                markers={[{
                  id: issue.id.toString(),
                  position: { lat: issue.latitude, lng: issue.longitude },
                  title: issue.category,
                  description: issue.description || undefined,
                  type: 'issue'
                }]}
                interactive={false}
                className="rounded-lg border"
              />
            </div>
          </div>
        </div>

        {/* AI Analysis Section */}
        {issue.ai_analysis_notes && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-blue-600" />
              AI Analysis
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900 leading-relaxed">{issue.ai_analysis_notes}</p>
              
              {(issue.ai_category_confidence || issue.ai_severity_confidence) && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {issue.ai_category_confidence && (
                      <div>
                        <span className="text-blue-700 font-medium">Category Confidence: </span>
                        <span className="text-blue-900">{issue.ai_category_confidence}%</span>
                      </div>
                    )}
                    {issue.ai_severity_confidence && (
                      <div>
                        <span className="text-blue-700 font-medium">Severity Confidence: </span>
                        <span className="text-blue-900">{issue.ai_severity_confidence}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resolution Evidence */}
        {issue.status === 'resolved' && (issue.resolution_notes || issue.resolution_image_path) && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Resolution
            </h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
              {issue.resolved_at && (
                <div>
                  <p className="text-sm text-green-700 font-medium">Resolved On</p>
                  <p className="text-green-900 flex items-center mt-1">
                    <Calendar className="w-4 h-4 mr-2" />
                    {formatDate(issue.resolved_at)}
                  </p>
                </div>
              )}

              {issue.resolution_notes && (
                <div>
                  <p className="text-sm text-green-700 font-medium mb-2">Resolution Notes</p>
                  <p className="text-green-900 leading-relaxed">{issue.resolution_notes}</p>
                </div>
              )}

              {issue.resolution_image_path && (
                <div>
                  <p className="text-sm text-green-700 font-medium mb-2">Resolution Photo</p>
                  <img
                    src={`http://localhost:8000/${issue.resolution_image_path}`}
                    alt="Resolution evidence"
                    className="w-full max-w-md rounded-lg border border-green-300 shadow-sm"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {issue.assigned_department && (
                <div>
                  <p className="text-sm text-green-700 font-medium">Resolved By</p>
                  <p className="text-green-900">{issue.assigned_department}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Duplicate Information */}
        {duplicateInfo && duplicateInfo.is_duplicate && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-indigo-600" />
              Similar Reports
            </h2>
            
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <p className="text-indigo-900 mb-2">
                This issue is part of a group with <strong>{duplicateInfo.duplicate_count} similar reports</strong> in the same area.
              </p>
              <p className="text-sm text-indigo-700">
                {duplicateInfo.is_primary 
                  ? "This is the primary report in the group."
                  : `This issue is linked to the primary report #${duplicateInfo.primary_issue_id}.`
                }
              </p>
              <p className="text-xs text-indigo-600 mt-2">
                Grouping similar issues helps prioritize community concerns and improve response times.
              </p>
            </div>
          </div>
        )}

        {/* Status Timeline (Future Enhancement) */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Timeline</h2>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Issue Reported</p>
                <p className="text-sm text-gray-600">{formatDate(issue.created_at)}</p>
                <p className="text-sm text-gray-500 mt-1">
                  AI analysis completed • Priority calculated • Duplicate check performed
                </p>
              </div>
            </div>

            {issue.status !== 'reported' && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Status Updated</p>
                  <p className="text-sm text-gray-600">{formatDate(issue.updated_at)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Status changed to "{getStatusDisplay(issue.status)}"
                  </p>
                </div>
              </div>
            )}

            {/* Future status updates would go here */}
          </div>
        </div>
      </div>
    </div>
  );
}
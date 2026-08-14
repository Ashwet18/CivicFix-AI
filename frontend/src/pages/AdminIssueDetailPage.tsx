import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getAdminIssueDetail, 
  updateIssueStatus, 
  assignIssueDepartment, 
  addAdminNote,
  resolveIssue 
} from '../services/api';
import { AdminIssueDetail, DEPARTMENTS, ISSUE_STATUSES } from '../types';
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
  Edit,
  Save,
  X,
  Upload,
  FileText,
  User
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

const STATUS_ICONS = {
  reported: Clock,
  assigned: Users,
  in_progress: RefreshCw,
  resolved: CheckCircle
};

export default function AdminIssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [issue, setIssue] = useState<AdminIssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Status update modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Department assignment
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [assigningDepartment, setAssigningDepartment] = useState(false);
  
  // Admin notes
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  
  // Resolution
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionImage, setResolutionImage] = useState<File | null>(null);
  const [resolutionImagePreview, setResolutionImagePreview] = useState<string | null>(null);
  const [resolvingIssue, setResolvingIssue] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load issue detail
  const loadIssueDetail = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await getAdminIssueDetail(parseInt(id));
      setIssue(data);
      
    } catch (err: any) {
      console.error('Failed to load issue:', err);
      if (err.response?.status === 404) {
        setError('Issue not found');
      } else if (err.response?.status === 403) {
        setError('Admin access required');
        navigate('/login');
      } else {
        setError('Failed to load issue details');
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadIssueDetail();
  }, [loadIssueDetail]);

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!issue || !newStatus) return;
    
    setUpdatingStatus(true);
    try {
      await updateIssueStatus(issue.id, newStatus, statusNotes || undefined);
      setShowStatusModal(false);
      setNewStatus('');
      setStatusNotes('');
      await loadIssueDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle department assignment
  const handleDepartmentAssign = async () => {
    if (!issue || !selectedDepartment) return;
    
    setAssigningDepartment(true);
    try {
      await assignIssueDepartment(issue.id, selectedDepartment);
      setShowDepartmentModal(false);
      setSelectedDepartment('');
      await loadIssueDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to assign department');
    } finally {
      setAssigningDepartment(false);
    }
  };

  // Handle add note
  const handleAddNote = async () => {
    if (!issue || !newNote.trim()) return;
    
    setAddingNote(true);
    try {
      await addAdminNote(issue.id, newNote);
      setShowNotesModal(false);
      setNewNote('');
      await loadIssueDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  // Handle resolution image selection
  const handleResolutionImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a JPG, PNG, or WEBP image');
      return;
    }
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image must be smaller than 5MB');
      return;
    }
    
    setResolutionImage(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setResolutionImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle resolve issue
  const handleResolve = async () => {
    if (!issue || !resolutionNotes.trim()) {
      alert('Resolution notes are required');
      return;
    }
    
    setResolvingIssue(true);
    try {
      await resolveIssue(issue.id, resolutionNotes, resolutionImage || undefined);
      setShowResolutionModal(false);
      setResolutionNotes('');
      setResolutionImage(null);
      setResolutionImagePreview(null);
      await loadIssueDetail();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to resolve issue');
    } finally {
      setResolvingIssue(false);
    }
  };

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

  // Get priority info
  const getPriorityInfo = (score: number) => {
    if (score >= 80) return { color: 'text-red-600 bg-red-50 border-red-200', label: 'Critical' };
    if (score >= 60) return { color: 'text-orange-600 bg-orange-50 border-orange-200', label: 'High' };
    if (score >= 40) return { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Medium' };
    return { color: 'text-green-600 bg-green-50 border-green-200', label: 'Low' };
  };

  // Get available status transitions
  const getAvailableTransitions = (currentStatus: string) => {
    const transitions: Record<string, string[]> = {
      reported: ['assigned'],
      assigned: ['in_progress', 'reported'],
      in_progress: ['resolved', 'assigned'],
      resolved: []
    };
    return transitions[currentStatus] || [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="bg-white rounded-lg p-6 space-y-4">
              <div className="flex space-x-4">
                <div className="w-48 h-48 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => navigate('/admin/issues')}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Issues
          </button>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-lg font-semibold text-red-900 mb-2">{error || 'Failed to load issue'}</h2>
            <button
              onClick={loadIssueDetail}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const StatusIcon = STATUS_ICONS[issue.status as keyof typeof STATUS_ICONS];
  const priorityInfo = getPriorityInfo(issue.priority_score);
  const availableTransitions = getAvailableTransitions(issue.status);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Navigation */}
        <button
          onClick={() => navigate('/admin/issues')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Issues
        </button>

        {/* Header with Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Issue Image and Basic Info */}
            <div className="flex gap-6">
              <img
                src={`http://localhost:8000/${issue.image_path}`}
                alt={`Issue ${issue.id}`}
                className="w-48 h-48 object-cover rounded-lg border shadow-sm flex-shrink-0"
              />
              
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">Issue #{issue.id}</h1>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[issue.status as keyof typeof STATUS_COLORS]}`}>
                    <StatusIcon className="w-4 h-4 inline mr-1" />
                    {issue.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{issue.category}</h2>
                
                {issue.reporter_email && (
                  <p className="text-sm text-gray-600 flex items-center mb-2">
                    <User className="w-4 h-4 mr-1" />
                    Reported by: {issue.reporter_email}
                  </p>
                )}
                
                <p className="text-sm text-gray-600 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(issue.created_at)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {issue.status !== 'resolved' && (
                <>
                  <button
                    onClick={() => {
                      setSelectedDepartment(issue.assigned_department || '');
                      setShowDepartmentModal(true);
                    }}
                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    {issue.assigned_department ? 'Change Department' : 'Assign Department'}
                  </button>
                  
                  {availableTransitions.length > 0 && (
                    <button
                      onClick={() => setShowStatusModal(true)}
                      className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Update Status
                    </button>
                  )}
                  
                  <button
                    onClick={() => setShowNotesModal(true)}
                    className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Add Note
                  </button>
                  
                  {(issue.status === 'in_progress' || issue.status === 'assigned') && (
                    <button
                      onClick={() => setShowResolutionModal(true)}
                      className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Resolved
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-lg border ${SEVERITY_COLORS[issue.severity as keyof typeof SEVERITY_COLORS]}`}>
            <div className="flex items-center mb-1">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Severity</span>
            </div>
            <p className="text-lg font-semibold capitalize">{issue.severity}</p>
          </div>

          <div className={`p-4 rounded-lg border ${priorityInfo.color}`}>
            <div className="flex items-center mb-1">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Priority</span>
            </div>
            <p className="text-lg font-semibold">{priorityInfo.label} ({Math.round(issue.priority_score)})</p>
          </div>

          <div className="p-4 bg-purple-50 text-purple-600 rounded-lg border border-purple-200">
            <div className="flex items-center mb-1">
              <Shield className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Confidence</span>
            </div>
            <p className="text-lg font-semibold">{issue.ai_category_confidence || 0}%</p>
          </div>

          {issue.duplicate_group_id && (
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200">
              <div className="flex items-center mb-1">
                <Users className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">Duplicate Group</span>
              </div>
              <p className="text-lg font-semibold">#{issue.duplicate_group_id}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {issue.description && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 leading-relaxed">{issue.description}</p>
          </div>
        )}

        {/* Location */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Location</h3>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Coordinates</p>
                <p className="font-mono text-lg">{issue.latitude.toFixed(6)}, {issue.longitude.toFixed(6)}</p>
              </div>
              {issue.address && (
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-gray-900">{issue.address}</p>
                </div>
              )}
              {issue.assigned_department && (
                <div>
                  <p className="text-sm text-gray-600">Assigned Department</p>
                  <p className="text-gray-900 font-medium">{issue.assigned_department}</p>
                  {issue.assigned_at && (
                    <p className="text-xs text-gray-500">Assigned on {formatDate(issue.assigned_at)}</p>
                  )}
                </div>
              )}
            </div>
            
            <Map
              center={{ lat: issue.latitude, lng: issue.longitude }}
              zoom={16}
              height="300px"
              markers={[{
                id: issue.id.toString(),
                position: { lat: issue.latitude, lng: issue.longitude },
                title: issue.category,
                type: 'issue'
              }]}
              interactive={false}
              className="rounded-lg border"
            />
          </div>
        </div>

        {/* AI Analysis */}
        {issue.ai_analysis_notes && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-blue-600" />
              AI Analysis
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900 leading-relaxed">{issue.ai_analysis_notes}</p>
            </div>
          </div>
        )}

        {/* Admin Notes */}
        {issue.admin_notes && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Admin Notes (Internal)</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{issue.admin_notes}</pre>
            </div>
          </div>
        )}

        {/* Resolution Evidence */}
        {issue.status === 'resolved' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Resolution Evidence
            </h3>
            <div className="space-y-4">
              {issue.resolution_notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Resolution Notes</p>
                  <p className="text-gray-900">{issue.resolution_notes}</p>
                </div>
              )}
              
              {issue.resolution_image_path && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Resolution Photo</p>
                  <img
                    src={`http://localhost:8000/${issue.resolution_image_path}`}
                    alt="Resolution"
                    className="w-full max-w-md rounded-lg border"
                  />
                </div>
              )}
              
              {issue.resolved_at && (
                <p className="text-sm text-gray-600">
                  Resolved on {formatDate(issue.resolved_at)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Status History */}
        {issue.history && issue.history.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Status History</h3>
            <div className="space-y-3">
              {issue.history.map((entry) => (
                <div key={entry.id} className="flex items-start space-x-3 pb-3 border-b last:border-b-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {entry.old_status && entry.new_status ? (
                        <>Status changed from <span className="capitalize">{entry.old_status.replace('_', ' ')}</span> to <span className="capitalize">{entry.new_status.replace('_', ' ')}</span></>
                      ) : (
                        'Status updated'
                      )}
                    </p>
                    {entry.notes && (
                      <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Update Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select status...</option>
                  {availableTransitions.map(status => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes about this status change..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setNewStatus('');
                    setStatusNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={updatingStatus}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || updatingStatus}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Department Assignment Modal */}
        {showDepartmentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Department</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select department...</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDepartmentModal(false);
                    setSelectedDepartment('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={assigningDepartment}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDepartmentAssign}
                  disabled={!selectedDepartment || assigningDepartment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigningDepartment ? 'Assigning...' : 'Assign Department'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Notes Modal */}
        {showNotesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Admin Note</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Note
                </label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={4}
                  placeholder="Add internal notes (not visible to citizens)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setNewNote('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={addingNote}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addingNote}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resolution Modal */}
        {showResolutionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-md w-full p-6 my-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mark Issue as Resolved</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Notes *
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  placeholder="Describe how the issue was resolved..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Photo (Optional)
                </label>
                
                {!resolutionImagePreview ? (
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to upload resolution photo</p>
                    <p className="text-xs text-gray-500">JPG, PNG, or WEBP • Max 5MB</p>
                  </div>
                ) : (
                  <div className="relative">
                    <img 
                      src={resolutionImagePreview} 
                      alt="Resolution preview" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setResolutionImage(null);
                        setResolutionImagePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleResolutionImageSelect}
                  className="hidden"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowResolutionModal(false);
                    setResolutionNotes('');
                    setResolutionImage(null);
                    setResolutionImagePreview(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={resolvingIssue}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={!resolutionNotes.trim() || resolvingIssue}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resolvingIssue ? 'Resolving...' : 'Mark as Resolved'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

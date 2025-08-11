import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ChevronLeft, ChevronDown, ChevronRight, Search, AlertTriangle, Pencil, Check, Shield, Edit, Trash2, HardHat, Settings, Calendar, Clock, CheckCircle, XCircle, User, Users, X, Lock, Unlock, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { verifyAdminPassword } from '../../utils/adminPassword';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface HolidaysProps {
  setShowHolidays: (show: boolean) => void;
  setShowAdminDashboard: (show: boolean) => void;
}

interface LeaveRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_type: 'worker' | 'staff';
    start_date: string;
    end_date: string;
  total_days: number;
  leave_type: string;
  reason?: string;
    status: 'pending' | 'approved' | 'denied';
  approved_by?: string;
  approved_at?: string;
  admin_notes?: string;
    created_at: string;
}

interface LeaveEntitlement {
  user_id: string;
  user_email: string;
  user_name: string;
  user_type: string;
  year: number;
  total_entitlement: number;
    used_days: number;
    remaining_days: number;
}

type ViewMode = 'my_requests' | 'all_requests' | 'entitlements' | 'holiday_table';

export function Holidays({ setShowHolidays, setShowAdminDashboard }: HolidaysProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('my_requests');
  
  // Modal states
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [showEditEntitlementModal, setShowEditEntitlementModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [selectedEntitlement, setSelectedEntitlement] = useState<LeaveEntitlement | null>(null);
  
  // Form states
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [leaveType, setLeaveType] = useState<'full_day' | 'half_day_morning' | 'half_day_afternoon'>('full_day');
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [newEntitlement, setNewEntitlement] = useState<number>(0);
  const [userFilter, setUserFilter] = useState('all');

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, viewMode]);

  const initializeData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        
        // Check if user is admin based on user metadata or email
        // You can modify this logic based on your admin detection needs
        const userType = user.user_metadata?.user_type;
        const isAdminEmail = user.email?.includes('admin') || user.email?.endsWith('@rockrevelations.co.uk');
        const isStaffUser = userType === 'staff';
        
        // For now, assume staff users can act as admins, or you can add specific admin logic
        setIsAdmin(isAdminEmail || isStaffUser);
      }
    } catch (error) {
      console.error('Error initializing:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchLeaveRequests(),
        fetchEntitlements()
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    if (!currentUser) return;

    let query = supabase.from('annual_leave_requests').select('*');
    
    if (viewMode === 'my_requests') {
      query = query.eq('user_email', currentUser.email);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    setRequests(data || []);
  };

  const fetchEntitlements = async () => {
        const currentYear = new Date().getFullYear();
    const { data, error } = await supabase
      .from('annual_leave_entitlements')
        .select('*')
      .eq('year', currentYear)
      .order('user_name');
    
    if (error) throw error;
    setEntitlements(data || []);
  };

  const calculateTotalDays = (start: Date, end: Date, type: string): number => {
    if (type.startsWith('half_day')) return 0.5;
    
    // Count only weekdays (Monday to Friday)
    let workingDays = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workingDays;
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateRange?.from || !currentUser) return;

    setLoading(true);
    setError(null);

    try {
      // Get current user's name from auth metadata or email
      const userName = currentUser.user_metadata?.full_name || 
                      currentUser.user_metadata?.name || 
                      currentUser.email?.split('@')[0] || 
                      currentUser.email;
      const endDate = dateRange.to || dateRange.from;
      const totalDays = calculateTotalDays(dateRange.from, endDate, leaveType);

      // Ensure user has entitlement record
      await supabase.rpc('ensure_user_entitlement', {
        p_user_id: currentUser.id,
        p_user_email: currentUser.email,
        p_user_name: userName,
        p_user_type: 'staff'
      });

      const { error } = await supabase
        .from('annual_leave_requests')
        .insert({
          user_id: currentUser.id,
          user_email: currentUser.email,
          user_name: userName,
          user_type: 'staff',
          start_date: dateRange.from.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          total_days: totalDays,
          leave_type: leaveType,
          reason: reason || null,
          status: 'pending'
        });

      if (error) throw error;

      setSuccess('Leave request submitted successfully!');
      setShowNewRequestModal(false);
      resetForm();
      fetchData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
        setLoading(false);
    }
  };

  const handleApprovalAction = async (action: 'approved' | 'denied') => {
    if (!selectedRequest || !currentUser) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('annual_leave_requests')
        .update({ 
          status: action,
          approved_by: currentUser.id,
          approved_at: new Date().toISOString(),
          admin_notes: adminNotes || null
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      setSuccess(`Request ${action} successfully!`);
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setAdminNotes('');
      fetchData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDateRange(undefined);
    setLeaveType('full_day');
    setReason('');
  };

  const handleAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const isValid = await verifyAdminPassword(adminPassword);
    if (isValid) {
      setIsAdminAuthenticated(true);
      setShowAdminPasswordModal(false);
      setAdminPassword('');
      setSuccess('Admin access granted!');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError('Incorrect password');
      setTimeout(() => setError(null), 3000);
    }
    setLoading(false);
  };

  const handleEditEntitlement = (entitlement: LeaveEntitlement) => {
    setSelectedEntitlement(entitlement);
    setNewEntitlement(entitlement.total_entitlement);
    setShowEditEntitlementModal(true);
  };

  const handleUpdateEntitlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntitlement) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('annual_leave_entitlements')
        .update({
          total_entitlement: newEntitlement,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedEntitlement.user_id)
        .eq('year', selectedEntitlement.year);

      if (error) throw error;
      
      setSuccess('Entitlement updated successfully!');
      setShowEditEntitlementModal(false);
      setSelectedEntitlement(null);
      fetchData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update entitlement');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'denied': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'denied': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesUserFilter = userFilter === 'all' || request.user_type === userFilter;
    
    return matchesSearch && matchesUserFilter;
  });

  const filteredEntitlements = entitlements.filter(entitlement =>
    entitlement.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entitlement.user_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

    return (
      <div className="space-y-6">
      {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
          <button
            onClick={() => {
              setShowHolidays(false);
              setShowAdminDashboard(true);
            }}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Company Section
          </button>
        </div>

            {/* Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Annual Leave Management
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          {!isAdminAuthenticated ? (
            <button
              onClick={() => setShowAdminPasswordModal(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 w-full sm:w-auto"
            >
              <Shield className="h-4 w-4 mr-2" />
              Admin View
            </button>
          ) : (
          <button
            onClick={() => {
                setIsAdminAuthenticated(false);
                setViewMode('my_requests');
            }}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 w-full sm:w-auto"
          >
              <Shield className="h-4 w-4 mr-2" />
            Exit Admin View
            </button>
          )}
          <button
            onClick={() => setShowNewRequestModal(true)}
            className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-semibold w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Request
          </button>
        </div>
        </div>

        {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 sm:gap-4 mt-4 border-b overflow-x-auto">
            <button
          onClick={() => setViewMode('my_requests')}
          className={`pb-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
            viewMode === 'my_requests'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <User className="h-4 w-4 inline mr-1" />
          My Requests
            </button>
        {isAdminAuthenticated && (
          <>
            <button
              onClick={() => setViewMode('all_requests')}
              className={`pb-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                viewMode === 'all_requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4 inline mr-1" />
              All Requests
            </button>
            <button
              onClick={() => setViewMode('entitlements')}
              className={`pb-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                viewMode === 'entitlements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-1" />
              Entitlements
            </button>
            <button
              onClick={() => setViewMode('holiday_table')}
              className={`pb-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                viewMode === 'holiday_table'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4 inline mr-1" />
              Holiday Table
            </button>
          </>
        )}
        </div>

      {/* Content */}
      <div className="">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">{success}</p>
          </div>
        )}

                {/* Search and Filters */}
        {isAdminAuthenticated && (viewMode === 'all_requests' || viewMode === 'entitlements' || viewMode === 'holiday_table') && (
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
                placeholder="Search by name, email, or reason..."
              value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
            
            {viewMode === 'all_requests' && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter by User Type:
                </label>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm w-full sm:w-auto"
                >
                  <option value="all">All Users</option>
                  <option value="worker">Workers Only</option>
                  <option value="staff">Staff Only</option>
                </select>
        </div>
            )}
          </div>
        )}

        {/* Content based on view mode */}
        {viewMode === 'entitlements' && isAdminAuthenticated ? (
          <EntitlementsView 
            entitlements={filteredEntitlements} 
            loading={loading}
            onEditEntitlement={handleEditEntitlement}
          />
        ) : viewMode === 'holiday_table' && isAdminAuthenticated ? (
          <HolidayTableView 
            entitlements={filteredEntitlements}
            requests={requests}
            loading={loading}
          />
        ) : (
          <RequestsView
            requests={filteredRequests}
            loading={loading}
            isAdmin={isAdminAuthenticated}
            viewMode={viewMode}
            onApprove={(request) => {
              setSelectedRequest(request);
              setShowApprovalModal(true);
            }}
            getStatusIcon={getStatusIcon}
            getStatusColor={getStatusColor}
          />
                                )}
                              </div>

      {/* New Request Modal */}
      {showNewRequestModal && createPortal(
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">New Leave Request</h3>
                            <button
                  onClick={() => setShowNewRequestModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                            </button>
                                          </div>

              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Leave Type
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as any)}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="full_day">Full Day(s)</option>
                    <option value="half_day_morning">Half Day (Morning)</option>
                    <option value="half_day_afternoon">Half Day (Afternoon)</option>
                  </select>
                                            </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Date{leaveType === 'full_day' ? 's' : ''}
                  </label>
                  <div className="border rounded-md p-4">
                    <DayPicker
                      mode={leaveType === 'full_day' ? 'range' : 'single'}
                      selected={dateRange}
                      onSelect={setDateRange}
                      disabled={{ before: new Date() }}
                      className="mx-auto"
                    />
                                        </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Enter reason for leave..."
                  />
                </div>

                                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                                              <button
                    type="button"
                    onClick={() => setShowNewRequestModal(false)}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 order-2 sm:order-1"
                  >
                    Cancel
                                              </button>
                                              <button
                    type="submit"
                    disabled={!dateRange?.from || loading}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 order-1 sm:order-2"
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                                                </button>
                                              </div>
              </form>
                                        </div>
                                      </div>
          </div>,
          document.body
        )}

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Review Leave Request</h3>
                      <button
                  onClick={() => setShowApprovalModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                      </button>
                  </div>
                  
              <div className="space-y-4 mb-6">
                <div>
                  <span className="text-sm text-gray-600">Employee:</span>
                  <p className="font-medium">{selectedRequest.user_name}</p>
                                  </div>
                <div>
                  <span className="text-sm text-gray-600">Dates:</span>
                  <p className="font-medium">
                    {new Date(selectedRequest.start_date).toLocaleDateString()} - {new Date(selectedRequest.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Duration:</span>
                  <p className="font-medium">{selectedRequest.total_days} day{selectedRequest.total_days !== 1 ? 's' : ''}</p>
                    </div>
                {selectedRequest.reason && (
                <div>
                    <span className="text-sm text-gray-600">Reason:</span>
                    <p className="font-medium">{selectedRequest.reason}</p>
                                    </div>
                                  )}
                                </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Notes (Optional)
                    </label>
                    <textarea 
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Add any notes for the employee..."
                    />
                </div>

                              <div className="flex flex-col sm:flex-row justify-end gap-3">
                                      <button
                    onClick={() => setShowApprovalModal(false)}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 order-3 sm:order-1"
                                      >
                    Cancel
                                      </button>
                                      <button
                    onClick={() => handleApprovalAction('denied')}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 order-2 sm:order-2"
                  >
                    Deny
                                      </button>
                                        <button
                    onClick={() => handleApprovalAction('approved')}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 order-1 sm:order-3"
                                        >
                                          Approve
                                        </button>
                                      </div>
                                </div>
                              </div>
                        </div>
                      )}

      {/* Admin Password Modal */}
      {showAdminPasswordModal && createPortal(
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Admin Access</h3>
                <button
                  onClick={() => setShowAdminPasswordModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAdminPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enter Admin Password
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Enter password..."
                    required
                  />
                </div>
        
                                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdminPasswordModal(false)}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 order-1 sm:order-2"
                  >
                    Unlock
                  </button>
                </div>
              </form>
            </div>
            </div>
          </div>,
          document.body
        )}

      {/* Edit Entitlement Modal */}
      {showEditEntitlementModal && selectedEntitlement && createPortal(
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Edit Entitlement</h3>
                    <button
                  onClick={() => setShowEditEntitlementModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                    <div className="mb-4">
                <div className="text-sm text-gray-600 mb-2">Employee:</div>
                <div className="font-medium">{selectedEntitlement.user_name}</div>
                <div className="text-sm text-gray-500">{selectedEntitlement.user_email}</div>
                      </div>

              <form onSubmit={handleUpdateEntitlement} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Entitlement (Days)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={newEntitlement}
                    onChange={(e) => setNewEntitlement(parseFloat(e.target.value))}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            required
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Current: {selectedEntitlement.total_entitlement} days
                    <br />
                    Used: {selectedEntitlement.used_days} days
                    <br />
                    Remaining: {selectedEntitlement.remaining_days} days
                  </div>
                </div>
                    
                                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                      <button
                        type="button"
                    onClick={() => setShowEditEntitlementModal(false)}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 order-2 sm:order-1"
                  >
                    Cancel
                      </button>
                      <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 order-1 sm:order-2"
                  >
                    {loading ? 'Updating...' : 'Update'}
                      </button>
                </div>
            </form>
                        </div>
          </div>
        </div>,
        document.body
      )}
      </div>
    );
  }

// Helper Components
function RequestsView({ requests, loading, isAdmin, viewMode, onApprove, getStatusIcon, getStatusColor }: any) {
  if (loading) {
  return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading requests...</div>
            </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No leave requests found</p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request: LeaveRequest) => (
        <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {/* Mobile Card Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(request.status)}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                  {request.status.toUpperCase()}
                </span>
                                </div>
              <div className="text-xs text-gray-500">
                {new Date(request.created_at).toLocaleDateString()}
                        </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {request.user_type === 'worker' ? '👷' : '👔'}
              </span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{request.user_name}</div>
                <div className="text-sm text-gray-500">{request.user_email}</div>
            </div>
            </div>
        </div>
        
          {/* Mobile Card Content */}
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-300 font-medium">Start Date:</span>
                <div className="font-medium text-gray-900 dark:text-white">
                  {new Date(request.start_date).toLocaleDateString()}
                                    </div>
            </div>
              <div>
                <span className="text-gray-600 dark:text-gray-300 font-medium">End Date:</span>
                <div className="font-medium text-gray-900 dark:text-white">
                  {new Date(request.end_date).toLocaleDateString()}
            </div>
          </div>
              <div>
                <span className="text-gray-600 dark:text-gray-300 font-medium">Duration:</span>
                <div className="font-medium text-gray-900 dark:text-white">
                  {request.total_days} day{request.total_days !== 1 ? 's' : ''}
              </div>
                        </div>
              <div>
                <span className="text-gray-600 dark:text-gray-300 font-medium">Type:</span>
                <div className="font-medium text-gray-900 dark:text-white capitalize">
                  {request.leave_type.startsWith('half_day') ? 'Half Day' : request.leave_type.replace('_', ' ')}
               </div>
              </div>
            </div>

                        {request.reason && (
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-300 font-medium">Reason:</span>
                <div className="font-medium text-gray-900 dark:text-white mt-1">
                  {request.reason}
                </div>
               </div>
      )}

            {request.admin_notes && (
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-300 font-medium">Admin Notes:</span>
                <div className="font-medium text-blue-600 mt-1">
                  {request.admin_notes}
                </div>
              </div>
      )}

            {/* Action Button */}
            {isAdmin && request.status === 'pending' && viewMode === 'all_requests' && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <button
                  onClick={() => onApprove(request)}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Eye className="h-4 w-4 mr-2" />
Review Request                </button>
                            </div>
                        )}
          </div>
               </div>
      ))}
        </div>
  );
}

function EntitlementsView({ entitlements, loading, onEditEntitlement }: any) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading entitlements...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entitlements.map((entitlement: LeaveEntitlement) => (
        <div
          key={`${entitlement.user_id}-${entitlement.year}`}
          onClick={() => onEditEntitlement(entitlement)}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
        >
          {/* Card Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {entitlement.user_type === 'worker' ? '👷' : '👔'}
                </span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {entitlement.user_name}
                  </div>
                  <div className="text-sm text-gray-500">{entitlement.user_email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Edit className="h-4 w-4" />
                <span className="text-xs hidden sm:block">Tap to edit</span>
              </div>
            </div>
          </div>

          {/* Card Content */}
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {entitlement.total_entitlement}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                  Total Days
                </div>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {entitlement.used_days}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 font-medium mb-2">
                  Used Days
                </div>
                {/* Progress Bar inside Used Days cell */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (entitlement.used_days / entitlement.total_entitlement) > 0.8 ? 'bg-red-500' :
                      (entitlement.used_days / entitlement.total_entitlement) > 0.6 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((entitlement.used_days / entitlement.total_entitlement) * 100, 100)}%` }}
                  />
                </div>
              </div>
              
              <div className={`rounded-lg p-3 ${
                entitlement.remaining_days < 5 ? 'bg-red-50 dark:bg-red-900/20' : 
                entitlement.remaining_days < 10 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 
                'bg-green-50 dark:bg-green-900/20'
              }`}>
                <div className={`text-2xl font-bold ${
                  entitlement.remaining_days < 5 ? 'text-red-600 dark:text-red-400' : 
                  entitlement.remaining_days < 10 ? 'text-yellow-600 dark:text-yellow-400' : 
                  'text-green-600 dark:text-green-400'
                }`}>
                  {entitlement.remaining_days}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                  Remaining
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HolidayTableView({ entitlements, requests, loading }: any) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading holiday data...</div>
                </div>
    );
  }

  // Calculate holidays taken for each user from approved requests
  const holidayData = entitlements.map((entitlement: LeaveEntitlement) => {
    const userRequests = requests.filter((req: LeaveRequest) => 
      req.user_email === entitlement.user_email && req.status === 'approved'
    );
    
    const totalHolidaysTaken = userRequests.reduce((sum: number, req: LeaveRequest) => 
      sum + req.total_days, 0
    );

    return {
      ...entitlement,
      holidays_taken: totalHolidaysTaken,
      holidays_remaining: entitlement.total_entitlement - totalHolidaysTaken
    };
  });

  if (holidayData.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No holiday data available</p>
      </div>
    );
  }

    return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Holiday Overview - All Employees
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Complete overview of all employee holiday entitlements and usage
        </p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Entitlement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Taken
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Usage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {holidayData.map((employee: any) => {
                const usagePercentage = (employee.holidays_taken / employee.total_entitlement * 100).toFixed(1);
                const isHighUsage = parseFloat(usagePercentage) > 80;
                const isLowRemaining = employee.holidays_remaining < 5;
                
                return (
                  <tr key={`${employee.user_id}-${employee.year}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-3">
                          {employee.user_type === 'worker' ? '👷' : '👔'}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {employee.user_name}
                          </div>
                          <div className="text-sm text-gray-500">{employee.user_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="font-medium">{employee.total_entitlement} days</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="font-medium">{employee.holidays_taken} days</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        isLowRemaining ? 'text-red-600 dark:text-red-400' : 
                        employee.holidays_remaining < 10 ? 'text-yellow-600 dark:text-yellow-400' : 
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {employee.holidays_remaining} days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full">
                        <div className={`text-sm font-medium mb-2 ${
                          isHighUsage ? 'text-red-600 dark:text-red-400' : 
                          parseFloat(usagePercentage) > 60 ? 'text-yellow-600 dark:text-yellow-400' : 
                          'text-green-600 dark:text-green-400'
                        }`}>
                          {usagePercentage}%
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isHighUsage ? 'bg-red-500' : 
                              parseFloat(usagePercentage) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(parseFloat(usagePercentage), 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {holidayData.map((employee: any) => {
          const usagePercentage = (employee.holidays_taken / employee.total_entitlement * 100).toFixed(1);
          const isHighUsage = parseFloat(usagePercentage) > 80;
          const isLowRemaining = employee.holidays_remaining < 5;
          
          return (
            <div key={`${employee.user_id}-${employee.year}`} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              {/* Card Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {employee.user_type === 'worker' ? '👷' : '👔'}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {employee.user_name}
                    </div>
                    <div className="text-sm text-gray-500">{employee.user_email}</div>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {employee.total_entitlement}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Entitlement
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {employee.holidays_taken}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Taken
                    </div>
                  </div>
                  
                  <div className={`rounded-lg p-3 text-center ${
                    isLowRemaining ? 'bg-red-50 dark:bg-red-900/20' : 
                    employee.holidays_remaining < 10 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 
                    'bg-green-50 dark:bg-green-900/20'
                  }`}>
                    <div className={`text-lg font-bold ${
                      isLowRemaining ? 'text-red-600 dark:text-red-400' : 
                      employee.holidays_remaining < 10 ? 'text-yellow-600 dark:text-yellow-400' : 
                      'text-green-600 dark:text-green-400'
                    }`}>
                      {employee.holidays_remaining}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Remaining
                    </div>
                  </div>
                  
                  <div className={`rounded-lg p-3 text-center ${
                    isHighUsage ? 'bg-red-50 dark:bg-red-900/20' : 
                    parseFloat(usagePercentage) > 60 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 
                    'bg-green-50 dark:bg-green-900/20'
                  }`}>
                    <div className={`text-lg font-bold ${
                      isHighUsage ? 'text-red-600 dark:text-red-400' : 
                      parseFloat(usagePercentage) > 60 ? 'text-yellow-600 dark:text-yellow-400' : 
                      'text-green-600 dark:text-green-400'
                    }`}>
                      {usagePercentage}%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                      Usage
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isHighUsage ? 'bg-red-500' : 
                          parseFloat(usagePercentage) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(parseFloat(usagePercentage), 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
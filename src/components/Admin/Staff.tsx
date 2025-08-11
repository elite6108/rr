import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Pencil, Trash2, Plus, ChevronLeft, Search, AlertTriangle, Check, RefreshCw, Clipboard, Settings, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StaffProps {
  setShowStaff: (show: boolean) => void;
  setShowAdminDashboard: (show: boolean) => void;
}

interface CompanySettings {
  id: string;  // UUID is stored as string
  token?: string;
}

interface StaffMember {
  id: number;
  name: string;
  position: string;
  email: string;
  phone: string;
  ni_number: string;
  start_date: string;
  token?: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  user_metadata?: {
    role?: string;
  };
}

interface CombinedStaffUser {
  id: string;
  name: string;
  type: 'staff' | 'user' | 'worker';
  original_id: string | number;
  email: string;
  position?: string;
  phone?: string;
  ni_number?: string;
  start_date?: string;
  token?: string;
}

interface WorkerPhone {
  email: string;
  phone: string;
}

export function Staff({ setShowStaff, setShowAdminDashboard }: StaffProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workerPhones, setWorkerPhones] = useState<WorkerPhone[]>([]);
  const [combinedStaffUsers, setCombinedStaffUsers] = useState<CombinedStaffUser[]>([]);
  const [userDetails, setUserDetails] = useState<{[userId: string]: Partial<CombinedStaffUser>}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CombinedStaffUser | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenLoading, setTokenLoading] = useState<number | null>(null);
  const [companyToken, setCompanyToken] = useState<string>('');
  const [workerToken, setWorkerToken] = useState<string>('');
  const addEditModalRef = useRef<HTMLDivElement>(null);
  const tokenModalRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    email: '',
    phone: '',
    ni_number: '',
    start_date: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{
    phone?: string;
    ni_number?: string;
  }>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [userFormData, setUserFormData] = useState({
    name: '',
    position: '',
    email: '',
    phone: '',
    ni_number: '',
    start_date: '',
  });
  const [userFormErrors, setUserFormErrors] = useState<{
    phone?: string;
    ni_number?: string;
  }>({});
  const [userCurrentStep, setUserCurrentStep] = useState(1);

  useEffect(() => {
    fetchStaff();
    fetchUsers();
    fetchWorkerPhones();
  }, []);

  useEffect(() => {
    // Combine staff and users when either list changes or user details are updated
    if (staff.length > 0 || users.length > 0 || workerPhones.length > 0) {
      combineStaffAndUsers();
    }
  }, [staff, users, userDetails, workerPhones]);

  const handleViewUser = (user: CombinedStaffUser) => {
    setSelectedUser(user);
    
    // Get stored details for this user if they exist
    const storedDetails = userDetails[user.original_id as string] || {};
    
    setUserFormData({
      name: storedDetails.name || user.name || '',
      position: storedDetails.position || user.position || '',
      email: user.email || '',
      phone: storedDetails.phone || user.phone || '',
      ni_number: storedDetails.ni_number || user.ni_number || '',
      start_date: storedDetails.start_date || user.start_date || '',
    });
    setUserCurrentStep(1);
    setShowUserDetailsModal(true);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    const isModalOpen = showAddModal || showEditModal || showDeleteModal || showTokenModal || showUserDetailsModal;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal, showEditModal, showDeleteModal, showTokenModal, showUserDetailsModal]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching all verified users via Edge Function...');
      
      // Get current session to pass authorization header
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.log('No valid session found');
        setUsers([]);
        return;
      }

      // Call the Edge Function to get all verified users
      const { data, error } = await supabase.functions.invoke('get-all-users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        // Fallback to current user only if Edge Function fails
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUsers([{
            id: user.id,
            full_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email || 'Current User',
            email: user.email || ''
          }]);
          console.log('Fallback: Using current authenticated user only:', user.email);
        } else {
          setUsers([]);
        }
        return;
      }

      if (data?.users) {
        setUsers(data.users.map((user: any) => ({
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          user_metadata: user.user_metadata,
        })));
        console.log(`Successfully fetched ${data.users.length} verified users:`, data.users.map((u: any) => u.email));
      } else {
        console.log('No users returned from Edge Function');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback to current user only if there's an error
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUsers([{
            id: user.id,
            full_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email || 'Current User',
            email: user.email || ''
          }]);
          console.log('Error fallback: Using current authenticated user only:', user.email);
        } else {
          setUsers([]);
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        setUsers([]);
      }
    }
  };

  const fetchWorkerPhones = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('email, phone');

      if (error) {
        console.error('Error fetching worker phones:', error);
        return;
      }

      setWorkerPhones(data || []);
    } catch (error) {
      console.error('Error in fetchWorkerPhones:', error);
    }
  };

  const combineStaffAndUsers = () => {
    const combined: CombinedStaffUser[] = [
      ...staff.map(staffMember => {
        const workerPhone = workerPhones.find(p => p.email === staffMember.email);
        return {
          id: `staff_${staffMember.id}`,
          name: staffMember.name,
          type: 'staff' as const,
          original_id: staffMember.id,
          email: staffMember.email,
          position: staffMember.position,
          phone: workerPhone?.phone || staffMember.phone,
          ni_number: staffMember.ni_number,
          start_date: staffMember.start_date,
          token: staffMember.token
        };
      }),
      ...users.filter(user => !staff.some(staffMember => staffMember.email === user.email))
        .map(user => {
          const storedDetails = userDetails[user.id] || {};
          const workerPhone = workerPhones.find(p => p.email === user.email);
          const isWorker = !!workerPhone;

          return {
            id: `user_${user.id}`,
            name: storedDetails.name || user.full_name || user.email || 'Unknown User',
            type: isWorker ? 'worker' : 'user',
            original_id: user.id,
            email: user.email,
            position: storedDetails.position,
            phone: workerPhone?.phone || storedDetails.phone,
            ni_number: storedDetails.ni_number,
            start_date: storedDetails.start_date
          };
        })
    ];
    
    console.log('Combined staff and users:', combined);
    setCombinedStaffUsers(combined);
  };

  const fetchStaff = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      setError('Failed to fetch staff members');
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setFormData({
      name: staffMember.name,
      position: staffMember.position,
      email: staffMember.email,
      phone: staffMember.phone,
      ni_number: staffMember.ni_number,
      start_date: staffMember.start_date,
    });
    setShowEditModal(true);
  };

  const handleDelete = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setShowDeleteModal(true);
  };

  const handleAdd = () => {
    setFormData({
      name: '',
      position: '',
      email: '',
      phone: '',
      ni_number: '',
      start_date: '',
    });
    setShowAddModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedStaff) return;

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', selectedStaff.id);

      if (error) throw error;

      setStaff(staff.filter((s) => s.id !== selectedStaff.id));
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting staff member:', error);
    }
  };

  const validatePhoneNumber = (phone: string) => {
    if (phone.length > 10) {
      return 'Phone number must be 10 digits after +44';
    }
    if (!/^\d{10}$/.test(phone)) {
      return 'Phone number must be 10 digits';
    }
    return '';
  };

  const validateNINumber = (ni: string) => {
    const niRegex = /^(?!BG)(?!GB)(?!NK)(?!KN)(?!TN)(?!NT)(?!ZZ)(?!.*[DFIQUV])[A-CEGHJ-NPR-TW-Z]{2}\d{6}[A-D]$/;
    if (!niRegex.test(ni)) {
      return 'Invalid National Insurance number format';
    }
    return '';
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let token = '';
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (i < 4) token += '-';
    }
    return token;
  };

  const handleGenerateToken = async (staffId: number) => {
    try {
      setTokenLoading(staffId);
      const newToken = generateToken();

      const { error } = await supabase
        .from('staff')
        .update({
          token: newToken
        })
        .eq('id', staffId);

      if (error) throw error;

      setStaff(prevStaff => 
        prevStaff.map(member => 
          member.id === staffId 
            ? { ...member, token: newToken }
            : member
        )
      );
    } catch (error) {
      console.error('Error generating token:', error);
    } finally {
      setTokenLoading(null);
    }
  };

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setSuccessMessage('Token copied to clipboard');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error copying token:', error);
      setError('Failed to copy token');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== 3) {
      nextStep();
      return;
    }

    setError(null);
    setFormErrors({});

    // Validate phone number
    const phoneError = validatePhoneNumber(formData.phone);
    if (phoneError) {
      setFormErrors(prev => ({ ...prev, phone: phoneError }));
      return;
    }

    // Validate NI number
    const niError = validateNINumber(formData.ni_number);
    if (niError) {
      setFormErrors(prev => ({ ...prev, ni_number: niError }));
      return;
    }

    try {
      if (showEditModal && selectedStaff) {
        const { error } = await supabase
          .from('staff')
          .update(formData)
          .eq('id', selectedStaff.id);

        if (error) throw error;

        setStaff(
          staff.map((s) =>
            s.id === selectedStaff.id ? { ...s, ...formData } : s
          )
        );
        setShowEditModal(false);
        setCurrentStep(1);
        setSuccessMessage('Staff member updated successfully');
      } else if (showAddModal) {
        const { data, error } = await supabase
          .from('staff')
          .insert([formData])
          .select();

        if (error) throw error;
        if (data) {
          setStaff([...staff, data[0]]);
          setSuccessMessage('Staff member added successfully');
        }
        setShowAddModal(false);
        setCurrentStep(1);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'An error occurred while saving'
      );
      console.error('Error saving staff member:', error);
    }
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const renderStepIndicator = () => {
    const stepLabels = ['Details', 'Contact', 'Employment'];
    
    return (
      <div className="mb-8 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-medium text-indigo-600">
            {stepLabels[currentStep - 1]}
          </div>
          <div className="text-sm text-gray-500">
            Step {currentStep} of 3
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, phone: value }));
    if (value.length > 0) {
      const error = validatePhoneNumber(value);
      setFormErrors(prev => ({ ...prev, phone: error }));
    } else {
      setFormErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  const handleNIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/\s/g, '');
    setFormData(prev => ({ ...prev, ni_number: value }));
    if (value.length > 0) {
      const error = validateNINumber(value);
      setFormErrors(prev => ({ ...prev, ni_number: error }));
    } else {
      setFormErrors(prev => ({ ...prev, ni_number: undefined }));
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userCurrentStep !== 3) {
      setUserCurrentStep((prev) => Math.min(prev + 1, 3));
      return;
    }

    setError(null);
    setUserFormErrors({});

    // Validate phone number
    if (userFormData.phone) {
      const phoneError = validatePhoneNumber(userFormData.phone);
      if (phoneError) {
        setUserFormErrors(prev => ({ ...prev, phone: phoneError }));
        return;
      }
    }

    // Validate NI number
    if (userFormData.ni_number) {
      const niError = validateNINumber(userFormData.ni_number);
      if (niError) {
        setUserFormErrors(prev => ({ ...prev, ni_number: niError }));
        return;
      }
    }

    try {
      if (!selectedUser) return;

      // Check if this user already exists as a staff member
      const existingStaffMember = staff.find(s => s.email === userFormData.email);
      
      if (existingStaffMember) {
        // Update existing staff member
        const { error } = await supabase
          .from('staff')
          .update({
            name: userFormData.name,
            position: userFormData.position,
            phone: userFormData.phone,
            ni_number: userFormData.ni_number,
            start_date: userFormData.start_date,
          })
          .eq('id', existingStaffMember.id);

        if (error) throw error;

        // Update local state
        setStaff(prevStaff => 
          prevStaff.map(s => 
            s.id === existingStaffMember.id 
              ? { ...s, ...userFormData }
              : s
          )
        );
        setSuccessMessage('Staff member updated successfully');
      } else {
        // For users that don't exist as staff, we need to decide whether to:
        // 1. Just update the user details (preserve user type)
        // 2. Convert them to staff
        
        // Since the user is editing a "user" type, we should preserve their user status
        // and store the additional details in userDetails state
        
        // Update the users list with the name
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === selectedUser.original_id 
              ? { ...user, full_name: userFormData.name }
              : user
          )
        );
        
        // Store additional user details
        setUserDetails(prevDetails => ({
          ...prevDetails,
          [selectedUser.original_id]: {
            name: userFormData.name,
            position: userFormData.position,
            phone: userFormData.phone,
            ni_number: userFormData.ni_number,
            start_date: userFormData.start_date
          }
        }));
        
        setSuccessMessage('User details updated successfully');
      }
      
      setShowUserDetailsModal(false);
      setUserCurrentStep(1);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'An error occurred while saving'
      );
      console.error('Error saving user details:', error);
    }
  };

  const userNextStep = () => {
    setUserCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const userPrevStep = () => {
    setUserCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const renderUserStepIndicator = () => {
    const stepLabels = ['Details', 'Contact', 'Employment'];
    
    return (
      <div className="mb-8 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-medium text-indigo-600">
            {stepLabels[userCurrentStep - 1]}
          </div>
          <div className="text-sm text-gray-500">
            Step {userCurrentStep} of 3
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${(userCurrentStep / 3) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  const handleUserPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setUserFormData(prev => ({ ...prev, phone: value }));
    if (value.length > 0) {
      const error = validatePhoneNumber(value);
      setUserFormErrors(prev => ({ ...prev, phone: error }));
    } else {
      setUserFormErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  const handleUserNIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/\s/g, '');
    setUserFormData(prev => ({ ...prev, ni_number: value }));
    if (value.length > 0) {
      const error = validateNINumber(value);
      setUserFormErrors(prev => ({ ...prev, ni_number: error }));
    } else {
      setUserFormErrors(prev => ({ ...prev, ni_number: undefined }));
    }
  };

  const handleConvertUserToStaff = async () => {
    if (!selectedUser || !userFormData.name || !userFormData.email) {
      setError('Please fill in required fields before converting to staff');
      return;
    }

    setError(null);
    setUserFormErrors({});

    // Validate phone number if provided
    if (userFormData.phone) {
      const phoneError = validatePhoneNumber(userFormData.phone);
      if (phoneError) {
        setUserFormErrors(prev => ({ ...prev, phone: phoneError }));
        return;
      }
    }

    // Validate NI number if provided
    if (userFormData.ni_number) {
      const niError = validateNINumber(userFormData.ni_number);
      if (niError) {
        setUserFormErrors(prev => ({ ...prev, ni_number: niError }));
        return;
      }
    }

    try {
      // Check if this user already exists as a staff member
      const existingStaffMember = staff.find(s => s.email === userFormData.email);
      
      if (existingStaffMember) {
        setError('This user is already a staff member');
        return;
      }

      // Create new staff member from user data
      const { data, error } = await supabase
        .from('staff')
        .insert([userFormData])
        .select();

      if (error) throw error;
      
      if (data && data[0]) {
        // Add to local state
        setStaff(prevStaff => [...prevStaff, data[0]]);
        setSuccessMessage('User converted to staff member successfully');
        setShowUserDetailsModal(false);
        setUserCurrentStep(1);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'An error occurred while converting user to staff'
      );
      console.error('Error converting user to staff:', error);
    }
  };

  const filteredStaffUsers = combinedStaffUsers.filter((member) => {
    if (member.type === 'worker') {
      return false;
    }
    const query = searchQuery.toLowerCase();
    return (
      member.name?.toLowerCase().includes(query) ||
      member.position?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.phone?.toLowerCase().includes(query) ||
      member.type?.toLowerCase().includes(query)
    );
  });

  const handleTokensClick = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('token, worker_token, id')
        .single();

      if (error) throw error;
      setCompanyToken(data?.token || '');
      setWorkerToken(data?.worker_token || '');
      setCompanySettings(data as CompanySettings);
      setShowTokenModal(true);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  };

  const handleGenerateCompanyToken = async () => {
    try {
      setTokenLoading(0);
      const newToken = generateToken();

      if (!companySettings?.id) {
        const { data: settingsData, error: fetchError } = await supabase
          .from('company_settings')
          .select('id')
          .single();

        if (fetchError) throw fetchError;
        if (!settingsData?.id) throw new Error('No company settings found');
        setCompanySettings(settingsData as CompanySettings);
      }

      const { error } = await supabase
        .from('company_settings')
        .update({ token: newToken })
        .eq('id', companySettings?.id);

      if (error) throw error;
      setCompanyToken(newToken);
    } catch (error) {
      console.error('Error generating company token:', error);
    } finally {
      setTokenLoading(null);
    }
  };

  const handleGenerateWorkerToken = async () => {
    try {
      setTokenLoading(-1); // Use -1 to indicate worker token loading
      const newToken = generateToken();

      if (!companySettings?.id) {
        const { data: settingsData, error: fetchError } = await supabase
          .from('company_settings')
          .select('id')
          .single();

        if (fetchError) throw fetchError;
        if (!settingsData?.id) throw new Error('No company settings found');
        setCompanySettings(settingsData as CompanySettings);
      }

      const { error } = await supabase
        .from('company_settings')
        .update({ worker_token: newToken })
        .eq('id', companySettings?.id);

      if (error) throw error;
      setWorkerToken(newToken);
    } catch (error) {
      console.error('Error generating worker token:', error);
    } finally {
      setTokenLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={() => {
            setShowStaff(false);
            setShowAdminDashboard(true);
          }}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Company Section
        </button>
       </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Staff & Users Management</h2>
      </div>

      <p>To add new staff, please get them to register as a user. For workers, they will need to register through the worker login.</p>

      {/* Search Box with Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, position, email, phone or type..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleTokensClick}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Settings className="h-4 w-4 mr-2" />
            Tokens
          </button>
          <button
            onClick={handleAdd}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 hide"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Staff
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
          <Check className="h-5 w-5 flex-shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Staff & Users Table - Desktop */}
      <div className="hidden lg:block bg-white dark:bg-gray-800 shadow-lg overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                    Name
                  </th>
                  <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                    Type
                  </th>
                  <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                    Email
                  </th>
                  <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                    Position
                  </th>
                  <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                    Phone
                  </th>
                  <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                    Start Date
                  </th>
                  <th className="sticky top-0 px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : filteredStaffUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No staff or users found
                    </td>
                  </tr>
                ) : (
                  filteredStaffUsers.map((member) => (
                    <tr 
                      key={member.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => {
                        if (member.type === 'staff') {
                          handleEdit(staff.find(s => s.id === member.original_id)!);
                        } else {
                          handleViewUser(member);
                        }
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {member.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          member.type === 'staff' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' 
                            : member.type === 'worker' 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' 
                              : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {member.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {member.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {member.position || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {member.phone ? (member.phone.startsWith('0') ? member.phone : `0${member.phone}`) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {member.start_date ? new Date(member.start_date).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-4">
                          {member.type === 'staff' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(staff.find(s => s.id === member.original_id)!);
                                }}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Edit"
                              >
                                <Pencil className="h-5 w-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(staff.find(s => s.id === member.original_id)!);
                                }}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </>
                          )}
                          {member.type === 'user' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewUser(member);
                              }}
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                              title="View Details"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Staff & Users Cards - Mobile/Tablet */}
      <div className="lg:hidden space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredStaffUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No staff or users found
          </div>
        ) : (
          filteredStaffUsers.map((member) => (
            <div 
              key={member.id} 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                if (member.type === 'staff') {
                  handleEdit(staff.find(s => s.id === member.original_id)!);
                } else {
                  handleViewUser(member);
                }
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{member.name}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      member.type === 'staff' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' 
                        : member.type === 'worker' 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' 
                          : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {member.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{member.position || 'N/A'}</p>
                </div>
                <div className="flex space-x-2">
                  {member.type === 'staff' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(staff.find(s => s.id === member.original_id)!);
                        }}
                        className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(staff.find(s => s.id === member.original_id)!);
                        }}
                        className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {member.type === 'user' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewUser(member);
                      }}
                      className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded-md"
                      title="View Details"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Contact Email:</span>
                  <span className="text-gray-900 dark:text-white">{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                    <span className="text-gray-900 dark:text-white">
                      {member.phone.startsWith('0') ? member.phone : `0${member.phone}`}
                    </span>
                  </div>
                )}
                {member.ni_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">NI Number:</span>
                    <span className="text-gray-900 dark:text-white">{member.ni_number}</span>
                  </div>
                )}
                {member.start_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Start Date:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(member.start_date).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 overflow-y-auto flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg-xl p-6 max-w-sm w-full m-4">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
              Confirm Deletion
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Are you sure you want to delete {selectedStaff?.name}? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 dark:hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 overflow-y-auto flex items-center justify-center z-50 p-4">
          <div ref={addEditModalRef} className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-lg w-full m-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              {showAddModal ? 'Add Staff Member' : 'Edit Staff Member'}
            </h2>
            {renderStepIndicator()}
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {currentStep === 1 && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              )}
              {currentStep === 2 && (
                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Position *</label>
                  <input
                    type="text"
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              )}
              {currentStep === 3 && (
                <>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email *</label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone *</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                        +44
                      </span>
                      <input
                        type="tel"
                        id="phone"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        required
                        maxLength={10}
                      />
                    </div>
                    {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
                  </div>
                  <div>
                    <label htmlFor="ni_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">NI Number *</label>
                    <input
                      type="text"
                      id="ni_number"
                      value={formData.ni_number}
                      onChange={handleNIChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                    {formErrors.ni_number && <p className="text-red-500 text-xs mt-1">{formErrors.ni_number}</p>}
                  </div>
                  <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date *</label>
                    <input
                      type="date"
                      id="start_date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </>
              )}
              <div className="flex justify-between items-center pt-4">
                {currentStep > 1 && (
                  <button type="button" onClick={prevStep} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Previous</button>
                )}
                <div className="ml-auto flex space-x-2">
                  <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false); setCurrentStep(1); }} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    {currentStep === 3 ? (showAddModal ? 'Add' : 'Save') : 'Next'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* User Details Modal */}
      {showUserDetailsModal && selectedUser && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 overflow-y-auto flex items-center justify-center z-50 p-4">
          <div ref={addEditModalRef} className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-lg w-full m-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Edit User Details
            </h2>
            {renderUserStepIndicator()}
            <form onSubmit={handleUserSubmit} className="space-y-4 mt-4">
              {userCurrentStep === 1 && (
                <div>
                  <label htmlFor="user_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                  <input
                    type="text"
                    id="user_name"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
              )}
              {userCurrentStep === 2 && (
                <>
                  <div>
                    <label htmlFor="user_email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email *</label>
                    <input
                      type="email"
                      id="user_email"
                      value={userFormData.email}
                      onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="user_phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                        +44
                      </span>
                      <input
                        type="tel"
                        id="user_phone"
                        value={userFormData.phone}
                        onChange={handleUserPhoneChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-r-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        maxLength={10}
                      />
                    </div>
                    {userFormErrors.phone && <p className="text-red-500 text-xs mt-1">{userFormErrors.phone}</p>}
                  </div>
                </>
              )}
              {userCurrentStep === 3 && (
                <>
                  <div>
                    <label htmlFor="user_position" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Position</label>
                    <input
                      type="text"
                      id="user_position"
                      value={userFormData.position}
                      onChange={(e) => setUserFormData({ ...userFormData, position: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="user_ni_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">NI Number</label>
                    <input
                      type="text"
                      id="user_ni_number"
                      value={userFormData.ni_number}
                      onChange={handleUserNIChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                    {userFormErrors.ni_number && <p className="text-red-500 text-xs mt-1">{userFormErrors.ni_number}</p>}
                  </div>
                  <div>
                    <label htmlFor="user_start_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                    <input
                      type="date"
                      id="user_start_date"
                      value={userFormData.start_date}
                      onChange={(e) => setUserFormData({ ...userFormData, start_date: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </>
              )}
              <div className="flex justify-between items-center pt-4">
                {userCurrentStep > 1 && (
                  <button type="button" onClick={userPrevStep} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Previous</button>
                )}
                <div className="ml-auto flex space-x-2">
                  <button type="button" onClick={() => { setShowUserDetailsModal(false); setUserCurrentStep(1); }} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
                  {userCurrentStep === 3 && selectedUser?.type === 'user' && (
                    <button 
                      type="button" 
                      onClick={handleConvertUserToStaff}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Convert to Staff
                    </button>
                  )}
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    {userCurrentStep === 3 ? 'Save Changes' : 'Next'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Token Modal */}
      {showTokenModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 overflow-y-auto flex items-center justify-center z-50 p-4">
          <div ref={tokenModalRef} className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Manage Tokens</h2>
              <button
                onClick={() => setShowTokenModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Company Token</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This token is for administrative access.</p>
                <div className="flex items-center space-x-2 mt-2">
                  <input type="text" value={companyToken} readOnly className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-white" />
                  <button onClick={handleGenerateCompanyToken} className="p-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                    <RefreshCw className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleCopyToken(companyToken)} className="p-2 text-white bg-green-600 rounded-md hover:bg-green-700">
                    <Clipboard className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Worker Token</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This token is for general staff access.</p>
                <div className="flex items-center space-x-2 mt-2">
                  <input type="text" value={workerToken} readOnly className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-white" />
                  <button onClick={handleGenerateWorkerToken} className="p-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                    <RefreshCw className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleCopyToken(workerToken)} className="p-2 text-white bg-green-600 rounded-md hover:bg-green-700">
                    <Clipboard className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setShowTokenModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

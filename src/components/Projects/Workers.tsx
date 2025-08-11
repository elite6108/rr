import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Upload, 
  Pencil,
  AlertTriangle,
  Search,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react';

type Worker = {
  id: string;
  full_name: string;
  phone: string;
  dob: string | null;
  national_insurance: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  last_health_questionnaire: string | null;
  photo_filename: string | null;
  photo_url?: string | null;
  first_name: string | null;
  last_name: string | null;
  last_main_questionnaire_date: string | null;
  email: string;
  company: string;
  is_active: boolean;
  created_at: string;
  workers_safety_handbook: { signed_at: string | null;[key: string]: any }[] | null;
  workers_annual_training: { signed_at: string | null;[key: string]: any }[] | null;
  workers_risk_assessment_signatures: { 
    signed_at: string | null;
    risk_assessments: { ra_id: string; name: string } | null;
    [key: string]: any 
  }[] | null;
  workers_policy_signatures: {
    signed_at: string | null;
    policy_id: string | null;
    other_policy_file_id: string | null;
    hs_policy_file_id: string | null;
    [key: string]: any
  }[] | null;
};

type SortField = 'full_name' | 'last_health_questionnaire';
type SortDirection = 'asc' | 'desc';

type WorkersProps = {
  onBack: () => void;
};

export function Workers({ 
  onBack,
}: WorkersProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('full_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    company: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  useEffect(() => {
    fetchWorkers();
  }, []);

  const getSignedImageUrl = async (filename: string | null): Promise<string | null> => {
    if (!filename) return null;
    
    try {
      const { data, error } = await supabase.storage
        .from('workers')
        .createSignedUrl(filename, 3600);
      
      if (error) {
        console.error('Error generating signed URL:', error);
        return null;
      }
        
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }
  };

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('workers')
        .select(`
          *,
          workers_safety_handbook (
            *
          ),
          workers_annual_training (
            *
          ),
          workers_risk_assessment_signatures (
            *,
            risk_assessments (
              ra_id,
              name
            )
          ),
          workers_policy_signatures (
            *
          )
        `)
        .order('full_name');

      if (error) throw error;

      if (data && data.length > 0) {
        const workersWithUrls = await Promise.all(
          data.map(async (worker: any) => {
            if (worker.photo_filename) {
              try {
                const signedUrl = await getSignedImageUrl(worker.photo_filename);
                return { ...worker, photo_url: signedUrl };
              } catch (err) {
                console.error('Error getting signed URL for worker:', worker.full_name, err);
                return { ...worker, photo_url: null };
              }
            }
            return worker;
          })
        );
        
        setWorkers(workersWithUrls || []);
      } else {
        setWorkers([]);
      }
    } catch (err) {
      console.error('Error fetching workers:', err);
      setError('Failed to load workers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      company: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    try {
      setUploading(true);

      const file = e.target.files[0];
      
      const allowedMimeTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/heif'];
      if (!allowedMimeTypes.includes(file.type)) {
        setError('File type not allowed. Please upload JPG, PNG or HEIF images only.');
        setUploading(false);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit.');
        setUploading(false);
        return;
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${formData.email.replace('@', '_at_')}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('workers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const signedUrl = await getSignedImageUrl(fileName);

      setFormData((prev) => ({
        ...prev,
        photo_filename: fileName,
        photo_url: signedUrl,
      }));
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not provided';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const dataToSubmit = {
        ...formData,
        is_active: true,
        photo_filename: formData.photo_filename || null
      };
      
      if ('photo_url' in dataToSubmit) {
        delete (dataToSubmit as any).photo_url;
      }

      if (editingWorkerId) {
        const { error } = await supabase
          .from('workers')
          .update(dataToSubmit)
          .eq('id', editingWorkerId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('workers').insert([dataToSubmit]);

        if (error) throw error;
      }

      await fetchWorkers();

      resetForm();
      setShowAddForm(false);
      setEditingWorkerId(null);
    } catch (err: any) {
      console.error('Error saving worker:', err);

      let errorMessage = 'Failed to save worker. ';

      if (err.code) {
        switch (err.code) {
          case '23505':
            errorMessage += 'A worker with this email already exists.';
            break;
          case '23502':
            errorMessage += 'Please fill in all required fields.';
            break;
          case '42P01':
            errorMessage += 'Database table not found. Please contact support.';
            break;
          case '42703':
            errorMessage += `Database error: ${
              err.message || 'Unknown column error'
            }`;
            break;
          default:
            errorMessage += err.message || `Error code: ${err.code}`;
        }
      } else if (err.message) {
        errorMessage += err.message;
      } else {
        errorMessage +=
          'Unknown error occurred. Please try again or contact support.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (worker: Worker) => {
    let photoUrl = null;
    if (worker.photo_filename) {
      try {
        photoUrl = await getSignedImageUrl(worker.photo_filename);
      } catch (err) {
        console.error('Error getting signed URL for worker edit:', worker.full_name, err);
        photoUrl = null;
      }
    }
  
    setFormData({
      full_name: worker.full_name || '',
      phone: worker.phone || '',
      email: worker.email || '',
      company: worker.company || '',
      emergency_contact_name: worker.emergency_contact_name || '',
      emergency_contact_phone: worker.emergency_contact_phone || '',
      photo_filename: worker.photo_filename || '',
      photo_url: photoUrl || '',
    } as any);

    setEditingWorkerId(worker.id);
    setShowAddForm(true);
  };

  const confirmDelete = (id: string) => {
    setWorkerToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!workerToDelete) return;

    try {
      setLoading(true);

      // First, get the worker data for photo cleanup
      const { data: workerData } = await supabase
        .from('workers')
        .select('photo_filename')
        .eq('id', workerToDelete)
        .single();

      // Delete related records from worker_site_access table first
      const { error: siteAccessError } = await supabase
        .from('worker_site_access')
        .delete()
        .eq('worker_id', workerToDelete);

      if (siteAccessError) {
        console.error('Error deleting worker site access:', siteAccessError);
        // Continue with worker deletion even if site access deletion fails
      }
      
      // Now delete the worker
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', workerToDelete);

      if (error) throw error;
      
      // Clean up the photo from storage if it exists
      if (workerData?.photo_filename) {
        const { error: storageError } = await supabase.storage
          .from('workers')
          .remove([workerData.photo_filename]);
          
        if (storageError) {
          console.error('Error deleting worker photo:', storageError);
        }
      }

      await fetchWorkers();

      setShowDeleteModal(false);
      setWorkerToDelete(null);
    } catch (err) {
      console.error('Error deleting worker:', err);
      setError('Failed to delete worker. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredWorkers = workers.filter((worker) => {
    const query = searchQuery.toLowerCase();
    return (
      worker.full_name?.toLowerCase().includes(query) ||
      worker.email?.toLowerCase().includes(query) ||
      worker.phone?.toLowerCase().includes(query) ||
      worker.company?.toLowerCase().includes(query)
    );
  });

  const sortedWorkers = [...filteredWorkers].sort((a, b) => {
    if (sortField === 'full_name') {
      const comparison = (a.full_name || '').localeCompare(b.full_name || '');
      return sortDirection === 'asc' ? comparison : -comparison;
    } else if (sortField === 'last_health_questionnaire') {
      const dateA = a.last_health_questionnaire ? new Date(a.last_health_questionnaire).getTime() : 0;
      const dateB = b.last_health_questionnaire ? new Date(b.last_health_questionnaire).getTime() : 0;
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Customers & Projects
        </button>
        
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Workers Management
      </h1>

      <div className="flex items-center">
      <div className="relative flex-grow">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, phone or company..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <button
        onClick={() => fetchWorkers()}
        className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
        disabled={loading}
      >
        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        <span className="ml-2">{loading ? 'Refreshing...' : 'Refresh'}</span>
      </button>
    </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 shadow-lg overflow-hidden sm:rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Edit Worker
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="full_name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Full Name *
                </label>
                <input
                  type="text"
                  name="full_name"
                  id="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Company *
                </label>
                <input
                  type="text"
                  name="company"
                  id="company"
                  required
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="emergency_contact_name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Emergency Contact Name *
                </label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  id="emergency_contact_name"
                  required
                  value={formData.emergency_contact_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="emergency_contact_phone"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Emergency Contact Phone *
                </label>
                <input
                  type="text"
                  name="emergency_contact_phone"
                  id="emergency_contact_phone"
                  required
                  value={formData.emergency_contact_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingWorkerId(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-lg-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-lg-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-lg overflow-hidden sm:rounded-lg">
        {loading ? (
          <div className="p-6 text-center">Loading workers...</div>
        ) : filteredWorkers.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No workers found. Workers must sign up through the Contractor Worker
            signup form.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Photo
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => handleSort('full_name')}
                      >
                        <div className="flex items-center">
                          Full Name
                          {sortField === 'full_name' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Contact
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => handleSort('last_health_questionnaire')}
                      >
                        <div className="flex items-center">
                          Health Questionnaire
                          {sortField === 'last_health_questionnaire' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Signatures
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedWorkers.map((worker) => (
                      <tr 
                        key={worker.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => handleEdit(worker)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          {worker.photo_url ? (
                            <img
                              src={worker.photo_url}
                              alt={worker.full_name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                              <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                                {worker.full_name?.substring(0, 2).toUpperCase() ||
                                  'NA'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {worker.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {worker.phone || worker.email ? (
                            <div>
                              {worker.phone && (
                                <div>{worker.phone}</div>
                              )}
                              {worker.email && (
                                <div className="text-xs">{worker.email}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">
                              Not provided
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {worker.last_health_questionnaire ? (
                            formatDate(worker.last_health_questionnaire)
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">
                              Not provided
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              worker.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}
                          >
                            {worker.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          <div>
                            <div className={worker.workers_safety_handbook && worker.workers_safety_handbook[0]?.signed_at ? 'text-green-500' : 'text-red-500'}>
                              Employee Handbook: {worker.workers_safety_handbook && worker.workers_safety_handbook[0]?.signed_at ? `Signed ${formatDate(worker.workers_safety_handbook[0].signed_at)}` : 'Not Signed'}
                            </div>
                            <div className={worker.workers_annual_training && worker.workers_annual_training[0]?.signed_at ? 'text-green-500' : 'text-red-500'}>
                              Annual Training: {worker.workers_annual_training && worker.workers_annual_training[0]?.signed_at ? `Signed ${formatDate(worker.workers_annual_training[0].signed_at)}` : 'Not Signed'}
                            </div>
                            <div className="mt-2">
                              <div className="text-gray-700 dark:text-gray-300 font-medium mb-1">Risk Assessments Signed:</div>
                              {worker.workers_risk_assessment_signatures && worker.workers_risk_assessment_signatures.length > 0 ? (
                                <div className="space-y-1">
                                  {(() => {
                                    // Group signatures by risk assessment ID and get the most recent one for each
                                    const latestSignatures = worker.workers_risk_assessment_signatures.reduce((acc, signature) => {
                                      const raId = signature.risk_assessments?.ra_id;
                                      if (!raId) return acc;
                                      
                                      if (!acc[raId] || (signature.signed_at && (!acc[raId].signed_at || new Date(signature.signed_at) > new Date(acc[raId].signed_at)))) {
                                        acc[raId] = signature;
                                      }
                                      return acc;
                                    }, {} as Record<string, any>);
                                    
                                    return Object.values(latestSignatures).map((signature, index) => (
                                      <div key={index} className="text-green-500 text-xs">
                                        {signature.risk_assessments?.ra_id || 'N/A'}<br/>
                                        {signature.risk_assessments?.name || 'Unknown Assessment'}<br/>
                                        Signed: {signature.signed_at ? formatDate(signature.signed_at) : 'N/A'}
                                      </div>
                                    ));
                                  })()}
                                </div>
                              ) : (
                                <div className="text-red-500 text-xs">No Risk Assessments Signed</div>
                              )}
                            </div>
                            <div className="mt-2">
                              <div className="text-gray-700 dark:text-gray-300 font-medium mb-1">Policies Signed:</div>
                              {(() => {
                                // Show policy signatures based on actual data structure
                                const policySignatures = worker.workers_policy_signatures || [];

                                if (policySignatures.length > 0) {
                                  return (
                                    <div className="space-y-1">
                                      {policySignatures.map((signature, index) => {
                                        let policyType = 'Unknown Policy';
                                        if (signature.policy_id) {
                                          policyType = 'General Policy';
                                        } else if (signature.other_policy_file_id) {
                                          policyType = 'Other Policy';
                                        } else if (signature.hs_policy_file_id) {
                                          policyType = 'H&S Policy';
                                        }

                                        return (
                                          <div key={index} className={signature.signed_at ? "text-green-500 text-xs" : "text-red-500 text-xs"}>
                                            {policyType}<br/>
                                            ID: {signature.policy_id || signature.other_policy_file_id || signature.hs_policy_file_id || 'N/A'}<br/>
                                            {signature.signed_at ? `Signed: ${formatDate(signature.signed_at)}` : 'Not Signed'}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                } else {
                                  return <div className="text-red-500 text-xs">No Policies Signed</div>;
                                }
                              })()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(worker);
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Edit"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(worker.id);
                              }}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile/Tablet Cards */}
            <div className="lg:hidden">
              <div className="space-y-4 p-4">
                {sortedWorkers.map((worker) => (
                  <div 
                    key={worker.id} 
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleEdit(worker)}
                  >
                    <div className="flex items-start space-x-4 mb-3">
                      {/* Photo */}
                      <div className="flex-shrink-0">
                        {worker.photo_url ? (
                          <img
                            src={worker.photo_url}
                            alt={worker.full_name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                              {worker.full_name?.substring(0, 2).toUpperCase() || 'NA'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Name and Status */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {worker.full_name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {worker.company}
                        </p>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            worker.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {worker.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Contact Info and Details */}
                    <div className="space-y-2 text-sm mb-4">
                      {(worker.phone || worker.email) && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Contact:</span>
                          <div className="text-gray-900 dark:text-white text-right">
                            {worker.phone && <div>{worker.phone}</div>}
                            {worker.email && <div className="text-xs">{worker.email}</div>}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Health Questionnaire:</span>
                        <span className="text-gray-900 dark:text-white">
                          {worker.last_health_questionnaire 
                            ? formatDate(worker.last_health_questionnaire)
                            : 'Not provided'
                          }
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Emergency Contact:</span>
                        <div className="text-gray-900 dark:text-white text-right">
                          {worker.emergency_contact_name && (
                            <div>{worker.emergency_contact_name}</div>
                          )}
                          {worker.emergency_contact_phone && (
                            <div className="text-xs">{worker.emergency_contact_phone}</div>
                          )}
                          {!worker.emergency_contact_name && !worker.emergency_contact_phone && (
                            <span className="text-gray-400 dark:text-gray-500">Not provided</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Signatures:</span>
                        <div className="text-right">
                          <div className={worker.workers_safety_handbook && worker.workers_safety_handbook[0]?.signed_at ? 'text-green-500' : 'text-red-500'}>
                            Employee Handbook: {worker.workers_safety_handbook && worker.workers_safety_handbook[0]?.signed_at ? `Signed ${formatDate(worker.workers_safety_handbook[0].signed_at)}` : 'Not Signed'}
                          </div>
                          <div className={worker.workers_annual_training && worker.workers_annual_training[0]?.signed_at ? 'text-green-500' : 'text-red-500'}>
                            Annual Training: {worker.workers_annual_training && worker.workers_annual_training[0]?.signed_at ? `Signed ${formatDate(worker.workers_annual_training[0].signed_at)}` : 'Not Signed'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Risk Assessments Signed:</span>
                        <div className="text-right">
                          {worker.workers_risk_assessment_signatures && worker.workers_risk_assessment_signatures.length > 0 ? (
                            <div className="space-y-1">
                              {(() => {
                                // Group signatures by risk assessment ID and get the most recent one for each
                                const latestSignatures = worker.workers_risk_assessment_signatures.reduce((acc, signature) => {
                                  const raId = signature.risk_assessments?.ra_id;
                                  if (!raId) return acc;
                                  
                                  if (!acc[raId] || (signature.signed_at && (!acc[raId].signed_at || new Date(signature.signed_at) > new Date(acc[raId].signed_at)))) {
                                    acc[raId] = signature;
                                  }
                                  return acc;
                                }, {} as Record<string, any>);
                                
                                return Object.values(latestSignatures).map((signature, index) => (
                                  <div key={index} className="text-green-500 text-xs">
                                    {signature.risk_assessments?.ra_id || 'N/A'}<br/>
                                    {signature.risk_assessments?.name || 'Unknown Assessment'}<br/>
                                    Signed: {signature.signed_at ? formatDate(signature.signed_at) : 'N/A'}
                                  </div>
                                ));
                              })()}
                            </div>
                          ) : (
                            <div className="text-red-500 text-xs">No Risk Assessments Signed</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(worker);
                        }}
                        className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(worker.id);
                        }}
                        className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Replace the existing modal with the portal modal */}
      <PortalModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setWorkerToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Worker"
        message="Are you sure you want to delete this worker? This action cannot be undone."
        confirmText="Delete"
        loading={loading}
      />
    </div>
  );
}

// Portal Modal Component
interface PortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  confirmButtonClass?: string;
  loading?: boolean;
}

function PortalModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText, 
  confirmButtonClass = "bg-red-600 hover:bg-red-700",
  loading = false 
}: PortalModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg-xl max-w-md w-full mx-4 p-6">
        <div className="sm:flex sm:items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-300" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-lg-sm px-4 py-2 ${confirmButtonClass} text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-lg-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

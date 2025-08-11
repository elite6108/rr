import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';
import { verifyAdminPassword } from '../../../utils/adminPassword';
import {
  ChevronLeft,
  Plus,
  Edit,
  Pencil,
  Trash2,
  AlertTriangle,
  Search,
  Shield,
} from 'lucide-react';
import { DriverForm } from './DriverForm';

interface StaffMember {
  id: number;
  name: string;
  position: string;
  email: string;
  phone: string;
  ni_number: string;
  start_date: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Worker {
  id: string;
  full_name: string;
  email: string;
  company: string;
  phone: string;
}

interface Driver {
  id: string;
  staff_id: number;
  licence_number: string;
  licence_expiry: string;
  user_id: string;
  full_name?: string;
  last_check?: string;
  points?: number;
}

interface DriversListProps {
  onBack: () => void;
  onDriverUpdate?: () => void;
}

export function DriversList({ onBack, onDriverUpdate }: DriversListProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const handlePasswordSubmit = async (password: string) => {
    const isValid = await verifyAdminPassword(password);
    if (isValid) {
      setIsAdminView(true);
      setShowPasswordModal(false);
    } else {
      alert('Incorrect password.');
    }
  };

  const fetchUsers = async () => {
    try {
      // Get the current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUsers([{
          id: user.id,
          full_name: user.user_metadata?.display_name || user.user_metadata?.full_name || user.email || 'Current User',
          email: user.email || ''
        }]);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      setUsers([]);
    }
  };

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setWorkers(data || []);
    } catch (err) {
      console.error('Error fetching workers:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch drivers, staff, users, and workers
      const [driversResponse, staffResponse] = await Promise.all([
        supabase
          .from('drivers')
          .select('*')
          .order('licence_number', { ascending: true }),
        supabase.from('staff').select('*').order('name', { ascending: true }),
      ]);

      if (driversResponse.error) throw driversResponse.error;
      if (staffResponse.error) throw staffResponse.error;

      setDrivers(driversResponse.data || []);
      setStaff(staffResponse.data || []);

      // Fetch users and workers
      await Promise.all([fetchUsers(), fetchWorkers()]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while fetching data'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    setDriverToDelete(driverId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!driverToDelete) return;

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', driverToDelete);

      if (error) throw error;

      await fetchData();
      setShowDeleteModal(false);
      setDriverToDelete(null);
    } catch (err) {
      console.error('Error deleting driver:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while deleting the driver'
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter out staff members who are already drivers
  const availableStaff = staff.filter(
    (staffMember) =>
      !drivers.some((driver) => driver.staff_id === staffMember.id)
  );

  // Check if any users or workers are available (they don't have existing driver records)
  const availableUsers = users.filter(user => 
    !availableStaff.some(staffMember => staffMember.name === user.full_name)
  );

  const availableWorkers = workers;

  // Determine if we have any available people to add as drivers
  const hasAvailablePeople = availableStaff.length > 0 || availableUsers.length > 0 || availableWorkers.length > 0;

  // Add filtered drivers
  const filteredDrivers = drivers.filter((driver) => {
    const staffMember = staff.find(s => s.id === driver.staff_id);
    const driverName = driver.full_name || staffMember?.name || '';
    
    return driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           driver.licence_number?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSuccess = () => {
    fetchData();
    setShowAddModal(false);
    setSelectedStaff(null);
    setDriverToEdit(null);
    if (onDriverUpdate) {
      onDriverUpdate();
    }
  };

  const getExpiryColor = (expiryDate: string | null): string => {
    if (!expiryDate) return 'text-gray-500 dark:text-gray-300';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(expiryDate);
    date.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'text-red-600 dark:text-red-400 font-bold'; // Expired
    }
    if (diffDays < 30) {
      return 'text-orange-500 dark:text-orange-400 font-semibold'; // 0-29 days
    }
    if (diffDays < 60) {
      return 'text-yellow-500 dark:text-yellow-400 font-semibold'; // 30-59 days
    }
    return 'text-gray-500 dark:text-gray-300'; // 60+ days
  };

  const getCheckColor = (checkDate: string | null): string => {
    if (!checkDate) return 'text-gray-500 dark:text-gray-300';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(checkDate);
    date.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 10) { // Passed or < 10 days
      return 'text-red-600 dark:text-red-400 font-bold';
    }
    if (diffDays < 30) { // 10-29 days
      return 'text-orange-500 dark:text-orange-400 font-semibold';
    }
     if (diffDays > 60) { // More than 60 days
      return 'text-green-700 dark:text-green-500 font-semibold';
    }
    if (diffDays > 30) { // 31-60 days
      return 'text-green-500 dark:text-green-400 font-semibold';
    }
    return 'text-gray-500 dark:text-gray-300';
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Vehicle Management
        </button>
        
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Drivers Management</h2>
      </div>

      <p>To add, edit drivers and view licence information, please click the Admin View button.</p>

      {/* Search Bar with Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search by name or licence number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        {isAdminView && hasAvailablePeople && (
          <button
            onClick={() => {
              setSelectedStaff(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Licence Info
          </button>
        )}
        <button
            onClick={() => {
              if (isAdminView) {
                setIsAdminView(false);
              } else {
                setShowPasswordModal(true);
              }
            }}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
              isAdminView 
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            <Shield className="h-4 w-4 mr-2" />
            {isAdminView ? 'Exit Admin View' : 'Admin View'}
          </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 shadow-lg overflow-hidden sm:rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          </div>
        ) : drivers.length === 0 ? (
          <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No drivers yet</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      Name
                    </th>
                    {isAdminView && (
                      <>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                        >
                          Licence Number
                        </th>
                      </>
                    )}
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      Licence Expiry
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      Last Check
                    </th>
                    {isAdminView && (
                      <>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                        >
                          Points
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4">
                          <span className="sr-only">Actions</span>
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {filteredDrivers.map((driver) => {
                    const staffMember = staff.find(
                      (s) => s.id === driver.staff_id
                    );
                    return (
                      <tr 
                        key={driver.id} 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isAdminView ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (isAdminView) {
                            setSelectedStaff(staffMember || null);
                            setDriverToEdit(driver);
                            setShowAddModal(true);
                          }
                        }}
                      >
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white">
                          {driver.full_name || staffMember?.name || 'Unknown Driver'}
                        </td>
                        {isAdminView && (
                          <>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                              {driver.licence_number}
                            </td>
                          </>
                        )}
                        <td className={`whitespace-nowrap px-3 py-4 text-sm ${getExpiryColor(driver.licence_expiry)}`}>
                          {driver.licence_expiry
                            ? new Date(
                                driver.licence_expiry
                              ).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-4 text-sm ${getCheckColor(driver.last_check)}`}>
                          {driver.last_check
                            ? new Date(
                                driver.last_check
                              ).toLocaleDateString()
                            : '-'}
                        </td>
                        {isAdminView && (
                          <>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                              {driver.points || 0}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                              <div className="flex justify-end space-x-4">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStaff(staffMember || null);
                                    setDriverToEdit(driver);
                                    setShowAddModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="Edit"
                                >
                                  <Pencil className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDriver(driver.id);
                                  }}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  title="Delete"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Cards */}
            <div className="lg:hidden">
              <div className="p-4 space-y-4">
                {filteredDrivers.map((driver) => {
                  const staffMember = staff.find(
                    (s) => s.id === driver.staff_id
                  );
                  return (
                    <div 
                      key={driver.id}
                      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-4 transition-shadow ${isAdminView ? 'cursor-pointer hover:shadow-lg' : ''}`}
                      onClick={() => {
                        if (isAdminView) {
                          setSelectedStaff(staffMember || null);
                          setDriverToEdit(driver);
                          setShowAddModal(true);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                            {driver.full_name || staffMember?.name || 'Unknown Driver'}
                          </h4>
                          {isAdminView && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Licence: {driver.licence_number}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Licence Expiry:</span>
                          <span className={getExpiryColor(driver.licence_expiry)}>
                            {driver.licence_expiry
                              ? new Date(driver.licence_expiry).toLocaleDateString()
                              : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Last Check:</span>
                          <span className={getCheckColor(driver.last_check)}>
                            {driver.last_check
                              ? new Date(driver.last_check).toLocaleDateString()
                              : '-'}
                          </span>
                        </div>
                        {isAdminView && (
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Points:</span>
                            <span className="text-gray-900 dark:text-white">
                              {driver.points || 0}
                            </span>
                          </div>
                        )}
                      </div>

                      {isAdminView && (
                        <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStaff(staffMember || null);
                              setDriverToEdit(driver);
                              setShowAddModal(true);
                            }}
                            className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDriver(driver.id);
                            }}
                            className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Driver Form Modal */}
      {showAddModal && (
        createPortal(
          <DriverForm
            availableStaff={availableStaff}
            selectedStaff={selectedStaff}
            driverToEdit={driverToEdit}
            onClose={() => {
              setShowAddModal(false);
              setSelectedStaff(null);
              setDriverToEdit(null);
            }}
            onSuccess={handleSuccess}
          />,
          document.body
        )
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        createPortal(
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg-xl p-6 max-w-sm w-full m-4">
              <div className="flex items-center justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                Confirm Deletion
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                Are you sure you want to delete this driver? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDriverToDelete(null);
                  }}
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
        )
      )}
      
      {showPasswordModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Enter Admin Password</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const password = (e.currentTarget.elements[0] as HTMLInputElement).value;
              handlePasswordSubmit(password);
            }}>
              <input
                type="password"
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Password"
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-md text-gray-600 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

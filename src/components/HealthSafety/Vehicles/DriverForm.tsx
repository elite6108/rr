import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, AlertTriangle } from 'lucide-react';

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
  driving_licence_number?: string;
}

interface CombinedStaffUser {
  id: string;
  name: string;
  type: 'staff' | 'user' | 'worker';
  original_id: string;
  email: string;
  position?: string;
  company?: string;
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

interface DriverFormProps {
  onClose: () => void;
  onSuccess: () => void;
  availableStaff: StaffMember[];
  selectedStaff: StaffMember | null;
  driverToEdit?: Driver | null;
}

export function DriverForm({ onClose, onSuccess, availableStaff, selectedStaff, driverToEdit }: DriverFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [combinedStaffUsers, setCombinedStaffUsers] = useState<CombinedStaffUser[]>([]);
  const [isNewDriver, setIsNewDriver] = useState(!!driverToEdit?.full_name);
  const [formData, setFormData] = useState({
    staff_id: driverToEdit?.staff_id || selectedStaff?.id || '',
    full_name: driverToEdit?.full_name || '',
    licence_number: driverToEdit?.licence_number || '',
    licence_expiry: driverToEdit?.licence_expiry || '',
    last_check: driverToEdit?.last_check || '',
    points: driverToEdit?.points || 0,
  });

  useEffect(() => {
    fetchUsers();
    fetchWorkers();
  }, []);

  useEffect(() => {
    // Combine staff, users, and workers when any list changes
    if (availableStaff.length > 0 || users.length > 0 || workers.length > 0) {
      combineStaffAndUsers();
    }
  }, [availableStaff, users, workers]);

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
          email: user.email
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

  const combineStaffAndUsers = () => {
    const combined: CombinedStaffUser[] = [
      // Add staff members
      ...availableStaff.map(staffMember => ({
        id: `staff_${staffMember.id}`,
        name: staffMember.name,
        type: 'staff' as const,
        original_id: staffMember.id.toString(),
        email: staffMember.email || '',
        position: staffMember.position
      })),
      // Add users, but exclude those who already exist as staff
      ...users.filter(user => !availableStaff.some(staffMember => staffMember.name === user.full_name))
        .map(user => ({
          id: `user_${user.id}`,
          name: user.full_name || user.email || 'Unknown User',
          type: 'user' as const,
          original_id: user.id,
          email: user.email
        })),
      // Add workers
      ...workers.map(worker => ({
        id: `worker_${worker.id}`,
        name: worker.full_name || worker.email || 'Unknown Worker',
        type: 'worker' as const,
        original_id: worker.id,
        email: worker.email,
        company: worker.company,
        phone: worker.phone
      }))
    ];
    
    setCombinedStaffUsers(combined);
  };

  // When editing, we need to include the current staff member in the options
  const staffOptions = driverToEdit 
    ? [...combinedStaffUsers, selectedStaff ? {
        id: `staff_${selectedStaff.id}`,
        name: selectedStaff.name,
        type: 'staff' as const,
        original_id: selectedStaff.id.toString(),
        email: selectedStaff.email || '',
        position: selectedStaff.position
      } : null].filter(Boolean) as CombinedStaffUser[]
    : combinedStaffUsers;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updatedFormData = { ...prev, [name]: value };

      if (name === 'staff_id' && !isNewDriver) {
        const selectedPerson = combinedStaffUsers.find(p => p.original_id === value);
        if (selectedPerson?.type === 'worker') {
          const worker = workers.find(w => w.id === selectedPerson.original_id);
          if (worker) {
            updatedFormData.licence_number = worker.driving_licence_number || '';
          }
        } else {
          updatedFormData.licence_number = '';
        }
      }
      return updatedFormData;
    });
  };

  const handleNext = () => {
    setError(null);
    if (isNewDriver) {
      if (!formData.full_name.trim()) {
        setError("Please enter the driver's full name");
        return;
      }
    } else {
      if (!formData.staff_id) {
        setError('Please select a staff member');
        return;
      }
    }
    setStep(2);
  };

  const handlePrevious = () => {
    setStep(1);
  };

  const handleSubmit = async () => {
    if (step !== 2) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (!formData.licence_number) throw new Error('Please enter a licence number');
      if (!formData.licence_expiry) throw new Error('Please enter a licence expiry date');

      const dataToSave: any = {
        licence_number: formData.licence_number,
        licence_expiry: formData.licence_expiry,
        last_check: formData.last_check || null,
        points: formData.points || 0,
      };

      if (isNewDriver) {
        if (!formData.full_name.trim()) throw new Error("Please enter the driver's full name");
        dataToSave.full_name = formData.full_name.trim();
        dataToSave.staff_id = null;
      } else {
        if (!formData.staff_id) throw new Error('Please select a staff member');
        const selectedPerson = combinedStaffUsers.find(p => p.original_id === formData.staff_id);
        if (!selectedPerson) throw new Error('Selected person not found');

        if (selectedPerson.type === 'staff') {
          dataToSave.staff_id = parseInt(selectedPerson.original_id, 10);
          dataToSave.full_name = null;
        } else { // User or Worker
          dataToSave.staff_id = null;
          dataToSave.full_name = selectedPerson.name;
        }
      }

      let error;
      if (driverToEdit) {
        ({ error } = await supabase
          .from('drivers')
          .update(dataToSave)
          .eq('id', driverToEdit.id));
      } else {
        dataToSave.user_id = user.id;
        ({ error } = await supabase
          .from('drivers')
          .insert([dataToSave]));
      }

      if (error) throw error;
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving driver:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            {driverToEdit ? 'Edit Driver Licence Information' : 'Add Driver Licence Information'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form className="p-4 space-y-4">
        <div className="mb-8 w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="text-base font-medium text-indigo-600">
              {step === 1 ? 'Driver' : 'Licence'}
            </div>
            <div className="text-sm text-gray-500">
              Step {step} of 2
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
        </div>
        
        {step === 1 && (
            <>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                    Driver Information
                    </label>
                    <div className="flex gap-4 mb-4">
                        <button
                            type="button"
                            onClick={() => setIsNewDriver(false)}
                            className={`w-full text-center px-4 py-2 border rounded-md text-sm ${!isNewDriver ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            Select existing staff member
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsNewDriver(true)}
                            className={`w-full text-center px-4 py-2 border rounded-md text-sm ${isNewDriver ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            {driverToEdit ? 'Driver by name' : 'Add new driver'}
                        </button>
                    </div>
                </div>

                {!isNewDriver ? (
                    <div>
                    <label htmlFor="staff_id" className="block text-sm font-medium text-gray-700 mb-1">
                        Staff Member *
                    </label>
                    <select
                        id="staff_id"
                        name="staff_id"
                        required={!isNewDriver}
                        value={formData.staff_id}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">Select a staff member</option>
                        {staffOptions.map(staff => (
                        <option key={staff.id} value={staff.original_id}>
                            {staff.name} - {
                            staff.type === 'staff' ? staff.position || 'Staff' :
                            staff.type === 'worker' ? staff.company || 'Worker' :
                            'User'
                            } ({staff.type})
                        </option>
                        ))}
                    </select>
                    </div>
                ) : (
                    <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Driver Full Name *
                    </label>
                    <input
                        type="text"
                        id="full_name"
                        name="full_name"
                        required={isNewDriver}
                        value={formData.full_name}
                        onChange={handleChange}
                        placeholder="Enter driver's full name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    </div>
                )}
            </>
        )}

        {step === 2 && (
            <>
                <div>
                    <label htmlFor="licence_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Licence Number *
                    </label>
                    <input
                    type="text"
                    id="licence_number"
                    name="licence_number"
                    required
                    value={formData.licence_number}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label htmlFor="licence_expiry" className="block text-sm font-medium text-gray-700 mb-1">
                    Licence Expiry Date *
                    </label>
                    <input
                    type="date"
                    id="licence_expiry"
                    name="licence_expiry"
                    required
                    value={formData.licence_expiry}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label htmlFor="last_check" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Check Date
                    </label>
                    <input
                    type="date"
                    id="last_check"
                    name="last_check"
                    value={formData.last_check}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-1">
                    Points
                    </label>
                    <input
                    type="number"
                    id="points"
                    name="points"
                    value={formData.points}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </>
        )}
          
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-md">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

            <div className="flex justify-between items-center pt-4">
                <div>
                    <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-[#374151] dark:text-white dark:hover:bg-[#DC2626] rounded-md"
                    >
                    Cancel
                    </button>
                </div>
                <div className="flex items-center space-x-4">
                    {step > 1 && (
                    <button
                        type="button"
                        onClick={handlePrevious}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                        Previous
                    </button>
                    )}
                    {step < 2 ? (
                    <button
                        type="button"
                        onClick={handleNext}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Next
                    </button>
                    ) : (
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Saving...' : driverToEdit ? 'Update Licence Info' : 'Save'}
                    </button>
                    )}
                </div>
            </div>
        </form>
      </div>
    </div>
  );
} 
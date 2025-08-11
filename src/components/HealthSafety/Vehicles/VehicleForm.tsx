import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Vehicle } from '../../../types/database';

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

interface CombinedStaffUser {
  id: string;
  name: string;
  type: 'staff' | 'user' | 'worker';
  original_id: string;
  email: string;
  position?: string;
  company?: string;
}

interface VehicleFormProps {
  onClose: () => void;
  onSuccess: () => void;
  vehicleToEdit?: Vehicle | null;
}

const UK_VEHICLE_BRANDS = [
  'Aston Martin',
  'Audi',
  'Bentley',
  'BMW',
  'Citroen',
  'Dacia',
  'Fiat',
  'Ford',
  'Honda',
  'Hyundai',
  'Jaguar',
  'Kia',
  'Land Rover',
  'Lexus',
  'Mazda',
  'Mercedes-Benz',
  'Mini',
  'Mitsubishi',
  'Nissan',
  'Peugeot',
  'Porsche',
  'Renault',
  'Seat',
  'Skoda',
  'Suzuki',
  'Tesla',
  'Toyota',
  'Vauxhall',
  'Volkswagen',
  'Volvo'
];

const SERVICE_INTERVAL_UNITS = [
  'Miles',
  'Hours',
  'Days',
  'Weeks',
  'Months',
  'Years'
];

// DVLA VES API function via Supabase Edge Function
// This calls our Supabase Edge Function which then calls the DVLA API
// This avoids CORS issues since the Edge Function runs server-side
const callDVLAAPI = async (registrationNumber: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('dvla-vehicle-lookup', {
      body: {
        registrationNumber: registrationNumber.replace(/\s+/g, '').toUpperCase()
      }
    });

    if (error) {
      throw new Error(error.message || 'Edge function error');
    }

    if (data.success) {
      return {
        success: true,
        data: data.data
      };
    } else {
      throw new Error(data.error || 'Unknown error from edge function');
    }
  } catch (error) {
    console.error('DVLA API Error:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to retrieve vehicle data from DVLA'
    };
  }
};

// MOT History API function via Supabase Edge Function
// This calls our MOT lookup Edge Function to get vehicle model information
const callMOTAPI = async (registrationNumber: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('mot-lookup', {
      body: {
        registrationNumber: registrationNumber.replace(/\s+/g, '').toUpperCase()
      }
    });

    if (error) {
      throw new Error(error.message || 'MOT Edge function error');
    }

    if (data.success) {
      return {
        success: true,
        data: data.data
      };
    } else {
      throw new Error(data.error || 'Unknown error from MOT edge function');
    }
  } catch (error) {
    console.error('MOT API Error:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to retrieve vehicle model from MOT API'
    };
  }
};

export function VehicleForm({ onClose, onSuccess, vehicleToEdit }: VehicleFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [combinedStaffUsers, setCombinedStaffUsers] = useState<CombinedStaffUser[]>([]);
  const [formData, setFormData] = useState({
    vin: (vehicleToEdit as any)?.vin || '',
    registration: vehicleToEdit?.registration || '',
    driver_id: (vehicleToEdit as any)?.driver_id || '',
    driver: '',
    mot_date: vehicleToEdit?.mot_date || '',
    tax_date: vehicleToEdit?.tax_date || '',
    service_date: vehicleToEdit?.service_date || '',
    insurance_date: vehicleToEdit?.insurance_date || '',
    breakdown_date: vehicleToEdit?.breakdown_date || '',
    has_congestion: (vehicleToEdit as any)?.has_congestion || false,
    has_dartford: (vehicleToEdit as any)?.has_dartford || false,
    has_clean_air: (vehicleToEdit as any)?.has_clean_air || false,
    service_interval_value: (vehicleToEdit as any)?.service_interval_value || '',
    service_interval_unit: (vehicleToEdit as any)?.service_interval_unit || 'Miles',
    notes: (vehicleToEdit as any)?.notes || '',
    ulez: (vehicleToEdit as any)?.ulez || '',
    last_service_date: (vehicleToEdit as any)?.last_service_date || ''
  });

  useEffect(() => {
    fetchStaff();
    fetchUsers();
    fetchWorkers();
  }, []);

  useEffect(() => {
    // Combine staff, users, and workers when any list changes
    if (staff.length > 0 || users.length > 0 || workers.length > 0) {
      combineAllDrivers();
    }
  }, [staff, users, workers]);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching staff');
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
      setError(err instanceof Error ? err.message : 'An error occurred while fetching workers');
    }
  };

  const combineAllDrivers = () => {
    const combined: CombinedStaffUser[] = [
      // Add staff members
      ...staff.map(staffMember => ({
        id: `staff_${staffMember.id}`,
        name: staffMember.name,
        type: 'staff' as const,
        original_id: staffMember.id.toString(),
        email: staffMember.email || '',
        position: staffMember.position
      })),
      // Add users, but exclude those who already exist as staff
      ...users.filter(user => !staff.some(staffMember => staffMember.name === user.full_name))
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (name === 'driver_id' && value) {
      const selectedStaff = combinedStaffUsers.find(s => s.original_id === value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        driver: selectedStaff?.name || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted explicitly'); // Debug log
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Call DVLA VES API to get MOT and TAX information
      const dvlaResult = await callDVLAAPI(formData.registration);
      
      let motDate = formData.mot_date;
      let taxDate = formData.tax_date;
      let make = vehicleToEdit?.make || '';
      let model = vehicleToEdit?.model || '';
      let apiMessages = [];
      
      if (dvlaResult.success && dvlaResult.data) {
        // Update MOT and TAX dates from DVLA API
        if (dvlaResult.data.motExpiryDate) {
          motDate = dvlaResult.data.motExpiryDate;
        }
        if (dvlaResult.data.taxDueDate) {
          taxDate = dvlaResult.data.taxDueDate;
        }
        
        // Update make from DVLA API
        if (dvlaResult.data.make) {
          make = dvlaResult.data.make;
        }
        apiMessages.push('DVLA data retrieved successfully');
      } else if (dvlaResult.error === 'CORS_ERROR') {
        apiMessages.push('DVLA API: CORS error (requires backend service)');
      } else {
        apiMessages.push(`DVLA API error: ${dvlaResult.message || dvlaResult.error}`);
      }

      // Call MOT API to get model information
      const motResult = await callMOTAPI(formData.registration);
      if (motResult.success && motResult.data) {
        if (motResult.data.model) {
          model = motResult.data.model;
        }
        apiMessages.push('MOT model data retrieved successfully');
      } else if (motResult.error === 'CORS_ERROR') {
        apiMessages.push('MOT API: CORS error (requires backend service)');
      } else {
        apiMessages.push(`MOT API error: ${motResult.message || motResult.error}`);
      }
      
      const finalApiMessage = `Vehicle saved successfully. ${apiMessages.join(', ')}`;

      // Ensure driver field is never null - use a default value if no driver is selected
      let driverName = formData.driver || 'Unassigned';
      
      if (formData.driver_id) {
        const selectedStaff = combinedStaffUsers.find(s => s.original_id === formData.driver_id);
        if (selectedStaff) {
          driverName = selectedStaff.name;
        }
      }

      let error;
      if (vehicleToEdit) {
        ({ error } = await supabase
          .from('vehicles')
          .update({
            ...formData,
            vin: formData.vin || null,
            make: make,
            model: model,
            driver_id: formData.driver_id || null,
            driver: driverName, // Always provide a value, never null
            mot_date: motDate || null,
            tax_date: taxDate || null,
            service_date: formData.service_date || null,
            insurance_date: formData.insurance_date || null,
            breakdown_date: formData.breakdown_date || null,
            service_interval_value: formData.service_interval_value || null,
            notes: formData.notes || null,
            ulez: formData.ulez || null,
            last_service_date: formData.last_service_date || null
          })
          .eq('id', vehicleToEdit.id));
      } else {
        ({ error } = await supabase
          .from('vehicles')
          .insert([{
            ...formData,
            user_id: user.id,
            vin: formData.vin || null,
            make: make,
            model: model,
            driver_id: formData.driver_id || null,
            driver: driverName, // Always provide a value, never null
            mot_date: motDate || null,
            tax_date: taxDate || null,
            service_date: formData.service_date || null,
            insurance_date: formData.insurance_date || null,
            breakdown_date: formData.breakdown_date || null,
            service_interval_value: formData.service_interval_value || null,
            notes: formData.notes || null,
            ulez: formData.ulez || null,
            last_service_date: formData.last_service_date || null
          }]));
      }

      if (error) throw error;
      
      // Show success message with API status
      console.log(finalApiMessage);
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving vehicle:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    console.log('Next step clicked, current step:', currentStep); // Debug log
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    console.log('Previous step clicked, current step:', currentStep); // Debug log
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Debug effect to track step changes
  useEffect(() => {
    console.log('Current step changed to:', currentStep);
  }, [currentStep]);

  const getStepLabel = () => {
    switch (currentStep) {
      case 1:
        return 'Vehicle Information';
      case 2:
        return 'Service & Insurance Details';
      case 3:
        return 'Additional Information';
      default:
        return '';
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="vin" className="block text-sm font-medium text-gray-700 mb-2">
                  VIN <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  id="vin"
                  name="vin"
                  value={formData.vin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="registration" className="block text-sm font-medium text-gray-700 mb-2">
                  Registration *
                </label>
                <input
                  type="text"
                  id="registration"
                  name="registration"
                  required
                  value={formData.registration}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="driver_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Driver <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <select
                  id="driver_id"
                  name="driver_id"
                  value={formData.driver_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a driver</option>
                  {combinedStaffUsers.map(member => (
                    <option key={member.id} value={member.original_id}>
                      {member.name} - {
                        member.type === 'staff' ? member.position || 'Staff' :
                        member.type === 'worker' ? member.company || 'Worker' :
                        'User'
                      } ({member.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        DVLA Integration
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>Make, Model, MOT and TAX data will be automatically retrieved from DVLA when you submit the form.</p>
                        <p className="mt-1 text-gray-600"><strong>Note:</strong> Drivers can be selected from Staff, Users, or Workers.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="insurance_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Due Date <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="date"
                  id="insurance_date"
                  name="insurance_date"
                  value={formData.insurance_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="breakdown_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Breakdown Cover Due Date <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="date"
                  id="breakdown_date"
                  name="breakdown_date"
                  value={formData.breakdown_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="last_service_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Service Date <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="date"
                  id="last_service_date"
                  name="last_service_date"
                  value={formData.last_service_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="service_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Service Due Date <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="date"
                  id="service_date"
                  name="service_date"
                  value={formData.service_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="service_interval_value" className="block text-sm font-medium text-gray-700 mb-2">
                  Service Interval <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    id="service_interval_value"
                    name="service_interval_value"
                    value={formData.service_interval_value}
                    onChange={handleChange}
                    className="w-2/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <select
                    id="service_interval_unit"
                    name="service_interval_unit"
                    value={formData.service_interval_unit}
                    onChange={handleChange}
                    className="w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {SERVICE_INTERVAL_UNITS.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Additional Services <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setFormData(prev => ({ ...prev, has_congestion: !prev.has_congestion }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFormData(prev => ({ ...prev, has_congestion: !prev.has_congestion }));
                    }
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                    formData.has_congestion
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <span className="text-sm font-medium">Added to Congestion Charge</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-200 ${
                    formData.has_congestion
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {formData.has_congestion ? '✓' : ''}
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setFormData(prev => ({ ...prev, has_dartford: !prev.has_dartford }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFormData(prev => ({ ...prev, has_dartford: !prev.has_dartford }));
                    }
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                    formData.has_dartford
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <span className="text-sm font-medium">Added to Dartford Crossing</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-200 ${
                    formData.has_dartford
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {formData.has_dartford ? '✓' : ''}
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setFormData(prev => ({ ...prev, has_clean_air: !prev.has_clean_air }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFormData(prev => ({ ...prev, has_clean_air: !prev.has_clean_air }));
                    }
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                    formData.has_clean_air
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <span className="text-sm font-medium">Added to Clean Air Zone</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-200 ${
                    formData.has_clean_air
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {formData.has_clean_air ? '✓' : ''}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mt-2 px-4">
                  This is for Bath, Birmingham, Bradford, Bristol, Portsmouth, Sheffield, Tyneside
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  ULEZ <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setFormData(prev => ({ ...prev, ulez: prev.ulez === 'should_be_paid' ? '' : 'should_be_paid' }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFormData(prev => ({ ...prev, ulez: prev.ulez === 'should_be_paid' ? '' : 'should_be_paid' }));
                    }
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                    formData.ulez === 'should_be_paid'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <span className="text-sm font-medium">Should be paid</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-200 ${
                    formData.ulez === 'should_be_paid'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {formData.ulez === 'should_be_paid' ? '✓' : ''}
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setFormData(prev => ({ ...prev, ulez: prev.ulez === 'meets_standard' ? '' : 'meets_standard' }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFormData(prev => ({ ...prev, ulez: prev.ulez === 'meets_standard' ? '' : 'meets_standard' }));
                    }
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                    formData.ulez === 'meets_standard'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  <span className="text-sm font-medium">Meets the standard</span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-200 ${
                    formData.ulez === 'meets_standard'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {formData.ulez === 'meets_standard' ? '✓' : ''}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mt-4 px-4">
                  If vehicles are added to the Transport for London (TfL) list and are subject to the ULEZ charge, the Fleet Auto Pay system will automatically cover the payment.
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto my-8 sm:my-4 max-h-[90vh] sm:max-h-[800px] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 p-4 sm:p-8 border-b">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <h2 className="text-2xl font-bold text-center sm:text-left">
              {vehicleToEdit ? 'Edit Vehicle' : 'New Vehicle'}
            </h2>
            <button
              onClick={onClose}
              className="w-full sm:w-auto text-gray-400 hover:text-gray-500 focus:outline-none flex justify-center items-center"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-8">
          <div className="mb-8 w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="text-base font-medium text-indigo-600">
                {getStepLabel()}
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

          <form className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-md">
                <X className="h-5 w-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {renderStep()}

            <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 pt-6 mt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-[#374151] dark:text-white dark:hover:bg-[#DC2626] rounded-md"
              >
                Cancel
              </button>
              <div className="flex flex-col sm:flex-row gap-3">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1 inline" />
                    Previous
                  </button>
                )}
                {currentStep === 3 ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : vehicleToEdit ? 'Save Changes' : 'Add Vehicle'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1 inline" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
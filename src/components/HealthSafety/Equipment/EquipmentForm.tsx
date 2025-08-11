import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Equipment } from '../../../types/database';

interface EquipmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  equipmentToEdit?: Equipment | null;
}

const EQUIPMENT_CATEGORIES = [
  'Fixed Plant',
  'Hand Tools',
  'Lifting Equipment',
  'Lifting Accessories',
  'Machinery',
  'Mobile Plant',
  'Portable Electrical Equipment',
  'Power Tools',
  'PPE',
  'RPE',
  'Working at Height Equipment'
] as const;

const INTERVAL_UNITS = [
  'Mile',
  'Hour',
  'Day',
  'Week',
  'Month',
  'Year'
] as const;

const INSPECTION_FREQUENCIES = [
  'Daily',
  'Weekly',
  'Monthly',
  'Annually'
] as const;

export function EquipmentForm({ onClose, onSuccess, equipmentToEdit }: EquipmentFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: (equipmentToEdit as any)?.category || '',
    name: equipmentToEdit?.name || '',
    serial_number: equipmentToEdit?.serial_number || '',
    location: (equipmentToEdit as any)?.location || '',
    purchase_date: (equipmentToEdit as any)?.purchase_date || '',
    warranty_expiry: (equipmentToEdit as any)?.warranty_expiry || '',
    inspection_interval: (equipmentToEdit as any)?.inspection_interval || '',
    inspection_frequency: (equipmentToEdit as any)?.inspection_frequency || 'Monthly',
    inspection_notes: (equipmentToEdit as any)?.inspection_notes || '',
    service_interval_value: (equipmentToEdit as any)?.service_interval_value || '',
    service_interval_unit: (equipmentToEdit as any)?.service_interval_unit || 'Month',
    service_notes: (equipmentToEdit as any)?.service_notes || '',
    notes: (equipmentToEdit as any)?.notes || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let error;
      if (equipmentToEdit) {
        // Update existing equipment
        ({ error } = await supabase
          .from('equipment')
          .update({
            ...formData,
            warranty_expiry: formData.warranty_expiry || null,
            notes: formData.notes || null
          })
          .eq('id', equipmentToEdit.id));
      } else {
        // Create new equipment
        ({ error } = await supabase
          .from('equipment')
          .insert([{
            ...formData,
            user_id: user.id,
            warranty_expiry: formData.warranty_expiry || null,
            notes: formData.notes || null
          }]));
      }

      if (error) throw error;
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving equipment:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getStepLabel = () => {
    switch (currentStep) {
      case 1:
        return 'Equipment Details';
      case 2:
        return 'Purchase & Warranty';
      case 3:
        return 'Service & Inspection';
      default:
        return '';
    }
  };

  const renderStepIndicator = () => {
    const stepLabels = ['Equipment Details', 'Purchase & Warranty', 'Service & Inspection'];
    
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a category</option>
                  {EQUIPMENT_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Equipment Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700 mb-2">
                  Serial Number <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  id="serial_number"
                  name="serial_number"
                  value={formData.serial_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <textarea
                  id="location"
                  name="location"
                  required
                  rows={2}
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Purchase <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="date"
                  id="purchase_date"
                  name="purchase_date"
                  value={formData.purchase_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="warranty_expiry" className="block text-sm font-medium text-gray-700 mb-2">
                  Warranty Expiration <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="date"
                  id="warranty_expiry"
                  name="warranty_expiry"
                  value={formData.warranty_expiry}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            {/* Inspection Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="inspection_interval" className="block text-sm font-medium text-gray-700 mb-2">
                  Inspection Interval <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="number"
                  id="inspection_interval"
                  name="inspection_interval"
                  min="1"
                  value={formData.inspection_interval}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="inspection_frequency" className="block text-sm font-medium text-gray-700 mb-2">
                  Frequency <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <select
                  id="inspection_frequency"
                  name="inspection_frequency"
                  value={formData.inspection_frequency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {INSPECTION_FREQUENCIES.map(freq => (
                    <option key={freq} value={freq}>{freq}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="inspection_notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  id="inspection_notes"
                  name="inspection_notes"
                  value={formData.inspection_notes}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Service Interval Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="service_interval_value" className="block text-sm font-medium text-gray-700 mb-2">
                  Service Interval <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="number"
                  id="service_interval_value"
                  name="service_interval_value"
                  min="1"
                  value={formData.service_interval_value}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="service_interval_unit" className="block text-sm font-medium text-gray-700 mb-2">
                  Unit <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <select
                  id="service_interval_unit"
                  name="service_interval_unit"
                  value={formData.service_interval_unit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {INTERVAL_UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="service_notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Service Notes <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  id="service_notes"
                  name="service_notes"
                  value={formData.service_notes}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
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
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-auto my-8 sm:my-4 max-h-[90vh] sm:max-h-[800px] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 p-4 sm:p-8 border-b">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <h2 className="text-2xl font-bold text-center sm:text-left">
              {equipmentToEdit ? 'Edit Equipment' : 'New Equipment'}
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
          {renderStepIndicator()}

          <form className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-md">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
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
                    {loading ? 'Saving...' : equipmentToEdit ? 'Save Changes' : 'Create Equipment'}
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
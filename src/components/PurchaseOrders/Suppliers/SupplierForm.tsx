import React from 'react';
import { X, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useSupplierForm } from './hooks/useSupplierForm';
import { StepIndicator } from './components/StepIndicator';
import { Step1SupplierName } from './components/form-steps/Step1SupplierName';
import { Step2Address } from './components/form-steps/Step2Address';
import type { SupplierFormProps } from './types';

export function SupplierForm({
  onClose,
  onSuccess,
  supplierToEdit,
}: SupplierFormProps) {
  const {
    loading,
    error,
    currentStep,
    formData,
    handleChange,
    handleSubmit,
    nextStep,
    prevStep,
  } = useSupplierForm({ onClose, onSuccess, supplierToEdit });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 overflow-y-auto h-screen w-screen flex items-start sm:items-center justify-center p-4">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full my-4 sm:my-8 max-h-[90vh] sm:max-h-[800px] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {supplierToEdit ? 'Edit Supplier' : 'New Supplier'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <StepIndicator currentStep={currentStep} />

        <form onSubmit={handleSubmit} className="space-y-6">
          {currentStep === 1 && (
            <Step1SupplierName formData={formData} handleChange={handleChange} />
          )}

          {currentStep === 2 && (
            <Step2Address formData={formData} handleChange={handleChange} />
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-red-600 dark:hover:text-white"
            >
              Cancel
            </button>
            <div className="flex flex-col sm:flex-row gap-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  <ChevronLeft className="h-4 w-4 mr-1 inline" style={{ marginTop: '-2px' }} />
                  Previous
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {loading
                  ? 'Saving...'
                  : currentStep === 2
                  ? (supplierToEdit ? 'Save Changes' : 'Create Supplier')
                  : 'Next'}
                {currentStep !== 2 && <ChevronRight className="h-4 w-4 ml-1 inline" style={{ marginTop: '-2px' }} />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
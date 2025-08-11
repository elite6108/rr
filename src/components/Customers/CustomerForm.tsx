import React from 'react';
import { X } from 'lucide-react';
import type { CustomerFormProps } from './types';
import { useCustomerForm } from './hooks/useCustomerForm';
import { StepIndicator } from './components/StepIndicator';
import { ErrorMessage } from './components/ErrorMessage';
import { NamesStep, AddressStep, ContactStep } from './components/form-steps';
import { FORM_STEPS, STEP_LABELS, TOTAL_STEPS } from './utils/constants';

export function CustomerForm({
  onClose,
  onSuccess,
  customerToEdit,
}: CustomerFormProps) {
  const {
    currentStep,
    loading,
    error,
    formData,
    handleChange,
    handlePhoneChange,
    handleCountyChange,
    nextStep,
    prevStep,
    submitForm
  } = useCustomerForm(customerToEdit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== FORM_STEPS.CONTACT) {
      nextStep();
      return;
    }

    await submitForm(onSuccess, onClose);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 overflow-y-auto h-screen w-screen flex items-center justify-center">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full m-4 max-h-[90vh] sm:max-h-[800px] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {customerToEdit ? 'Edit Customer' : 'New Customer'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <StepIndicator 
          currentStep={currentStep} 
          totalSteps={TOTAL_STEPS} 
          stepLabels={STEP_LABELS} 
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {currentStep === FORM_STEPS.NAMES && (
            <NamesStep 
              formData={formData}
              handleChange={handleChange}
            />
          )}

          {currentStep === FORM_STEPS.ADDRESS && (
            <AddressStep 
              formData={formData}
              handleChange={handleChange}
              handleCountyChange={handleCountyChange}
            />
          )}

          {currentStep === FORM_STEPS.CONTACT && (
            <ContactStep 
              formData={formData}
              handleChange={handleChange}
              handlePhoneChange={handlePhoneChange}
            />
          )}

          {error && <ErrorMessage error={error} />}

          <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left h-4 w-4 mr-1 inline" style={{ marginTop: '-2px' }}><path d="m15 18-6-6 6-6"></path></svg>
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
                  : currentStep === FORM_STEPS.CONTACT
                  ? customerToEdit
                    ? 'Save Changes'
                    : 'Create Customer'
                  : 'Next'}
                {currentStep !== FORM_STEPS.CONTACT && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right h-4 w-4 ml-1 inline" style={{ marginTop: '-2px' }}><path d="m9 18 6-6-6-6"></path></svg>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

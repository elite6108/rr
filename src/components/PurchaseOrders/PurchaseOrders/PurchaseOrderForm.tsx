import React from 'react';
import { X, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { usePurchaseOrderForm } from './hooks/usePurchaseOrderForm';
import { StepIndicator } from './components/StepIndicator';
import { Step1Details } from './components/form-steps/Step1Details';
import { Step2Items } from './components/form-steps/Step2Items';
import { Step3Notes } from './components/form-steps/Step3Notes';
import { FORM_STEP_LABELS } from './utils/constants';
import { FormStep } from './types';
import type { PurchaseOrderFormProps } from './types';

export function PurchaseOrderForm({
  onClose,
  onSuccess,
  orderToEdit,
  preselectedProject,
  disableProjectSelection = false,
  viewOnly = false,
}: PurchaseOrderFormProps) {
  const {
    currentStep,
    loading,
    error,
    projects,
    suppliers,
    createdByName,
    includeVat,
    companyPrefix,
    formData,
    setIncludeVat,
    handleInputChange,
    handleProjectChange,
    handleSupplierChange,
    handleItemChange,
    addItem,
    removeItem,
    nextStep,
    prevStep,
    handleSubmit,
  } = usePurchaseOrderForm({
    onClose,
    onSuccess,
    orderToEdit,
    preselectedProject,
    disableProjectSelection,
  });

  const isLastStep = currentStep === FormStep.NOTES;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 overflow-y-auto h-screen w-screen flex items-start sm:items-center justify-center p-4">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-4xl w-full my-4 sm:my-8 max-h-[90vh] sm:max-h-[800px] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {viewOnly ? 'View Purchase Order' : orderToEdit ? 'Edit Purchase Order' : 'New Purchase Order'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {!viewOnly && (
          <StepIndicator
            currentStep={currentStep}
            totalSteps={FORM_STEP_LABELS.length}
            stepLabels={FORM_STEP_LABELS}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {(currentStep === FormStep.DETAILS || viewOnly) && (
            <Step1Details
              formData={formData}
              projects={projects}
              suppliers={suppliers}
              loading={loading}
              error={error}
              createdByName={createdByName}
              companyPrefix={companyPrefix}
              disableProjectSelection={disableProjectSelection}
              handleProjectChange={handleProjectChange}
              handleSupplierChange={handleSupplierChange}
              handleInputChange={handleInputChange}
            />
          )}

          {(currentStep === FormStep.ITEMS || viewOnly) && (
            <Step2Items
              formData={formData}
              loading={loading}
              includeVat={includeVat}
              handleItemChange={handleItemChange}
              addItem={addItem}
              removeItem={removeItem}
              setIncludeVat={setIncludeVat}
            />
          )}

          {(currentStep === FormStep.NOTES || viewOnly) && (
            <Step3Notes
              formData={formData}
              loading={loading}
              handleInputChange={handleInputChange}
            />
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {!viewOnly && (
            <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 pt-6 border-t border-gray-200 dark:border-gray-600">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-red-600 dark:hover:text-white"
              >
                Cancel
              </button>
              <div className="flex flex-col sm:flex-row gap-3">
                {currentStep > FormStep.DETAILS && (
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
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading
                    ? 'Saving...'
                    : isLastStep
                    ? (orderToEdit ? 'Save Changes' : 'Create Purchase Order')
                    : 'Next'}
                  {!isLastStep && <ChevronRight className="h-4 w-4 ml-1 inline" style={{ marginTop: '-2px' }} />}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
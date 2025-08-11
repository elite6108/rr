import React, { useEffect } from 'react';
import { X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { SiteSurveyFormProps } from '../types';
import { useSiteSurveyForm } from '../hooks/useSiteSurveyForm';
import { StepIndicator } from '../components/StepIndicator';
import {
  Step1Details,
  Step2SiteAccess,
  Step3Land,
  Step4WorkRequired,
  Step5CourtFeatures,
  Step6DrawingsPlans,
  Step7Review
} from '../components/form-steps';
import { STEP_LABELS, TOTAL_STEPS } from '../utils/constants';

export function SiteSurveyForm({
  onClose,
  onSuccess,
  surveyToEdit,
  isProjectContext = false,
}: SiteSurveyFormProps) {
  const {
    // State
    currentStep,
    loading,
    error,
    customers,
    projects,
    uploadingFiles,
    showW3WModal,
    currentUser,
    formData,

    // Actions
    setCurrentStep,
    setShowW3WModal,
    setFormData,
    handleCustomerChange,
    handleInputChange,
    handleBooleanChange,
    handleMultiSelectChange,
    handleFileUpload,
    handleSubmit
  } = useSiteSurveyForm({
    onClose,
    onSuccess,
    surveyToEdit,
    isProjectContext
  });

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const renderCurrentStep = () => {
    const stepProps = {
      formData,
      setFormData,
      customers,
      projects,
      currentUser,
      loading,
      uploadingFiles,
      showW3WModal,
      setShowW3WModal,
      handleCustomerChange,
      handleInputChange,
      handleBooleanChange,
      handleMultiSelectChange,
      handleFileUpload,
      isProjectContext
    };

    switch (currentStep) {
      case 1:
        return <Step1Details {...stepProps} />;
      case 2:
        return <Step2SiteAccess {...stepProps} />;
      case 3:
        return <Step3Land {...stepProps} />;
      case 4:
        return <Step4WorkRequired {...stepProps} />;
      case 5:
        return <Step5CourtFeatures {...stepProps} />;
      case 6:
        return <Step6DrawingsPlans {...stepProps} />;
      case 7:
        return <Step7Review {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 overflow-y-auto h-screen w-screen flex items-center justify-center">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {surveyToEdit ? 'Edit Site Survey' : 'New Site Survey'}
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

        <form onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          if (currentStep < TOTAL_STEPS) {
            setCurrentStep(prev => prev + 1);
          } else {
            handleSubmit(e);
          }
        }} className="space-y-6">
          {renderCurrentStep()}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

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
                  onClick={() => setCurrentStep(prev => prev - 1)}
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
                {loading ? 'Saving...' : currentStep === TOTAL_STEPS ? (surveyToEdit ? 'Save Changes' : 'Submit Survey') : 'Next'}
                {currentStep !== TOTAL_STEPS && <ChevronRight className="h-4 w-4 ml-1 inline" style={{ marginTop: '-2px' }} />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
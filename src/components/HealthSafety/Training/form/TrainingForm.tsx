import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TrainingFormProps } from '../types';
import { useTrainingForm } from '../hooks/useTrainingForm';
import { StepIndicator } from '../components/StepIndicator';
import { 
  Step1StaffSelection, 
  Step2TrainingRecords, 
  Step3CardsTickets, 
  Step4Certificates 
} from '../components/form-steps';
import { STEP_LABELS, TOTAL_STEPS, FORM_STEPS } from '../utils/constants';

export function TrainingForm({ onClose, editData }: TrainingFormProps) {
  const {
    // State
    currentStep,
    combinedStaffUsers,
    selectedStaff,
    trainingRecords,
    cardTickets,
    certificates,
    expandedTrainingItems,
    expandedCards,
    filePreviews,

    // Actions
    setCurrentStep,
    setSelectedStaff,
    setTrainingRecords,
    setCardTickets,
    setCertificates,
    setExpandedTrainingItems,
    setExpandedCards,
    setFilePreviews,
    handleSubmit
  } = useTrainingForm({ onClose, editData });

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    if (window.innerWidth < 640) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl p-4 sm:p-8 max-w-4xl w-full m-4 max-h-[calc(100vh-2rem)] sm:max-h-[800px] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {editData ? 'Edit Training Matrix' : 'New Training Matrix'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 focus:outline-none">
            <X className="h-6 w-6" />
          </button>
        </div>

        <StepIndicator
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          stepLabels={STEP_LABELS}
        />

        <form className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2">
            {currentStep === FORM_STEPS.STAFF_SELECTION && (
              <Step1StaffSelection
                selectedStaff={selectedStaff}
                setSelectedStaff={setSelectedStaff}
                combinedStaffUsers={combinedStaffUsers}
                editData={editData}
              />
            )}

            {currentStep === FORM_STEPS.TRAINING_RECORDS && (
              <Step2TrainingRecords
                trainingRecords={trainingRecords}
                setTrainingRecords={setTrainingRecords}
                expandedTrainingItems={expandedTrainingItems}
                setExpandedTrainingItems={setExpandedTrainingItems}
              />
            )}

            {currentStep === FORM_STEPS.CARDS_TICKETS && (
              <Step3CardsTickets
                cardTickets={cardTickets}
                setCardTickets={setCardTickets}
                expandedCards={expandedCards}
                setExpandedCards={setExpandedCards}
              />
            )}

            {currentStep === FORM_STEPS.CERTIFICATES && (
              <Step4Certificates
                filePreviews={filePreviews}
                setFilePreviews={setFilePreviews}
              />
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 pt-6 mt-6 border-t">
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
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  <ChevronLeft className="h-4 w-4 mr-1 inline" />
                  Previous
                </button>
              )}
              {currentStep === TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Complete & Save
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
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
  );
}
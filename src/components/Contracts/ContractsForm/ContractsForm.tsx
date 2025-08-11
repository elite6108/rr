import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ContractsFormProps, SubcontractorData } from '../types';
import { useContractsForm } from '../hooks/useContractsForm';
import { StepIndicator } from '../components/StepIndicator';
import { 
  Step1Contract, 
  Step2Customer, 
  Step3Project, 
  Step4Description, 
  Step5Subcontractors, 
  Step6Financial 
} from '../components/form-steps';
import { STEP_LABELS, TOTAL_STEPS, FORM_STEPS } from '../utils/constants';

export function ContractsForm({
  onClose,
  onSuccess,
  contract,
  preSelectedProjectId,
  disableCustomerAndProject = false,
}: ContractsFormProps) {
  const {
    // State
    currentStep,
    loading,
    error,
    formData,
    projects,
    customers,
    sites,
    quotes,
    subcontractors,
    expandedSubcontractors,
    siteManager,
    siteAddress,
    customerAddress,
    activeDescriptionTab,
    selectedSubcontractors,

    // Actions
    setCurrentStep,
    setFormData,
    setExpandedSubcontractors,
    setActiveDescriptionTab,
    setSelectedSubcontractors,
    handleInputChange,
    handleSubmit
  } = useContractsForm({ 
    contract, 
    preSelectedProjectId, 
    onSuccess, 
    onClose 
  });

  // Helper functions for form step components
  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;

    if (customerId) {
      const selectedCustomer = customers.find(
        (customer) => customer.id === customerId
      );

      if (selectedCustomer) {
        // Format the customer address in one line
        const addressParts = [
          selectedCustomer.address_line1,
          selectedCustomer.address_line2,
          selectedCustomer.town,
          selectedCustomer.county,
          selectedCustomer.post_code,
        ].filter(Boolean);

        const formattedAddress = addressParts.join(', ');

        // Update form data with customer details
        setFormData((prev) => ({
          ...prev,
          customer_id: customerId,
          customer_phone: selectedCustomer.phone,
          customer_email: selectedCustomer.email,
          customer_address: formattedAddress,
        }));
      }
    } else {
      // Reset customer fields if no customer is selected
      setFormData((prev) => ({
        ...prev,
        customer_id: '',
        customer_phone: '',
        customer_email: '',
        customer_address: '',
      }));
    }
  };

  const handleProjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = e.target.value;

    // Reset site-related fields
    setFormData((prev) => ({
      ...prev,
      project_id: projectId,
      site_id: '',
      site_address: '',
      site_manager: '',
      project_manager: '',
    }));

    if (projectId) {
      // Find project details from the projects array
      const selectedProject = projects.find(p => p.id === projectId);
      if (selectedProject) {
        setFormData((prev) => ({
          ...prev,
          project_manager: selectedProject.project_manager || '',
        }));
      }
    }
  };

  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const siteId = e.target.value;

    if (siteId) {
      const selectedSite = sites.find((site) => site.id === siteId);

      if (selectedSite) {
        // Format the site address in one line
        const addressParts = [
          selectedSite.address,
          selectedSite.town,
          selectedSite.county,
          selectedSite.postcode,
        ].filter(Boolean);

        const formattedAddress = addressParts.join(', ');

        // Update form data with site details
        setFormData((prev) => ({
          ...prev,
          site_id: siteId,
          site_address: formattedAddress,
          site_manager: selectedSite.site_manager || '',
        }));
      }
    } else {
      // Reset site fields if no site is selected
      setFormData((prev) => ({
        ...prev,
        site_id: '',
        site_address: '',
        site_manager: '',
      }));
    }
  };

  const addSubcontractor = () => {
    setSelectedSubcontractors([
      ...selectedSubcontractors,
      {
        subcontractor_id: '',
        manager: '',
        responsibilities: '',
      },
    ]);
  };

  const removeSubcontractor = (index: number) => {
    setSelectedSubcontractors(
      selectedSubcontractors.filter((_, i) => i !== index)
    );
  };

  const updateSubcontractor = (
    index: number,
    field: keyof SubcontractorData,
    value: string
  ) => {
    const updated = [...selectedSubcontractors];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setSelectedSubcontractors(updated);
  };

  const toggleSubcontractor = (index: number) => {
    const newExpanded = new Set(expandedSubcontractors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSubcontractors(Array.from(newExpanded));
  };
    
    return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-screen w-screen flex items-center justify-center z-50">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 m-4 max-w-2xl w-full max-h-[800px] md:max-h-[800px] max-h-[600px] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {contract ? 'Edit Contract' : 'New Contract'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <StepIndicator
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          stepLabels={STEP_LABELS}
        />

        <div className="mt-4 overflow-y-auto flex-1 space-y-6 md:max-h-[500px] max-h-[400px]">
          {currentStep === FORM_STEPS.CONTRACT && (
            <Step1Contract
              formData={formData}
              handleInputChange={handleInputChange}
            />
          )}

          {currentStep === FORM_STEPS.CUSTOMER && (
            <Step2Customer
              formData={formData}
              customers={customers}
              customerAddress={customerAddress}
              onCustomerChange={handleCustomerChange}
              disableCustomerAndProject={disableCustomerAndProject}
              handleInputChange={handleInputChange}
            />
          )}

          {currentStep === FORM_STEPS.PROJECT && (
            <Step3Project
              formData={formData}
              handleInputChange={handleInputChange}
              projects={projects}
              sites={sites}
              siteAddress={siteAddress}
              siteManager={siteManager}
              onProjectChange={handleProjectChange}
              onSiteChange={handleSiteChange}
              disableCustomerAndProject={disableCustomerAndProject}
              preSelectedProjectId={preSelectedProjectId}
            />
          )}

          {currentStep === FORM_STEPS.DESCRIPTION && (
            <Step4Description
              formData={formData}
              handleInputChange={handleInputChange}
              setFormData={setFormData}
              activeDescriptionTab={activeDescriptionTab}
              setActiveDescriptionTab={setActiveDescriptionTab}
              quotes={quotes}
            />
          )}

          {currentStep === FORM_STEPS.SUBCONTRACTORS && (
            <Step5Subcontractors
              selectedSubcontractors={selectedSubcontractors}
              subcontractors={subcontractors}
              expandedSubcontractors={expandedSubcontractors}
              onAddSubcontractor={addSubcontractor}
              onRemoveSubcontractor={removeSubcontractor}
              onUpdateSubcontractor={updateSubcontractor}
              onToggleSubcontractor={toggleSubcontractor}
            />
          )}

          {currentStep === FORM_STEPS.FINANCIAL && (
            <Step6Financial
              formData={formData}
              handleInputChange={handleInputChange}
              setFormData={setFormData}
            />
          )}
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-red-600 dark:hover:text-white"
          >
            Cancel
          </button>
          <div className="flex flex-col sm:flex-row gap-3">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
<ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </button>
            )}
            <button
              onClick={() => {
                if (currentStep < TOTAL_STEPS) {
                  setCurrentStep(currentStep + 1);
                } else {
                  handleSubmit();
                }
              }}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading 
                ? 'Saving...' 
                : currentStep === TOTAL_STEPS 
                  ? (contract ? 'Update Contract' : 'Save Contract')
                  : 'Next'
              }
              {currentStep !== TOTAL_STEPS && <ChevronRight className="h-4 w-4 ml-1" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
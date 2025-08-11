import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { CompanySettingsFormProps, TabType } from './types';
import { useCompanySettings } from './hooks/useCompanySettings';
import { useLogoUpload } from './hooks/useLogoUpload';
import { useFormSubmission } from './hooks/useFormSubmission';
import { TabNavigation } from './components/TabNavigation';
import { ErrorMessage } from './components/ErrorMessage';
import { SuccessMessage } from './components/SuccessMessage';
import { 
  CompanyInfoTab, 
  ContactTab, 
  TaxInfoTab, 
  PrefixTab, 
  InsurancesTab 
} from './components/tabs';

export function CompanySettingsForm({ onClose }: CompanySettingsFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>('company');
  
  // Custom hooks
  const { formData, handleChange, updateFormData } = useCompanySettings();
  const { uploadingLogo, handleLogoUpload } = useLogoUpload(formData, updateFormData);
  const { loading, error, success, handleSubmit, clearError } = useFormSubmission(formData, onClose);

  // Handle logo upload with error handling
  const handleLogoUploadWithError = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      clearError();
      await handleLogoUpload(e);
    } catch (err) {
      // Error handling is done in the hook, but we could add additional handling here if needed
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-60 overflow-y-auto h-full w-full flex items-center justify-center">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full m-4 max-w-2xl sm:max-h-[600px] max-h-[450px] overflow-y-auto sm:w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold dark:text-white">Company Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-100 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tab Content */}
          {activeTab === 'company' && (
            <CompanyInfoTab 
              formData={formData}
              handleChange={handleChange}
              handleLogoUpload={handleLogoUploadWithError}
              uploadingLogo={uploadingLogo}
            />
          )}

          {activeTab === 'contact' && (
            <ContactTab 
              formData={formData}
              handleChange={handleChange}
            />
          )}

          {activeTab === 'tax' && (
            <TaxInfoTab 
              formData={formData}
              handleChange={handleChange}
            />
          )}

          {activeTab === 'prefix' && (
            <PrefixTab 
              formData={formData}
              handleChange={handleChange}
            />
          )}

          {activeTab === 'insurances' && (
            <InsurancesTab 
              formData={formData}
              handleChange={handleChange}
            />
          )}

          {error && <ErrorMessage error={error} />}
          {success && <SuccessMessage />}

          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingLogo}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
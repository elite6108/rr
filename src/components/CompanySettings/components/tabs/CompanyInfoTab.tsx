import React from 'react';
import type { TabProps } from '../../types';
import { LogoUpload } from '../LogoUpload';
import { counties } from '../../utils/constants';

interface CompanyInfoTabProps extends TabProps {
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploadingLogo: boolean;
}

export function CompanyInfoTab({ 
  formData, 
  handleChange, 
  handleLogoUpload, 
  uploadingLogo 
}: CompanyInfoTabProps) {
  return (
    <div className="space-y-6">
      {/* Logo Upload Section */}
      <LogoUpload 
        formData={formData}
        handleLogoUpload={handleLogoUpload}
        uploadingLogo={uploadingLogo}
      />

      <div className="grid grid-cols-1 gap-6">
        <div className="w-full">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Company Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="w-full">
          <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Address Line 1 *
          </label>
          <input
            type="text"
            id="address_line1"
            name="address_line1"
            required
            value={formData.address_line1 || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="w-full">
          <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Address Line 2 <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <input
            type="text"
            id="address_line2"
            name="address_line2"
            value={formData.address_line2 || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="w-full">
          <label htmlFor="town" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Town *
          </label>
          <input
            type="text"
            id="town"
            name="town"
            required
            value={formData.town || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="w-full">
          <label htmlFor="county" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            County *
          </label>
          <select
            id="county"
            name="county"
            required
            value={formData.county || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select a county</option>
            {counties.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full">
          <label htmlFor="post_code" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Post Code *
          </label>
          <input
            type="text"
            id="post_code"
            name="post_code"
            required
            value={formData.post_code || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}
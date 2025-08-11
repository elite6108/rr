import React from 'react';
import type { TabProps } from '../../types';

export function TaxInfoTab({ formData, handleChange }: TabProps) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="w-full">
        <label htmlFor="company_number" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Company Number *
        </label>
        <input
          type="text"
          id="company_number"
          name="company_number"
          value={formData.company_number || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          placeholder="12345678"
        />
      </div>

      <div className="w-full">
        <label htmlFor="vat_number" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          VAT Number *
        </label>
        <input
          type="text"
          id="vat_number"
          name="vat_number"
          value={formData.vat_number || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          placeholder="GB123456789"
        />
      </div>
    </div>
  );
}
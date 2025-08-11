import React from 'react';
import { format } from 'date-fns';
import type { FormStepProps } from '../../types';

export function Step1Contract({ formData, handleInputChange }: FormStepProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 text-blue-800 rounded-md mb-4 dark:bg-blue-900/20 dark:text-blue-200">
        <p className="text-sm">
          This Contract Generator will request specific details about the
          project and the associated work. The information provided, along with
          the terms, definitions, and agreed wording, will be included in the
          final PDF version of this contract.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Contract ID <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          name="contract_id"
          value={formData.contract_id}
          readOnly
          className="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md shadow-sm focus:outline-none"
          placeholder="Automatically generated on save"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Contract Date *
        </label>
        <input
          type="date"
          name="contract_date"
          value={formData.contract_date}
          onChange={handleInputChange}
          min={format(new Date(), 'yyyy-MM-dd')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
    </div>
  );
}
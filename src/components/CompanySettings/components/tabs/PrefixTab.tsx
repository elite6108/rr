import React from 'react';
import type { TabProps } from '../../types';

export function PrefixTab({ formData, handleChange }: TabProps) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="w-full">
        <label htmlFor="prefix" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Prefix *
        </label>
        <input
          type="text"
          id="prefix"
          name="prefix"
          required
          value={formData.prefix || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          placeholder="settings-prefix"
        />
        <p className="mt-1 text-xs text-gray-500">
          This prefix will be used as a reference in other areas of the application
        </p>
      </div>
    </div>
  );
}
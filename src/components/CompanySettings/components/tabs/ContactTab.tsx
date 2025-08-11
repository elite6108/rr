import React from 'react';
import type { TabProps } from '../../types';

export function ContactTab({ formData, handleChange }: TabProps) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="w-full">
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Phone *
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          required
          value={formData.phone || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="w-full">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          value={formData.email || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
      </div>
    </div>
  );
}
import React from 'react';
import type { TabProps } from '../../types';

export function InsurancesTab({ formData, handleChange }: TabProps) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="w-full">
        <label htmlFor="public_liability" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Public Liability *
        </label>
        <input
          type="text"
          id="public_liability"
          name="public_liability"
          value={formData.public_liability || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="w-full">
        <label htmlFor="employers_liability" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Employers Liability *
        </label>
        <input
          type="text"
          id="employers_liability"
          name="employers_liability"
          value={formData.employers_liability || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="w-full">
        <label htmlFor="products_liability" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Products Liability <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          id="products_liability"
          name="products_liability"
          value={formData.products_liability || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="w-full">
        <label htmlFor="professional_indemnity" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Professional Indemnity <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          id="professional_indemnity"
          name="professional_indemnity"
          value={formData.professional_indemnity || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="w-full">
        <label htmlFor="contractors_risk" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Contractors' All Risk <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          id="contractors_risk"
          name="contractors_risk"
          value={formData.contractors_risk || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="w-full">
        <label htmlFor="plant_machinery" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Plant & Machinery <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          id="plant_machinery"
          name="plant_machinery"
          value={formData.plant_machinery || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="w-full">
        <label htmlFor="owned_plant" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Owned Plant Insurance <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          id="owned_plant"
          name="owned_plant"
          value={formData.owned_plant || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="w-full">
        <label htmlFor="hired_plant" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Hired Plant Insurance <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          id="hired_plant"
          name="hired_plant"
          value={formData.hired_plant || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="w-full">
        <label htmlFor="environmental_liability" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Environmental Liability <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          id="environmental_liability"
          name="environmental_liability"
          value={formData.environmental_liability || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="w-full">
        <label htmlFor="latent_defects" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Latent Defects Insurance <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          id="latent_defects"
          name="latent_defects"
          value={formData.latent_defects || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="w-full">
        <label htmlFor="other_insurances" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          Other Insurances <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <textarea
          id="other_insurances"
          name="other_insurances"
          rows={3}
          value={formData.other_insurances || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
      </div>
    </div>
  );
}
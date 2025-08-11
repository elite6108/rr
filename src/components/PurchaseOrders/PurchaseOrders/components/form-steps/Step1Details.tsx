import React from 'react';
import { INPUT_CLASS_NAME, SELECT_CLASS_NAME } from '../../utils/constants';
import type { FormStepProps } from '../../types';

export function Step1Details({
  formData,
  projects = [],
  suppliers = [],
  loading = false,
  error,
  createdByName = '',
  companyPrefix = '',
  disableProjectSelection = false,
  handleProjectChange,
  handleSupplierChange,
  handleInputChange,
}: FormStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project *
        </label>
        <select
          name="project_id"
          value={formData.project_id}
          onChange={handleProjectChange}
          required
          disabled={disableProjectSelection || loading}
          className={`${SELECT_CLASS_NAME} ${disableProjectSelection ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
        >
          <option value="">Select a project...</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {disableProjectSelection && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Project is preselected and cannot be changed.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Supplier *
        </label>
        <select
          name="supplier_id"
          value={formData.supplier_id}
          onChange={handleSupplierChange}
          required
          disabled={loading}
          className={SELECT_CLASS_NAME}
        >
          <option value="">Select a supplier...</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Delivery Address *
        </label>
        <input
          type="text"
          name="delivery_to"
          value={formData.delivery_to}
          onChange={handleInputChange}
          required
          disabled={loading}
          className={INPUT_CLASS_NAME}
          placeholder="Enter delivery address"
        />
      </div>

      {createdByName && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Created by:</span>
            <span className="text-gray-900 dark:text-white font-medium">{createdByName}</span>
          </div>
        </div>
      )}
    </div>
  );
}
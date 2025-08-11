import React from 'react';
import { INPUT_CLASS_NAME } from '../../utils/constants';
import type { FormStepProps } from '../../types';

export function Step1SupplierName({ formData, handleChange }: FormStepProps) {
  return (
    <div>
      <label
        htmlFor="name"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Supplier Name *
      </label>
      <input
        type="text"
        id="name"
        name="name"
        required
        value={formData.name}
        onChange={handleChange}
        className={INPUT_CLASS_NAME}
        placeholder="Enter supplier name"
      />
    </div>
  );
}
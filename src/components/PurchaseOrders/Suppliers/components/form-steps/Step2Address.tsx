import React from 'react';
import { INPUT_CLASS_NAME, COUNTY_LIST } from '../../utils/constants';
import type { FormStepProps } from '../../types';

export function Step2Address({ formData, handleChange }: FormStepProps) {
  return (
    <>
      <div>
        <label
          htmlFor="address_line1"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Address Line 1 *
        </label>
        <input
          type="text"
          id="address_line1"
          name="address_line1"
          required
          value={formData.address_line1}
          onChange={handleChange}
          className={INPUT_CLASS_NAME}
          placeholder="Enter address line 1"
        />
      </div>

      <div>
        <label
          htmlFor="address_line2"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Address Line 2 <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          id="address_line2"
          name="address_line2"
          value={formData.address_line2}
          onChange={handleChange}
          className={INPUT_CLASS_NAME}
          placeholder="Enter address line 2 (optional)"
        />
      </div>

      <div>
        <label
          htmlFor="town"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Town *
        </label>
        <input
          type="text"
          id="town"
          name="town"
          required
          value={formData.town}
          onChange={handleChange}
          className={INPUT_CLASS_NAME}
          placeholder="Enter town"
        />
      </div>

      <div>
        <label
          htmlFor="county"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          County *
        </label>
        <select
          id="county"
          name="county"
          required
          value={formData.county}
          onChange={handleChange}
          className={INPUT_CLASS_NAME}
        >
          <option value="">Select a county</option>
          {COUNTY_LIST.map((county) => (
            <option key={county} value={county}>
              {county}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="post_code"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Post Code *
        </label>
        <input
          type="text"
          id="post_code"
          name="post_code"
          required
          value={formData.post_code}
          onChange={handleChange}
          className={INPUT_CLASS_NAME}
          placeholder="Enter post code"
        />
      </div>
    </>
  );
}
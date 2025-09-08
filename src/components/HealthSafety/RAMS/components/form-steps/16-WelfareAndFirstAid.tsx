import React from 'react';
import type { RAMSFormData } from '../../../../../types/rams';
import { RAMS_DEFAULTS } from '../../../../../types/rams';

interface WelfareAndFirstAidProps {
  data: RAMSFormData;
  onChange: (data: Partial<RAMSFormData>) => void;
}

export function WelfareAndFirstAid({ data, onChange }: WelfareAndFirstAidProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Welfare & First Aid</h3>
      
      <div>
        <label htmlFor="welfare_first_aid" className="block text-sm font-medium text-gray-700 mb-2">
          Welfare & First Aid Information *
        </label>
        <textarea
          id="welfare_first_aid"
          value={data.welfare_first_aid || RAMS_DEFAULTS.WELFARE_FIRST_AID}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange({ welfare_first_aid: e.target.value })}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="nearest_hospital" className="block text-sm font-medium text-gray-700 mb-2">
          Nearest Hospital *
        </label>
        <input
          type="text"
          id="nearest_hospital"
          value={data.nearest_hospital || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ nearest_hospital: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter nearest hospital details"
        />
      </div>
    </div>
  );
}
import React from 'react';
import { FORM_STEP_LABELS } from '../utils/constants';

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="mb-8 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="text-base font-medium text-indigo-600">
          {FORM_STEP_LABELS[currentStep - 1]}
        </div>
        <div className="text-sm text-gray-500">
          Step {currentStep} of {FORM_STEP_LABELS.length}
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${(currentStep / FORM_STEP_LABELS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
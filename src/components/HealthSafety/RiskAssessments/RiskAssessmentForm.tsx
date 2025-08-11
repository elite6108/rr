import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { RiskAssessment } from '../../../types/database';

// Import screen components
import { DetailsScreen } from './RiskAssessment/DetailsScreen';
import { PPEScreen } from './RiskAssessment/PPEScreen';
import { GuidelinesScreen } from './RiskAssessment/GuidelinesScreen';
import { WorkingMethodScreen } from './RiskAssessment/WorkingMethodScreen';
import { HazardsScreen } from './RiskAssessment/HazardsScreen';

interface RiskAssessmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  assessmentToEdit?: RiskAssessment | null;
}

interface WorkingMethodItem {
  id: string;
  number: number;
  description: string;
}

interface HazardItem {
  id: string;
  title: string;
  whoMightBeHarmed: string;
  howMightBeHarmed: string;
  beforeLikelihood: number;
  beforeSeverity: number;
  beforeTotal: number;
  controlMeasures: { id: string; description: string }[];
  afterLikelihood: number;
  afterSeverity: number;
  afterTotal: number;
}

type Screen = 'details' | 'ppe' | 'guidelines' | 'workingMethod' | 'hazards';

export function RiskAssessmentForm({ onClose, onSuccess, assessmentToEdit }: RiskAssessmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('details');
  const [formData, setFormData] = useState({
    name: assessmentToEdit?.name || '',
    location: assessmentToEdit?.location || '',
    assessor: assessmentToEdit?.assessor || '',
    selectedPPE: assessmentToEdit?.ppe || [],
    guidelines: assessmentToEdit?.guidelines || '',
    workingMethods: assessmentToEdit?.working_methods || [],
    hazards: assessmentToEdit?.hazards || []
  });

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Fetch user's display name
  useEffect(() => {
    const fetchUserDisplayName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.display_name && !assessmentToEdit) {
          setFormData(prev => ({ ...prev, assessor: user.user_metadata.display_name }));
        }
      } catch (err) {
        console.error('Error fetching user display name:', err);
      }
    };

    fetchUserDisplayName();
  }, [assessmentToEdit]);

  const handleChange = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const validateCurrentScreen = () => {
    switch (currentScreen) {
      case 'details':
        if (!formData.name.trim()) return 'Name is required';
        if (!formData.location.trim()) return 'Location is required';
        if (!formData.assessor.trim()) return 'Assessor name is required';
        break;
      case 'ppe':
        break;
      case 'workingMethod':
        if (formData.workingMethods.length === 0) return 'Please add at least one working method';
        break;
      case 'hazards':
        if (formData.hazards.length === 0) return 'Please add at least one hazard';
        // Validate each hazard
        for (const hazard of formData.hazards) {
          if (!hazard.title) return `Hazard title is required`;
          if (!hazard.whoMightBeHarmed) return `"Who might be harmed" is required`;
          if (!hazard.howMightBeHarmed) return `"How might they be harmed" is required`;
          if (hazard.beforeLikelihood < 1 || hazard.beforeSeverity < 1) return `Please set likelihood and severity ratings`;
          if (hazard.controlMeasures.length === 0) return `Please add at least one control measure`;
          if (hazard.afterLikelihood < 1 || hazard.afterSeverity < 1) return `Please set final likelihood and severity ratings`;
        }
        break;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only proceed with submission if we're on the hazards screen
    if (currentScreen !== 'hazards') {
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Validate all fields and collect errors
      const errors: string[] = [];

      if (!formData.name.trim()) {
        errors.push('Name is required');
      }
      if (!formData.location.trim()) {
        errors.push('Location is required');
      }
      if (!formData.assessor.trim()) {
        errors.push('Assessor name is required');
      }
      if (formData.workingMethods.length === 0) {
        errors.push('Please add at least one working method');
      }
      if (formData.hazards.length === 0) {
        errors.push('Please add at least one hazard');
      }
      
      // Validate each hazard
      for (const hazard of formData.hazards) {
        if (!hazard.title) {
          errors.push(`Hazard title is required for hazard #${formData.hazards.indexOf(hazard) + 1}`);
        }
        if (!hazard.whoMightBeHarmed) {
          errors.push(`"Who might be harmed" is required for hazard #${formData.hazards.indexOf(hazard) + 1}`);
        }
        if (!hazard.howMightBeHarmed) {
          errors.push(`"How might they be harmed" is required for hazard #${formData.hazards.indexOf(hazard) + 1}`);
        }
        if (hazard.beforeLikelihood < 1 || hazard.beforeSeverity < 1) {
          errors.push(`Please set likelihood and severity ratings for hazard #${formData.hazards.indexOf(hazard) + 1} (before control measures)`);
        }
        if (hazard.controlMeasures.length === 0) {
          errors.push(`Please add at least one control measure for hazard #${formData.hazards.indexOf(hazard) + 1}`);
        }
        if (hazard.afterLikelihood < 1 || hazard.afterSeverity < 1) {
          errors.push(`Please set likelihood and severity ratings for hazard #${formData.hazards.indexOf(hazard) + 1} (after control measures)`);
        }
      }

      // If there are any errors, display them all
      if (errors.length > 0) {
        throw new Error(errors.join('\n'));
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Prepare data for database
      const riskAssessmentData = {
        name: formData.name,
        location: formData.location,
        creation_date: new Date().toISOString(),
        assessor: formData.assessor,
        ppe: formData.selectedPPE,
        guidelines: formData.guidelines || null,
        working_methods: formData.workingMethods,
        hazards: formData.hazards,
        user_id: user.id,
        review_date: (() => {
          const date = new Date();
          date.setFullYear(date.getFullYear() + 1);
          return date.toISOString();
        })()
      };

      let error;
      if (assessmentToEdit) {
        // Update existing assessment
        ({ error } = await supabase
          .from('risk_assessments')
          .update(riskAssessmentData)
          .eq('id', assessmentToEdit.id));
      } else {
        // Create new assessment
        ({ error } = await supabase
          .from('risk_assessments')
          .insert([riskAssessmentData]));
      }

      if (error) {
        console.error('Database error details:', error);
        if (error.code === '23505') {
          throw new Error('A risk assessment with this name already exists');
        } else if (error.code === '23502') {
          throw new Error('Please fill in all required fields');
        } else {
          throw new Error(`Database error: ${error.message}${error.details ? ` - ${error.details}` : ''}`);
        }
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving risk assessment:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError(err.message as string);
      } else {
        setError('An unexpected error occurred while saving the risk assessment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const nextScreen = () => {
    const validationError = validateCurrentScreen();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    switch (currentScreen) {
      case 'details':
        setCurrentScreen('ppe');
        break;
      case 'ppe':
        setCurrentScreen('guidelines');
        break;
      case 'guidelines':
        setCurrentScreen('workingMethod');
        break;
      case 'workingMethod':
        setCurrentScreen('hazards');
        break;
    }
  };

  const previousScreen = () => {
    setError(null);
    switch (currentScreen) {
      case 'ppe':
        setCurrentScreen('details');
        break;
      case 'guidelines':
        setCurrentScreen('ppe');
        break;
      case 'workingMethod':
        setCurrentScreen('guidelines');
        break;
      case 'hazards':
        setCurrentScreen('workingMethod');
        break;
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'details':
        return <DetailsScreen data={formData} onChange={handleChange} />;
      case 'ppe':
        return <PPEScreen data={formData} onChange={handleChange} />;
      case 'guidelines':
        return <GuidelinesScreen data={formData} onChange={handleChange} />;
      case 'workingMethod':
        return <WorkingMethodScreen data={formData} onChange={handleChange} />;
      case 'hazards':
        return <HazardsScreen data={formData} onChange={handleChange} />;
    }
  };

  const getStepLabel = () => {
    switch (currentScreen) {
      case 'details':
        return 'Details';
      case 'ppe':
        return 'PPE';
      case 'guidelines':
        return 'Guidelines';
      case 'workingMethod':
        return 'Working Method';
      case 'hazards':
        return 'Hazards';
    }
  };

  const getCurrentStepNumber = () => {
    switch (currentScreen) {
      case 'details':
        return 1;
      case 'ppe':
        return 2;
      case 'guidelines':
        return 3;
      case 'workingMethod':
        return 4;
      case 'hazards':
        return 5;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 z-50"></div>
      <div className="fixed inset-0 overflow-y-auto h-full w-full flex items-center justify-center z-50 min-h-screen">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg-xl p-8 max-w-4xl w-full m-4 my-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{assessmentToEdit ? 'Edit Risk Assessment' : 'New Risk Assessment'}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-8 w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="text-base font-medium text-indigo-600 dark:text-indigo-400">
                {getStepLabel()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Step {getCurrentStepNumber()} of 5
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${(getCurrentStepNumber() / 5) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-6">
            {renderScreen()}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1">
                  {error.split('\n').map((line, index) => (
                    <p key={index} className="mb-1 last:mb-0">{line}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <div className="flex flex-col sm:flex-row gap-3">
                {currentScreen !== 'details' && (
                  <button
                    type="button"
                    onClick={previousScreen}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left h-4 w-4 mr-1 inline" style={{ marginTop: '-2px' }}><path d="m15 18-6-6 6-6"></path></svg>
                    Previous
                  </button>
                )}
                {currentScreen === 'hazards' ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : assessmentToEdit ? 'Update Assessment' : 'Save Assessment'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextScreen}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right h-4 w-4 ml-1 inline" style={{ marginTop: '-2px' }}><path d="m9 18 6-6-6-6"></path></svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
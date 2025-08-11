import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

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

interface PreviousRiskAssessment {
  id: string;
  ra_id: string;
  name: string;
  location: string;
  created_at: string;
  hazards: HazardItem[];
}

interface HazardsScreenProps {
  data: {
    hazards: HazardItem[];
  };
  onChange: (data: Partial<typeof HazardsScreenProps.prototype.data>) => void;
}

export function HazardsScreen({ data, onChange }: HazardsScreenProps) {
  const [collapsedHazards, setCollapsedHazards] = useState<Set<string>>(new Set());
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [previousRiskAssessments, setPreviousRiskAssessments] = useState<PreviousRiskAssessment[]>([]);
  const [loadingRiskAssessments, setLoadingRiskAssessments] = useState(false);
  const [selectedRiskAssessment, setSelectedRiskAssessment] = useState<string | null>(null);
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const toggleHazardCollapse = (hazardId: string) => {
    setCollapsedHazards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hazardId)) {
        newSet.delete(hazardId);
      } else {
        newSet.add(hazardId);
      }
      return newSet;
    });
  };

  const importAllHazards = async () => {
    if (!selectedRiskAssessment) return;

    setImportLoading(true);
    try {
      const selectedRA = previousRiskAssessments.find(ra => ra.id === selectedRiskAssessment);
      if (!selectedRA || !selectedRA.hazards) {
        throw new Error('Selected risk assessment not found or has no hazards');
      }

      // Import hazards with new IDs to avoid conflicts
      const importedHazards = selectedRA.hazards.map(hazard => ({
        ...hazard,
        id: crypto.randomUUID(), // Generate new ID
        controlMeasures: hazard.controlMeasures.map(measure => ({
          ...measure,
          id: crypto.randomUUID() // Generate new ID for control measures
        }))
      }));

      // Add imported hazards to current hazards
      onChange({
        hazards: [...data.hazards, ...importedHazards]
      });

      // Reset import state
      setShowImportDropdown(false);
      setShowImportOptions(false);
      setSelectedRiskAssessment(null);
      
      // Show success modal
      setSuccessMessage(`Successfully imported ${importedHazards.length} hazards from ${selectedRA.name}`);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error importing hazards:', error);
      alert('Failed to import hazards');
    } finally {
      setImportLoading(false);
    }
  };

  const importSpecificHazard = async (hazardId: string) => {
    if (!selectedRiskAssessment) return;

    setImportLoading(true);
    try {
      const selectedRA = previousRiskAssessments.find(ra => ra.id === selectedRiskAssessment);
      if (!selectedRA || !selectedRA.hazards) {
        throw new Error('Selected risk assessment not found or has no hazards');
      }

      const hazardToImport = selectedRA.hazards.find(h => h.id === hazardId);
      if (!hazardToImport) {
        throw new Error('Selected hazard not found');
      }

      // Import hazard with new ID to avoid conflicts
      const importedHazard = {
        ...hazardToImport,
        id: crypto.randomUUID(), // Generate new ID
        controlMeasures: hazardToImport.controlMeasures.map(measure => ({
          ...measure,
          id: crypto.randomUUID() // Generate new ID for control measures
        }))
      };

      // Add imported hazard to current hazards
      onChange({
        hazards: [...data.hazards, importedHazard]
      });

      // Reset import state
      setShowImportDropdown(false);
      setShowImportOptions(false);
      setSelectedRiskAssessment(null);
      
      // Show success modal
      setSuccessMessage(`Successfully imported hazard "${hazardToImport.title}" from ${selectedRA.name}`);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error importing hazard:', error);
      alert('Failed to import hazard');
    } finally {
      setImportLoading(false);
    }
  };

  const addHazard = () => {
    const newHazard: HazardItem = {
      id: crypto.randomUUID(),
      title: '',
      whoMightBeHarmed: '',
      howMightBeHarmed: '',
      beforeLikelihood: 1,
      beforeSeverity: 1,
      beforeTotal: 1,
      controlMeasures: [],
      afterLikelihood: 1,
      afterSeverity: 1,
      afterTotal: 1
    };

    onChange({
      hazards: [...data.hazards, newHazard]
    });
  };

  const updateHazard = (id: string, updates: Partial<HazardItem>) => {
    onChange({
      hazards: data.hazards.map(hazard =>
        hazard.id === id
          ? {
              ...hazard,
              ...updates,
              // If beforeSeverity is being updated, also update afterSeverity to match
              afterSeverity: updates.beforeSeverity !== undefined ? updates.beforeSeverity : hazard.afterSeverity,
              beforeTotal: updates.beforeLikelihood !== undefined || updates.beforeSeverity !== undefined
                ? (updates.beforeLikelihood || hazard.beforeLikelihood) * (updates.beforeSeverity || hazard.beforeSeverity)
                : hazard.beforeTotal,
              afterTotal: updates.afterLikelihood !== undefined || updates.beforeSeverity !== undefined
                ? (updates.afterLikelihood || hazard.afterLikelihood) * (updates.beforeSeverity !== undefined ? updates.beforeSeverity : hazard.afterSeverity)
                : hazard.afterTotal
            }
          : hazard
      )
    });
  };

  const removeHazard = (id: string) => {
    onChange({
      hazards: data.hazards.filter(hazard => hazard.id !== id)
    });
  };

  const addControlMeasure = (hazardId: string) => {
    onChange({
      hazards: data.hazards.map(hazard =>
        hazard.id === hazardId
          ? {
              ...hazard,
              controlMeasures: [
                ...hazard.controlMeasures,
                { id: crypto.randomUUID(), description: '' }
              ]
            }
          : hazard
      )
    });
  };

  const updateControlMeasure = (hazardId: string, measureId: string, description: string) => {
    onChange({
      hazards: data.hazards.map(hazard =>
        hazard.id === hazardId
          ? {
              ...hazard,
              controlMeasures: hazard.controlMeasures.map(measure =>
                measure.id === measureId
                  ? { ...measure, description }
                  : measure
              )
            }
          : hazard
      )
    });
  };

  const removeControlMeasure = (hazardId: string, measureId: string) => {
    onChange({
      hazards: data.hazards.map(hazard =>
        hazard.id === hazardId
          ? {
              ...hazard,
              controlMeasures: hazard.controlMeasures.filter(measure => measure.id !== measureId)
            }
          : hazard
      )
    });
  };

  const fetchPreviousRiskAssessments = async () => {
    setLoadingRiskAssessments(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: riskAssessmentData, error } = await supabase
        .from('risk_assessments')
        .select('id, ra_id, name, location, created_at, hazards')
        .eq('user_id', user.id)
        .not('hazards', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out risk assessments that don't have hazards or have empty hazards array
      const validRiskAssessments = (riskAssessmentData || []).filter(ra => 
        ra.hazards && 
        Array.isArray(ra.hazards) && 
        ra.hazards.length > 0
      );

      setPreviousRiskAssessments(validRiskAssessments);
    } catch (error) {
      console.error('Error fetching previous risk assessments:', error);
      alert('Failed to fetch previous risk assessments');
    } finally {
      setLoadingRiskAssessments(false);
    }
  };

  const handleImportClick = async () => {
    if (!showImportDropdown) {
      await fetchPreviousRiskAssessments();
    }
    setShowImportDropdown(!showImportDropdown);
    setShowImportOptions(false);
    setSelectedRiskAssessment(null);
  };

  const handleRiskAssessmentSelect = (raId: string) => {
    setSelectedRiskAssessment(raId);
    setShowImportOptions(true);
  };

  return (
    <div className="space-y-6">
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md md:max-w-6xl w-full mx-4 md:h-[89vh] md:flex md:flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-2 mr-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Import Successful</h3>
              </div>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="md:flex-1 md:flex md:flex-col md:justify-center">
              <p className="text-sm text-gray-600 mb-4 md:text-center md:text-lg">{successMessage}</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h3 className="text-lg font-medium text-gray-900">Hazards *</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={handleImportClick}
              className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Import Hazard
              <ChevronDown className="h-4 w-4 ml-1" />
            </button>
            
            {showImportDropdown && (
              <div className="absolute z-10 mt-1 w-full sm:w-80 bg-white border border-gray-300 rounded-md shadow-lg">
                <div className="p-4 space-y-4">
                  <div className="text-sm font-medium text-gray-700">Select Risk Assessment</div>
                  
                  {loadingRiskAssessments ? (
                    <div className="text-sm text-gray-500">Loading previous risk assessments...</div>
                  ) : previousRiskAssessments.length === 0 ? (
                    <div className="text-sm text-gray-500">No previous risk assessments with hazards found</div>
                  ) : (
                    <>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {previousRiskAssessments.map((ra) => (
                          <button
                            key={ra.id}
                            type="button"
                            onClick={() => handleRiskAssessmentSelect(ra.id)}
                            className={`w-full text-left p-2 hover:bg-gray-50 rounded cursor-pointer border ${
                              selectedRiskAssessment === ra.id ? 'border-indigo-500 bg-indigo-50' : 'border-transparent'
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {ra.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {ra.ra_id} • {ra.location} • {ra.hazards.length} hazards
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(ra.created_at).toLocaleDateString()}
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      {showImportOptions && selectedRiskAssessment && (
                        <div className="border-t pt-4">
                          <div className="text-sm font-medium text-gray-700 mb-3">Import Options</div>
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={importAllHazards}
                              disabled={importLoading}
                              className="w-full px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {importLoading ? 'Importing...' : 'Import All Hazards'}
                            </button>
                            <div className="text-xs text-gray-500 mb-2">Or select specific hazard:</div>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {previousRiskAssessments
                                .find(ra => ra.id === selectedRiskAssessment)
                                ?.hazards.map((hazard) => (
                                <button
                                  key={hazard.id}
                                  type="button"
                                  onClick={() => importSpecificHazard(hazard.id)}
                                  disabled={importLoading}
                                  className="w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {hazard.title || 'Untitled Hazard'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-end space-x-2 pt-2 border-t">
                        <button
                          type="button"
                          onClick={() => {
                            setShowImportDropdown(false);
                            setShowImportOptions(false);
                            setSelectedRiskAssessment(null);
                          }}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button
            type="button"
            onClick={addHazard}
            className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Hazard
          </button>
        </div>
      </div>

      <div className="max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
        <div className="space-y-8">
          {data.hazards.map((hazard) => (
            <div key={hazard.id} className="bg-gray-50 p-6 rounded-lg space-y-6">
              <div className="flex justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => toggleHazardCollapse(hazard.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {collapsedHazards.has(hazard.id) ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                  <h4 className="text-lg font-medium text-gray-900">
                    {hazard.title || 'Hazard Details'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => removeHazard(hazard.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              {!collapsedHazards.has(hazard.id) && (
                <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hazard Title *
                    </label>
                    <input
                      type="text"
                      value={hazard.title}
                      onChange={(e) => updateHazard(hazard.id, { title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Who Might Be Harmed *
                    </label>
                    <input
                      type="text"
                      value={hazard.whoMightBeHarmed}
                      onChange={(e) => updateHazard(hazard.id, { whoMightBeHarmed: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      How Might They Be Harmed *
                    </label>
                    <textarea
                      value={hazard.howMightBeHarmed}
                      onChange={(e) => updateHazard(hazard.id, { howMightBeHarmed: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                      Risk Calculation (Before Control Measures) *
                    </h5>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-full sm:w-auto flex flex-col gap-1">
                        <label className="block text-xs text-gray-500">Likelihood *</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={hazard.beforeLikelihood}
                          onChange={(e) => updateHazard(hazard.id, { beforeLikelihood: parseInt(e.target.value) })}
                          className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div className="w-full sm:w-auto flex flex-col gap-1">
                        <label className="block text-xs text-gray-500">Severity *</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={hazard.beforeSeverity}
                          onChange={(e) => updateHazard(hazard.id, { beforeSeverity: parseInt(e.target.value) })}
                          className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div className="w-full sm:w-auto flex flex-col gap-1">
                        <label className="block text-xs text-gray-500">Total Risk</label>
                        <input
                          type="number"
                          value={hazard.beforeTotal}
                          disabled
                          className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="text-sm font-medium text-gray-700">Control Measures *</h5>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto pr-2">
                      <div className="space-y-2">
                        {hazard.controlMeasures.map((measure) => (
                          <div key={measure.id} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={measure.description}
                              onChange={(e) => updateControlMeasure(hazard.id, measure.id, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Enter control measure *"
                            />
                            <button
                              type="button"
                              onClick={() => removeControlMeasure(hazard.id, measure.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addControlMeasure(hazard.id)}
                      className="mt-2 inline-flex items-center px-2 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Measure
                    </button>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                      Risk Calculation (After Control Measures) *
                    </h5>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-full sm:w-auto flex flex-col gap-1">
                        <label className="block text-xs text-gray-500">Likelihood *</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={hazard.afterLikelihood}
                          onChange={(e) => updateHazard(hazard.id, { afterLikelihood: parseInt(e.target.value) })}
                          className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div className="w-full sm:w-auto flex flex-col gap-1">
                        <label className="block text-xs text-gray-500">Severity *</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={hazard.afterSeverity}
                          disabled
                          className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                        />
                      </div>
                      <div className="w-full sm:w-auto flex flex-col gap-1">
                        <label className="block text-xs text-gray-500">Total Risk</label>
                        <input
                          type="number"
                          value={hazard.afterTotal}
                          disabled
                          className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {data.hazards.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Click "Add Hazard" to start adding hazards</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
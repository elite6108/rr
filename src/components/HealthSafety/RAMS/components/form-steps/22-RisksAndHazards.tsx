import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import type { RAMSFormData } from '../../../../../types/rams';

interface RisksAndHazardsProps {
  data: RAMSFormData;
  onChange: (data: Partial<RAMSFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
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

interface PreviousRAMS {
  id: string;
  rams_number: string;
  reference: string;
  client_name: string;
  created_at: string;
  hazards: HazardItem[];
}

export function RisksAndHazards({ data, onChange, onSubmit }: RisksAndHazardsProps) {
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [previousRAMS, setPreviousRAMS] = useState<PreviousRAMS[]>([]);
  const [loadingRAMS, setLoadingRAMS] = useState(false);
  const [selectedRAMS, setSelectedRAMS] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);

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
      hazards: [...(data.hazards || []), newHazard]
    });
  };

  const updateHazard = (id: string, updates: Partial<HazardItem>) => {
    onChange({
      hazards: (data.hazards || []).map(hazard =>
        hazard.id === id
          ? {
              ...hazard,
              ...updates,
              beforeTotal: updates.beforeLikelihood !== undefined || updates.beforeSeverity !== undefined
                ? (updates.beforeLikelihood || hazard.beforeLikelihood) * (updates.beforeSeverity || hazard.beforeSeverity)
                : hazard.beforeTotal,
              afterTotal: updates.afterLikelihood !== undefined || updates.afterSeverity !== undefined
                ? (updates.afterLikelihood || hazard.afterLikelihood) * (updates.afterSeverity || hazard.afterSeverity)
                : hazard.afterTotal
            }
          : hazard
      )
    });
  };

  const removeHazard = (id: string) => {
    onChange({
      hazards: (data.hazards || []).filter(hazard => hazard.id !== id)
    });
  };

  const addControlMeasure = (hazardId: string) => {
    onChange({
      hazards: (data.hazards || []).map(hazard =>
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
      hazards: (data.hazards || []).map(hazard =>
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
      hazards: (data.hazards || []).map(hazard =>
        hazard.id === hazardId
          ? {
              ...hazard,
              controlMeasures: hazard.controlMeasures.filter(measure => measure.id !== measureId)
            }
          : hazard
      )
    });
  };

  const fetchPreviousRAMS = async () => {
    setLoadingRAMS(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: ramsData, error } = await supabase
        .from('rams')
        .select('id, rams_number, reference, client_name, created_at, hazards')
        .eq('user_id', user.id)
        .not('hazards', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out RAMS that don't have hazards or have empty hazards array
      const validRAMS = (ramsData || []).filter(rams => 
        rams.hazards && 
        Array.isArray(rams.hazards) && 
        rams.hazards.length > 0
      );

      setPreviousRAMS(validRAMS);
    } catch (error) {
      console.error('Error fetching previous RAMS:', error);
      alert('Failed to fetch previous RAMS');
    } finally {
      setLoadingRAMS(false);
    }
  };

  const handleImportClick = async () => {
    if (!showImportDropdown) {
      await fetchPreviousRAMS();
    }
    setShowImportDropdown(!showImportDropdown);
  };

  const importHazards = async () => {
    if (!selectedRAMS) return;

    setImportLoading(true);
    try {
      const selectedRAMSData = previousRAMS.find(rams => rams.id === selectedRAMS);
      if (!selectedRAMSData || !selectedRAMSData.hazards) {
        throw new Error('Selected RAMS not found or has no hazards');
      }

      // Import hazards with new IDs to avoid conflicts
      const importedHazards = selectedRAMSData.hazards.map(hazard => ({
        ...hazard,
        id: crypto.randomUUID(), // Generate new ID
        controlMeasures: hazard.controlMeasures.map(measure => ({
          ...measure,
          id: crypto.randomUUID() // Generate new ID for control measures
        }))
      }));

      // Add imported hazards to current hazards
      onChange({
        hazards: [...(data.hazards || []), ...importedHazards]
      });

      // Reset import state
      setShowImportDropdown(false);
      setSelectedRAMS(null);
      
      alert(`Successfully imported ${importedHazards.length} hazards from ${selectedRAMSData.reference || selectedRAMSData.rams_number}`);
    } catch (error) {
      console.error('Error importing hazards:', error);
      alert('Failed to import hazards');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h3 className="text-lg font-medium text-gray-900">Risks & Hazards *</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={handleImportClick}
              className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Import from Previous RAMS
              <ChevronDown className="h-4 w-4 ml-1" />
            </button>
            
            {showImportDropdown && (
              <div className="absolute z-10 mt-1 w-full sm:w-80 bg-white border border-gray-300 rounded-md shadow-lg">
                <div className="p-4 space-y-4">
                  <div className="text-sm font-medium text-gray-700">Select Previous RAMS</div>
                  
                  {loadingRAMS ? (
                    <div className="text-sm text-gray-500">Loading previous RAMS...</div>
                  ) : previousRAMS.length === 0 ? (
                    <div className="text-sm text-gray-500">No previous RAMS with hazards found</div>
                  ) : (
                    <>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {previousRAMS.map((rams) => (
                          <label key={rams.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="radio"
                              name="selectedRAMS"
                              value={rams.id}
                              checked={selectedRAMS === rams.id}
                              onChange={(e) => setSelectedRAMS(e.target.value)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {rams.reference || rams.rams_number}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {rams.client_name} • {rams.hazards.length} hazards
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(rams.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                      
                      <div className="flex justify-end space-x-2 pt-2 border-t">
                        <button
                          type="button"
                          onClick={() => {
                            setShowImportDropdown(false);
                            setSelectedRAMS(null);
                          }}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={importHazards}
                          disabled={!selectedRAMS || importLoading}
                          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {importLoading ? 'Importing...' : 'Import'}
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

      <div className="space-y-8">
        {(data.hazards || []).map((hazard) => (
          <div key={hazard.id} className="bg-gray-50 p-6 rounded-lg space-y-6">
            <div className="flex justify-between">
              <h4 className="text-lg font-medium text-gray-900">Hazard Details</h4>
              <button
                type="button"
                onClick={() => removeHazard(hazard.id)}
                className="text-red-600 hover:text-red-900"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
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
                  <div className="w-full sm:w-auto">
                    <label className="block text-xs text-gray-500">Likelihood</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={hazard.beforeLikelihood}
                      onChange={(e) => updateHazard(hazard.id, { beforeLikelihood: parseInt(e.target.value) })}
                      className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <label className="block text-xs text-gray-500">Severity</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={hazard.beforeSeverity}
                      onChange={(e) => updateHazard(hazard.id, { beforeSeverity: parseInt(e.target.value) })}
                      className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="w-full sm:w-auto">
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
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
                  <h5 className="text-sm font-medium text-gray-700">Control Measures *</h5>
                  <button
                    type="button"
                    onClick={() => addControlMeasure(hazard.id)}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-2 py-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Measure
                  </button>
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
                          placeholder="Enter control measure"
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
              </div>

              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  Risk Calculation (After Control Measures) *
                </h5>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-full sm:w-auto">
                    <label className="block text-xs text-gray-500">Likelihood</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={hazard.afterLikelihood}
                      onChange={(e) => updateHazard(hazard.id, { afterLikelihood: parseInt(e.target.value) })}
                      className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <label className="block text-xs text-gray-500">Severity</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={hazard.afterSeverity}
                      onChange={(e) => updateHazard(hazard.id, { afterSeverity: parseInt(e.target.value) })}
                      className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="w-full sm:w-auto">
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
          </div>
        ))}

        {(data.hazards || []).length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Click "Add Hazard" to start adding hazards or "Import from Previous RAMS" to import existing hazards</p>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, AlertCircle, Plus, Trash2, Camera, Loader2, Image, ChevronLeft, ChevronRight, Save, Eye } from 'lucide-react';
import type { Equipment, ChecklistItem as DbChecklistItem, EquipmentChecklist } from '../../../types/database';

// Extend the DB type to include a temporary client-side URL
interface ChecklistItem extends DbChecklistItem {
  signed_url?: string;
}

interface EquipmentChecklistFormProps {
  equipment: Equipment;
  checklistToEdit?: EquipmentChecklist | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CHECKLIST_ITEMS = [
  'Visual Inspection',
  'Functionality Test',
  'Safety Features',
  'Calibration Check',
  'Power Supply',
  'Connections/Cables',
  'Display/Controls',
  'Cleanliness',
  'Damage Assessment',
  'Storage Condition'
];

export function EquipmentChecklistForm({ equipment, checklistToEdit, onClose, onSuccess }: EquipmentChecklistFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState('');
  const [createdByName, setCreatedByName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  useEffect(() => {
    if (checklistToEdit) {
      // When editing, we need to generate signed URLs for all images
      const loadChecklistWithSignedUrls = async () => {
        const itemsWithSignedUrls = await Promise.all(
          checklistToEdit.items.map(async (item) => {
            if (item.image_url) {
              try {
                // Generate a signed URL with 1 hour expiry
                const { data } = await supabase.storage
                  .from('equipment-checklist-images')
                  .createSignedUrl(item.image_url, 60 * 60); // 1 hour expiry
                
                if (data?.signedUrl) {
                  return {
                    ...item,
                    signed_url: data.signedUrl // Store signed URL separately
                  };
                }
              } catch (error) {
                console.error('Error generating signed URL:', error);
              }
            }
            return { ...item, signed_url: undefined };
          })
        );
        
        setItems(itemsWithSignedUrls);
        setNotes(checklistToEdit.notes || '');
        setCreatedByName(checklistToEdit.created_by_name);
        setFrequency(checklistToEdit.frequency);
      };
      
      loadChecklistWithSignedUrls();
    }
    fetchUserFullName();
  }, [checklistToEdit]);

  const fetchUserFullName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.display_name) {
        setCreatedByName(user.user_metadata.display_name);
      }
    } catch (err) {
      console.error('Error fetching user display name:', err);
    }
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        status: 'pass',
        notes: '',
        image_url: ''
      }
    ]);
  };

  const handleImageUpload = async (itemId: string, file: File) => {
    try {
      setUploadingImage(itemId);
      setError(null);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('Image size must be less than 5MB');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const fileName = `${itemId}-${Date.now()}.${fileExt}`;
      const filePath = `${equipment.id}/${fileName}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('equipment-checklist-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Generate a signed URL with 1 hour expiry
      const { data } = await supabase.storage
        .from('equipment-checklist-images')
        .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

      if (!data?.signedUrl) throw new Error("Failed to generate signed URL");
      
      // Update the item with both the file path and signed URL
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? { 
              ...item, 
              image_url: filePath,
              signed_url: data.signedUrl
            }
          : item
      ));
    } catch (error) {
      console.error('Error uploading image:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };
  
  const handleRemoveImage = (itemId: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? {
            ...item,
            image_url: '',
            signed_url: undefined,
          }
        : item
    ));
    // Note: This only removes the reference. The image remains in storage
    // until a cleanup process is implemented, perhaps on final submission.
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof ChecklistItem, value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        // For name field, check if already selected
        if (field === 'name' && value) {
          const isItemAlreadySelected = prev.some(otherItem => 
            otherItem.id !== id && otherItem.name === value
          );

          if (isItemAlreadySelected) {
            setError('This item has already been selected');
            return item;
          }
          setError(null);
        }

        return { ...item, [field]: value };
      }
      return item;
    }));
  };
  const validateStep = (step: number): boolean => {
    setError(null);
    switch(step) {
      case 1:
        if (!createdByName.trim()) {
          setError("Your name is required.");
          return false;
        }
        if (!frequency) {
          setError("Frequency is required.");
          return false;
        }
        break;
      case 2:
        if (items.length === 0) {
          setError("At least one checklist item is required.");
          return false;
        }
        if (items.some(item => !item.name.trim())) {
          setError("All checklist items must have a name.");
          return false;
        }
        break;
      // No validation needed for step 3 (Notes) as it's optional
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
     if (!validateStep(1) || !validateStep(2)) {
      // Re-validate all required steps before final submission
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Validate form
      if (!createdByName) throw new Error('Please enter your name');
      if (items.some(item => !item.name)) throw new Error('All items must have a name');

      const status = items.some(item => item.status === 'fail') ? 'fail' : 'pass';

      // Process items to store only file paths, not signed URLs
      const processedItems = items.map(item => {
        // Remove the temporary signed_url before saving to DB
        const { signed_url, ...rest } = item;
        return rest;
      });

      let error;
      if (checklistToEdit) {
        // Update existing checklist
        ({ error } = await supabase
          .from('equipment_checklists')
          .update({
            items: processedItems,
            notes: notes || null,
            created_by_name: createdByName,
            frequency,
            status
          })
          .eq('id', checklistToEdit.id));
      } else {
        // Create new checklist
        ({ error } = await supabase
          .from('equipment_checklists')
          .insert([{
            equipment_id: equipment.id,
            user_id: user.id,
            items: processedItems,
            notes: notes || null,
            created_by_name: createdByName,
            frequency,
            status
          }]));
      }

      if (error) throw error;
      
      onSuccess();
    } catch (err) {
      console.error('Error saving checklist:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get available items (not yet selected)
  const getAvailableItems = () => {
    const selectedItems = new Set(items.map(item => item.name).filter(Boolean));
    return CHECKLIST_ITEMS.filter(item => !selectedItems.has(item));
  };

  const getStepLabel = () => {
    switch(currentStep) {
      case 1: return 'Details';
      case 2: return 'Checklist Items';
      case 3: return 'Notes & Summary';
      default: return 'Details';
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: // Details Step
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="createdByName" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name*
              </label>
              <input
                id="createdByName"
                type="text"
                value={createdByName}
                onChange={e => setCreatedByName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
                Frequency*
              </label>
              <select
                id="frequency"
                value={frequency}
                onChange={e => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        );

      case 2: // Checklist Items Step
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Checklist Items*</h3>
            {items.map((item, index) => (
              <div key={item.id} className="p-4 border rounded-md bg-gray-50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name*</label>
                    <select
                      value={item.name}
                      onChange={e => handleItemChange(item.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    >
                      <option value="">Select an item</option>
                      {item.name && <option value={item.name}>{item.name}</option>}
                      {getAvailableItems().map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status*</label>
                    <select
                      value={item.status}
                      onChange={e => handleItemChange(item.id, 'status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    >
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                      <option value="n/a">N/A</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Notes*</label>
                  <textarea
                    value={item.notes}
                    onChange={e => handleItemChange(item.id, 'notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    rows={2}
                    placeholder="Add notes for this item"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {!item.image_url && (
                      <label htmlFor={`image-upload-${item.id}`} className="cursor-pointer text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-2">
                        {uploadingImage === item.id ? <Loader2 className="animate-spin" /> : <Camera />}
                        <span>Upload Image</span>
                      </label>
                    )}
                    <input
                      id={`image-upload-${item.id}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => e.target.files && handleImageUpload(item.id, e.target.files[0])}
                      disabled={!!uploadingImage}
                    />
                  </div>
                  {item.signed_url && (
                    <div className="relative group w-24 h-24 border rounded-md overflow-hidden">
                      <img
                        src={item.signed_url}
                        alt="Checklist item thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
                        <a href={item.signed_url} target="_blank" rel="noopener noreferrer" className="text-white p-1 rounded-full bg-gray-700 bg-opacity-50 hover:bg-opacity-75">
                          <Eye size={16} />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(item.id)}
                          className="text-white p-1 rounded-full bg-gray-700 bg-opacity-50 hover:bg-opacity-75"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                  <button onClick={() => handleRemoveItem(item.id)} className="text-red-600 hover:text-red-800 self-end">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-dashed rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>
        );

      case 3: // Notes Step
        return (
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Overall Notes <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              rows={5}
              placeholder="Add any overall notes for this checklist"
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center p-4 z-50">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-auto my-8 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{checklistToEdit ? 'Edit Checklist' : 'New Equipment Checklist'}</h2>
            <p className="text-sm text-gray-500">for {equipment.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="p-6">
          <div className="mb-8 w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="text-base font-medium text-indigo-600">
                {getStepLabel()}
              </div>
              <div className="text-sm text-gray-500">
                Step {currentStep} of 3
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {renderStep()}
          </form>
        </div>

        {error && (
          <div className="px-6 py-4 border-t bg-red-50">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center p-6 border-t bg-gray-50">
           <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </button>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700"
            >
              Cancel
            </button>
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span className="ml-2">{checklistToEdit ? 'Save Changes' : 'Submit Checklist'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
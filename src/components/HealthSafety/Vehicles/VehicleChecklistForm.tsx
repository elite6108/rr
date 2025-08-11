import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, AlertCircle, Plus, Trash2, Camera, Loader2, Image, ChevronLeft, ChevronRight, Save, Eye } from 'lucide-react';
import type {
  Vehicle,
  ChecklistItem as DbChecklistItem,
  VehicleChecklist,
} from '../../../types/database';

// Extend the DB type to include a temporary client-side URL
interface ChecklistItem extends DbChecklistItem {
  signed_url?: string;
  temp_category?: 'inside' | 'outside';
}

interface DriverWithStaff {
  id: string;
  staff_id: number;
  licence_number: string;
  licence_expiry: string;
  user_id: string;
  staff: {
    name: string;
  };
}

interface VehicleChecklistFormProps {
  vehicle: Vehicle;
  checklistToEdit?: VehicleChecklist | null;
  onClose: () => void;
  onSuccess: () => void;
}

const OUTSIDE_CHECKLIST_ITEMS = [
  'Engine Oil',
  'Coolant Level',
  'Washer Fluid Level',
  'Washer & Wipers',
  'Lights (Front, Side, Rear)',
  'Horn',
  'Tyre Tread & Sidewalls',
  'Type Pressure',
  'Bodywork',
  'Glass (Windows)',
  'Mirrors',
];

const INSIDE_CHECKLIST_ITEMS = [
  'Seatbelt',
  'First Aid & Eye Wash',
  'Brakes',
  'Indicator',
  'Clean & Tidy',
];

const ALL_CHECKLIST_ITEMS = [...OUTSIDE_CHECKLIST_ITEMS, ...INSIDE_CHECKLIST_ITEMS];

export default function VehicleChecklistForm({
  vehicle,
  checklistToEdit,
  onClose,
  onSuccess,
}: VehicleChecklistFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [notes, setNotes] = useState('');
  const [createdByName, setCreatedByName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [drivers, setDrivers] = useState<DriverWithStaff[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [mileage, setMileage] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>(
    'daily'
  );
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
                  .from('vehicle-checklist-images')
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
        setDriverName(checklistToEdit.driver_name);
        setMileage(checklistToEdit.mileage);
        setFrequency(checklistToEdit.frequency);
      };
      
      loadChecklistWithSignedUrls();
    }
    fetchUserFullName();
    fetchDrivers();
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

  const fetchDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          staff (
            name
          )
        `)
        .order('staff(name)', { ascending: true });

      if (error) throw error;
      setDrivers(data || []);
    } catch (err) {
      console.error('Error fetching drivers:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching drivers');
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleAddItem = (category: 'inside' | 'outside') => {
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      name: '',
      status: 'pass',
      notes: '',
      image_url: '',
      temp_category: category,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (
    id: string,
    field: keyof ChecklistItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // For name field, check if already selected
          if (field === 'name' && value) {
            const isItemAlreadySelected = prev.some(
              (otherItem) => otherItem.id !== id && otherItem.name === value
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
      })
    );
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
      const filePath = `${vehicle.id}/${fileName}`;

      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('vehicle-checklist-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Generate a signed URL with 1 hour expiry
      const { data } = await supabase.storage
        .from('vehicle-checklist-images')
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
  };
  
  const validateStep = (step: number): boolean => {
    setError(null);
    switch(step) {
      case 1:
        if (!createdByName.trim() || !driverName.trim() || !mileage.trim()) {
          setError("Please fill out all required fields for this step.");
          return false;
        }
        break;
      case 2:
        if (items.length === 0 || items.some(item => !item.name.trim())) {
          setError("Please add and name at least one checklist item.");
          return false;
        }
        break;
      // Step 3 is optional
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleSubmit(new Event('submit') as any);
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) {
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const status = items.some((item) => item.status === 'fail') ? 'fail' : 'pass';
      
      const processedItems = items.map(item => {
        const { signed_url, temp_category, ...rest } = item;
        return rest;
      });

      let error;
      if (checklistToEdit) {
        ({ error } = await supabase
          .from('vehicle_checklists')
          .update({
            items: processedItems,
            notes: notes || null,
            created_by_name: createdByName,
            driver_name: driverName,
            mileage: mileage,
            frequency: frequency,
            status,
          })
          .eq('id', checklistToEdit.id));
      } else {
        ({ error } = await supabase.from('vehicle_checklists').insert([
          {
            vehicle_id: vehicle.id,
            user_id: user.id,
            items: processedItems,
            notes: notes || null,
            created_by_name: createdByName,
            driver_name: driverName,
            mileage: mileage,
            frequency: frequency,
            status,
          },
        ]));
      }

      if (error) throw error;
      onSuccess();
    } catch (err) {
      console.error('Error saving vehicle checklist:', err);
      setError(
        err instanceof Error ? err.message : 'An error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const getAvailableItems = () => {
    const selectedItems = new Set(items.map(item => item.name).filter(Boolean));
    const outsideItems = OUTSIDE_CHECKLIST_ITEMS.filter(item => !selectedItems.has(item));
    const insideItems = INSIDE_CHECKLIST_ITEMS.filter(item => !selectedItems.has(item));
    return { outsideItems, insideItems };
  };

  const getStepLabel = () => {
    switch (currentStep) {
      case 1: return 'Details';
      case 2: return 'Outside Checklist';
      case 3: return 'Inside Checklist';
      case 4: return 'Notes & Summary';
      default: return 'Details';
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="createdByName" className="block text-sm font-medium text-gray-700 mb-2">Your Name*</label>
                <input
                  id="createdByName"
                  type="text"
                  value={createdByName}
                  onChange={(e) => setCreatedByName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label htmlFor="driverName" className="block text-sm font-medium text-gray-700 mb-2">Driver's Name*</label>
                <select
                  id="driverName"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  disabled={loadingDrivers}
                >
                  <option value="">{loadingDrivers ? 'Loading...' : 'Select a driver'}</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.staff.name}>{driver.staff.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="mileage" className="block text-sm font-medium text-gray-700 mb-2">Mileage*</label>
                <input
                  id="mileage"
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  placeholder="Enter current mileage"
                />
              </div>
              <div>
                <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">Frequency*</label>
                <select
                  id="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Outside Checklist Items*</h3>
            {items.filter(item => OUTSIDE_CHECKLIST_ITEMS.includes(item.name) || item.temp_category === 'outside').map((item, index) => (
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
                      {getAvailableItems().outsideItems.map(name => (
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Notes <span className="text-gray-400 text-xs">(optional)</span></label>
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
              onClick={() => handleAddItem('outside')}
              className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-dashed rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Inside Checklist Items*</h3>
            {items.filter(item => INSIDE_CHECKLIST_ITEMS.includes(item.name) || item.temp_category === 'inside').map((item, index) => (
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
                      {getAvailableItems().insideItems.map(name => (
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Notes <span className="text-gray-400 text-xs">(optional)</span></label>
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
              onClick={() => handleAddItem('inside')}
              className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-dashed rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>
        );
      case 4:
        return (
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">Overall Notes <span className="text-gray-400 text-xs">(optional)</span></label>
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
            <h2 className="text-2xl font-bold text-gray-900">{checklistToEdit ? 'Edit Checklist' : 'New Vehicle Checklist'}</h2>
            <p className="text-sm text-gray-500">for {vehicle.make} {vehicle.model} ({vehicle.registration})</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-8 w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="text-base font-medium text-indigo-600">{getStepLabel()}</div>
              <div className="text-sm text-gray-500">Step {currentStep} of 4</div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${(currentStep / 4) * 100}%` }}
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
            {currentStep < 4 ? (
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
                type="submit"
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

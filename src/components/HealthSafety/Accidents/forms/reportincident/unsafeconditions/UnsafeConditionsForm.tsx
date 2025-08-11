'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../../../lib/supabase';
import BaseForm, { Step } from '../../BaseForm';
import { Upload } from 'lucide-react';

// Define the form data structure
interface FormData {
  // Form specific fields
  autoId: string;
  reportType: string;
  category: string;

  // Step 1 - Details
  incidentLocation: string;
  incidentDate: string;

  // Step 2 - Description
  incidentDescription: string;

  // Step 3 - Health & Safety
  hazardSource: string;

  // Step 4 - Root Causes
  rootCauseWorkEnvironment: string[];
  rootCauseHumanFactors: string[];
  rootCausePpe: string[];
  rootCauseManagement: string[];
  rootCausePlantEquipment: string[];

  // Step 5 - Actions
  actionsTaken: string;
  actions: { title: string; dueDate: string; description: string }[];
  file_urls: string[];
}

interface UnsafeConditionsFormProps {
  onClose?: () => void;
  initialData?: any;
  isEditing?: boolean;
}

export default function UnsafeConditionsForm({ onClose, initialData, isEditing = false }: UnsafeConditionsFormProps) {
  // Generate autoId on load with format UC-XXXXX (where X is a number) or use existing one
  const [autoId, setAutoId] = useState(() => {
    if (isEditing && initialData?.autoId) {
      return initialData.autoId;
    }
    return ''; // Start empty instead of default value
  });
  const [isLoadingId, setIsLoadingId] = useState(!isEditing);

  useEffect(() => {
    if (!isEditing) {
      const getNextId = async () => {
        setIsLoadingId(true);
        try {
        // Get the next sequential number from Supabase
        const { data, error } = await supabase
            .from('accidents_unsafeconditions')
            .select('auto_id')
            .order('auto_id', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error getting last report number:', error);
            const defaultId = 'UC-00001';
            setAutoId(defaultId);
            setFormData(prev => ({ ...prev, autoId: defaultId }));
          return;
        }

        if (data && data.length > 0) {
            const lastNumber = parseInt(data[0].auto_id.split('-')[1]);
          const nextNumber = (lastNumber + 1).toString().padStart(5, '0');
            const newId = `UC-${nextNumber}`;
            setAutoId(newId);
            setFormData(prev => ({ ...prev, autoId: newId }));
        } else {
            const defaultId = 'UC-00001';
            setAutoId(defaultId);
            setFormData(prev => ({ ...prev, autoId: defaultId }));
          }
        } catch (err) {
          console.error('Error in getNextId:', err);
          const defaultId = 'UC-00001';
          setAutoId(defaultId);
          setFormData(prev => ({ ...prev, autoId: defaultId }));
        } finally {
          setIsLoadingId(false);
        }
      };

      getNextId();
    }
  }, [isEditing]);

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // For actions modal
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionDraft, setActionDraft] = useState({ title: '', dueDate: '', description: '' });

  // Initialize form state with default values or existing data
  const [formData, setFormData] = useState<FormData>(() => {
    if (isEditing && initialData) {
      console.log('Editing form with initial data:', initialData); // Debug log
      
      const formDataObject = {
        autoId: initialData.autoId || initialData.auto_id || autoId,
        reportType: initialData.reportType || initialData.report_type || 'Unsafe Conditions',
        category: initialData.category || 'Report An Incident',
        incidentLocation: initialData.incidentLocation || initialData.incident_location || '',
        incidentDate: initialData.incidentDate || initialData.incident_date || '',
        incidentDescription: initialData.incidentDescription || initialData.incident_description || '',
        hazardSource: initialData.hazardSource || initialData.hazard_source || '',
        rootCauseWorkEnvironment: initialData.rootCauseWorkEnvironment || initialData.root_cause_work_environment || [],
        rootCauseHumanFactors: initialData.rootCauseHumanFactors || initialData.root_cause_human_factors || [],
        rootCausePpe: initialData.rootCausePpe || initialData.root_cause_ppe || [],
        rootCauseManagement: initialData.rootCauseManagement || initialData.root_cause_management || [],
        rootCausePlantEquipment: initialData.rootCausePlantEquipment || initialData.root_cause_plant_equipment || [],
        actionsTaken: initialData.actionsTaken || initialData.actions_taken || '',
        actions: initialData.actions || [],
        file_urls: [], // Initialize empty, will be handled by useEffect
      };

      return formDataObject;
    }
    
    return {
      autoId,
      reportType: 'Unsafe Conditions',
      category: 'Report An Incident',
      incidentLocation: '',
      incidentDate: '',
      incidentDescription: '',
      hazardSource: '',
      rootCauseWorkEnvironment: [],
      rootCauseHumanFactors: [],
      rootCausePpe: [],
      rootCauseManagement: [],
      rootCausePlantEquipment: [],
      actionsTaken: '',
      actions: [],
      file_urls: [],
    };
  });

  // Add debug logging for file URLs
  useEffect(() => {
    if (isEditing && initialData) {
      console.log('Current form data:', formData);
      console.log('File URLs in form:', formData.file_urls);
      console.log('File URLs length:', formData.file_urls.length);
    }
  }, [isEditing, initialData, formData.file_urls]);

  // Also add a useEffect to handle file URL refreshing properly
  useEffect(() => {
    if (isEditing && initialData) {
      console.log('UseEffect: Processing file URLs for editing form');
      console.log('UseEffect: Full initialData object:', JSON.stringify(initialData, null, 2));
      console.log('UseEffect: initialData.file_urls specifically:', initialData.file_urls);
      console.log('UseEffect: typeof initialData.file_urls:', typeof initialData.file_urls);
      
      // Check all possible field names for file URLs
      console.log('UseEffect: Checking all possible file URL fields:');
      console.log('- initialData.file_urls:', initialData.file_urls);
      console.log('- initialData.fileUrls:', initialData.fileUrls);
      console.log('- initialData.files:', initialData.files);
      console.log('- initialData.file_url:', initialData.file_url);
      
      // Check for both snake_case and camelCase versions
      const fileUrlsFromDb = initialData.file_urls || initialData.fileUrls;
      
      if (fileUrlsFromDb) {
        console.log('UseEffect: Found file URLs in database:', fileUrlsFromDb);
        let fileUrls: string[] = [];
        
        if (typeof fileUrlsFromDb === 'string') {
          try {
            fileUrls = JSON.parse(fileUrlsFromDb);
            console.log('UseEffect: Parsed file URLs from string:', fileUrls);
          } catch (e) {
            console.error('UseEffect: Error parsing file_urls:', e);
            fileUrls = [];
          }
        } else if (Array.isArray(fileUrlsFromDb)) {
          fileUrls = fileUrlsFromDb;
          console.log('UseEffect: Using file URLs as array:', fileUrls);
        }
        
        // Filter valid URLs
        fileUrls = fileUrls.filter((url: any) => url && typeof url === 'string');
        console.log('UseEffect: Filtered file URLs:', fileUrls);
        
        if (fileUrls.length > 0) {
          console.log('UseEffect: Setting file URLs in form data');
          // Set the URLs immediately first
          setFormData(prev => {
            console.log('UseEffect: Updating form data with file URLs:', fileUrls);
            return { ...prev, file_urls: fileUrls };
          });
          
          // Then refresh the signed URLs
          const refreshUrls = async () => {
            console.log('UseEffect: Starting to refresh signed URLs...');
            try {
              const newUrls = await Promise.all(
                fileUrls.map(async (url: any) => {
                  const pathMatch = url.match(/\/object\/sign\/([^?]+)/);
                  if (pathMatch) {
                    let path = pathMatch[1];
                    console.log('UseEffect: Extracted path from URL:', path);
                    
                    // Remove the bucket name if it's at the beginning of the path
                    if (path.startsWith('accidents-unsafeconditions/')) {
                      path = path.replace('accidents-unsafeconditions/', '');
                      console.log('UseEffect: Cleaned path (removed bucket name):', path);
                    }
                    
                    console.log('UseEffect: Refreshing URL for path:', path);
                    const { data, error } = await supabase.storage
                      .from('accidents-unsafeconditions')
                      .createSignedUrl(path, 60 * 60 * 24 * 7);
                    
                    if (data?.signedUrl) {
                      console.log('UseEffect: Successfully refreshed URL');
                      return data.signedUrl;
                    } else {
                      console.error('UseEffect: Error refreshing URL:', error);
                    }
                  }
                  return url;
                })
              );
              
              console.log('UseEffect: All refreshed URLs:', newUrls);
              setFormData(prev => ({ ...prev, file_urls: newUrls }));
            } catch (error) {
              console.error('UseEffect: Error refreshing signed URLs:', error);
            }
          };
          
          // Small delay to ensure component is mounted
          setTimeout(refreshUrls, 100);
        } else {
          console.log('UseEffect: No valid file URLs found after filtering');
        }
      } else {
        console.log('UseEffect: No file URLs field found in initialData');
      }
    }
  }, [isEditing, initialData]);

  const handleFileUpload = async (files: FileList, fieldName: 'file_urls') => {
    if (!files || files.length === 0) return;
    
    try {
      setUploadingFiles(true);
      setError(null);
      
      const uploadedUrls: string[] = [];
      
      // Create an array from FileList for easier handling
      const fileArray = Array.from(files);
      
      for (const file of fileArray) {
        // Create a unique file name to avoid collisions
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const filePath = `${formData.autoId}/${fileName}`;
        
        // Upload the file to Supabase Storage
        const { data, error } = await supabase.storage
          .from('accidents-unsafeconditions')
          .upload(filePath, file);
            
        if (error) throw error;
        
        // For private buckets, we need to use createSignedUrl instead of getPublicUrl
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('accidents-unsafeconditions')
          .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days expiry
        
        if (signedUrlError) {
          console.error('Error creating signed URL:', signedUrlError);
          throw signedUrlError;
        }
        
        // Add the signed URL to our array if it exists
        if (signedUrlData?.signedUrl) {
          console.log('Successfully uploaded file with signed URL:', signedUrlData.signedUrl);
          uploadedUrls.push(signedUrlData.signedUrl);
        }
      }
      
      // Update the form data with the new URLs
      setFormData(prev => {
        const newData = {
          ...prev,
          [fieldName]: [...prev[fieldName] as string[], ...uploadedUrls]
        };
        console.log('Updated formData.file_urls:', newData.file_urls); // Debug log
        console.log('Number of files now:', newData.file_urls.length); // Debug log
        return newData;
      });
      
    } catch (err) {
      console.error(`Error uploading ${fieldName}:`, err);
      setError(`Failed to upload files. Please try again.`);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const uploadFiles = async () => {
    const uploadedUrls: string[] = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${formData.autoId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('accidents-unsafeconditions')
        .upload(filePath, file);
        
      if (uploadError) {
        throw new Error(`Error uploading file: ${uploadError.message}`);
      }
      
      uploadedUrls.push(filePath);
    }
    
    return uploadedUrls;
  };

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, formSteps.length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Ensure file_urls is a proper array
      const fileUrlsToSubmit = formData.file_urls;
      console.log('Submitting file URLs:', fileUrlsToSubmit); // Debug log
      
      const dataToSubmit = {
        auto_id: formData.autoId,
        report_type: formData.reportType,
        category: formData.category,
        incident_location: formData.incidentLocation,
        incident_date: formData.incidentDate || null,
        incident_description: formData.incidentDescription,
        hazard_source: formData.hazardSource,
        root_cause_work_environment: formData.rootCauseWorkEnvironment,
        root_cause_human_factors: formData.rootCauseHumanFactors,
        root_cause_ppe: formData.rootCausePpe,
        root_cause_management: formData.rootCauseManagement,
        root_cause_plant_equipment: formData.rootCausePlantEquipment,
        actions_taken: formData.actionsTaken,
        actions: formData.actions,
        file_urls: fileUrlsToSubmit
      };

      console.log('Submitting data:', dataToSubmit); // Debug log

      if (isEditing && initialData?.id) {
        const { error: submitError } = await supabase
          .from('accidents_unsafeconditions')
          .update(dataToSubmit)
          .eq('id', initialData.id);

        if (submitError) throw submitError;
      } else {
        const { error: submitError } = await supabase
          .from('accidents_unsafeconditions')
          .insert([dataToSubmit]);

        if (submitError) throw submitError;
      }
      
      setIsSubmitting(false);
      setSubmitted(true);
      
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      console.error('Submission error:', err); // Debug log
      setIsSubmitting(false);
      setError(err?.message || 'An unknown error occurred.');
      setSubmitted(false);
    }
  };

  // Define the form steps with IDs
  const formSteps: Step[] = [
    { id: 'id-and-type', title: 'Report Details' },
    { id: 'incident-description', title: 'Description of Incident' },
    { id: 'health-safety', title: 'Health & Safety' },
    { id: 'root-causes', title: 'Root Causes' },
    { id: 'actions', title: 'Actions' },
    { id: 'documentation', title: 'Documentation' },
  ];

  // Content for each step
  const stepContent = [
    // Step 1: Details
    <div key="id-and-type" className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID</label>
        <input type="text" value={formData.autoId} readOnly disabled className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Report Type</label>
        <input type="text" value={formData.reportType} readOnly disabled className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
        <input type="text" value={formData.category} readOnly disabled className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" />
      </div>
    </div>,

    // Step 2: Description of Incident
    <div key="incident-description" className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Where did the incident occur? *</label>
        <input 
          type="text" 
          value={formData.incidentLocation} 
          onChange={e => setFormData({ ...formData, incidentLocation: e.target.value })} 
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" 
          required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Incident Date *</label>
        <input 
          type="date" 
          value={formData.incidentDate} 
          onChange={e => setFormData({ ...formData, incidentDate: e.target.value })} 
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" 
          required 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Describe what happened and how *</label>
        <textarea 
          value={formData.incidentDescription} 
          onChange={e => setFormData({ ...formData, incidentDescription: e.target.value })} 
          rows={4} 
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" 
          required 
        />
      </div>
    </div>,

    // Step 3: Health & Safety
    <div key="health-safety" className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select source of hazard *</label>
        <select 
          value={formData.hazardSource} 
          onChange={e => setFormData({ ...formData, hazardSource: e.target.value })} 
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          required
        >
          <option value="">Select source of hazard</option>
          <option value="Cold">Cold</option>
          <option value="Dust">Dust</option>
          <option value="Excavation">Excavation</option>
          <option value="Floor/ground condition">Floor/ground condition</option>
          <option value="Flying particle">Flying particle</option>
          <option value="Hand tool">Hand tool</option>
          <option value="Hazardous substance">Hazardous substance</option>
          <option value="Heat/hot work">Heat/hot work</option>
          <option value="Lack of oxygen">Lack of oxygen</option>
          <option value="Ladder">Ladder</option>
          <option value="Lifting equipment">Lifting equipment</option>
          <option value="Materials">Materials</option>
          <option value="Moving parts of machinery">Moving parts of machinery</option>
          <option value="Power tool">Power tool</option>
          <option value="Proximity to water">Proximity to water</option>
          <option value="Scaffold">Scaffold</option>
          <option value="Stairs/steps">Stairs/steps</option>
          <option value="Static equipment/machinery">Static equipment/machinery</option>
          <option value="Structure">Structure</option>
          <option value="Temporary works">Temporary works</option>
          <option value="Vehicle/mobile equipment">Vehicle/mobile equipment</option>
          <option value="Working surface">Working surface</option>
          <option value="Workstation layout">Workstation layout</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>,

    // Step 4: Root Causes
    <div key="root-causes" className="space-y-6">
      {/* Work Environment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Work Environment *</label>
        <div className="flex flex-wrap gap-2">
          {['Access/Egress','Defective workplace','Design/Layout','Housekeeping','Lack of room','Lighting','Noise/distraction','Weather','Other'].map(option => (
            <button type="button" key={option} onClick={() => setFormData(fd => ({ ...fd, rootCauseWorkEnvironment: fd.rootCauseWorkEnvironment.includes(option) ? fd.rootCauseWorkEnvironment.filter(o => o !== option) : [...fd.rootCauseWorkEnvironment, option] }))} className={`px-3 py-1 rounded-full border ${formData.rootCauseWorkEnvironment.includes(option) ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{option}</button>
          ))}
        </div>
      </div>
      {/* Human Factors */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Human Factors *</label>
        <div className="flex flex-wrap gap-2">
          {['Error of judgement','Failure to adhere to the RAs','Failure to follow rules','Fatigue','Horseplay','Instructions misunderstood','Lack of experience','Lapse in concentration','Undue haste','Unsafe attitude','Working without authorisation','Other'].map(option => (
            <button type="button" key={option} onClick={() => setFormData(fd => ({ ...fd, rootCauseHumanFactors: fd.rootCauseHumanFactors.includes(option) ? fd.rootCauseHumanFactors.filter(o => o !== option) : [...fd.rootCauseHumanFactors, option] }))} className={`px-3 py-1 rounded-full border ${formData.rootCauseHumanFactors.includes(option) ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{option}</button>
          ))}
        </div>
      </div>
      {/* PPE */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PPE *</label>
        <div className="flex flex-wrap gap-2">
          {['Design','Maintenance/defective','Not provided/unavailable','Not used','Work type','Other'].map(option => (
            <button type="button" key={option} onClick={() => setFormData(fd => ({ ...fd, rootCausePpe: fd.rootCausePpe.includes(option) ? fd.rootCausePpe.filter(o => o !== option) : [...fd.rootCausePpe, option] }))} className={`px-3 py-1 rounded-full border ${formData.rootCausePpe.includes(option) ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{option}</button>
          ))}
        </div>
      </div>
      {/* Management */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Management *</label>
        <div className="flex flex-wrap gap-2">
          {['RAMS not communicated','Supervision','System Failure','Training','Other'].map(option => (
            <button type="button" key={option} onClick={() => setFormData(fd => ({ ...fd, rootCauseManagement: fd.rootCauseManagement.includes(option) ? fd.rootCauseManagement.filter(o => o !== option) : [...fd.rootCauseManagement, option] }))} className={`px-3 py-1 rounded-full border ${formData.rootCauseManagement.includes(option) ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{option}</button>
          ))}
        </div>
      </div>
      {/* Plant / Equipment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plant / Equipment *</label>
        <div className="flex flex-wrap gap-2">
          {['Construction/design','Installation','Maintenance','Mechanical failure','Operation/use','Safety device','Other'].map(option => (
            <button type="button" key={option} onClick={() => setFormData(fd => ({ ...fd, rootCausePlantEquipment: fd.rootCausePlantEquipment.includes(option) ? fd.rootCausePlantEquipment.filter(o => o !== option) : [...fd.rootCausePlantEquipment, option] }))} className={`px-3 py-1 rounded-full border ${formData.rootCausePlantEquipment.includes(option) ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>{option}</button>
          ))}
        </div>
      </div>
    </div>,

    // Step 5: Actions
    <div key="actions" className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">What actions have been taken to prevent a similar incident? *</label>
        <textarea 
          value={formData.actionsTaken} 
          onChange={e => setFormData({ ...formData, actionsTaken: e.target.value })} 
          rows={4} 
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" 
          required 
        />
      </div>
      <div>
        <button type="button" onClick={() => setShowActionModal(true)} className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">Add Action</button>
      </div>
      <div className="space-y-2">
        {formData.actions.map((action, idx) => (
          <div key={idx} className="flex items-center gap-2 border p-2 rounded">
            <div className="flex-1">
              <div className="font-semibold">{action.title}</div>
              <div className="text-xs text-gray-500">Due: {action.dueDate}</div>
              <div className="text-sm">{action.description}</div>
            </div>
            <button type="button" onClick={() => setFormData(fd => ({ ...fd, actions: fd.actions.filter((_, i) => i !== idx) }))} className="text-red-600 hover:underline">Remove</button>
          </div>
        ))}
      </div>
      {/* Modal for adding action */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-md relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-100 focus:outline-none" onClick={() => setShowActionModal(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x h-6 w-6"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
            <h2 className="text-lg font-bold mb-4">Add Action</h2>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Action Title *</label>
              <input 
                type="text" 
                value={actionDraft.title} 
                onChange={e => setActionDraft({ ...actionDraft, title: e.target.value })} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" 
                required 
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Action Due Date *</label>
              <input 
                type="date" 
                value={actionDraft.dueDate} 
                onChange={e => setActionDraft({ ...actionDraft, dueDate: e.target.value })} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" 
                required 
              />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Action Description *</label>
              <textarea 
                value={actionDraft.description} 
                onChange={e => setActionDraft({ ...actionDraft, description: e.target.value })} 
                rows={3} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white" 
                required 
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setShowActionModal(false)} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded">Cancel</button>
              <button type="button" onClick={() => {
                setFormData(fd => ({ ...fd, actions: [...fd.actions, actionDraft] }));
                setActionDraft({ title: '', dueDate: '', description: '' });
                setShowActionModal(false);
              }} className="px-4 py-2 bg-indigo-600 text-white rounded">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>,

    // Step 6: Documentation
    <div key="documentation" className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Documentation</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Supporting Documents/Images <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <div className="flex flex-col gap-2">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 text-center">
                <input
                  type="file"
                  multiple
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              id="documentation-files"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileUpload(e.target.files, 'file_urls');
                }
              }}
            />
            <label
              htmlFor="documentation-files"
              className="cursor-pointer flex flex-col items-center justify-center"
            >
              {uploadingFiles ? (
                <div className="flex flex-col items-center">
                  <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="mt-2 text-sm text-gray-500">Uploading...</span>
                </div>
              ) : (
                <>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-gray-300">
                    Click to upload files
                  </span>
                  <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
                    PNG, JPG, PDF, DOC up to 10MB
                  </span>
                </>
              )}
              </label>
          </div>

          {/* Add debug info */}
          <div className="text-xs text-gray-500 mb-2">
            Debug: {formData.file_urls.length} files uploaded
          </div>

          {formData.file_urls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              {formData.file_urls.map((fileUrl, index) => {
                const fileName = fileUrl.split('/').pop()?.split('?')[0] || `File ${index + 1}`;
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName.toLowerCase());
                
                return (
                  <div key={index} className="relative group">
                    <div className="w-full h-32 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 border">
                      {isImage ? (
                        <div className="relative w-full h-full">
                          <img
                            src={fileUrl}
                            alt={`Document ${index + 1}`}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => window.open(fileUrl, '_blank')}
                            onError={() => {
                              const imgElement = document.getElementById(`file-preview-${index}`);
                              if (imgElement) {
                                imgElement.style.display = 'none';
                                const fallbackElement = document.getElementById(`file-preview-fallback-${index}`);
                                if (fallbackElement) {
                                  fallbackElement.style.display = 'flex';
                                }
                              }
                            }}
                            id={`file-preview-${index}`}
                          />
                          <div 
                            id={`file-preview-fallback-${index}`}
                            className="hidden absolute inset-0 w-full h-full items-center justify-center bg-gray-200 dark:bg-gray-600 cursor-pointer"
                            onClick={() => window.open(fileUrl, '_blank')}
                          >
                            <div className="text-center p-2">
                              <div className="text-gray-500 text-xs font-medium">
                                {fileName.split('.').pop()?.toUpperCase() || 'IMAGE'}
                              </div>
                              <div className="text-gray-400 text-xs mt-1 truncate max-w-[120px]">
                                {fileName}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-600 cursor-pointer"
                          onClick={() => window.open(fileUrl, '_blank')}
                        >
                          <div className="text-center p-2">
                            <div className="text-gray-500 text-xs font-medium">
                              {fileName.split('.').pop()?.toUpperCase() || 'FILE'}
                            </div>
                            <div className="text-gray-400 text-xs mt-1 truncate max-w-[120px]">
                              {fileName}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            file_urls: prev.file_urls.filter((_, i) => i !== index)
                          }));
                        }}
                        className="p-1 bg-red-500 rounded-full text-white hover:bg-red-600 shadow-lg"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
  ];

  return (
    <div className="unsafe-conditions-form">
      <h1 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Unsafe Conditions Report</h1>
      {submitted ? (
        <div className="bg-green-50 dark:bg-green-900 p-4 rounded-md mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">Success!</h3>
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                <p>Your unsafe conditions report has been successfully submitted and saved.</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <BaseForm
        steps={formSteps}
        currentStep={currentStep}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSubmit={handleSubmit}
        onCancel={onClose}
        submitButtonProps={{
          className: submitted ? 'bg-green-600 hover:bg-green-700 text-white' : undefined,
          disabled: submitted,
          children: submitted ? 'Submitted' : undefined,
        }}
      >
        {stepContent[currentStep]}
        {error && (
          <div className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">{error}</div>
        )}
      </BaseForm>
    </div>
  );
}
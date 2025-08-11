import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';
import { ArrowRight, ChevronDown, ChevronRight, ChevronLeft, Pencil, Plus, Trash2, Edit, Save, X, AlertTriangle, FileText, Calendar, Check, Eye, File, Bell } from 'lucide-react';
import SpotlightCard from '../../../styles/spotlight/SpotlightCard';

interface ActionPlanProps {
  setShowActionPlan: (show: boolean) => void;
  setActiveSection: (section: string) => void;
  onShowReportingDashboard?: () => void;
}

interface ActionPlanItem {
  id: string;
  section: string;
  item: string;
  description: string;
  type: string;
  serials: string;
  notes: string;
  last_done: string | null;
  interval_months: string;
  next_due: string | null;
  created_at: string;
  issue: boolean;
  files?: string[];
}

interface FilePreview {
  id: string;
  name: string;
  url: string;
  file?: File;
  isExisting: boolean;
}

const sections = [
  'Health Policy Signature',
  'Health',
  'Forklift Trucks',
  'Cranes',
  'Compressor',
  'Extraction',
  'Electrical',
  'Heating',
  'Fire',
  'Training',
  'Noise',
  'Air'
];

const sectionTypes: Record<string, string[]> = {
  'Health Policy Signature': ['SIGNATURES'],
  'Health': ['SURVEILLANCE'],
  'Forklift Trucks': ['LOLER', 'THOROUGH EXAM'],
  'Cranes': ['LOLER', 'SERVICE'],
  'Compressor': ['SERVICE', 'WSE'],
  'Extraction': ['TESTING', 'SERVICE'],
  'Electrical': ['PAT', 'LANDLORD', 'EICR', 'EMERGENCY LIGHTING'],
  'Heating': ['SERVICE'],
  'Fire': ['INSPECTION', 'SERVICE'],
  'Training': ['TRAINING'],
  'Noise': ['NOISE REPORT', 'NOISE SURVEY', 'INTERNAL NOISE READING'],
  'Air': ['AIR QUALITY SAMPLING']
};

export function ActionPlan({ setShowActionPlan, setActiveSection, onShowReportingDashboard }: ActionPlanProps) {
  const [actionPlans, setActionPlans] = useState<ActionPlanItem[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const [newActionPlan, setNewActionPlan] = useState<Partial<ActionPlanItem>>({
    section: sections[0],
    item: '',
    description: '',
    type: '',
    serials: '',
    notes: '',
    last_done: '',
    interval_months: '',
    next_due: '',
    issue: false,
    files: [],
  });

  useEffect(() => {
    fetchActionPlans();
  }, []);

  // Scroll to modal when it opens
  useEffect(() => {
    if ((isAdding || isEditing) && modalRef.current) {
      const elementTop = modalRef.current.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementTop - 30,
        behavior: 'smooth'
      });
    }
  }, [isAdding, isEditing]);

  const fetchActionPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('action_plan')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActionPlans(data || []);
    } catch (error) {
      console.error('Error fetching action plans:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    
    try {
      const newPreviews = await Promise.all(
        Array.from(files).map(async (file) => {
          const previewUrl = URL.createObjectURL(file);
          return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: file.name,
            url: previewUrl,
            file: file,
            isExisting: false
          };
        })
      );

      setFilePreviews(prev => [...prev, ...newPreviews]);
    } catch (error) {
      console.error('Error creating file previews:', error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleRemoveFile = (id: string) => {
    const fileToRemove = filePreviews.find(file => file.id === id);
    
    // Remove from file previews
    setFilePreviews(prev => prev.filter(file => file.id !== id));
    
    // If it was a blob URL, revoke it to free memory
    if (fileToRemove && !fileToRemove.isExisting) {
      URL.revokeObjectURL(fileToRemove.url);
    }
  };

  const loadExistingFiles = async (files: string[]) => {
    if (!files || files.length === 0) {
      setFilePreviews([]);
      return;
    }

    try {
      const existingFilePreviews = await Promise.all(
        files.map(async (filePath) => {
          try {
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('action-plan-files')
              .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days expiry

            if (signedUrlError) {
              console.error('Error creating signed URL:', signedUrlError);
              return null;
            }

            const fileName = filePath.split('/').pop() || filePath;
            return {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name: fileName,
              url: signedUrlData.signedUrl,
              isExisting: true
            };
          } catch (error) {
            console.error('Error loading file:', error);
            return null;
          }
        })
      );

      const validPreviews = existingFilePreviews.filter(preview => preview !== null);
      setFilePreviews(validPreviews);
    } catch (error) {
      console.error('Error loading existing files:', error);
    }
  };

  const handleAddActionPlan = async () => {
    try {
      console.log('Attempting to add action plan:', newActionPlan);
      
      // Validate required fields
      if (!newActionPlan.section || !newActionPlan.item || !newActionPlan.type || !newActionPlan.interval_months) {
        alert('Please fill in all required fields (Section, Item, Type, Interval Months)');
        return;
      }
      
      // Upload files first
      const uploadedFiles: string[] = [];
      
      if (filePreviews.length > 0) {
        const filesToUpload = filePreviews.filter(preview => !preview.isExisting && preview.file);
        
        for (const preview of filesToUpload) {
          if (!preview.file) continue;
          
          const fileExt = preview.file.name.split('.').pop();
          const fileName = `${Date.now()}_${preview.file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          
          const { data, error } = await supabase.storage
            .from('action-plan-files')
            .upload(fileName, preview.file);
          
          if (error) {
            console.error('Error uploading file:', error);
            continue;
          }
          
          uploadedFiles.push(data.path);
        }
        
        // Add existing files to the list
        const existingFiles = filePreviews
          .filter(preview => preview.isExisting)
          .map(preview => preview.name); // For existing files, we store the file path
        
        uploadedFiles.push(...existingFiles);
      }
      
      const actionPlanData = {
        ...newActionPlan,
        files: uploadedFiles,
        last_done: newActionPlan.last_done || null,
        next_due: newActionPlan.next_due || null,
      };
      
      const { data, error } = await supabase
        .from('action_plan')
        .insert([actionPlanData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Action plan added successfully:', data);
      setActionPlans([...(data || []), ...actionPlans]);
      setIsAdding(false);
      setCurrentStep(1);
      setFilePreviews([]);
      setNewActionPlan({
        section: sections[0],
        item: '',
        description: '',
        type: '',
        serials: '',
        notes: '',
        last_done: '',
        interval_months: '',
        next_due: '',
        issue: false,
        files: [],
      });
    } catch (error) {
      console.error('Error adding action plan:', error);
      // Show user-friendly error message
      alert('Failed to save action plan. Please check the console for details.');
    }
  };

  const handleUpdateActionPlan = async (id: string) => {
    try {
      // Validate required fields
      if (!newActionPlan.section || !newActionPlan.item || !newActionPlan.type || !newActionPlan.interval_months) {
        alert('Please fill in all required fields (Section, Item, Type, Interval Months)');
        return;
      }
      
      // Upload new files first
      const uploadedFiles: string[] = [];
      
      if (filePreviews.length > 0) {
        const filesToUpload = filePreviews.filter(preview => !preview.isExisting && preview.file);
        
        for (const preview of filesToUpload) {
          if (!preview.file) continue;
          
          const fileExt = preview.file.name.split('.').pop();
          const fileName = `${Date.now()}_${preview.file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          
          const { data, error } = await supabase.storage
            .from('action-plan-files')
            .upload(fileName, preview.file);
          
          if (error) {
            console.error('Error uploading file:', error);
            continue;
          }
          
          uploadedFiles.push(data.path);
        }
        
        // Add existing files to the list
        const existingFiles = filePreviews
          .filter(preview => preview.isExisting)
          .map(preview => preview.name); // For existing files, we store the file path
        
        uploadedFiles.push(...existingFiles);
      }
      
      const updateData = {
        ...newActionPlan,
        files: uploadedFiles,
        last_done: newActionPlan.last_done || null,
        next_due: newActionPlan.next_due || null,
      };
      
      const { error } = await supabase
        .from('action_plan')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setActionPlans(
        actionPlans.map((plan) =>
          plan.id === id ? { ...plan, ...updateData } : plan
        )
      );
      setIsEditing(null);
      setCurrentStep(1);
      setFilePreviews([]);
      setNewActionPlan({
        section: sections[0],
        item: '',
        description: '',
        type: '',
        serials: '',
        notes: '',
        last_done: '',
        interval_months: '',
        next_due: '',
        issue: false,
        files: [],
      });
    } catch (error) {
      console.error('Error updating action plan:', error);
    }
  };

  const handleDeleteActionPlan = async (id: string) => {
    try {
      const { error } = await supabase
        .from('action_plan')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setActionPlans(actionPlans.filter((plan) => plan.id !== id));
    } catch (error) {
      console.error('Error deleting action plan:', error);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleSectionChange = (section: string) => {
    setNewActionPlan({
      ...newActionPlan,
      section,
      type: sectionTypes[section]?.[0] || '' // Set first type as default
    });
  };

  // Add these helper functions for statistics
  const getItemsDueInDays = (days: number) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    
    return actionPlans.filter(plan => {
      if (!plan.next_due) return false;
      const dueDate = new Date(plan.next_due);
      return dueDate >= today && dueDate <= futureDate;
    }).length;
  };

  const getOverdueItems = () => {
    const today = new Date();
    return actionPlans.filter(plan => {
      if (!plan.last_done) return true;
      if (!plan.next_due) return false;
      return new Date(plan.next_due) < today;
    }).length;
  };

  const getReportedIssuesCount = () => {
    return actionPlans.filter(plan => plan.issue).length;
  };

  // Add helper function to check if a section has overdue items
  const getSectionOverdueCount = (section: string) => {
    const today = new Date();
    return actionPlans.filter(plan => {
      if (plan.section !== section) return false;
      if (!plan.last_done) return true; // Overdue if never done
      if (!plan.next_due) return false;
      return new Date(plan.next_due) < today;
    }).length;
  };

  const getSectionIssuesCount = (section: string) => {
    return actionPlans.filter(plan => plan.section === section && plan.issue).length;
  };

  const calculateNextDue = (lastDone: string, intervalMonths: string): string => {
    if (!lastDone || !intervalMonths) return '';
    
    const lastDoneDate = new Date(lastDone);
    const months = parseInt(intervalMonths);
    
    if (isNaN(months)) return '';
    
    const nextDueDate = new Date(lastDoneDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + months);
    
    return nextDueDate.toISOString().split('T')[0];
  };

  const handleIntervalMonthsChange = (value: string) => {
    // Extract numbers from the input (e.g., "12 months" becomes "12")
    const numericValue = value.replace(/[^\d]/g, '');
    
    setNewActionPlan(prev => {
      const updated = { ...prev, interval_months: numericValue };
      if (prev.last_done && numericValue) {
        updated.next_due = calculateNextDue(prev.last_done, numericValue);
      }
      return updated;
    });
  };

  const handleLastDoneChange = (value: string) => {
    setNewActionPlan(prev => {
      const updated = { ...prev, last_done: value };
      if (prev.interval_months) {
        updated.next_due = calculateNextDue(value, prev.interval_months);
      }
      return updated;
    });
  };

  const formatDateToUK = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const truncateNotes = (notes: string, maxWords: number = 5): string => {
    if (!notes) return '';
    const words = notes.trim().split(/\s+/);
    if (words.length <= maxWords) return notes;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const sectionHasDescriptions = (section: string): boolean => {
    return actionPlans
      .filter(plan => plan.section === section)
      .some(plan => plan.description && plan.description.trim().length > 0);
  };

  const sectionHasSerials = (section: string): boolean => {
    return actionPlans
      .filter(plan => plan.section === section)
      .some(plan => plan.serials && plan.serials.trim().length > 0);
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      await handleDeleteActionPlan(itemToDelete);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // Update the useEffect to load files when editing
  useEffect(() => {
    if (isEditing && newActionPlan.files) {
      loadExistingFiles(newActionPlan.files);
    } else if (isAdding) {
      setFilePreviews([]);
    }
  }, [isEditing, isAdding]);

  const getStepLabel = () => {
    switch (currentStep) {
      case 1:
        return 'Category';
      case 2:
        return 'Item Details';
      case 3:
        return 'Service & Attachments';
      default:
        return '';
    }
  };

  const handleNextStep = () => {
    // Validate current step before moving to next
    if (currentStep === 1) {
      if (!newActionPlan.section) {
        alert('Please select a section before proceeding');
        return;
      }
    } else if (currentStep === 2) {
      if (!newActionPlan.item || !newActionPlan.type) {
        alert('Please fill in Item and Type before proceeding');
        return;
      }
    }
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={() => {
            if (onShowReportingDashboard) {
              onShowReportingDashboard();
            } else {
              setShowActionPlan(false);
              setActiveSection('health');
            }
          }}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Reporting
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Action Plan</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {(isAdding || isEditing) && createPortal(
        <>
          {/* Modal Backdrop */}
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 z-50"></div>
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              ref={modalRef}
              className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {isAdding ? 'Add New Item' : 'Edit Item'}
                </h3>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(null);
                    setCurrentStep(1);
                    setFilePreviews([]);
                    setNewActionPlan({
                      section: sections[0],
                      item: '',
                      description: '',
                      type: '',
                      serials: '',
                      notes: '',
                      last_done: '',
                      interval_months: '',
                      next_due: '',
                      issue: false,
                      files: [],
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Step Indicators */}
              <div className="mb-8 w-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-base font-medium text-indigo-600 dark:text-indigo-400">
                    {getStepLabel()}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Step {currentStep} of 3
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                    style={{ width: `${(currentStep / 3) * 100}%` }}
                  />
                </div>
              </div>

              {/* Step 1: Category */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Section *
                    </label>
                    <select
                      value={newActionPlan.section}
                      onChange={(e) => handleSectionChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      {sections.map((section) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Step 2: Item Details */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Item *
                      </label>
                      <input
                        type="text"
                        value={newActionPlan.item}
                        onChange={(e) =>
                          setNewActionPlan({ ...newActionPlan, item: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type *
                      </label>
                      <select
                        value={newActionPlan.type}
                        onChange={(e) =>
                          setNewActionPlan({ ...newActionPlan, type: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      >
                        {sectionTypes[newActionPlan.section || '']?.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={newActionPlan.description}
                        onChange={(e) =>
                          setNewActionPlan({ ...newActionPlan, description: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Serials <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={newActionPlan.serials}
                        onChange={(e) =>
                          setNewActionPlan({ ...newActionPlan, serials: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Notes <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <textarea
                        value={newActionPlan.notes}
                        onChange={(e) =>
                          setNewActionPlan({ ...newActionPlan, notes: e.target.value })
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Service & Attachments */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Done
                      </label>
                      <input
                        type="date"
                        value={newActionPlan.last_done || ''}
                        onChange={(e) => handleLastDoneChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Interval Months *
                      </label>
                      <input
                        type="text"
                        value={newActionPlan.interval_months}
                        onChange={(e) => handleIntervalMonthsChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter number (e.g., 12 for 12 months)"
                      />
                    </div>
                  </div>

                  {/* Issue Reported Toggle Switch */}
                  <div className="pt-2">
                    <label className="flex items-center justify-start cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={!!newActionPlan.issue}
                          onChange={(e) =>
                            setNewActionPlan({ ...newActionPlan, issue: e.target.checked })
                          }
                        />
                        <div className={`block w-14 h-8 rounded-full ${newActionPlan.issue ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${newActionPlan.issue ? 'transform translate-x-6' : ''}`}></div>
                      </div>
                      <div className="ml-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Issue Reported
                      </div>
                    </label>
                  </div>

                  {/* File Upload Section */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Attachments <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <div className="flex flex-col gap-2">
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 text-center">
                        <input
                          type="file"
                          multiple
                          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                          className="hidden"
                          id="file-upload"
                          onChange={handleFileUpload}
                        />
                        <label
                          htmlFor="file-upload"
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
                              <FileText className="h-10 w-10 text-gray-400 mb-2" />
                              <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-gray-300">
                                Click to upload files
                              </span>
                              <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">
                                Images, PDFs, Documents up to 10MB
                              </span>
                            </>
                          )}
                        </label>
                      </div>

                      {filePreviews.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                          {filePreviews.map((preview) => (
                            <div key={preview.id} className="relative group">
                              <div className="aspect-w-1 aspect-h-1 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                                {preview.file && preview.file.type.startsWith('image/') ? (
                                  <img
                                    src={preview.url}
                                    alt={preview.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : preview.isExisting && preview.url && (preview.url.includes('.jpg') || preview.url.includes('.jpeg') || preview.url.includes('.png')) ? (
                                  <img
                                    src={preview.url}
                                    alt={preview.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <File className="h-12 w-12 text-gray-400" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <div className="flex space-x-2">
                                    <a
                                      href={preview.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 bg-white rounded-full hover:bg-gray-100"
                                    >
                                      <Eye className="h-5 w-5 text-gray-600" />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFile(preview.id)}
                                      className="p-2 bg-white rounded-full hover:bg-gray-100"
                                    >
                                      <X className="h-5 w-5 text-gray-600" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                                {preview.name}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between space-x-4 mt-8">
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(null);
                    setCurrentStep(1);
                    setFilePreviews([]);
                    setNewActionPlan({
                      section: sections[0],
                      item: '',
                      description: '',
                      type: '',
                      serials: '',
                      notes: '',
                      last_done: '',
                      interval_months: '',
                      next_due: '',
                      issue: false,
                      files: [],
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                
                <div className="flex space-x-3">
                  {currentStep > 1 && (
                    <button
                      onClick={handlePrevStep}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1 inline" />
                      Previous
                    </button>
                  )}
                  
                  {currentStep < 3 ? (
                    <button
                      onClick={handleNextStep}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1 inline" />
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        isAdding ? handleAddActionPlan() : handleUpdateActionPlan(isEditing!)
                      }
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAdding ? 'Add' : 'Save'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && createPortal(
        <>
          {/* Modal Backdrop */}
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 z-50"></div>
          
          {/* Modal Container - Fixed positioned to viewport */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                Confirm Deletion
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                Are you sure you want to delete this item? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setItemToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 dark:hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Statistics Widgets */}
      <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Total Items Widget */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(251, 113, 133, 0.4)"
                            darkSpotlightColor="rgba(251, 113, 133, 0.2)"
            size={400}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
          >
            <div className="relative z-10">
              <div className="mb-6">
              
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Total Items
                </h3>
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-white text-left">
                {actionPlans.length}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#FFF6F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <Check className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#e84943' }} />
            </div>
          </SpotlightCard>

          {/* Due in 30 Days Widget */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
             spotlightColor="rgba(251, 113, 133, 0.4)"
                            darkSpotlightColor="rgba(251, 113, 133, 0.2)"
            size={400}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
          >
            <div className="relative z-10">
              <div className="mb-6">
                              <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Due in 30 Days
                </h3>
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-white text-left">
                {getItemsDueInDays(30)}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#FFF6F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <FileText className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#e84943' }} />
            </div>
          </SpotlightCard>

          {/* Due in 60 Days Widget */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
           spotlightColor="rgba(251, 113, 133, 0.4)"
                            darkSpotlightColor="rgba(251, 113, 133, 0.2)"
            size={400}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
          >
            <div className="relative z-10">
              <div className="mb-6">
               
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Due in 60 Days
                </h3>
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-white text-left">
                {getItemsDueInDays(60)}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#FFF6F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <Calendar className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#e84943' }} />
            </div>
          </SpotlightCard>

          {/* Overdue Items Widget */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(239, 68, 68, 0.4)"
            darkSpotlightColor="rgba(239, 68, 68, 0.2)"
            size={400}
            className="bg-red-50 dark:bg-red-900/20 rounded-2xl shadow-lg p-6 overflow-hidden relative border border-red-200 dark:border-red-800"
          >
            <div className="relative z-10">
              <div className="mb-6">
               
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Overdue Items
                </h3>
              </div>
              <div className="text-lg font-medium text-red-600 dark:text-red-400 text-left">
                {getOverdueItems()}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#FFF6F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <AlertTriangle className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#dc2626' }} />
            </div>
          </SpotlightCard>

           {/* Issues Reported Widget */}
           <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(239, 68, 68, 0.4)"
            darkSpotlightColor="rgba(239, 68, 68, 0.2)"
            size={400}
            className="bg-red-50 dark:bg-red-900/20 rounded-2xl shadow-lg p-6 overflow-hidden relative border border-red-200 dark:border-red-800"
          >
            <div className="relative z-10">
              <div className="mb-6">
              
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Issue Reported
                </h3>
              </div>
              <div className="text-lg font-medium text-red-600 dark:text-red-400 text-left">
                {getReportedIssuesCount()}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#FFF6F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <AlertTriangle className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#dc2626' }} />
            </div>
          </SpotlightCard>
        </div>
      </div>

      {/* Main Content */}
      <div className="mt-6">
        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section) => {
            const sectionCount = actionPlans.filter(plan => plan.section === section).length;
            const overdueCount = getSectionOverdueCount(section);
            const hasOverdue = overdueCount > 0;
            const issuesCount = getSectionIssuesCount(section);
            const hasIssues = issuesCount > 0;
            
            return (
              <div key={section} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection(section)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-medium dark:text-white">
                      {section}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      hasOverdue 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {sectionCount}
                    </span>
                    {hasOverdue && (
                      <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                    )}
                    {hasIssues && (
                      <Bell className="h-4 w-4 text-yellow-500 dark:text-yellow-400 ml-2" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewActionPlan({
                          section: section,
                          item: '',
                          description: '',
                          type: sectionTypes[section]?.[0] || '',
                          serials: '',
                          notes: '',
                          last_done: '',
                          interval_months: '',
                          next_due: '',
                          issue: false,
                          files: [],
                        });
                        setIsAdding(true);
                      }}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 dark:text-indigo-400 dark:bg-indigo-900 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      title="Add item to this section"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </button>
                    {expandedSections.has(section) ? (
                      <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedSections.has(section) && (
                  <div className="p-4 bg-white dark:bg-gray-800">
                    {/* Desktop Table */}
                    <div className="hidden lg:block">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 rounded-lg overflow-hidden">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider first:rounded-tl-lg">
                                Item
                              </th>
                              {sectionHasDescriptions(section) && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Description
                                </th>
                              )}
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Type
                              </th>
                              {!['Health Policy Signature', 'Health', 'Training'].includes(section) && sectionHasSerials(section) && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Serials
                                </th>
                              )}
                              {!['Health Policy Signature', 'Health', 'Training'].includes(section) && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                  Notes
                                </th>
                              )}
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Last Done
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Interval
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Next Due
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider last:rounded-tr-lg">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {actionPlans
                              .filter((plan) => plan.section === section)
                              .map((plan, index, array) => {
                                const isOverdue = !plan.last_done || (plan.next_due && new Date(plan.next_due) < new Date());
                                return (
                                  <tr 
                                    key={plan.id} 
                                    className={`${index === array.length - 1 ? 'last:rounded-b-lg' : ''} ${
                                      isOverdue ? 'bg-red-50 dark:bg-red-900/20' : ''
                                    } hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer`}
                                    onClick={() => {
                                      setIsEditing(plan.id);
                                      setNewActionPlan(plan);
                                    }}
                                  >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 first:rounded-bl-lg">
                                      {plan.item}
                                    </td>
                                    {sectionHasDescriptions(section) && (
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                        {plan.description}
                                      </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                      {plan.type}
                                    </td>
                                    {!['Health Policy Signature', 'Health', 'Training'].includes(section) && sectionHasSerials(section) && (
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                        {plan.serials}
                                      </td>
                                    )}
                                    {!['Health Policy Signature', 'Health', 'Training'].includes(section) && (
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                        {truncateNotes(plan.notes)}
                                      </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                      {formatDateToUK(plan.last_done)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                      {plan.interval_months}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                                      isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-gray-100'
                                    }`}>
                                      {formatDateToUK(plan.next_due)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium last:rounded-br-lg">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsEditing(plan.id);
                                          setNewActionPlan(plan);
                                        }}
                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                                        title="Edit"
                                      >
                                        <Pencil className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteClick(plan.id);
                                        }}
                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                      >
                                        <Trash2 className="h-5 w-5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Mobile/Tablet Cards */}
                    <div className="lg:hidden">
                      <div className="space-y-4">
                        {actionPlans
                          .filter((plan) => plan.section === section)
                          .map((plan) => {
                            const isOverdue = !plan.last_done || (plan.next_due && new Date(plan.next_due) < new Date());
                            return (
                              <div 
                                key={plan.id}
                                className={`rounded-lg shadow-md p-4 border ${
                                  isOverdue 
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                                }`}
                                onClick={() => {
                                  setIsEditing(plan.id);
                                  setNewActionPlan(plan);
                                }}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                                      {plan.item}
                                    </h4>
                                    {sectionHasDescriptions(section) && plan.description && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {plan.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                                    <span className="ml-2 text-gray-900 dark:text-white">{plan.type}</span>
                                  </div>
                                  {!['Health Policy Signature', 'Health', 'Training'].includes(section) && sectionHasSerials(section) && plan.serials && (
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Serials:</span>
                                      <span className="ml-2 text-gray-900 dark:text-white">{plan.serials}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Last Done:</span>
                                    <span className="ml-2 text-gray-900 dark:text-white">{formatDateToUK(plan.last_done) || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Interval:</span>
                                    <span className="ml-2 text-gray-900 dark:text-white">{plan.interval_months ? `${plan.interval_months} months` : 'N/A'}</span>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-gray-500 dark:text-gray-400">Next Due:</span>
                                    <span className={`ml-2 ${
                                      isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-white'
                                    }`}>
                                      {formatDateToUK(plan.next_due) || 'N/A'}
                                      {isOverdue && !plan.last_done && <span className="ml-1 text-xs">(Never done)</span>}
                                      {isOverdue && plan.last_done && <span className="ml-1 text-xs">(Overdue)</span>}
                                    </span>
                                  </div>
                                </div>

                                {plan.notes && !['Health Policy Signature', 'Health', 'Training'].includes(section) && (
                                  <div className="mb-4">
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">Notes:</span>
                                    <p className="text-sm text-gray-900 dark:text-white mt-1">{truncateNotes(plan.notes)}</p>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsEditing(plan.id);
                                      setNewActionPlan(plan);
                                    }}
                                    className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                                    title="Edit"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteClick(plan.id);
                                    }}
                                    className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        {actionPlans.filter((plan) => plan.section === section).length === 0 && (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                            <p className="text-gray-500 dark:text-gray-400">No items in this section</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
} 
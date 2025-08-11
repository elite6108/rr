import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Search,
  Trash2,
  Edit,
  Plus,
  Pencil, 
  FileText,
  ChevronLeft,
  ClipboardCheck as ClipboardList,
  AlertCircle,
  Bell, 
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  RefreshCw,
  Clipboard,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateContractorPDF } from '../../utils/pdf/contractor/contractorPDFGenerator';

interface SubcontractorsProps {
  setShowSubcontractors: (show: boolean) => void;
  setShowAdminDashboard: (show: boolean) => void;
}

interface Reminder {
  type: 'insurance';
  title: string;
  date: Date;
  description: string;
  severity: 'warning' | 'danger';
}

interface InsuranceDetails {
  insurer: string;
  policy_no: string;
  renewal_date: string;
  limit_of_indemnity: string;
}

interface Subcontractor {
  id: string;
  company_name: string;
  services_provided: string;
  address: string;
  phone: string;
  email: string;
  swms: boolean;
  insurance_exp_date: string;
  review_date: string;
  created_at?: string;
  updated_at?: string;
  employers_liability: InsuranceDetails;
  public_liability: InsuranceDetails;
  professional_negligence: InsuranceDetails;
  contractors_all_risk: InsuranceDetails;
  custom_insurance_types?: Record<string, InsuranceDetails>;
  nature_of_business: string;
  swms_url?: string;
  health_safety_policy_url?: string;
  additional_files_urls?: string[];
  review?: ReviewFormData;
  token?: string;
}

interface SubcontractorFormData
  extends Omit<Subcontractor, 'id' | 'created_at' | 'updated_at'> {
  nature_of_business: string;
  employers_liability: InsuranceDetails;
  public_liability: InsuranceDetails;
  professional_negligence: InsuranceDetails;
  contractors_all_risk: InsuranceDetails;
  has_swms: boolean;
  swms_file?: File | null;
  swms_url?: string;
  swms_file_path?: string;
  has_health_safety_policy: boolean;
  health_safety_policy_file?: File | null;
  health_safety_policy_url?: string;
  health_safety_file_path?: string;
  additional_files: File[];
  additional_files_urls: string[];
  additional_files_paths?: string[];
}

interface SatisfactionRating {
  rating:
    | 'totally_dissatisfied'
    | 'mostly_dissatisfied'
    | 'neither'
    | 'mostly_satisfied'
    | 'totally_satisfied';
  comments: string;
}

interface ReviewFormData {
  date: string;
  requirements_scope: string;
  requirements: string;
  review_date: string;
  agreed_timeframe: string;
  total_time_taken: string;
  actual_timeframe: string;

  // Satisfaction ratings
  quality_rating: SatisfactionRating;
  timeliness_rating: SatisfactionRating;
  communication_rating: SatisfactionRating;
  understanding_rating: SatisfactionRating;
  cooperativeness_rating: SatisfactionRating;
  overall_satisfaction_rating: SatisfactionRating;

  // Yes/No questions
  authority_to_work: boolean;
  relevant_permits: boolean;
  risk_assessments: boolean;
  documents_legible: boolean;
  time_limit_clear: boolean;
  control_measures: boolean;
  work_in_line: boolean;
  right_people: boolean;
  emergency_knowledge: boolean;
  ppe_condition: boolean;
  tools_condition: boolean;
  housekeeping_standards: boolean;
}

export function Subcontractors({ setShowSubcontractors, setShowAdminDashboard }: SubcontractorsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedContractorId, setSelectedContractorId] = useState<
    string | null
  >(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedContractorForReview, setSelectedContractorForReview] =
    useState<Subcontractor | null>(null);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingContractor, setEditingContractor] =
    useState<Subcontractor | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showReminders, setShowReminders] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<SubcontractorFormData>({
    company_name: '',
    services_provided: '',
    address: '',
    phone: '',
    email: '',
    nature_of_business: '',
    swms: false,
    insurance_exp_date: '',
    review_date: '',
    employers_liability: {
      insurer: '',
      policy_no: '',
      renewal_date: '',
      limit_of_indemnity: '',
    },
    public_liability: {
      insurer: '',
      policy_no: '',
      renewal_date: '',
      limit_of_indemnity: '',
    },
    professional_negligence: {
      insurer: '',
      policy_no: '',
      renewal_date: '',
      limit_of_indemnity: '',
    },
    contractors_all_risk: {
      insurer: '',
      policy_no: '',
      renewal_date: '',
      limit_of_indemnity: '',
    },
    has_swms: false,
    has_health_safety_policy: false,
    additional_files: [],
    additional_files_urls: [],
  });
  const [customInsuranceTypes, setCustomInsuranceTypes] = useState<string[]>(
    []
  );
  const [reviewFormData, setReviewFormData] = useState<ReviewFormData>({
    date: new Date().toISOString().split('T')[0],
    requirements_scope: '',
    requirements: '',
    review_date: new Date().toISOString().split('T')[0],
    agreed_timeframe: '',
    total_time_taken: '',
    actual_timeframe: '',
    quality_rating: { rating: 'neither', comments: '' },
    timeliness_rating: { rating: 'neither', comments: '' },
    communication_rating: { rating: 'neither', comments: '' },
    understanding_rating: { rating: 'neither', comments: '' },
    cooperativeness_rating: { rating: 'neither', comments: '' },
    overall_satisfaction_rating: { rating: 'neither', comments: '' },
    authority_to_work: false,
    relevant_permits: false,
    risk_assessments: false,
    documents_legible: false,
    time_limit_clear: false,
    control_measures: false,
    work_in_line: false,
    right_people: false,
    emergency_knowledge: false,
    ppe_condition: false,
    tools_condition: false,
    housekeeping_standards: false,
  });
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch contractors on component mount
  useEffect(() => {
    fetchContractors();
    fetchCompanySettings();
  }, []);

  useEffect(() => {
    // Update reminders whenever subcontractors change
    setReminders(getReminders());
  }, [subcontractors]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const isModalOpen = showFormModal || showReviewModal || showDeleteModal;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showFormModal, showReviewModal, showDeleteModal]);

  const getReminders = (): Reminder[] => {
    const today = new Date();
    const reminders: Reminder[] = [];

    subcontractors.forEach((contractor) => {
      // Check main insurance expiry date
      if (contractor.insurance_exp_date) {
        const expiryDate = new Date(contractor.insurance_exp_date);
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30 || diffDays < 0) {
          reminders.push({
            type: 'insurance',
            title: contractor.company_name,
            date: expiryDate,
            description:
              diffDays < 0
                ? `Insurance expired - ${expiryDate.toLocaleDateString()}`
                : `Insurance expires in ${diffDays} days`,
            severity: diffDays <= 0 ? 'danger' : 'warning',
          });
        }
      }

      // Check all insurance types
      const insuranceTypes = [
        { name: 'Employers Liability', data: contractor.employers_liability },
        { name: 'Public Liability', data: contractor.public_liability },
        {
          name: 'Professional Negligence',
          data: contractor.professional_negligence,
        },
        { name: 'Contractors All Risk', data: contractor.contractors_all_risk },
      ];

      // Add custom insurance types
      if (contractor.custom_insurance_types) {
        Object.entries(contractor.custom_insurance_types).forEach(
          ([key, value]) => {
            insuranceTypes.push({
              name: key
                .split('_')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
              data: value,
            });
          }
        );
      }

      insuranceTypes.forEach(({ name, data }) => {
        if (data?.renewal_date) {
          const expiryDate = new Date(data.renewal_date);
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 30 || diffDays < 0) {
            reminders.push({
              type: 'insurance',
              title: `${contractor.company_name} - ${name}`,
              date: expiryDate,
              description:
                diffDays < 0
                  ? `${name} expired - ${expiryDate.toLocaleDateString()}`
                  : `${name} expires in ${diffDays} days`,
              severity: diffDays <= 0 ? 'danger' : 'warning',
            });
          }
        }
      });
    });

    // Sort reminders by date
    return reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const fetchContractors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('subcontractors').select('*, token');

      if (error) throw error;

      // Fetch reviews for each contractor
      const contractorsWithReviews = await Promise.all(
        data.map(async (contractor: Subcontractor) => {
          const { data: reviewData, error: reviewError } = await supabase
            .from('contractor_reviews')
            .select('*')
            .eq('contractor_id', contractor.id)
            .order('review_date', { ascending: false })
            .limit(1);

          if (reviewError) {
            console.error('Error fetching review:', reviewError);
            return {
              ...contractor,
              review: null,
            };
          }

          return {
            ...contractor,
            review: reviewData && reviewData.length > 0 ? reviewData[0] : null,
          };
        })
      );

      // Generate signed URLs for all stored files
      const contractorsWithSignedUrls = await Promise.all(
        contractorsWithReviews.map(async (contractor) => {
          const contractorWithUrls = { ...contractor };
          
          // Create signed URLs for SWMS files
          if (contractor.swms_url) {
            const path = contractor.swms_url.split('/').pop();
            if (path) {
              const { data } = await supabase.storage
                .from('subcontractor-files')
                .createSignedUrl(path, 60 * 60); // 1 hour expiry
                
              if (data?.signedUrl) {
                contractorWithUrls.swms_url = data.signedUrl;
              }
            }
          }
          
          // Create signed URLs for Health & Safety Policy files
          if (contractor.health_safety_policy_url) {
            const path = contractor.health_safety_policy_url.split('/').pop();
            if (path) {
              const { data } = await supabase.storage
                .from('subcontractor-files')
                .createSignedUrl(path, 60 * 60); // 1 hour expiry
                
              if (data?.signedUrl) {
                contractorWithUrls.health_safety_policy_url = data.signedUrl;
              }
            }
          }
          
          // Create signed URLs for additional files
          if (contractor.additional_files_urls && contractor.additional_files_urls.length > 0) {
            const signedUrls = await Promise.all(
              contractor.additional_files_urls.map(async (url: string) => {
                const path = url.split('/').pop();
                if (path) {
                  const { data } = await supabase.storage
                    .from('subcontractor-files')
                    .createSignedUrl(path, 60 * 60); // 1 hour expiry
                    
                  return data?.signedUrl || url;
                }
                return url;
              })
            );
            
            contractorWithUrls.additional_files_urls = signedUrls;
          }
          
          return contractorWithUrls;
        })
      );

      setSubcontractors(contractorsWithSignedUrls);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching contractors:', err);
      setError('Failed to fetch contractors');
      setLoading(false);
    }
  };

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .single();

      if (error) throw error;
      setCompanySettings(data);
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const getDateStatus = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    if (date < today) {
      return 'expired';
    } else if (date <= thirtyDaysFromNow) {
      return 'due_soon';
    }
    return 'ok';
  };

  const getStatusLabel = (status: string, type: 'insurance' | 'review') => {
    switch (status) {
      case 'expired':
        return type === 'insurance' ? 'Expired' : 'Review Now';
      case 'due_soon':
        return 'Due Soon';
      default:
        return '';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'expired':
        return 'text-red-600';
      case 'due_soon':
        return 'text-orange-500';
      default:
        return 'text-gray-900';
    }
  };

  const filteredContractors = subcontractors.filter(
    (contractor) =>
      contractor.company_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      contractor.services_provided
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setSelectedContractorId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedContractorId) return;

    try {
      const { error } = await supabase
        .from('subcontractors')
        .delete()
        .eq('id', selectedContractorId);

      if (error) throw error;

      setSubcontractors((prev) =>
        prev.filter((c) => c.id !== selectedContractorId)
      );
      setShowDeleteModal(false);
      setSelectedContractorId(null);
    } catch (err) {
      console.error('Error deleting contractor:', err);
      setError('Failed to delete contractor');
    }
  };

  const handleEdit = (contractor: Subcontractor) => {
    // Initialize formData with the contractor's values
    setFormData({
      company_name: contractor.company_name || '',
      services_provided: contractor.services_provided || '',
      address: contractor.address || '',
      phone: contractor.phone || '',
      email: contractor.email || '',
      nature_of_business: contractor.nature_of_business || '',
      swms: contractor.swms || false,
      insurance_exp_date: contractor.insurance_exp_date || '',
      review_date: contractor.review_date || '',
      employers_liability: contractor.employers_liability || {
        insurer: '',
        policy_no: '',
        renewal_date: '',
        limit_of_indemnity: '',
      },
      public_liability: contractor.public_liability || {
        insurer: '',
        policy_no: '',
        renewal_date: '',
        limit_of_indemnity: '',
      },
      professional_negligence: contractor.professional_negligence || {
        insurer: '',
        policy_no: '',
        renewal_date: '',
        limit_of_indemnity: '',
      },
      contractors_all_risk: contractor.contractors_all_risk || {
        insurer: '',
        policy_no: '',
        renewal_date: '',
        limit_of_indemnity: '',
      },
      has_swms: !!contractor.swms,
      has_health_safety_policy: !!contractor.health_safety_policy_url,
      additional_files: [],
      additional_files_urls: contractor.additional_files_urls || [],
      swms_url: contractor.swms_url || '',
      health_safety_policy_url: contractor.health_safety_policy_url || '',
    });

    // Set editing contractor for reference during update
    setEditingContractor(contractor);
    setCurrentStep(1); // Reset to first step
    setShowFormModal(true);
  };

  const handleAdd = () => {
    // Reset form data to initial empty state
    setFormData({
      company_name: '',
      services_provided: '',
      address: '',
      phone: '',
      email: '',
      nature_of_business: '',
      swms: false,
      insurance_exp_date: '',
      review_date: '',
      employers_liability: {
        insurer: '',
        policy_no: '',
        renewal_date: '',
        limit_of_indemnity: '',
      },
      public_liability: {
        insurer: '',
        policy_no: '',
        renewal_date: '',
        limit_of_indemnity: '',
      },
      professional_negligence: {
        insurer: '',
        policy_no: '',
        renewal_date: '',
        limit_of_indemnity: '',
      },
      contractors_all_risk: {
        insurer: '',
        policy_no: '',
        renewal_date: '',
        limit_of_indemnity: '',
      },
      has_swms: false,
      has_health_safety_policy: false,
      additional_files: [],
      additional_files_urls: [],
    });
    setCurrentStep(1); // Reset to first step
    setEditingContractor(null);
    setShowFormModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleInsuranceChange = (
    type: keyof SubcontractorFormData,
    field: keyof InsuranceDetails,
    value: string
  ) => {
    setFormData((prev) => {
      // Check if the type exists in prev before spreading
      const currentTypeData = prev[type] as InsuranceDetails || {
        insurer: '',
        policy_no: '',
        renewal_date: '',
        limit_of_indemnity: '',
      };
      
      return {
        ...prev,
        [type]: {
          ...currentTypeData,
          [field]: value,
        },
      };
    });
  };

  const handleFileUpload = async (
    file: File,
    type: 'swms' | 'health_safety' | 'additional'
  ) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('subcontractor-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create a signed URL with 1 hour expiry
      const { data } = await supabase.storage
        .from('subcontractor-files')
        .createSignedUrl(fileName, 60 * 60); // 1 hour expiry

      if (!data?.signedUrl) throw new Error("Failed to generate signed URL");
      
      const signedUrl = data.signedUrl;

      if (type === 'swms') {
        setFormData((prev) => ({ 
          ...prev, 
          swms_url: signedUrl,
          // Store the path/filename to retrieve later
          swms_file_path: fileName 
        }));
      } else if (type === 'health_safety') {
        setFormData((prev) => ({
          ...prev,
          health_safety_policy_url: signedUrl,
          // Store the path/filename to retrieve later
          health_safety_file_path: fileName
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          additional_files_urls: [...prev.additional_files_urls, signedUrl],
          // Store the path/filename to retrieve later
          additional_files_paths: [...(prev.additional_files_paths || []), fileName]
        }));
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file');
    }
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let token = '';
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (i < 4) token += '-';
    }
    return token;
  };

  const handleGenerateToken = async (contractorId: string) => {
    try {
      setTokenLoading(contractorId);
      const newToken = generateToken();

      const { error } = await supabase
        .from('subcontractors')
        .update({
          token: newToken
        })
        .eq('id', contractorId);

      if (error) throw error;

      setSubcontractors(prevContractors => 
        prevContractors.map(contractor => 
          contractor.id === contractorId 
            ? { ...contractor, token: newToken }
            : contractor
        )
      );
    } catch (error) {
      console.error('Error generating token:', error);
    } finally {
      setTokenLoading(null);
    }
  };

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setSuccessMessage('Token copied to clipboard');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error copying token:', error);
      setError('Failed to copy token');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleFormSubmit = async (formData: SubcontractorFormData) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const {
        additional_files,
        swms_file,
        health_safety_policy_file,
        // Save paths for later retrieval
        swms_file_path,
        health_safety_file_path,
        additional_files_paths,
        ...cleanFormData
      } = formData;

      // Store file paths instead of signed URLs
      const dataToSend = {
        ...cleanFormData,
        user_id: user.id,
        insurance_exp_date:
          cleanFormData.insurance_exp_date ||
          new Date().toISOString().split('T')[0],
        review_date: 
          cleanFormData.review_date ||
          new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        // Store just the filenames/paths
        swms_url: swms_file_path ? `${swms_file_path}` : cleanFormData.swms_url,
        health_safety_policy_url: health_safety_file_path ? `${health_safety_file_path}` : cleanFormData.health_safety_policy_url,
        additional_files_urls: additional_files_paths || cleanFormData.additional_files_urls
      };

      if (editingContractor) {
        // Update existing contractor
        const { error } = await supabase
          .from('subcontractors')
          .update(dataToSend)
          .eq('id', editingContractor.id);

        if (error) throw error;

        // Refresh all data to get new signed URLs
        await fetchContractors();
      } else {
        // Add new contractor
        const { data, error } = await supabase
          .from('subcontractors')
          .insert([dataToSend])
          .select();

        if (error) throw error;
        
        // Refresh all data to get new signed URLs
        await fetchContractors();
      }

      setShowFormModal(false);
      setEditingContractor(null);
    } catch (error) {
      console.error('Error saving contractor:', error);
      setError(
        'Failed to save contractor: ' + (error as any)?.message ||
          'Unknown error'
      );
    }
  };

  const handleReview = (contractor: Subcontractor) => {
    setSelectedContractorForReview(contractor);
    // Initialize review form data with existing review data if it exists
    if (contractor.review) {
      setReviewFormData({
        ...contractor.review,
        // Ensure review_date matches the date
        review_date: contractor.review.date,
        // Set actual_timeframe to be the same as total_time_taken (or empty string if not present)
        actual_timeframe: contractor.review.total_time_taken || '',
      });
    } else {
      // Initialize with default values if no review exists
      const today = new Date().toISOString().split('T')[0];
      setReviewFormData({
        date: today,
        requirements_scope: '',
        requirements: '',
        review_date: today,
        agreed_timeframe: '',
        total_time_taken: '',
        actual_timeframe: '',
        quality_rating: { rating: 'neither', comments: '' },
        timeliness_rating: { rating: 'neither', comments: '' },
        communication_rating: { rating: 'neither', comments: '' },
        understanding_rating: { rating: 'neither', comments: '' },
        cooperativeness_rating: { rating: 'neither', comments: '' },
        overall_satisfaction_rating: { rating: 'neither', comments: '' },
        authority_to_work: false,
        relevant_permits: false,
        risk_assessments: false,
        documents_legible: false,
        time_limit_clear: false,
        control_measures: false,
        work_in_line: false,
        right_people: false,
        emergency_knowledge: false,
        ppe_condition: false,
        tools_condition: false,
        housekeeping_standards: false,
      });
    }
    setShowReviewModal(true);
    
    // Scroll to top on mobile devices when modal opens
    if (window.innerWidth < 640) { // 640px is Tailwind's 'sm' breakpoint
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  const handleReviewChange = (field: keyof ReviewFormData, value: any) => {
    setReviewFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSatisfactionChange = (
    field: keyof ReviewFormData,
    rating: string,
    comments?: string
  ) => {
    setReviewFormData((prev) => ({
      ...prev,
      [field]: {
        rating: rating as SatisfactionRating['rating'],
        comments: comments ?? prev[field].comments,
      },
    }));
  };

  const handleRequirementsChange = (value: string) => {
    setReviewFormData((prev) => ({
      ...prev,
      requirements_scope: value,
      requirements: value || 'No specific requirements provided',
    }));
  };

  const handleDateChange = (value: string) => {
    setReviewFormData((prev) => ({
      ...prev,
      date: value,
      review_date: value,
    }));
  };

  const handleGeneratePDF = async (contractor: Subcontractor) => {
    try {
      setGeneratingPdfId(contractor.id);
      
      // Open the window first (must be synchronous for iOS Safari)
      const newWindow = window.open('', '_blank');
      
      // Check if window was blocked
      if (!newWindow) {
        alert('Please allow popups for this site to view PDFs');
        return;
      }
      
      // Show loading state in the new window
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Generating PDF...</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
            .loading { text-align: center; }
            .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 0 auto 20px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="loading">
            <div class="spinner"></div>
            <p>Generating PDF...</p>
          </div>
        </body>
        </html>
      `);

      // Generate PDF
      const pdfDataUrl = await generateContractorPDF({
        contractor,
        companySettings,
      });

      // Format filename for better clarity
      const formattedFilename = `Contractor-${contractor.company_name.replace(/\s+/g, '-')}.pdf`;
      
      // Check if window is still open
      if (newWindow.closed) {
        alert('PDF window was closed. Please try again.');
        return;
      }
      
      // For iOS Safari, try direct PDF display first
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        // iOS Safari - direct PDF approach
        const response = await fetch(pdfDataUrl);
        const blob = await response.blob();
        const pdfUrl = URL.createObjectURL(blob);
        
        // Replace the loading content with PDF viewer
        newWindow.document.open();
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${formattedFilename}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
              .pdf-container { width: 100%; height: 100%; }
              .download-bar { 
                position: fixed; 
                top: 0; 
                left: 0; 
                right: 0; 
                background: #f1f1f1; 
                padding: 10px; 
                display: flex; 
                justify-content: center;
                z-index: 1000;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .download-button { 
                background: #0066cc; 
                color: white; 
                padding: 12px 24px; 
                border: none; 
                border-radius: 4px; 
                cursor: pointer; 
                font-weight: bold;
                text-decoration: none;
                font-family: Arial, sans-serif;
                font-size: 16px;
                touch-action: manipulation;
              }
              .download-button:hover { background: #0055aa; }
              .pdf-view { margin-top: 60px; height: calc(100% - 60px); }
              .pdf-fallback { 
                padding: 20px; 
                text-align: center; 
                font-family: Arial, sans-serif;
              }
              .pdf-fallback a { 
                color: #0066cc; 
                text-decoration: none; 
                font-weight: bold;
                font-size: 18px;
                display: inline-block;
                margin: 20px 0;
                padding: 15px 30px;
                background: #f0f0f0;
                border-radius: 5px;
              }
            </style>
          </head>
          <body>
            <div class="download-bar">
              <button id="download-btn" class="download-button">Download ${formattedFilename}</button>
            </div>
            <div class="pdf-view">
              <div class="pdf-fallback">
                <h2>PDF Ready for Download</h2>
                <p>Click the download button above to save the PDF file.</p>
                <a id="direct-link" href="${pdfUrl}" download="${formattedFilename}">
                  Direct Download Link
                </a>
              </div>
            </div>
            <script>
              const pdfUrl = "${pdfUrl}";
              const fileName = "${formattedFilename}";
              
              // Download function
              function downloadPDF() {
                const a = document.createElement('a');
                a.href = pdfUrl;
                a.download = fileName;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }
              
              // Set up download button
              document.getElementById('download-btn').addEventListener('click', downloadPDF);
              document.getElementById('direct-link').addEventListener('click', function(e) {
                e.preventDefault();
                downloadPDF();
              });
              
              // Handle keyboard shortcuts
              document.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                  e.preventDefault();
                  downloadPDF();
                }
              });
              
              // Try to trigger download automatically (iOS Safari might block this)
              setTimeout(function() {
                if (confirm('Would you like to download the PDF now?')) {
                  downloadPDF();
                }
              }, 1000);
              
              // Clean up when the window is closed
              window.addEventListener('beforeunload', function() {
                URL.revokeObjectURL(pdfUrl);
              });
            </script>
          </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        // Desktop/non-iOS - iframe approach with proper blob handling
        const response = await fetch(pdfDataUrl);
        const blob = await response.blob();
        const pdfUrl = URL.createObjectURL(blob);
        
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${formattedFilename}</title>
          <meta charset="UTF-8">
          <style>
            body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
            .pdf-container { width: 100%; height: 100%; }
            iframe { width: 100%; height: 100%; border: none; }
            .download-bar { 
              position: fixed; 
              top: 0; 
              left: 0; 
              right: 0; 
              background: #f1f1f1; 
              padding: 10px; 
              display: flex; 
              justify-content: center;
              z-index: 1000;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .download-button { 
              background: #0066cc; 
              color: white; 
              padding: 8px 16px; 
              border: none; 
              border-radius: 4px; 
              cursor: pointer; 
              font-weight: bold;
              text-decoration: none;
              font-family: Arial, sans-serif;
            }
            .download-button:hover { background: #0055aa; }
            .pdf-view { margin-top: 50px; height: calc(100% - 50px); }
          </style>
        </head>
        <body>
          <div class="download-bar">
            <a id="download-btn" class="download-button" href="#">Download ${formattedFilename}</a>
          </div>
          <div class="pdf-view">
            <iframe id="pdf-iframe" src="${pdfUrl}" style="width:100%; height:100%; border:none;"></iframe>
          </div>
          <script>
            const pdfUrl = "${pdfUrl}";
            const fileName = "${formattedFilename}";
            
            // Set up download button
            document.getElementById('download-btn').addEventListener('click', function(e) {
              e.preventDefault();
              
              // Direct download approach with correct filename
              const a = document.createElement('a');
              a.href = pdfUrl;
              a.download = fileName;
              a.style.display = 'none';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            });
            
            // Handle Ctrl+S keyboard shortcut
            document.addEventListener('keydown', function(e) {
              if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                document.getElementById('download-btn').click();
              }
            });

            // Clean up when the window is closed
            window.addEventListener('beforeunload', function() {
              URL.revokeObjectURL(pdfUrl);
            });
          </script>
        </body>
        </html>
        `;

        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  // Add review to database
  const submitReview = async () => {
    if (!selectedContractorForReview) return;

    try {
      setSubmittingReview(true);

      // Create an object that ensures no required fields are null
      const reviewDataToSubmit = {
        ...reviewFormData,
        // If requirements_scope is empty, use a default value to avoid null constraint
        requirements:
          reviewFormData.requirements_scope ||
          'No specific requirements provided',
        // Make sure review_date is properly set to avoid not-null constraint
        review_date: reviewFormData.date,
        // Use total_time_taken for the actual_timeframe field in the database
        actual_timeframe: reviewFormData.total_time_taken || 'Not specified',
        // Set satisfaction_rating as a string value from the overall rating
        satisfaction_rating:
          reviewFormData.overall_satisfaction_rating?.rating || 'neither',
        contractor_id: selectedContractorForReview.id,
      };

      // Insert into contractor_reviews table
      const { error: reviewError } = await supabase
        .from('contractor_reviews')
        .insert([reviewDataToSubmit]);

      if (reviewError) throw reviewError;

      // Update the review date in the subcontractors table
      const { error: updateError } = await supabase
        .from('subcontractors')
        .update({ review_date: reviewFormData.date })
        .eq('id', selectedContractorForReview.id);

      if (updateError) throw updateError;

      // Update local state
      setSubcontractors((prev) =>
        prev.map((c) =>
          c.id === selectedContractorForReview.id
            ? { ...c, review_date: reviewFormData.date, review: reviewFormData }
            : c
        )
      );

      setShowReviewModal(false);
      setSelectedContractorForReview(null);
      setSubmittingReview(false);
    } catch (error: any) {
      console.error('Error saving review:', error);
      setSubmittingReview(false);
      setSubmitError(`Failed to save review: ${error.message}`);
    }
  };

  const renderFormStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            <h4 className="text-lg font-medium sticky top-0 bg-white py-2">
              Company Info
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Services Provided{' '}
                  <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  name="services_provided"
                  value={formData.services_provided}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  pattern="^\+?44[0-9]{10}$"
                  placeholder="+44"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nature of Business{' '}
                  <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  name="nature_of_business"
                  value={formData.nature_of_business}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 max-h-[500px] overflow-y-auto">
            <div className="sticky top-0 bg-white py-2 z-10">
              <h4 className="text-lg font-medium">Insurance</h4>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Insurance Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="insurance_exp_date"
                  value={formData.insurance_exp_date}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                />
              </div>
              <button
                onClick={() => {
                  const newType = `custom_insurance_${
                    customInsuranceTypes.length + 1
                  }`;
                  setCustomInsuranceTypes([...customInsuranceTypes, newType]);
                  setFormData((prev) => ({
                    ...prev,
                    [newType]: {
                      insurer: '',
                      policy_no: '',
                      renewal_date: '',
                      limit_of_indemnity: '',
                    },
                  }));
                }}
                className="mt-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Add New Insurance Type
              </button>
            </div>
            {[
              'employers_liability',
              'public_liability',
              'professional_negligence',
              'contractors_all_risk',
              ...customInsuranceTypes,
            ].map((insurance) => (
              <div key={insurance} className="border p-4 rounded-md">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="text-md font-medium">
                    {insurance.startsWith('custom_insurance_')
                      ? `Custom Insurance ${insurance.split('_').pop()}`
                      : insurance
                          .split('_')
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                          )
                          .join(' ')}
                  </h5>
                  {insurance.startsWith('custom_insurance_') && (
                    <button
                      onClick={() => {
                        setCustomInsuranceTypes(
                          customInsuranceTypes.filter(
                            (type) => type !== insurance
                          )
                        );
                        setFormData((prev) => {
                          const newData = { ...prev };
                          delete newData[insurance];
                          return newData;
                        });
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Insurer{' '}
                      <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData[insurance]?.insurer || ''}
                      onChange={(e) =>
                        handleInsuranceChange(
                          insurance as keyof SubcontractorFormData,
                          'insurer',
                          e.target.value
                        )
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Policy Number{' '}
                      <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData[insurance]?.policy_no || ''}
                      onChange={(e) =>
                        handleInsuranceChange(
                          insurance as keyof SubcontractorFormData,
                          'policy_no',
                          e.target.value
                        )
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Renewal Date{' '}
                      <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={formData[insurance]?.renewal_date || ''}
                      onChange={(e) =>
                        handleInsuranceChange(
                          insurance as keyof SubcontractorFormData,
                          'renewal_date',
                          e.target.value
                        )
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Limit of Indemnity{' '}
                      <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData[insurance]?.limit_of_indemnity || ''}
                      onChange={(e) =>
                        handleInsuranceChange(
                          insurance as keyof SubcontractorFormData,
                          'limit_of_indemnity',
                          e.target.value
                        )
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 max-h-[500px] overflow-y-auto">
            <h4 className="text-lg font-medium sticky top-0 bg-white py-2">
              HS
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Has the contractor submitted a SWMS?{' '}
                  <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, has_swms: true }))}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      formData.has_swms
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, has_swms: false }))}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      !formData.has_swms
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    No
                  </button>
                </div>
                {formData.has_swms && (
                  <div className="mt-4">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleFileUpload(e.target.files[0], 'swms')
                      }
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    {formData.swms_url && (
                      <a
                        href={formData.swms_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
                      >
                        View SWMS
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Health & Safety Policy?{' '}
                  <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, has_health_safety_policy: true }))}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      formData.has_health_safety_policy
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, has_health_safety_policy: false }))}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      !formData.has_health_safety_policy
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    No
                  </button>
                </div>
                {formData.has_health_safety_policy && (
                  <div className="mt-4">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleFileUpload(e.target.files[0], 'health_safety')
                      }
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    {formData.health_safety_policy_url && (
                      <a
                        href={formData.health_safety_policy_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
                      >
                        View Health & Safety Policy
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 max-h-[500px] overflow-y-auto">
            <h4 className="text-lg font-medium sticky top-0 bg-white py-2">
              Upload Documents
            </h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Documents{' '}
                <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    Array.from(e.target.files).forEach((file) =>
                      handleFileUpload(file, 'additional')
                    );
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {formData.additional_files_urls.length > 0 && (
                <div className="mt-4 space-y-2">
                  {formData.additional_files_urls.map((url, index) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-indigo-600 hover:text-indigo-900"
                    >
                      View Additional File {index + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderStepIndicator = () => {
    const stepLabels = ['Company Info', 'Insurance', 'Documents'];
    
    return (
      <div className="mb-8 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-medium text-indigo-600">
            {stepLabels[currentStep - 1]}
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
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={() => {
            setShowSubcontractors(false);
            setShowAdminDashboard(true);
          }}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Company Section
        </button>
        
      </div>


      {/* Header with Add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Sub-contractor Management</h2>
      </div>
      
      {/* Search Bar with Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search contractors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg-sm dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="w-full sm:w-auto">
          <button
            onClick={() => {
              setEditingContractor(null);
              setShowFormModal(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contractor
          </button>
        </div>
      </div>

      {/* Collapsible Reminders Section */}
      {reminders.length > 0 && (
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden shadow-lg">
            <button
              onClick={() => setShowReminders(!showReminders)}
              className="flex items-center justify-between w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Upcoming Reminders ({reminders.length})
              </h3>
              <ChevronDown 
                className={`h-5 w-5 text-gray-500 dark:text-gray-400 transform transition-transform duration-200 ${
                  showReminders ? 'rotate-180' : ''
                }`}
              />
            </button>
            {showReminders && (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {reminders.map((reminder, index) => (
                  <div
                    key={index}
                    className={`p-4 ${
                      reminder.severity === 'danger'
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : 'bg-yellow-50 dark:bg-yellow-900/20'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {reminder.title}
                        </h4>
                        <p
                          className={`text-sm ${
                            reminder.severity === 'danger'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-yellow-600 dark:text-yellow-400'
                          }`}
                        >
                          {reminder.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content with rounded table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block">
          {loading ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : error ? (
            <div className="text-center text-red-600 dark:text-red-400 py-4">
              {error}
            </div>
          ) : successMessage ? (
            <div className="text-center text-green-600 dark:text-green-400 py-4">
              {successMessage}
            </div>
          ) : subcontractors.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              No contractors found
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="min-w-full">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 rounded-lg" style={{ minWidth: '900px' }}>
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider first:rounded-tl-lg">
                        Company Name
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Services Provided
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        SWMS
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Insurance Exp Date
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Review Date
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Token
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider last:rounded-tr-lg">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredContractors.map((contractor) => (
                      <tr
                        key={contractor.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => handleEdit(contractor)}
                      >
                        <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">
                          <div className="max-w-32 truncate" title={contractor.company_name}>
                            {contractor.company_name}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">
                          <div className="max-w-32 truncate" title={contractor.services_provided}>
                            {contractor.services_provided}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">
                          <div className="max-w-32 truncate" title={contractor.address}>
                            {contractor.address}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-900 dark:text-white">
                          <div className="flex flex-col space-y-1">
                            <div className="max-w-28 truncate text-xs" title={contractor.phone}>
                              {contractor.phone}
                            </div>
                            <div className="max-w-28 truncate text-xs text-gray-500 dark:text-gray-400" title={contractor.email}>
                              {contractor.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          {contractor.swms ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                              Yes
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          {(() => {
                            const status = getDateStatus(
                              contractor.insurance_exp_date
                            );
                            const label = getStatusLabel(status, 'insurance');
                            return (
                              <div
                                className={`${getStatusStyle(
                                  status
                                )} dark:text-white`}
                              >
                                {formatDate(contractor.insurance_exp_date)}
                                {label && (
                                  <span
                                    className={`ml-2 text-xs font-medium ${
                                      status === 'expired'
                                        ? 'text-red-600 dark:text-red-400'
                                        : status === 'due_soon'
                                        ? 'text-orange-600 dark:text-orange-400'
                                        : 'text-gray-600 dark:text-gray-400'
                                    }`}
                                  >
                                    ({label})
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          {(() => {
                            const status = getDateStatus(contractor.review_date);
                            const label = getStatusLabel(status, 'review');
                            return (
                              <div
                                className={`${getStatusStyle(
                                  status
                                )} dark:text-white`}
                              >
                                {formatDate(contractor.review_date)}
                                {label && (
                                  <span
                                    className={`ml-2 text-xs font-medium ${
                                      status === 'expired'
                                        ? 'text-red-600 dark:text-red-400'
                                        : status === 'due_soon'
                                        ? 'text-orange-600 dark:text-orange-400'
                                        : 'text-gray-600 dark:text-gray-400'
                                    }`}
                                  >
                                    ({label})
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs">
                              {contractor.token || '-'}
                            </span>
                            {contractor.token && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyToken(contractor.token!);
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                title="Copy Token"
                              >
                                <Clipboard className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateToken(contractor.id);
                              }}
                              disabled={tokenLoading === contractor.id}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50"
                              title={contractor.token ? 'Regenerate Token' : 'Generate Token'}
                            >
                              <RefreshCw className={`h-4 w-4 ${tokenLoading === contractor.id ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(contractor);
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Edit"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReview(contractor);
                              }}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Contractor Review"
                            >
                              <ClipboardList className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGeneratePDF(contractor);
                              }}
                              disabled={generatingPdfId === contractor.id}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                              title="View PDF"
                            >
                              {generatingPdfId === contractor.id ? (
                                <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                              ) : (
                                <FileText className="h-5 w-5" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(contractor.id);
                              }}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Mobile/Tablet Cards */}
        <div className="lg:hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 dark:text-red-400 py-8">
              {error}
            </div>
          ) : successMessage ? (
            <div className="text-center text-green-600 dark:text-green-400 py-8">
              {successMessage}
            </div>
          ) : filteredContractors.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No contractors found
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {filteredContractors.map((contractor) => (
                <div 
                  key={contractor.id} 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleEdit(contractor)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{contractor.company_name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{contractor.services_provided}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(contractor);
                        }}
                        className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReview(contractor);
                        }}
                        className="p-2 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md"
                        title="Review"
                      >
                        <ClipboardList className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGeneratePDF(contractor);
                        }}
                        disabled={generatingPdfId === contractor.id}
                        className="p-2 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md disabled:opacity-50"
                        title="PDF"
                      >
                        {generatingPdfId === contractor.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(contractor.id);
                        }}
                        className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Address:</span>
                      <span className="text-gray-900 dark:text-white text-right">{contractor.address}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                      <span className="text-gray-900 dark:text-white">{contractor.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Email:</span>
                      <span className="text-gray-900 dark:text-white text-right break-all">{contractor.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">SWMS:</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${contractor.swms ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}`}>
                        {contractor.swms ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Insurance Exp:</span>
                      <span className={`text-right ${getStatusStyle(getDateStatus(contractor.insurance_exp_date))} dark:text-white`}>
                        {formatDate(contractor.insurance_exp_date)}
                        {(() => {
                          const status = getDateStatus(contractor.insurance_exp_date);
                          const label = getStatusLabel(status, 'insurance');
                          return label && (
                            <span className={`ml-1 text-xs ${status === 'expired' ? 'text-red-600 dark:text-red-400' : status === 'due_soon' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>
                              ({label})
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Review Date:</span>
                      <span className={`text-right ${getStatusStyle(getDateStatus(contractor.review_date))} dark:text-white`}>
                        {formatDate(contractor.review_date)}
                        {(() => {
                          const status = getDateStatus(contractor.review_date);
                          const label = getStatusLabel(status, 'review');
                          return label && (
                            <span className={`ml-1 text-xs ${status === 'expired' ? 'text-red-600 dark:text-red-400' : status === 'due_soon' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>
                              ({label})
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                    {contractor.token && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 dark:text-gray-400">Token:</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs text-gray-900 dark:text-white">{contractor.token}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyToken(contractor.token!);
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                            title="Copy Token"
                          >
                            <Clipboard className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals - Update modal backgrounds and text colors */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 overflow-y-auto flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg-xl p-6 max-w-md w-full m-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Confirm Delete
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-4">
              Are you sure you want to delete this contractor? This action
              cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 dark:hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showFormModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-lg-xl p-6 max-w-2xl w-full m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingContractor ? 'Edit' : 'Add'} Sub Contractor
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {renderStepIndicator()}

            <div className="mb-6">{renderFormStep()}</div>

            <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
              <button
                onClick={() => setShowFormModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-red-600 dark:hover:text-white"
              >
                Cancel
              </button>
              <div className="flex flex-col sm:flex-row gap-3">
                {currentStep > 1 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left h-4 w-4 mr-1 inline" style={{ marginTop: '-2px' }}><path d="m15 18-6-6 6-6"></path></svg>
                    Previous
                  </button>
                )}
                <button
                  onClick={() => {
                    if (currentStep < 4) {
                      setCurrentStep(currentStep + 1);
                    } else {
                      handleFormSubmit(formData);
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {currentStep === 4 ? 'Submit' : 'Next'}
                  {currentStep !== 4 && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right h-4 w-4 ml-1 inline" style={{ marginTop: '-2px' }}><path d="m9 18 6-6-6-6"></path></svg>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showReviewModal && selectedContractorForReview && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-lg shadow-lg-xl w-full max-w-full sm:max-w-4xl max-h-[500px] sm:max-h-[600px] flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Review for {selectedContractorForReview.company_name}
              </h3>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSubmitError(null);
                }}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {submitError && (
              <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
                {submitError}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-6">
                {/* Date and Text Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={reviewFormData.date}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Details of your requirements and scope of contract *
                    </label>
                    <textarea
                      value={reviewFormData.requirements_scope}
                      onChange={(e) => handleRequirementsChange(e.target.value)}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      What was the agreed timeframe for completion of the project? *
                    </label>
                    <input
                      type="text"
                      value={reviewFormData.agreed_timeframe}
                      onChange={(e) =>
                        handleReviewChange('agreed_timeframe', e.target.value)
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      What was the total time taken to complete the project? *
                    </label>
                    <input
                      type="text"
                      value={reviewFormData.total_time_taken}
                      onChange={(e) =>
                        handleReviewChange('total_time_taken', e.target.value)
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-lg-sm p-2"
                    />
                  </div>
                </div>

                {/* Satisfaction Ratings - Mobile Friendly */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Satisfaction Ratings</h4>
                  {[
                    {
                      key: 'quality_rating',
                      label: 'Overall quality of delivered project',
                    },
                    {
                      key: 'timeliness_rating',
                      label: 'Timeliness of project delivery',
                    },
                    {
                      key: 'communication_rating',
                      label: 'Communication throughout the project',
                    },
                    {
                      key: 'understanding_rating',
                      label: 'Contractors understanding of your needs',
                    },
                    {
                      key: 'cooperativeness_rating',
                      label:
                        'Cooperativeness of the Contractor in dealing with any issues or complaints',
                    },
                    {
                      key: 'overall_satisfaction_rating',
                      label: 'Overall satisfaction with the contractor',
                    },
                  ].map(({ key, label }) => (
                    <div key={key} className="border border-gray-200 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">{label}</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                        {[
                          { value: 'totally_dissatisfied', label: 'Totally dissatisfied' },
                          { value: 'mostly_dissatisfied', label: 'Mostly dissatisfied' },
                          { value: 'neither', label: 'Neither' },
                          { value: 'mostly_satisfied', label: 'Mostly satisfied' },
                          { value: 'totally_satisfied', label: 'Totally satisfied' },
                        ].map(({ value, label: ratingLabel }) => (
                          <button
                            key={value}
                            onClick={() =>
                              handleSatisfactionChange(
                                key as keyof ReviewFormData,
                                value
                              )
                            }
                            className={`
                              px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-center
                              ${
                                reviewFormData[key as keyof ReviewFormData]
                                  .rating === value
                                  ? value.includes('dissatisfied')
                                    ? 'bg-red-100 text-red-800 border-2 border-red-500'
                                    : value === 'neither'
                                    ? 'bg-gray-100 text-gray-800 border-2 border-gray-500'
                                    : 'bg-green-100 text-green-800 border-2 border-green-500'
                                  : 'bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-gray-400'
                              }
                            `}
                          >
                            {ratingLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Safety and Compliance Checklist */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">
                    Safety and Compliance Checklist
                  </h4>
                  {[
                    {
                      key: 'authority_to_work',
                      label:
                        'Is an authority to work document in place and on the job?',
                    },
                    {
                      key: 'relevant_permits',
                      label: 'Are relevant permits in place?',
                    },
                    {
                      key: 'risk_assessments',
                      label:
                        'Are necessary risk assessments available and on the job?',
                    },
                    {
                      key: 'documents_legible',
                      label:
                        'Are the authority to work, associated documents legible?',
                    },
                    {
                      key: 'time_limit_clear',
                      label:
                        'Is the operational time limit of the authority to work and permits clear?',
                    },
                    {
                      key: 'control_measures',
                      label:
                        "Are control measures in place as stated within the RAM's?",
                    },
                    {
                      key: 'work_in_line',
                      label:
                        'Is the work carried out in line with the authority to work?',
                    },
                    {
                      key: 'right_people',
                      label: 'Are the right people carrying out the task?',
                    },
                    {
                      key: 'emergency_knowledge',
                      label:
                        'Do people know what to do in the event of emergency? (ASK)',
                    },
                    {
                      key: 'ppe_condition',
                      label:
                        'Is the personal protective equipment (PPE) in use and in good order',
                    },
                    {
                      key: 'tools_condition',
                      label:
                        'Are tools and equipment suitable and in good condition?',
                    },
                    {
                      key: 'housekeeping_standards',
                      label: 'Are housekeeping standards satisfactory?',
                    },
                  ].map(({ key, label }) => (
                    <div key={key} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col space-y-3">
                        <span className="text-sm text-gray-700 font-medium">{label}</span>
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() =>
                              handleReviewChange(key as keyof ReviewFormData, true)
                            }
                            className={`
                              px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none
                              ${
                                reviewFormData[key as keyof ReviewFormData] === true
                                  ? 'bg-green-100 text-green-800 border-2 border-green-500'
                                  : 'bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-green-300'
                              }
                            `}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() =>
                              handleReviewChange(key as keyof ReviewFormData, false)
                            }
                            className={`
                              px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none
                              ${
                                reviewFormData[key as keyof ReviewFormData] ===
                                false
                                  ? 'bg-red-100 text-red-800 border-2 border-red-500'
                                  : 'bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-red-300'
                              }
                            `}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSubmitError(null);
                }}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={submittingReview}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
              >
                {submittingReview ? 'Saving...' : 'Save Review'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

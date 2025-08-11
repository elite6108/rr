import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Plus, Search, Edit, Pencil, Trash2, X, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { generateCoshhAssessmentPDF } from '../../../utils/pdf/coshh/coshhAssessmentPDFGenerator';

// PPE Constants - same as PPEScreen.tsx
const PRIORITY_PPE = [
  'Safety Gloves',
  'Safety Footwear',
  'Hi Vis Clothing',
  'Hard Hat',
  'Safety Goggles',
  'Hearing Protection',
  'Protective Clothing',
  'P3 Masks',
  'Face Shield',
  'Respirator Hoods'
];

const OTHER_PPE = [
  'Connect an earth terminal to the ground',
  'Disconnect before carrying out maintenance or repair',
  'Disconnect mains plug from electrical outlet',
  'Disinfect surface',
  'Disinfect your hands',
  'Ensure continuous ventilation',
  'Entry only with supervisor outside',
  'General mandatory action sign',
  'Install locks and keep locked',
  'Install or check guard',
  'Opaque eye protection must be worn',
  'Place trash in the bin',
  'Refer to instruction manual',
  'Secure gas cylinders',
  'Sound your horn',
  'Use barrier cream',
  'Use breathing equipment',
  'Use footbridge',
  'Use footwear with antistatic or antispark features',
  'Use gas detector',
  'Use guard to protect from injury from the table saw',
  'Use handrail',
  'Use protective apron',
  'Use this walkway',
  'Ventilate before and during entering',
  'Wash your hands',
  'Wear a safety harness',
  'Wear a welding mask',
  'Wear safety belts'
];

// Map of PPE names to their filenames
const PPE_FILENAMES = {
  'Safety Gloves': 'wear-protective-gloves.png',
  'Safety Footwear': 'wear-foot-protection.png',
  'Hi Vis Clothing': 'wear-high-visibility-clothing.png',
  'Hard Hat': 'wear-head-protection.png',
  'Safety Goggles': 'wear-eye-protection.png',
  'Hearing Protection': 'wear-ear-protection.png',
  'Protective Clothing': 'wear-protective-clothing.png',
  'P3 Masks': 'wear-a-mask.png',
  'Face Shield': 'wear-a-face-shield.png',
  'Respirator Hoods': 'wear-respiratory-protection.png',
  'Connect an earth terminal to the ground': 'connect-an-earth-terminal-to-the-ground.png',
  'Disconnect before carrying out maintenance or repair': 'disconnect-before-carrying-out-maintenance-or-repair.png',
  'Disconnect mains plug from electrical outlet': 'disconnect-mains-plug-from-electrical-outlet.png',
  'Disinfect surface': 'disinfect-surface.png',
  'Disinfect your hands': 'disinfect-your-hands.png',
  'Ensure continuous ventilation': 'ensure-continuous-ventilation.png',
  'Entry only with supervisor outside': 'entry-only-with-supervisor-outside.png',
  'General mandatory action sign': 'general-mandatory-action-sign.png',
  'Install locks and keep locked': 'install-locks-and-keep-locked.png',
  'Install or check guard': 'install-or-check-guard.png',
  'Opaque eye protection must be worn': 'opaque-eye-protection-must-be-worn.png',
  'Place trash in the bin': 'place-trash-in-the-bin.png',
  'Refer to instruction manual': 'refer-to-instruction-manual.png',
  'Secure gas cylinders': 'secure-gas-cylinders.png',
  'Sound your horn': 'sound-your-horn.png',
  'Use barrier cream': 'use-barrier-cream.png',
  'Use breathing equipment': 'use-breathing-equipment.png',
  'Use footbridge': 'use-footbridge.png',
  'Use footwear with antistatic or antispark features': 'use-footwear-with-anti-static-or-anti-spark-features.png',
  'Use gas detector': 'use-gas-detector.png',
  'Use guard to protect from injury from the table saw': 'use-guard-to-protect-from-injury-from-the-table-saw.png',
  'Use handrail': 'use-handrail.png',
  'Use protective apron': 'use-protective-apron.png',
  'Use this walkway': 'use-this-walkway.png',
  'Ventilate before and during entering': 'ventilate-before-and-during-entering.png',
  'Wash your hands': 'wash-your-hands.png',
  'Wear a safety harness': 'wear-a-safety-harness.png',
  'Wear a welding mask': 'wear-a-welding-mask.png',
  'Wear safety belts': 'wear-safety-belts.png'
};

// Hazard Constants for COSHH assessments
const HAZARDS = [
  'Acute Toxicity',
  'Corrosive', 
  'Flammable',
  'Gas Under Pressure',
  'Hazardous to Environment',
  'Health Hazard',
  'Oxidising',
  'Serious Health Hazard'
];

// Map of hazard names to their filenames in signage-artwork bucket
const HAZARD_FILENAMES = {
  'Acute Toxicity': 'acute-toxicity.png',
  'Corrosive': 'corrosive.png',
  'Flammable': 'flammable.png',
  'Gas Under Pressure': 'gas-under-pressure.png',
  'Hazardous to Environment': 'hazardous-to-environment.png',
  'Health Hazard': 'health-hazard.png',
  'Oxidising': 'oxidising.png',
  'Serious Health Hazard': 'serious-health-hazard.png'
};

// Function to get a signed URL for a hazard icon
const getSignedHazardImageUrl = async (filename: string) => {
  if (!filename) return null;
  
  try {
    const { data } = await supabase.storage
      .from('signage-artwork')
      .createSignedUrl(filename, 3600);
      
    return data?.signedUrl;
  } catch (error) {
    console.error('Error generating signed hazard URL:', error);
    return null;
  }
};

// Function to get a signed URL for a PPE icon
const getSignedImageUrl = async (filename: string) => {
  if (!filename) return null;
  
  try {
    const { data } = await supabase.storage
      .from('ppe-icons')
      .createSignedUrl(filename, 3600);
      
    return data?.signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
};

interface CoshhAssessmentsProps {
  onBack: () => void;
}

interface CoshhAssessment {
  id: string;
  substance_name: string;
  coshh_reference: string;
  supplied_by: string;
  description_of_substance: string;
  form: string;
  odour: string;
  method_of_use: string;
  site_and_location: string;
  assessment_date: string;
  review_date: string;
  persons_at_risk: string[];
  routes_of_entry: string[];
  selected_ppe: string[];
  selected_hazards: string[];
  ppe_location: string;
  hazards_precautions: string;
  carcinogen: boolean;
  sk: boolean;
  sen: boolean;
  ingredient_items: Array<{
    ingredient_name: string;
    wel_twa_8_hrs: string;
    stel_15_mins: string;
  }>;
  occupational_exposure: string;
  maximum_exposure: string;
  workplace_exposure: string;
  stel: string;
  stability_reactivity: string;
  ecological_information: string;
  amount_used: string;
  times_per_day: string;
  duration: string;
  how_often_process: string;
  how_long_process: string;
  general_precautions: string;
  first_aid_measures: string;
  accidental_release_measures: string;
  ventilation: string;
  handling: string;
  storage: string;
  further_controls: string;
  respiratory_protection: string;
  ppe_details: string;
  monitoring: string;
  health_surveillance: string;
  additional_control_items: string[];
  responsibility: string;
  by_when: string;
  spillage_procedure: string;
  fire_explosion: string;
  handling_storage: string;
  disposal_considerations: string;
  assessment_comments: string;
  q1_answer: boolean;
  q1_action: string;
  q2_answer: boolean;
  q2_action: string;
  q3_answer: boolean;
  q3_action: string;
  q4_answer: boolean;
  q4_action: string;
  q5_answer: boolean;
  q5_action: string;
  assessment_conclusion: string;
  hazard_level: string;
  assessor_name: string;
  created_at: string;
  updated_at: string;
}

export function CoshhAssessments({ onBack }: CoshhAssessmentsProps) {
  const [assessments, setAssessments] = useState<CoshhAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<CoshhAssessment | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [userProfile, setUserProfile] = useState<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [importExportMode, setImportExportMode] = useState<'import' | 'export'>('export');
  const [selectedForExport, setSelectedForExport] = useState<string | null>(null);
  const [ppeSearchQuery, setPpeSearchQuery] = useState('');
  const [hazardSearchQuery, setHazardSearchQuery] = useState('');
  const [loadingIcons, setLoadingIcons] = useState(true);
  const [iconUrls, setIconUrls] = useState<Record<string, string>>({});
  const [loadingHazardIcons, setLoadingHazardIcons] = useState(true);
  const [hazardIconUrls, setHazardIconUrls] = useState<Record<string, string>>({});

  // Add dynamic control items state
  const [controlItems, setControlItems] = useState<Array<{ id: string; item: string }>>([]);

  // Add dynamic ingredient items state
  const [ingredientItems, setIngredientItems] = useState<Array<{ id: string; ingredient_name: string; wel_twa_8_hrs: string; stel_15_mins: string }>>([]);

  // Helper function to get date 365 days from now
  const getDefaultReviewDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 365);
    return date.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    id: '',
    substance_name: '',
    coshh_reference: '',
    supplied_by: '',
    description_of_substance: '',
    form: '',
    odour: '',
    method_of_use: '',
    site_and_location: '',
    assessment_date: new Date().toISOString().split('T')[0],
    review_date: getDefaultReviewDate(),
    persons_at_risk: [] as string[],
    routes_of_entry: [] as string[],
    selected_ppe: [] as string[],
    selected_hazards: [] as string[],
    ppe_location: '',
    hazards_precautions: '',
    carcinogen: false,
    sk: false,
    sen: false,
    ingredient_items: [] as Array<{
      ingredient_name: string;
      wel_twa_8_hrs: string;
      stel_15_mins: string;
    }>,
    occupational_exposure: '',
    maximum_exposure: '',
    workplace_exposure: '',
    stel: '',
    stability_reactivity: '',
    ecological_information: '',
    amount_used: '',
    times_per_day: '',
    duration: '',
    how_often_process: '',
    how_long_process: '',
    general_precautions: '',
    first_aid_measures: '',
    accidental_release_measures: '',
    ventilation: '',
    handling: '',
    storage: '',
    further_controls: '',
    respiratory_protection: '',
    ppe_details: '',
    monitoring: '',
    health_surveillance: '',
    responsibility: '',
    by_when: '',
    spillage_procedure: '',
    fire_explosion: '',
    handling_storage: '',
    disposal_considerations: '',
    assessment_comments: '',
    additional_control_items: [] as string[],
    q1_answer: true,
    q1_action: '',
    q2_answer: true,
    q2_action: '',
    q3_answer: true,
    q3_action: '',
    q4_answer: true,
    q4_action: '',
    q5_answer: true,
    q5_action: '',
    assessment_conclusion: '',
    hazard_level: '',
    assessor_name: userProfile?.full_name || '',
    created_at: '',
    updated_at: ''
  });

  useEffect(() => {
    fetchAssessments();
    fetchUserProfile();
  }, []);

  // Load signed URLs for all PPE icons in parallel
  useEffect(() => {
    const loadIconUrls = async () => {
      setLoadingIcons(true);
      try {
        const urlPromises = Object.entries(PPE_FILENAMES).map(async ([ppe, filename]) => {
          const url = await getSignedImageUrl(filename);
          return [ppe, url] as [string, string | null];
        });

        const results = await Promise.all(urlPromises);
        const urls: Record<string, string> = {};
        results.forEach(([ppe, url]) => {
          if (url) {
            urls[ppe] = url;
          }
        });
        setIconUrls(urls);
      } catch (error) {
        console.error('Error loading PPE icons:', error);
      } finally {
        setLoadingIcons(false);
      }
    };

    loadIconUrls();
  }, []);

  // Refresh signed URLs every 45 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const urlPromises = Object.entries(PPE_FILENAMES).map(async ([ppe, filename]) => {
          const url = await getSignedImageUrl(filename);
          return [ppe, url] as [string, string | null];
        });

        const results = await Promise.all(urlPromises);
        const urls: Record<string, string> = {};
        results.forEach(([ppe, url]) => {
          if (url) {
            urls[ppe] = url;
          }
        });
        setIconUrls(urls);
      } catch (error) {
        console.error('Error refreshing PPE icons:', error);
      }
    }, 45 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Load signed URLs for all hazard icons in parallel
  useEffect(() => {
    const loadHazardIconUrls = async () => {
      setLoadingHazardIcons(true);
      try {
        const urlPromises = Object.entries(HAZARD_FILENAMES).map(async ([hazard, filename]) => {
          const url = await getSignedHazardImageUrl(filename);
          return [hazard, url] as [string, string | null];
        });

        const results = await Promise.all(urlPromises);
        const urls: Record<string, string> = {};
        results.forEach(([hazard, url]) => {
          if (url) {
            urls[hazard] = url;
          }
        });
        setHazardIconUrls(urls);
      } catch (error) {
        console.error('Error loading hazard icons:', error);
      } finally {
        setLoadingHazardIcons(false);
      }
    };

    loadHazardIconUrls();
  }, []);

  // Refresh hazard signed URLs every 45 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const urlPromises = Object.entries(HAZARD_FILENAMES).map(async ([hazard, filename]) => {
          const url = await getSignedHazardImageUrl(filename);
          return [hazard, url] as [string, string | null];
        });

        const results = await Promise.all(urlPromises);
        const urls: Record<string, string> = {};
        results.forEach(([hazard, url]) => {
          if (url) {
            urls[hazard] = url;
          }
        });
        setHazardIconUrls(urls);
      } catch (error) {
        console.error('Error refreshing hazard icons:', error);
      }
    }, 45 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Prevent body scroll when any modal is open
  useEffect(() => {
    const isModalOpen = showAddModal || showEditModal || showDeleteModal || showImportExportModal;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal, showEditModal, showDeleteModal, showImportExportModal]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.display_name) {
        setUserProfile({ full_name: user.user_metadata.display_name });
      } else {
        setUserProfile({ full_name: 'Unknown User' });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile({ full_name: 'Unknown User' });
    }
  };

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coshh_assessments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssessments(data || []);
    } catch (error) {
      console.error('Error fetching COSHH assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNextCoshhReference = async (): Promise<string> => {
    try {
      // Fetch all assessments to find the highest COSHH reference number
      const { data, error } = await supabase
        .from('coshh_assessments')
        .select('coshh_reference')
        .order('coshh_reference', { ascending: false });

      if (error) throw error;

      let nextNumber = 1;

      if (data && data.length > 0) {
        // Find the highest number from existing COSHH references
        for (const assessment of data) {
          if (assessment.coshh_reference && assessment.coshh_reference.startsWith('COSHH-')) {
            const numberPart = assessment.coshh_reference.substring(6); // Remove 'COSHH-'
            const currentNumber = parseInt(numberPart, 10);
            if (!isNaN(currentNumber) && currentNumber >= nextNumber) {
              nextNumber = currentNumber + 1;
            }
          }
        }
      }

      // Format with zero padding to 5 digits
      return `COSHH-${nextNumber.toString().padStart(5, '0')}`;
    } catch (error) {
      console.error('Error generating COSHH reference:', error);
      return `COSHH-00001`; // Fallback to first number
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      substance_name: '',
      coshh_reference: '',
      supplied_by: '',
      description_of_substance: '',
      form: '',
      odour: '',
      method_of_use: '',
      site_and_location: '',
      assessment_date: new Date().toISOString().split('T')[0],
      review_date: getDefaultReviewDate(),
      persons_at_risk: [],
      routes_of_entry: [],
      selected_ppe: [],
      selected_hazards: [],
      ppe_location: '',
      hazards_precautions: '',
      carcinogen: false,
      sk: false,
      sen: false,
      ingredient_items: [],
      occupational_exposure: '',
      maximum_exposure: '',
      workplace_exposure: '',
      stel: '',
      stability_reactivity: '',
      ecological_information: '',
      amount_used: '',
      times_per_day: '',
      duration: '',
      how_often_process: '',
      how_long_process: '',
      general_precautions: '',
      first_aid_measures: '',
      accidental_release_measures: '',
      ventilation: '',
      handling: '',
      storage: '',
      further_controls: '',
      respiratory_protection: '',
      ppe_details: '',
      monitoring: '',
      health_surveillance: '',
      responsibility: '',
      by_when: '',
      spillage_procedure: '',
      fire_explosion: '',
      handling_storage: '',
      disposal_considerations: '',
      assessment_comments: '',
      additional_control_items: [],
      q1_answer: true,
      q1_action: '',
      q2_answer: true,
      q2_action: '',
      q3_answer: true,
      q3_action: '',
      q4_answer: true,
      q4_action: '',
      q5_answer: true,
      q5_action: '',
      assessment_conclusion: '',
      hazard_level: '',
      assessor_name: userProfile?.full_name || '',
      created_at: '',
      updated_at: ''
    });
    setCurrentStep(1);
    // Reset control items and ingredient items
    setControlItems([]);
    setIngredientItems([]);
  };

  const handleAdd = async () => {
    const nextReference = await generateNextCoshhReference();
    setFormData({
      id: '',
      substance_name: '',
      coshh_reference: nextReference,
      supplied_by: '',
      description_of_substance: '',
      form: '',
      odour: '',
      method_of_use: '',
      site_and_location: '',
      assessment_date: new Date().toISOString().split('T')[0],
      review_date: getDefaultReviewDate(),
      persons_at_risk: [],
      routes_of_entry: [],
      selected_ppe: [],
      selected_hazards: [],
      ppe_location: '',
      hazards_precautions: '',
      carcinogen: false,
      sk: false,
      sen: false,
      ingredient_items: [],
      occupational_exposure: '',
      maximum_exposure: '',
      workplace_exposure: '',
      stel: '',
      stability_reactivity: '',
      ecological_information: '',
      amount_used: '',
      times_per_day: '',
      duration: '',
      how_often_process: '',
      how_long_process: '',
      general_precautions: '',
      first_aid_measures: '',
      accidental_release_measures: '',
      ventilation: '',
      handling: '',
      storage: '',
      further_controls: '',
      respiratory_protection: '',
      ppe_details: '',
      monitoring: '',
      health_surveillance: '',
      responsibility: '',
      by_when: '',
      spillage_procedure: '',
      fire_explosion: '',
      handling_storage: '',
      disposal_considerations: '',
      assessment_comments: '',
      additional_control_items: [],
      q1_answer: true,
      q1_action: '',
      q2_answer: true,
      q2_action: '',
      q3_answer: true,
      q3_action: '',
      q4_answer: true,
      q4_action: '',
      q5_answer: true,
      q5_action: '',
      assessment_conclusion: '',
      hazard_level: '',
      assessor_name: userProfile?.full_name || '',
      created_at: '',
      updated_at: ''
    });
    setCurrentStep(1);
    setControlItems([]);
    setIngredientItems([]);
    setShowAddModal(true);
  };

  const handleEdit = (assessment: CoshhAssessment) => {
    setFormData(assessment);
    setSelectedAssessment(assessment);
    setCurrentStep(1);
    // Load existing control items if they exist
    if (assessment.additional_control_items && assessment.additional_control_items.length > 0) {
      const items = assessment.additional_control_items.map((item, index) => ({
        id: Date.now().toString() + index,
        item: item
      }));
      setControlItems(items);
    } else {
      setControlItems([]);
    }
    // Load existing ingredient items if they exist
    if (assessment.ingredient_items && assessment.ingredient_items.length > 0) {
      const items = assessment.ingredient_items.map((item, index) => ({
        id: Date.now().toString() + index,
        ...item
      }));
      setIngredientItems(items);
    } else {
      setIngredientItems([]);
    }
    setShowEditModal(true);
  };

  const handleDelete = (assessment: CoshhAssessment) => {
    setSelectedAssessment(assessment);
    setShowDeleteModal(true);
  };

  const handleViewPDF = async (assessment: CoshhAssessment) => {
    try {
      setDownloadingPDF(true);

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
            <p>Generating COSHH Assessment PDF...</p>
          </div>
        </body>
        </html>
      `);

      console.log('Starting PDF generation for assessment:', assessment.substance_name);
      console.log('Full assessment object:', assessment);
      console.log('Assessment persons_at_risk type:', typeof assessment.persons_at_risk);
      console.log('Assessment persons_at_risk value:', assessment.persons_at_risk);
      console.log('Assessment routes_of_entry type:', typeof assessment.routes_of_entry);
      console.log('Assessment routes_of_entry value:', assessment.routes_of_entry);
      console.log('Assessment selected_ppe type:', typeof assessment.selected_ppe);
      console.log('Assessment selected_ppe value:', assessment.selected_ppe);
      console.log('Assessment selected_hazards type:', typeof assessment.selected_hazards);
      console.log('Assessment selected_hazards value:', assessment.selected_hazards);
      
      // Check if jsPDF is available
      try {
        await import('jspdf');
      } catch (importError) {
        throw new Error('jsPDF library is not installed. Please add "jspdf": "^2.5.1" and "jspdf-autotable": "^3.8.0" to your package.json dependencies.');
      }
      
      const pdfDataUrl = await generateCoshhAssessmentPDF(assessment);
      console.log('PDF generated successfully, data URL length:', pdfDataUrl.length);
      
      // Format filename with assessment name and date
      const formattedDate = new Date().toISOString().split('T')[0];
      const substanceName = assessment.substance_name.replace(/[^a-zA-Z0-9]/g, '-');
      const formattedFilename = `COSHH-Assessment-${substanceName}-${formattedDate}.pdf`;

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
                <h2>COSHH Assessment PDF Ready for Download</h2>
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
                if (confirm('Would you like to download the COSHH Assessment PDF now?')) {
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
        // Desktop/non-iOS - iframe approach
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${formattedFilename}</title>
          <meta charset="UTF-8">
          <meta name="filename" content="${formattedFilename}">
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
            #pdf-name { font-weight: bold; margin-left: 10px; }
          </style>
        </head>
        <body>
          <div class="download-bar">
            <a id="download-btn" class="download-button" href="#">Download ${formattedFilename}</a>
          </div>
          <div class="pdf-view">
            <iframe id="pdf-iframe" style="width:100%; height:100%; border:none;"></iframe>
          </div>
          <script>
            // Store PDF data and filename
            const pdfDataUrl = "${pdfDataUrl}";
            const fileName = "${formattedFilename}";
            document.title = fileName;
            
            // Convert base64 data URL to Blob
            const base64Data = pdfDataUrl.split(',')[1];
            const binaryData = atob(base64Data);
            const array = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
              array[i] = binaryData.charCodeAt(i);
            }
            
            // Create PDF blob
            const pdfBlob = new Blob([array], {type: 'application/pdf'});
            
            // Create object URL
            const pdfUrl = URL.createObjectURL(pdfBlob);
            
            // Set iframe source to view PDF
            document.getElementById('pdf-iframe').src = pdfUrl;
            
            // Set up download button
            const downloadBtn = document.getElementById('download-btn');
            downloadBtn.addEventListener('click', function(e) {
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
                downloadBtn.click();
              }
            });

            // Helper function to force download with proper filename
            function forceDownload(blob, filename) {
              const a = document.createElement('a');
              const url = URL.createObjectURL(blob);
              a.href = url;
              a.download = filename || 'download';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }

            // Clean up when the window is closed
            window.addEventListener('beforeunload', function() {
              URL.revokeObjectURL(pdfUrl);
            });
            
            // For browsers that don't support download attribute properly
            if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
              downloadBtn.addEventListener('click', function(e) {
                e.preventDefault();
                alert('To download this PDF with the correct filename, please use the keyboard shortcut Command+S and manually type "${formattedFilename}" in the filename field.');
              });
            }
          </script>
        </body>
        </html>
        `;
        
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('Error generating COSHH assessment PDF:', error);
      if (error instanceof Error && error.message.includes('jsPDF')) {
        alert(`PDF Library Missing!\n\nTo enable PDF generation, you need to install the required dependencies:\n\n1. Add to package.json:\n   "jspdf": "^2.5.1"\n   "jspdf-autotable": "^3.8.0"\n\n2. Run: npm install\n\nError: ${error.message}`);
      } else {
        alert(`Failed to generate PDF. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setDownloadingPDF(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedAssessment) return;

    try {
      const { error } = await supabase
        .from('coshh_assessments')
        .delete()
        .eq('id', selectedAssessment.id);

      if (error) throw error;
      
      setAssessments(assessments.filter(a => a.id !== selectedAssessment.id));
      setShowDeleteModal(false);
      setSelectedAssessment(null);
    } catch (error) {
      console.error('Error deleting assessment:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep < 13) {
      nextStep();
      return;
    }

    try {
      setError(null);
      
      // Convert control items to array of strings
      const controlItemsArray = controlItems.map(item => item.item).filter(item => item.trim() !== '');
      
      // Convert ingredient items
      const ingredientItemsArray = ingredientItems.map(item => ({
        ingredient_name: item.ingredient_name,
        wel_twa_8_hrs: item.wel_twa_8_hrs,
        stel_15_mins: item.stel_15_mins
      })).filter(item => item.ingredient_name.trim() !== '');
      
      const submitData = {
        ...formData,
        additional_control_items: controlItemsArray,
        ingredient_items: ingredientItemsArray,
        assessor_name: userProfile?.full_name || ''
      };

      if (showEditModal && selectedAssessment) {
        const { error } = await supabase
          .from('coshh_assessments')
          .update(submitData)
          .eq('id', selectedAssessment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coshh_assessments')
          .insert([submitData]);

        if (error) throw error;
      }

      // Reset form and close modal
      setShowAddModal(false);
      setShowEditModal(false);
      resetForm();
      
      // Refresh assessments list
      fetchAssessments();
    } catch (error) {
      console.error('Error saving assessment:', error);
      setError('Failed to save assessment. Please try again.');
    }
  };

  const handleExport = (assessment: CoshhAssessment) => {
    // Create export object with all assessment fields
    const exportData = {
      substance_name: assessment.substance_name,
      supplied_by: assessment.supplied_by,
      description_of_substance: assessment.description_of_substance,
      form: assessment.form,
      odour: assessment.odour,
      method_of_use: assessment.method_of_use,
      site_and_location: assessment.site_and_location,
      assessment_date: assessment.assessment_date,
      review_date: assessment.review_date,
      persons_at_risk: assessment.persons_at_risk,
      routes_of_entry: assessment.routes_of_entry,
      selected_ppe: assessment.selected_ppe,
      selected_hazards: assessment.selected_hazards,
      ppe_location: assessment.ppe_location,
      hazards_precautions: assessment.hazards_precautions,
      carcinogen: assessment.carcinogen,
      sk: assessment.sk,
      sen: assessment.sen,
      ingredient_items: assessment.ingredient_items,
      occupational_exposure: assessment.occupational_exposure,
      maximum_exposure: assessment.maximum_exposure,
      workplace_exposure: assessment.workplace_exposure,
      stel: assessment.stel,
      stability_reactivity: assessment.stability_reactivity,
      ecological_information: assessment.ecological_information,
      amount_used: assessment.amount_used,
      times_per_day: assessment.times_per_day,
      duration: assessment.duration,
      how_often_process: assessment.how_often_process,
      how_long_process: assessment.how_long_process,
      general_precautions: assessment.general_precautions,
      first_aid_measures: assessment.first_aid_measures,
      accidental_release_measures: assessment.accidental_release_measures,
      ventilation: assessment.ventilation,
      handling: assessment.handling,
      storage: assessment.storage,
      further_controls: assessment.further_controls,
      respiratory_protection: assessment.respiratory_protection,
      ppe_details: assessment.ppe_details,
      monitoring: assessment.monitoring,
      health_surveillance: assessment.health_surveillance,
      responsibility: assessment.responsibility,
      by_when: assessment.by_when,
      spillage_procedure: assessment.spillage_procedure,
      fire_explosion: assessment.fire_explosion,
      handling_storage: assessment.handling_storage,
      disposal_considerations: assessment.disposal_considerations,
      assessment_comments: assessment.assessment_comments,
      additional_control_items: assessment.additional_control_items,
      q1_answer: assessment.q1_answer,
      q1_action: assessment.q1_action,
      q2_answer: assessment.q2_answer,
      q2_action: assessment.q2_action,
      q3_answer: assessment.q3_answer,
      q3_action: assessment.q3_action,
      q4_answer: assessment.q4_answer,
      q4_action: assessment.q4_action,
      q5_answer: assessment.q5_answer,
      q5_action: assessment.q5_action,
      assessment_conclusion: assessment.assessment_conclusion,
      hazard_level: assessment.hazard_level,
      assessor_name: assessment.assessor_name
    };

    // Create and download the file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coshh_assessment_${assessment.coshh_reference}_${assessment.substance_name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowImportExportModal(false);
    setSelectedForExport(null);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);

        // Generate new COSHH reference
        const nextReference = await generateNextCoshhReference();

        // Create form data with imported values
        const newAssessment = {
          substance_name: importData.substance_name || '',
          coshh_reference: nextReference,
          supplied_by: importData.supplied_by || '',
          description_of_substance: importData.description_of_substance || '',
          form: importData.form || '',
          odour: importData.odour || '',
          method_of_use: importData.method_of_use || '',
          site_and_location: importData.site_and_location || '',
          assessment_date: importData.assessment_date || new Date().toISOString().split('T')[0],
          review_date: importData.review_date || getDefaultReviewDate(),
          persons_at_risk: Array.isArray(importData.persons_at_risk) ? importData.persons_at_risk : [],
          routes_of_entry: Array.isArray(importData.routes_of_entry) ? importData.routes_of_entry : [],
          selected_ppe: Array.isArray(importData.selected_ppe) ? importData.selected_ppe : [],
          selected_hazards: Array.isArray(importData.selected_hazards) ? importData.selected_hazards : [],
          ppe_location: importData.ppe_location || '',
          hazards_precautions: importData.hazards_precautions || '',
          carcinogen: importData.carcinogen !== undefined ? importData.carcinogen : false,
          sk: importData.sk !== undefined ? importData.sk : false,
          sen: importData.sen !== undefined ? importData.sen : false,
          ingredient_items: Array.isArray(importData.ingredient_items) ? importData.ingredient_items : [],
          occupational_exposure: importData.occupational_exposure || '',
          maximum_exposure: importData.maximum_exposure || '',
          workplace_exposure: importData.workplace_exposure || '',
          stel: importData.stel || '',
          stability_reactivity: importData.stability_reactivity || '',
          ecological_information: importData.ecological_information || '',
          amount_used: importData.amount_used || '',
          times_per_day: importData.times_per_day || '',
          duration: importData.duration || '',
          how_often_process: importData.how_often_process || '',
          how_long_process: importData.how_long_process || '',
          general_precautions: importData.general_precautions || '',
          first_aid_measures: importData.first_aid_measures || '',
          accidental_release_measures: importData.accidental_release_measures || '',
          ventilation: importData.ventilation || '',
          handling: importData.handling || '',
          storage: importData.storage || '',
          further_controls: importData.further_controls || '',
          respiratory_protection: importData.respiratory_protection || '',
          ppe_details: importData.ppe_details || '',
          monitoring: importData.monitoring || '',
          health_surveillance: importData.health_surveillance || '',
          responsibility: importData.responsibility || '',
          by_when: importData.by_when || '',
          spillage_procedure: importData.spillage_procedure || '',
          fire_explosion: importData.fire_explosion || '',
          handling_storage: importData.handling_storage || '',
          disposal_considerations: importData.disposal_considerations || '',
          assessment_comments: importData.assessment_comments || '',
          additional_control_items: Array.isArray(importData.additional_control_items) ? importData.additional_control_items : [],
          q1_answer: importData.q1_answer !== undefined ? importData.q1_answer : true,
          q1_action: importData.q1_action || '',
          q2_answer: importData.q2_answer !== undefined ? importData.q2_answer : true,
          q2_action: importData.q2_action || '',
          q3_answer: importData.q3_answer !== undefined ? importData.q3_answer : true,
          q3_action: importData.q3_action || '',
          q4_answer: importData.q4_answer !== undefined ? importData.q4_answer : true,
          q4_action: importData.q4_action || '',
          q5_answer: importData.q5_answer !== undefined ? importData.q5_answer : true,
          q5_action: importData.q5_action || '',
          assessment_conclusion: importData.assessment_conclusion || '',
          hazard_level: importData.hazard_level || '',
          assessor_name: userProfile?.full_name || ''
        };

        // Insert into database
        const { error } = await supabase
          .from('coshh_assessments')
          .insert([newAssessment]);

        if (error) throw error;

        // Refresh assessments list
        await fetchAssessments();
        setShowImportExportModal(false);
        
        // Reset file input
        event.target.value = '';

      } catch (error) {
        console.error('Import error:', error);
        setError('Failed to import assessment. Please check the file format.');
      }
    };

    reader.readAsText(file);
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 13));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const renderStepIndicator = () => {
    const stepLabels = [
      'COSHH Assessment Sheet',
      'Hazards & PPE',
      'Chemical Properties',
      'Hazard Exposure Limits',
      'Frequency & Duration',
      'Substance Properties',
      'Control Methods',
      'Additional Controls',
      'Spillage & Storage',
      'Assessment Comments',
      'Assessor Summary',
      'Assessment Decision',
      'Final Details'
    ];
    
    return (
      <div className="mb-8 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-medium text-indigo-600">
            {stepLabels[currentStep - 1]}
          </div>
          <div className="text-sm text-gray-500">
            Step {currentStep} of 13
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${(currentStep / 13) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  const toggleArrayValue = (array: string[], value: string) => {
    if (array.includes(value)) {
      return array.filter(item => item !== value);
    } else {
      return [...array, value];
    }
  };

  // PPE helper functions
  const togglePPE = (ppe: string) => {
    const newSelected = formData.selected_ppe.includes(ppe)
      ? formData.selected_ppe.filter(p => p !== ppe)
      : [...formData.selected_ppe, ppe];
    
    setFormData({...formData, selected_ppe: newSelected});
  };

  const filterPPE = (items: string[]) => {
    return items.filter(ppe => 
      ppe.toLowerCase().includes(ppeSearchQuery.toLowerCase())
    );
  };

  // Hazard helper functions
  const toggleHazard = (hazard: string) => {
    const newSelected = formData.selected_hazards.includes(hazard)
      ? formData.selected_hazards.filter(h => h !== hazard)
      : [...formData.selected_hazards, hazard];
    
    setFormData({...formData, selected_hazards: newSelected});
  };

  const filterHazards = (items: string[]) => {
    return items.filter(hazard => 
      hazard.toLowerCase().includes(hazardSearchQuery.toLowerCase())
    );
  };

  const filteredAssessments = assessments.filter(assessment =>
    assessment.substance_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assessment.coshh_reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Very High': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800';
      case 'Expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Add functions for managing dynamic control items
  const addControlItem = () => {
    const newItem = {
      id: Date.now().toString(),
      item: ''
    };
    setControlItems([...controlItems, newItem]);
  };

  const removeControlItem = (id: string) => {
    setControlItems(controlItems.filter(item => item.id !== id));
  };

  const updateControlItem = (id: string, value: string) => {
    setControlItems(controlItems.map(item => 
      item.id === id ? { ...item, item: value } : item
    ));
  };

  // Add functions for managing dynamic ingredient items
  const addIngredientItem = () => {
    const newItem = {
      id: Date.now().toString(),
      ingredient_name: '',
      wel_twa_8_hrs: '',
      stel_15_mins: ''
    };
    setIngredientItems([...ingredientItems, newItem]);
  };

  const removeIngredientItem = (id: string) => {
    setIngredientItems(ingredientItems.filter(item => item.id !== id));
  };

  const updateIngredientItem = (id: string, field: string, value: string) => {
    setIngredientItems(ingredientItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

    return (
      <div>
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
          <button
          onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
          Back to COSHH Management
          </button>
        </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          COSHH Assessments
        </h2>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search assessments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleAdd}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Assessment
          </button>
          <button
            onClick={() => {
              setImportExportMode('export');
              setSelectedForExport(null);
              setShowImportExportModal(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FileText className="h-4 w-4 mr-2" />
            Import - Export
          </button>
        </div>
      </div>

      {/* Assessments Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Substance Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  COSHH Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Assessment Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Review Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Assessor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredAssessments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No assessments found. Click "Add Assessment" to get started.
                  </td>
                </tr>
              ) : (
                filteredAssessments.map((assessment) => (
                  <tr 
                    key={assessment.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleEdit(assessment)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {assessment.substance_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {assessment.coshh_reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {assessment.assessment_date ? new Date(assessment.assessment_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {assessment.review_date ? new Date(assessment.review_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {assessment.assessor_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <div className="flex justify-end space-x-4">
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleEdit(assessment);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleViewPDF(assessment);
                          }}
                          disabled={downloadingPDF}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                          title={downloadingPDF ? "Generating PDF..." : "View PDF"}
                        >
                          <FileText className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleDelete(assessment);
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden">
          {loading ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No assessments found. Click "Add Assessment" to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAssessments.map((assessment) => (
                <div key={assessment.id} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm mx-4 my-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                        {assessment.substance_name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {assessment.coshh_reference}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(assessment)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleViewPDF(assessment)}
                        disabled={downloadingPDF}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-50"
                        title={downloadingPDF ? "Generating PDF..." : "View PDF"}
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(assessment)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Assessment Date:</span>
                      <p className="text-gray-900 dark:text-white mt-1">
                        {assessment.assessment_date ? new Date(assessment.assessment_date).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Review Date:</span>
                      <p className="text-gray-900 dark:text-white mt-1">
                        {assessment.review_date ? new Date(assessment.review_date).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Assessor:</span>
                      <p className="text-gray-900 dark:text-white mt-1">{assessment.assessor_name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 overflow-y-auto flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full m-4">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
              Confirm Deletion
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Are you sure you want to delete this assessment for {selectedAssessment?.substance_name}? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Import-Export Modal */}
      {showImportExportModal && createPortal(
        <>
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 z-50"></div>
          <div className="fixed inset-0 overflow-y-auto flex items-center justify-center z-50 min-h-screen">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full m-4 my-8">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Import - Export COSHH Assessments
                </h3>
                <button
                  onClick={() => {
                    setShowImportExportModal(false);
                    setSelectedForExport(null);
                  }}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6">
                {/* Mode Selection */}
                <div className="flex space-x-4 mb-6">
                  <button
                    onClick={() => setImportExportMode('export')}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                      importExportMode === 'export'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Export
                  </button>
                  <button
                    onClick={() => setImportExportMode('import')}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                      importExportMode === 'import'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Plus className="h-4 w-4 inline mr-2" />
                    Import
                  </button>
                </div>

                {/* Export Mode */}
                {importExportMode === 'export' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select COSHH Assessment to Export
                      </label>
                      <select
                        value={selectedForExport || ''}
                        onChange={(e) => setSelectedForExport(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      >
                        <option value="">Select a COSHH assessment...</option>
                        {assessments.map((assessment) => (
                          <option key={assessment.id} value={assessment.id}>
                            {assessment.coshh_reference} - {assessment.substance_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      * Exports all editable fields including substance details and form data. COSHH reference will be auto-generated on import.
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowImportExportModal(false);
                          setSelectedForExport(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (selectedForExport) {
                            const assessment = assessments.find(a => a.id === selectedForExport);
                            if (assessment) handleExport(assessment);
                          }
                        }}
                        disabled={!selectedForExport}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FileText className="h-4 w-4 inline mr-2" />
                        Export
                      </button>
                    </div>
                  </div>
                )}

                {/* Import Mode */}
                {importExportMode === 'import' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select File to Import
                      </label>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900 dark:file:text-indigo-300 dark:hover:file:bg-indigo-800"
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      * Import will create a new COSHH assessment with a new COSHH reference. Select a JSON file exported from this system.
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setShowImportExportModal(false);
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Add/Edit Assessment Modal */}
      {(showAddModal || showEditModal) && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 overflow-y-auto flex items-center justify-center z-50 p-4">
          <div ref={modalRef} className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {showAddModal ? 'Add' : 'Edit'} COSHH Assessment
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {renderStepIndicator()}
            
            <form onSubmit={handleSubmit}>
              {/* Step 1: COSHH Assessment Sheet */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name of Substance *
                      </label>
                      <input
                        type="text"
                        value={formData.substance_name}
                        onChange={(e) => setFormData({...formData, substance_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        COSHH Reference *
                      </label>
                      <input
                        type="text"
                        value={formData.coshh_reference}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white bg-gray-50 dark:bg-gray-600"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-generated sequential reference number</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Supplied by *
                      </label>
                      <input
                        type="text"
                        value={formData.supplied_by}
                        onChange={(e) => setFormData({...formData, supplied_by: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Date of Assessment *
                      </label>
                      <input
                        type="date"
                        value={formData.assessment_date}
                        onChange={(e) => setFormData({...formData, assessment_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description of Substance *
                      </label>
                      <textarea
                        value={formData.description_of_substance}
                        onChange={(e) => setFormData({...formData, description_of_substance: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Form <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <select
                        value={formData.form}
                        onChange={(e) => setFormData({...formData, form: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select Form</option>
                        <option value="Liquid">Liquid</option>
                        <option value="Gas">Gas</option>
                        <option value="Paste">Paste</option>
                        <option value="Solid">Solid</option>
                        <option value="Powder">Powder</option>
                        <option value="Granules">Granules</option>
                        <option value="Aerosol">Aerosol</option>
                        <option value="Foam">Foam</option>
                        <option value="Gel">Gel</option>
                        <option value="Cream">Cream</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Odour <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.odour}
                        onChange={(e) => setFormData({...formData, odour: e.target.value})}
                        placeholder="Describe the odour"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Method of Use *
                      </label>
                      <textarea
                        value={formData.method_of_use}
                        onChange={(e) => setFormData({...formData, method_of_use: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Site and Location *
                      </label>
                      <textarea
                        value={formData.site_and_location}
                        onChange={(e) => setFormData({...formData, site_and_location: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Review Date <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={formData.review_date}
                        onChange={(e) => setFormData({...formData, review_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Persons at Risk <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {['Staff', 'Public', 'Young/Pregnant workers', 'Visitors', 'Contractors'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setFormData({
                            ...formData, 
                            persons_at_risk: toggleArrayValue(formData.persons_at_risk, option)
                          })}
                          className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                            formData.persons_at_risk.includes(option)
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Hazards & PPE */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Routes of Entry <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Inhalation', 'Absorption', 'Ingestion'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setFormData({
                            ...formData, 
                            routes_of_entry: toggleArrayValue(formData.routes_of_entry, option)
                          })}
                          className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                            formData.routes_of_entry.includes(option)
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Select PPE <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    
                    {/* PPE Search Box */}
                    <div className="relative mb-4">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={ppeSearchQuery}
                        onChange={(e) => setPpeSearchQuery(e.target.value)}
                        placeholder="Search PPE items..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
                      />
                    </div>

                    {/* PPE Selection Grid */}
                    <div className="overflow-y-auto max-h-[300px] space-y-4">
                      {/* Priority PPE Section */}
                      {(ppeSearchQuery === '' || filterPPE(PRIORITY_PPE).length > 0) && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Common PPE</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filterPPE(PRIORITY_PPE).map((ppe) => {
                              const isSelected = formData.selected_ppe.includes(ppe);
                              return (
                                <button
                                  key={ppe}
                                  type="button"
                                  onClick={() => togglePPE(ppe)}
                                  className={`
                                    flex items-center px-4 py-3 rounded-lg text-left transition-colors
                                    ${isSelected 
                                      ? 'bg-indigo-50 dark:bg-indigo-900/50 border-2 border-indigo-500 text-indigo-700 dark:text-indigo-300' 
                                      : 'bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    } min-h-[80px]
                                  `}
                                >
                                  <div className="flex items-start space-x-3">
                                    <div className={`
                                      flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-1
                                      ${isSelected 
                                        ? 'bg-indigo-500 border-indigo-500' 
                                        : 'border-gray-300 dark:border-gray-600'
                                      }
                                    `}>
                                      {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                                    </div>
                                    <div className="flex-1 flex items-center space-x-3">
                                      <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
                                        {loadingIcons ? (
                                          <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
                                        ) : iconUrls[ppe] ? (
                                          <img 
                                            src={iconUrls[ppe]}
                                            alt={ppe}
                                            className="w-12 h-12 object-contain"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        ) : null}
                                      </div>
                                      <span className="text-sm font-medium">{ppe}</span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Other PPE Section */}
                      {(ppeSearchQuery === '' || filterPPE(OTHER_PPE).length > 0) && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Additional PPE</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filterPPE(OTHER_PPE).map((ppe) => {
                              const isSelected = formData.selected_ppe.includes(ppe);
                              return (
                                <button
                                  key={ppe}
                                  type="button"
                                  onClick={() => togglePPE(ppe)}
                                  className={`
                                    flex items-center px-4 py-3 rounded-lg text-left transition-colors
                                    ${isSelected 
                                      ? 'bg-indigo-50 dark:bg-indigo-900/50 border-2 border-indigo-500 text-indigo-700 dark:text-indigo-300' 
                                      : 'bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                    } min-h-[80px]
                                  `}
                                >
                                  <div className="flex items-start space-x-3">
                                    <div className={`
                                      flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-1
                                      ${isSelected 
                                        ? 'bg-indigo-500 border-indigo-500' 
                                        : 'border-gray-300 dark:border-gray-600'
                                      }
                                    `}>
                                      {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                                    </div>
                                    <div className="flex-1 flex items-center space-x-3">
                                      <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
                                        {loadingIcons ? (
                                          <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
                                        ) : iconUrls[ppe] ? (
                                          <img 
                                            src={iconUrls[ppe]}
                                            alt={ppe}
                                            className="w-12 h-12 object-contain"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        ) : null}
                                      </div>
                                      <span className="text-sm font-medium">{ppe}</span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {ppeSearchQuery !== '' && filterPPE([...PRIORITY_PPE, ...OTHER_PPE]).length === 0 && (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          No PPE items found matching your search
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location of PPE <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.ppe_location}
                      onChange={(e) => setFormData({...formData, ppe_location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Chemical Properties */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Chemical Properties</h3>
                  
                  {/* Chemical Property Flags */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Carcinogen <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, carcinogen: true})}
                          className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                            formData.carcinogen
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, carcinogen: false})}
                          className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                            !formData.carcinogen
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Sk (Skin Notation) <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, sk: true})}
                          className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                            formData.sk
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, sk: false})}
                          className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                            !formData.sk
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Sen (Sensitiser) <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, sen: true})}
                          className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                            formData.sen
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, sen: false})}
                          className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                            !formData.sen
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ingredient Items */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Ingredient Items <span className="text-gray-400 text-xs">(optional if known)</span>
                    </label>
                    
                    <div className="space-y-3">
                      {ingredientItems.map((item, index) => (
                        <div key={item.id} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              Ingredient {index + 1}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeIngredientItem(item.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Ingredient Name
                              </label>
                              <input
                                type="text"
                                value={item.ingredient_name}
                                onChange={(e) => updateIngredientItem(item.id, 'ingredient_name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                                placeholder="Enter ingredient name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                WEL TWA 8 Hrs
                              </label>
                              <input
                                type="text"
                                value={item.wel_twa_8_hrs}
                                onChange={(e) => updateIngredientItem(item.id, 'wel_twa_8_hrs', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                                placeholder="Enter WEL TWA value"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                STEL (15 mins)
                              </label>
                              <input
                                type="text"
                                value={item.stel_15_mins}
                                onChange={(e) => updateIngredientItem(item.id, 'stel_15_mins', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                                placeholder="Enter STEL value"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={addIngredientItem}
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Ingredient Item
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Hazard Exposure Limits */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Hazards & Precaution Statement <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.hazards_precautions}
                      onChange={(e) => setFormData({...formData, hazards_precautions: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Occupational Exposure Standard (OES) <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.occupational_exposure}
                      onChange={(e) => setFormData({...formData, occupational_exposure: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Maximum Exposure Limits (MEL) <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.maximum_exposure}
                      onChange={(e) => setFormData({...formData, maximum_exposure: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Workplace Exposure Limits (WEL) TWA 8 Hours <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.workplace_exposure}
                      onChange={(e) => setFormData({...formData, workplace_exposure: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Short-Term Exposure Limit (STEL) 15 mins <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.stel}
                      onChange={(e) => setFormData({...formData, stel: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Stability and Reactivity <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.stability_reactivity}
                      onChange={(e) => setFormData({...formData, stability_reactivity: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ecological Information <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.ecological_information}
                      onChange={(e) => setFormData({...formData, ecological_information: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Step 5: Frequency & Duration of Exposure */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount Used <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <select
                      value={formData.amount_used}
                      onChange={(e) => setFormData({...formData, amount_used: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select Amount</option>
                      <option value="Small (ml)">Small (ml)</option>
                      <option value="Medium (litres)">Medium (litres)</option>
                      <option value="Large (cubic metres)">Large (cubic metres)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      How many times per day <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <select
                      value={formData.times_per_day}
                      onChange={(e) => setFormData({...formData, times_per_day: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select Frequency</option>
                      <option value="1-5">1-5</option>
                      <option value="5-10">5-10</option>
                      <option value="More than 10">More than 10</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Duration <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <select
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select Duration</option>
                      <option value="1-5 Minutes">1-5 Minutes</option>
                      <option value="6-30 minutes">6-30 minutes</option>
                      <option value="31-60 minutes">31-60 minutes</option>
                      <option value="1 hour+">1 hour+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      How often is the process done <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.how_often_process}
                      onChange={(e) => setFormData({...formData, how_often_process: e.target.value})}
                      placeholder="e.g., 3 times per week, daily, monthly"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      How long does it take <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.how_long_process}
                      onChange={(e) => setFormData({...formData, how_long_process: e.target.value})}
                      placeholder="e.g., 30 minutes, 2 hours, 1 week"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Step 6: Substance Properties */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Select the hazards <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    
                    {/* Hazard Search Box */}
                    <div className="relative mb-4">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={hazardSearchQuery}
                        onChange={(e) => setHazardSearchQuery(e.target.value)}
                        placeholder="Search hazard types..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:text-white"
                      />
                    </div>

                    {/* Hazard Selection Grid */}
                    <div className="overflow-y-auto max-h-[400px] space-y-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Hazard Symbols</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {filterHazards(HAZARDS).map((hazard) => {
                            const isSelected = formData.selected_hazards.includes(hazard);
                            return (
                              <button
                                key={hazard}
                                type="button"
                                onClick={() => toggleHazard(hazard)}
                                className={`
                                  flex flex-col items-center p-4 rounded-lg text-center transition-colors
                                  ${isSelected 
                                    ? 'bg-red-50 dark:bg-red-900/50 border-2 border-red-500 text-red-700 dark:text-red-300' 
                                    : 'bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                                  } min-h-[120px]
                                `}
                              >
                                <div className={`
                                  flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mb-2
                                  ${isSelected 
                                    ? 'bg-red-500 border-red-500' 
                                    : 'border-gray-300 dark:border-gray-600'
                                  }
                                `}>
                                  {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                                </div>
                                
                                <div className="w-16 h-16 flex items-center justify-center mb-2">
                                  {loadingHazardIcons ? (
                                    <div className="w-8 h-8 border-2 border-gray-200 border-t-red-500 rounded-full animate-spin" />
                                  ) : hazardIconUrls[hazard] ? (
                                    <img 
                                      src={hazardIconUrls[hazard]}
                                      alt={hazard}
                                      className="w-16 h-16 object-contain"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : null}
                                </div>
                                
                                <span className="text-xs font-medium text-center leading-tight">{hazard}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {hazardSearchQuery !== '' && filterHazards(HAZARDS).length === 0 && (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          No hazard types found matching your search
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 7: Control Methods */}
              {currentStep === 7 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      General Precautions <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.general_precautions}
                      onChange={(e) => setFormData({...formData, general_precautions: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      First Aid Measures <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.first_aid_measures}
                      onChange={(e) => setFormData({...formData, first_aid_measures: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Accidental Release Measures <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.accidental_release_measures}
                      onChange={(e) => setFormData({...formData, accidental_release_measures: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ventilation <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.ventilation}
                      onChange={(e) => setFormData({...formData, ventilation: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Handling <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.handling}
                      onChange={(e) => setFormData({...formData, handling: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Storage <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.storage}
                      onChange={(e) => setFormData({...formData, storage: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Step 8: Additional Controls */}
              {currentStep === 8 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Additional Control Items <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    
                    {/* Dynamic Control Items */}
                    <div className="space-y-3">
                      {controlItems.map((item, index) => (
                        <div key={item.id} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              Control Item {index + 1}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeControlItem(item.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Control Item
                            </label>
                            <textarea
                              value={item.item}
                              onChange={(e) => updateControlItem(item.id, e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                              placeholder="Describe the control item..."
                            />
                          </div>
                        </div>
                      ))}
                      
                      {/* Add Control Item Button */}
                      <button
                        type="button"
                        onClick={addControlItem}
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Control Item
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Further Controls Required <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.further_controls}
                      onChange={(e) => setFormData({...formData, further_controls: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Respiratory Protection <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.respiratory_protection}
                      onChange={(e) => setFormData({...formData, respiratory_protection: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      PPE <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.ppe_details}
                      onChange={(e) => setFormData({...formData, ppe_details: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Monitoring <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.monitoring}
                      onChange={(e) => setFormData({...formData, monitoring: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Health Surveillance <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.health_surveillance}
                      onChange={(e) => setFormData({...formData, health_surveillance: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Responsibility <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <textarea
                        value={formData.responsibility}
                        onChange={(e) => setFormData({...formData, responsibility: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        By When <span className="text-gray-400 text-xs">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={formData.by_when}
                        onChange={(e) => setFormData({...formData, by_when: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 8: Spillage, Fire, Storage and Disposal */}
              {currentStep === 9 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Spillage Procedure <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.spillage_procedure}
                      onChange={(e) => setFormData({...formData, spillage_procedure: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fire & Explosion Prevention <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.fire_explosion}
                      onChange={(e) => setFormData({...formData, fire_explosion: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Handling & Storage <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.handling_storage}
                      onChange={(e) => setFormData({...formData, handling_storage: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Disposal Considerations <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.disposal_considerations}
                      onChange={(e) => setFormData({...formData, disposal_considerations: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Step 9: COSHH Assessment Comments */}
              {currentStep === 10 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      COSHH Assessment Comments <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <textarea
                      value={formData.assessment_comments}
                      onChange={(e) => setFormData({...formData, assessment_comments: e.target.value})}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Step 10: Assessor Summary */}
              {currentStep === 11 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Assessor Summary <span className="text-gray-400 text-xs">(optional)</span></h3>
                  
                  {/* Question 1 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Q: Has the assessment taken into account all relevant factors relating to the use of the substance? If not, please specify what further action is needed.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, q1_answer: true})}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          formData.q1_answer
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, q1_answer: false})}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          !formData.q1_answer
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        No
                      </button>
                    </div>
                    {!formData.q1_answer && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Further Action <span className="text-gray-400 text-xs">(optional)</span>
                        </label>
                        <textarea
                          value={formData.q1_action}
                          onChange={(e) => setFormData({...formData, q1_action: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Question 2 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Q: Has the feasibility of preventing exposure been fully considered in the assessment? If not, outline the additional steps that should be taken.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, q2_answer: true})}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          formData.q2_answer
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, q2_answer: false})}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          !formData.q2_answer
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        No
                      </button>
                    </div>
                    {!formData.q2_answer && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Further Action <span className="text-gray-400 text-xs">(optional)</span>
                        </label>
                        <textarea
                          value={formData.q2_action}
                          onChange={(e) => setFormData({...formData, q2_action: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Question 3 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Q: Has the assessment addressed the measures necessary to achieve and maintain sufficient control of exposure where complete prevention isn't reasonably practicable? If not, provide details of the further action required.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, q3_answer: true})}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          formData.q3_answer
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, q3_answer: false})}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          !formData.q3_answer
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        No
                      </button>
                    </div>
                    {!formData.q3_answer && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Further Action <span className="text-gray-400 text-xs">(optional)</span>
                        </label>
                        <textarea
                          value={formData.q3_action}
                          onChange={(e) => setFormData({...formData, q3_action: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Question 4 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Q: Has the need for monitoring levels of exposure to the substance been evaluated as part of the assessment? If not, explain what further action should be undertaken.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, q4_answer: true})}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          formData.q4_answer
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, q4_answer: false})}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          !formData.q4_answer
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        No
                      </button>
                    </div>
                    {!formData.q4_answer && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Further Action <span className="text-gray-400 text-xs">(optional)</span>
                        </label>
                        <textarea
                          value={formData.q4_action}
                          onChange={(e) => setFormData({...formData, q4_action: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Question 5 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Q: Has the assessment clearly identified all necessary steps to ensure compliance with applicable regulations? If not, please describe any outstanding actions required.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, q5_answer: true})}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          formData.q5_answer
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, q5_answer: false})}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          !formData.q5_answer
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        No
                      </button>
                    </div>
                    {!formData.q5_answer && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Further Action <span className="text-gray-400 text-xs">(optional)</span>
                        </label>
                        <textarea
                          value={formData.q5_action}
                          onChange={(e) => setFormData({...formData, q5_action: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 11: COSHH Assessment */}
              {currentStep === 12 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">COSHH Assessment <span className="text-gray-400 text-xs">(optional)</span></h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Select which option is best suited for this substance:
                  </p>
                  
                  <div className="space-y-4">
                    <label className="flex items-start space-x-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="assessment_conclusion"
                        value="Option 1: The task is safe to be carried out with current control procedures"
                        checked={formData.assessment_conclusion === "Option 1: The task is safe to be carried out with current control procedures"}
                        onChange={(e) => setFormData({...formData, assessment_conclusion: e.target.value})}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          Option 1: The task is safe to be carried out with current control procedures
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          This means no additional action is necessary
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="assessment_conclusion"
                        value="Option 2: The task is considered safe to proceed, provided the actions listed are carried out"
                        checked={formData.assessment_conclusion === "Option 2: The task is considered safe to proceed, provided the actions listed are carried out"}
                        onChange={(e) => setFormData({...formData, assessment_conclusion: e.target.value})}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          Option 2: The task is considered safe to proceed, provided the actions listed are carried out
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          This means substance is not currently presenting major issues but still requires some action to meet COSHH standards. Actions should be prioritised and target dates set for completion.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="assessment_conclusion"
                        value="Option 3: The task or substance is currently unsafe, with serious breaches of health and safety regulations"
                        checked={formData.assessment_conclusion === "Option 3: The task or substance is currently unsafe, with serious breaches of health and safety regulations"}
                        onChange={(e) => setFormData({...formData, assessment_conclusion: e.target.value})}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          Option 3: The task or substance is currently unsafe, with serious breaches of health and safety regulations
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          This means the task or substance poses a potential risk of serious harm to users; its use must be suspended until identified issues are fully resolved.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Step 12: Final Details */}
              {currentStep === 13 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Final Details</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Taking into account the control measures in place, it is considered that the hazard from the substance is: <span className="text-gray-400 text-xs">(optional)</span>
                    </label>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, hazard_level: 'Low'})}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          formData.hazard_level === 'Low'
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        Low
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, hazard_level: 'Medium'})}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          formData.hazard_level === 'Medium'
                            ? 'bg-yellow-600 text-white border-yellow-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        Medium
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, hazard_level: 'High'})}
                        className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                          formData.hazard_level === 'High'
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        High
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Assessor Name *
                      </label>
                      <input
                        type="text"
                        value={formData.assessor_name}
                        onChange={(e) => setFormData({...formData, assessor_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white bg-gray-50 dark:bg-gray-600"
                        required
                        readOnly
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-populated from your profile</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Assessment Date *
                      </label>
                      <input
                        type="date"
                        value={formData.assessment_date}
                        onChange={(e) => setFormData({...formData, assessment_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-6 border-t">
                {currentStep > 1 && (
                      <button
                    type="button" 
                    onClick={prevStep} 
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                    Previous
                      </button>
                )}
                <div className="ml-auto flex space-x-2">
                      <button
                    type="button" 
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      resetForm();
                    }} 
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                      </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {currentStep === 13 ? 
                      (showEditModal ? 'Update Assessment' : 'Add Assessment') : 'Next'}
                  </button>
        </div>
      </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
} 
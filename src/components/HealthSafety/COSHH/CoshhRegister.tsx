import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Plus, Search, Pencil, Trash2, AlertTriangle, X, FileCheck, FileText } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { generateCoshhRegisterPDF } from '../../../utils/pdf/coshh/coshhRegisterPDFGenerator';

interface CoshhRegisterProps {
  onBack: () => void;
}

interface CoshhSubstance {
  id: string;
  substance_name: string;
  manufacturer: string;
  category: string | string[]; // Support both old string format and new array format
  storage_location: string;
  hazard_sheet_location: string;
  added_date: string;
  review_date: string;
  reviewed_date?: string;
  auditor: string;
  created_at: string;
  updated_at: string;
}

export function CoshhRegister({ onBack }: CoshhRegisterProps) {
  const [substances, setSubstances] = useState<CoshhSubstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSubstance, setSelectedSubstance] = useState<CoshhSubstance | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [auditorName, setAuditorName] = useState('');
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Helper function to get date 365 days from now
  const getDefaultReviewDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 365);
    return date.toISOString().split('T')[0];
  };

  // Helper function to normalize category data (handle both string and array formats)
  const normalizeCategories = (category: string | string[]): string[] => {
    if (Array.isArray(category)) {
      return category;
    }
    return category ? [category] : [];
  };

  const [formData, setFormData] = useState({
    substance_name: '',
    manufacturer: '',
    category: [] as string[],
    storage_location: '',
    hazard_sheet_location: 'Stonepad > H&S > Coshh > MSDS',
    review_date: getDefaultReviewDate()
  });

  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const categories = [
    'Biological Agents',
    'Carcinogenic / Mutagenic / Reproductive Toxicants (CMRs)',
    'Compressed Gases / Gas Cylinders',
    'Corrosive Substances',
    'Environmental Hazards',
    'Flammable Substances',
    'Harmful / Irritants',
    'Nanomaterials',
    'Oxidising Agents',
    'Sensitisers',
    'Toxic / Highly Toxic Substances'
  ];

  useEffect(() => {
    fetchSubstances();
    fetchUserProfile();
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const isModalOpen = showAddModal || showEditModal || showDeleteModal || showReviewModal;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal, showEditModal, showDeleteModal, showReviewModal]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.display_name) {
        setAuditorName(user.user_metadata.display_name);
      } else {
        setAuditorName('Unknown User');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setAuditorName('Unknown User');
    }
  };

  const fetchSubstances = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coshh_register')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubstances(data || []);
    } catch (error) {
      console.error('Error fetching COSHH substances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadRegister = async () => {
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
            <p>Generating COSHH Register PDF...</p>
          </div>
        </body>
        </html>
      `);

      const pdfDataUrl = await generateCoshhRegisterPDF(substances);
      
      // Format filename with current date
      const formattedDate = new Date().toISOString().split('T')[0];
      const formattedFilename = `COSHH-Register-${formattedDate}.pdf`;

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
                <h2>COSHH Register PDF Ready for Download</h2>
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
                if (confirm('Would you like to download the COSHH Register PDF now?')) {
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
        const htmlContent = createPdfViewerHtml(pdfDataUrl, formattedFilename);
        
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('Error downloading COSHH register:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Helper function to create the HTML content for PDF viewer
  const createPdfViewerHtml = (pdfDataUrl: string, filename: string) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <meta charset="UTF-8">
      <meta name="filename" content="${filename}">
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
        <a id="download-btn" class="download-button" href="#">Download ${filename}</a>
      </div>
      <div class="pdf-view">
        <iframe id="pdf-iframe" style="width:100%; height:100%; border:none;"></iframe>
      </div>
      <script>
        // Store PDF data and filename
        const pdfDataUrl = "${pdfDataUrl}";
        const fileName = "${filename}";
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
            alert('To download this PDF with the correct filename, please use the keyboard shortcut Command+S and manually type "${filename}" in the filename field.');
          });
        }
      </script>
    </body>
    </html>
    `;
  };

  const resetForm = () => {
    setFormData({
      substance_name: '',
      manufacturer: '',
      category: [],
      storage_location: '',
      hazard_sheet_location: 'Stonepad > H&S > Coshh > MSDS',
      review_date: getDefaultReviewDate()
    });
    setCustomCategory('');
    setShowCustomCategory(false);
    setCurrentStep(1);
  };

  const handleOtherToggle = (checked: boolean) => {
    setShowCustomCategory(checked);
    if (!checked) {
      setCustomCategory('');
      // Only remove custom categories if we're in add mode, not edit mode
      if (showAddModal) {
        setFormData(prev => ({
          ...prev,
          category: prev.category.filter(cat => categories.includes(cat))
        }));
      }
    }
  };

  const handleAddCustomCategory = () => {
    const trimmedCategory = customCategory.trim();
    console.log('Adding custom category:', trimmedCategory);
    console.log('Current categories:', formData.category);
    
    if (trimmedCategory && !formData.category.includes(trimmedCategory)) {
      const newCategories = [...formData.category, trimmedCategory];
      console.log('New categories will be:', newCategories);
      
      setFormData(prev => ({
        ...prev,
        category: newCategories
      }));
      setCustomCategory('');
    } else {
      console.log('Category not added - either empty or duplicate');
    }
  };

  const handleAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEdit = (substance: CoshhSubstance) => {
    setSelectedSubstance(substance);
    const normalizedCategories = normalizeCategories(substance.category);
    
    setFormData({
      substance_name: substance.substance_name,
      manufacturer: substance.manufacturer,
      category: normalizedCategories,
      storage_location: substance.storage_location,
      hazard_sheet_location: substance.hazard_sheet_location,
      review_date: substance.review_date
    });
    
    // Check if there are any custom categories (not in predefined list)
    const hasCustomCategories = normalizedCategories.some(cat => !categories.includes(cat));
    setShowCustomCategory(hasCustomCategories);
    setCustomCategory('');
    
    setCurrentStep(1);
    setShowEditModal(true);
  };

  const handleReview = (substance: CoshhSubstance) => {
    setSelectedSubstance(substance);
    const normalizedCategories = normalizeCategories(substance.category);
    
    setFormData({
      substance_name: substance.substance_name,
      manufacturer: substance.manufacturer,
      category: normalizedCategories,
      storage_location: substance.storage_location,
      hazard_sheet_location: substance.hazard_sheet_location,
      review_date: substance.review_date
    });
    
    // Check if there are any custom categories (not in predefined list)
    const hasCustomCategories = normalizedCategories.some(cat => !categories.includes(cat));
    setShowCustomCategory(hasCustomCategories);
    setCustomCategory('');
    
    setCurrentStep(1);
    setShowReviewModal(true);
  };

  const handleDelete = (substance: CoshhSubstance) => {
    setSelectedSubstance(substance);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedSubstance) return;

    try {
      const { error } = await supabase
        .from('coshh_register')
        .delete()
        .eq('id', selectedSubstance.id);

      if (error) throw error;
      
      setSubstances(substances.filter(s => s.id !== selectedSubstance.id));
      setShowDeleteModal(false);
      setSelectedSubstance(null);
    } catch (error) {
      console.error('Error deleting substance:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate categories are selected before proceeding
    if (currentStep === 1 && formData.category.length === 0) {
      alert('Please select at least one category');
      return;
    }
    
    if (currentStep < 3) {
      nextStep();
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (showReviewModal && selectedSubstance) {
        // For review modal, update the reviewed_date and set next review date based on reviewed_date
        const reviewedDate = new Date(today);
        const nextReviewDate = new Date(reviewedDate);
        nextReviewDate.setDate(reviewedDate.getDate() + 365);
        const nextReviewDateString = nextReviewDate.toISOString().split('T')[0];
        
        const { error } = await supabase
          .from('coshh_register')
          .update({ 
            reviewed_date: today,
            review_date: nextReviewDateString
          })
          .eq('id', selectedSubstance.id);
        
        if (error) throw error;
      } else {
        // For add/edit modal
        let submissionData;
        
        if (showEditModal && selectedSubstance) {
          // For edit, keep the original added_date and recalculate review_date based on it (unless already reviewed)
          const addedDate = new Date(selectedSubstance.added_date);
          const baseDate = selectedSubstance.reviewed_date ? new Date(selectedSubstance.reviewed_date) : addedDate;
          const calculatedReviewDate = new Date(baseDate);
          calculatedReviewDate.setDate(baseDate.getDate() + 365);
          
          submissionData = {
            ...formData,
            auditor: auditorName,
            review_date: formData.review_date || calculatedReviewDate.toISOString().split('T')[0]
          };
          
          console.log('Updating substance with data:', submissionData);
          
          const { error } = await supabase
            .from('coshh_register')
            .update(submissionData)
            .eq('id', selectedSubstance.id);
          
          if (error) {
            console.error('Database error:', error);
            throw error;
          }
        } else {
          // For new substance, calculate review_date based on added_date (which is today)
          const addedDate = new Date(today);
          const reviewDate = new Date(addedDate);
          reviewDate.setDate(addedDate.getDate() + 365);
          
          submissionData = {
            ...formData,
            auditor: auditorName,
            added_date: today,
            review_date: reviewDate.toISOString().split('T')[0]
          };
          
          console.log('Inserting new substance with data:', submissionData);
          
          const { error } = await supabase
            .from('coshh_register')
            .insert([submissionData]);
          
          if (error) {
            console.error('Database error:', error);
            throw error;
          }
        }
      }

      setShowAddModal(false);
      setShowEditModal(false);
      setShowReviewModal(false);
      setSelectedSubstance(null);
      resetForm();
      fetchSubstances();
    } catch (error) {
      console.error('Error saving substance:', error);
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const renderStepIndicator = () => {
    const stepLabels = showReviewModal ? 
      ['Basic Info', 'Details', 'Review Sign Off'] : 
      ['Basic Info', 'Details', 'Sign Off'];
    
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

  const filteredSubstances = substances.filter(substance => {
    const searchLower = searchTerm.toLowerCase();
    const categories = normalizeCategories(substance.category);
    
    return substance.substance_name.toLowerCase().includes(searchLower) ||
           substance.manufacturer.toLowerCase().includes(searchLower) ||
           categories.some(cat => cat.toLowerCase().includes(searchLower));
  });

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
          COSHH Register
        </h2>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search substances..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <button
            onClick={handleDownloadRegister}
            disabled={downloadingPDF || substances.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="h-4 w-4 mr-2" />
            {downloadingPDF ? 'Generating...' : 'Download'}
          </button>
          <button
            onClick={handleAdd}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Substance
          </button>
        </div>
      </div>

      {/* Substances Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Substance Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Manufacturer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Storage Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date Added
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Reviewed On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Next Review Due
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredSubstances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No substances found. Click "Add Substance" to get started.
                  </td>
                </tr>
              ) : (
                filteredSubstances.map((substance) => (
                  <tr 
                    key={substance.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleEdit(substance)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {substance.substance_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {substance.manufacturer}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="flex flex-wrap gap-1">
                        {normalizeCategories(substance.category).map((cat, index) => (
                          <span 
                            key={index} 
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {substance.storage_location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {substance.added_date ? new Date(substance.added_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {substance.reviewed_date ? new Date(substance.reviewed_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {substance.review_date ? new Date(substance.review_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(substance);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                          title="Edit"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReview(substance);
                          }}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1"
                          title="Review"
                        >
                          <FileCheck className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(substance);
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
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
          ) : filteredSubstances.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No substances found. Click "Add Substance" to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSubstances.map((substance) => (
                <div 
                  key={substance.id} 
                  className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm mx-4 my-4 cursor-pointer"
                  onClick={() => handleEdit(substance)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                        {substance.substance_name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {substance.manufacturer}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(substance);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        title="Edit"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReview(substance);
                        }}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                        title="Review"
                      >
                        <FileCheck className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(substance);
                        }}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Categories:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {normalizeCategories(substance.category).map((cat, index) => (
                          <span 
                            key={index} 
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Storage:</span>
                      <p className="text-gray-900 dark:text-white mt-1">{substance.storage_location}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Added:</span>
                      <p className="text-gray-900 dark:text-white mt-1">
                        {substance.added_date ? new Date(substance.added_date).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Next Review:</span>
                      <p className="text-gray-900 dark:text-white mt-1">
                        {substance.review_date ? new Date(substance.review_date).toLocaleDateString() : '-'}
                      </p>
                    </div>
                  </div>
                  
                  {substance.reviewed_date && (
                    <div className="text-sm border-t border-gray-200 dark:border-gray-600 pt-3">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Last Reviewed:</span>
                      <p className="text-gray-900 dark:text-white mt-1">
                        {new Date(substance.reviewed_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
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
              Are you sure you want to delete {selectedSubstance?.substance_name}? This action cannot be undone.
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

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal || showReviewModal) && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 overflow-y-auto flex items-center justify-center z-50 p-4">
          <div ref={modalRef} className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-lg w-full m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {showReviewModal ? 'Review Substance' : 
                 showAddModal ? 'Add Substance' : 'Edit Substance'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setShowReviewModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {renderStepIndicator()}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Substance Name *
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
                      Manufacturer *
                    </label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Categories * <span className="text-xs text-gray-500">(Select one or more)</span>
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-white dark:bg-gray-700">
                      {categories.map((category) => (
                        <label key={category} className="flex items-start space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.category.includes(category)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  category: [...formData.category, category]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  category: formData.category.filter(c => c !== category)
                                });
                              }
                            }}
                            className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-900 dark:text-white leading-tight">
                            {category}
                          </span>
                        </label>
                      ))}
                      
                      {/* Other option */}
                      <label className="flex items-start space-x-2 cursor-pointer border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                        <input
                          type="checkbox"
                          checked={showCustomCategory}
                          onChange={(e) => handleOtherToggle(e.target.checked)}
                          className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-900 dark:text-white leading-tight font-medium">
                          Other (specify custom category)
                        </span>
                      </label>
                    </div>

                    {/* Custom category input */}
                    {showCustomCategory && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-600 rounded-md">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Custom Category
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            placeholder="Enter custom category name"
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomCategory();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomCategory}
                            disabled={!customCategory.trim()}
                            className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Display selected categories */}
                    {formData.category.length > 0 && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Selected Categories:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {formData.category.map((cat, index) => (
                            <span 
                              key={index} 
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              {cat}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    category: prev.category.filter(c => c !== cat)
                                  }));
                                }}
                                className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.category.length === 0 && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        Please select at least one category
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Step 2: Details */}
              {currentStep === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Storage Location *
                    </label>
                    <input
                      type="text"
                      value={formData.storage_location}
                      onChange={(e) => setFormData({...formData, storage_location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Hazard Sheet Location *
                    </label>
                    <input
                      type="text"
                      value={formData.hazard_sheet_location}
                      onChange={(e) => setFormData({...formData, hazard_sheet_location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  {!showReviewModal && (
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
                  )}
                </>
              )}

              {/* Step 3: Sign Off */}
              {currentStep === 3 && (
                <div>
                  {showReviewModal ? (
                    <div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Reviewed Date
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {new Date().toLocaleDateString()}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Today's date will be recorded as the review date
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Auditor
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {auditorName}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Logged in user will be recorded as the auditor
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-4">
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
                      setShowReviewModal(false);
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
                    {currentStep === 3 ? 
                      (showReviewModal ? 'Complete Review' : 
                       showAddModal ? 'Add Substance' : 'Update') : 'Next'}
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
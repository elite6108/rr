import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Plus, Edit, Trash2, AlertTriangle, FileText, Loader2, Search, ChevronUp, ChevronDown, Pencil, X } from 'lucide-react';
import { RiskAssessmentForm } from './RiskAssessmentForm';
import { generateRiskAssessmentPDF } from '../../../utils/pdf/riskassessments/riskAssessmentPDFGenerator';
import type { RiskAssessment } from '../../../types/database';

interface RiskAssessmentsubpageProps {
  onBack: () => void;
  setShowRiskAssessmentsubpage: (show: boolean) => void;
  setActiveSection: (section: string) => void;
}

export function RiskAssessmentsubpage({ onBack, setShowRiskAssessmentsubpage, setActiveSection }: RiskAssessmentsubpageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<RiskAssessment | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [importExportMode, setImportExportMode] = useState<'export' | 'import'>('export');
  const [selectedForExport, setSelectedForExport] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Prevent body scroll when any modal is open
  useEffect(() => {
    const isModalOpen = showModal || showDeleteModal || showImportExportModal;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal, showDeleteModal, showImportExportModal]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('risk_assessments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRiskAssessments(data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (assessment: RiskAssessment) => {
    setSelectedAssessment(assessment);
    setShowModal(true);
  };

  const handleViewPDF = async (assessment: RiskAssessment) => {
    try {
      setGeneratingPdfId(assessment.id);
      setPdfError(null);
      console.log('Starting PDF generation for assessment:', assessment.ra_id);

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

      // Fetch company settings
      console.log('Fetching company settings...');
      const { data: companySettings, error: companyError } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (companyError) {
        console.error('Error fetching company settings:', companyError);
        throw new Error(`Failed to load company settings: ${companyError.message}`);
      }
      if (!companySettings) {
        console.error('No company settings found');
        throw new Error('Company settings not found. Please set up your company details first.');
      }

      console.log('Company settings loaded successfully');
      console.log('Starting PDF generation...');

      // Generate PDF
      const pdfDataUrl = await generateRiskAssessmentPDF({
        assessment,
        companySettings
      });

      console.log('PDF generated successfully');

      // Format filename for better clarity using RA number
      const raNumber = assessment.ra_id || 'unknown';
      const formattedFilename = raNumber.startsWith('RA-') 
        ? `${raNumber}.pdf` 
        : `RA-${raNumber}.pdf`;

      console.log('Using filename:', formattedFilename);
      
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

        console.log('Created HTML content for PDF viewer');
        
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      }
      
      console.log('PDF handling completed successfully');
    } catch (error) {
      console.error('Error in handleViewPDF:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      setPdfError(error instanceof Error ? error.message : 'An unexpected error occurred while generating the PDF');
    } finally {
      setGeneratingPdfId(null);
      console.log('PDF generation process completed');
    }
  };

  const handleDelete = (assessment: RiskAssessment) => {
    setSelectedAssessment(assessment);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedAssessment) return;
    
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('risk_assessments')
        .delete()
        .eq('id', selectedAssessment.id);

      if (error) throw error;
      
      await fetchData();
      setShowDeleteModal(false);
      setSelectedAssessment(null);
    } catch (err) {
      console.error('Error deleting risk assessment:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting the risk assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!selectedForExport) return;
    
    const assessmentToExport = riskAssessments.find(ra => ra.id === selectedForExport);
    if (!assessmentToExport) return;

    // Fields to exclude from export (system-generated fields)
    const excludedFields = ['id', 'ra_id', 'created_at', 'updated_at', 'user_id'];
    
    // Create export data by including all fields except the excluded ones
    const exportData: any = {};
    
    Object.keys(assessmentToExport).forEach(key => {
      if (!excludedFields.includes(key)) {
        exportData[key] = assessmentToExport[key];
      }
    });

    // Create and download file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `risk-assessment-${assessmentToExport.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
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
        const importData = JSON.parse(e.target?.result as string);
        
        // Validate required fields
        if (!importData.name) {
          setError('Import file must contain a name field');
          return;
        }

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setError('Unable to get user information. Please make sure you are logged in.');
          return;
        }

        // Generate new RA number
        const { data: existingRAs } = await supabase
          .from('risk_assessments')
          .select('ra_id')
          .order('created_at', { ascending: false });

        let newRaNumber = 1;
        if (existingRAs && existingRAs.length > 0) {
          const latestRaId = existingRAs[0].ra_id;
          if (latestRaId) {
            const match = latestRaId.match(/RA-(\d+)/);
            if (match) {
              newRaNumber = parseInt(match[1]) + 1;
            }
          }
        }

        // Create new risk assessment with imported data
        const newAssessment = {
          ra_id: `RA-${newRaNumber.toString().padStart(3, '0')}`,
          user_id: user.id, // Add the current user's ID
          ...importData, // Spread all imported data
        };

        // Insert into database
        const { error: insertError } = await supabase
          .from('risk_assessments')
          .insert([newAssessment]);

        if (insertError) {
          console.error('Error importing risk assessment:', insertError);
          setError(`Failed to import: ${insertError.message}`);
        } else {
          await fetchData(); // Refresh the list
          setShowImportExportModal(false);
          setError(null);
        }

      } catch (err) {
        console.error('Error parsing import file:', err);
        setError('Invalid file format. Please select a valid JSON file.');
      }
    };

    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  const getReviewStatus = (reviewDate: string) => {
    const review = new Date(reviewDate);
    const today = new Date();
    const daysUntilReview = Math.floor((review.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilReview < 0) {
      return {
        text: 'Review Overdue',
        className: 'bg-red-100 text-red-800'
      };
    } else if (daysUntilReview <= 30) {
      return {
        text: 'Review Due Soon',
        className: 'bg-yellow-100 text-yellow-800'
      };
    }
    return {
      text: 'Active',
      className: 'bg-green-100 text-green-800'
    };
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredAssessments = React.useMemo(() => {
    let filteredAssessments = [...riskAssessments];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredAssessments = filteredAssessments.filter(assessment => 
        assessment.name.toLowerCase().includes(query) ||
        assessment.ra_id?.toString().includes(query)
      );
    }

    // Apply sorting
    if (sortConfig) {
      filteredAssessments.sort((a, b) => {
        if (sortConfig.key === 'name') {
          return sortConfig.direction === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
        if (sortConfig.key === 'ra_id') {
          return sortConfig.direction === 'asc'
            ? (a.ra_id || '').localeCompare(b.ra_id || '')
            : (b.ra_id || '').localeCompare(a.ra_id || '');
        }
        if (sortConfig.key === 'created_at') {
          return sortConfig.direction === 'asc' 
            ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortConfig.key === 'review_date') {
          return sortConfig.direction === 'asc' 
            ? new Date(a.review_date).getTime() - new Date(b.review_date).getTime()
            : new Date(b.review_date).getTime() - new Date(a.review_date).getTime();
        }
        if (sortConfig.key === 'status') {
          const statusA = getReviewStatus(a.review_date).text;
          const statusB = getReviewStatus(b.review_date).text;
          return sortConfig.direction === 'asc' 
            ? statusA.localeCompare(statusB)
            : statusB.localeCompare(statusA);
        }
        return 0;
      });
    }

    return filteredAssessments;
  }, [riskAssessments, searchQuery, sortConfig]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Health & Safety
        </button>
       
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Risk Assessments</h2>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Search Bar with Add Button and Import-Export Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search risk assessments..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-300 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:border-gray-600 dark:text-white sm:text-sm"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setSelectedAssessment(null);
              setShowModal(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Risk Assessment
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

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          </div>
        ) : sortedAndFilteredAssessments.length === 0 ? (
          <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-700/50">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No matching risk assessments found' : 'No risk assessments yet'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th 
                        scope="col" 
                        className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer first:rounded-tl-lg last:rounded-tr-lg"
                        onClick={() => handleSort('ra_id')}
                      >
                        <div className="flex items-center gap-2">
                          RA Number
                          {sortConfig?.key === 'ra_id' && (
                            sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-2">
                          Name
                          {sortConfig?.key === 'name' && (
                            sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center gap-2">
                          Created
                          {sortConfig?.key === 'created_at' && (
                            sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer"
                        onClick={() => handleSort('review_date')}
                      >
                        <div className="flex items-center gap-2">
                          Review Date
                          {sortConfig?.key === 'review_date' && (
                            sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          {sortConfig?.key === 'status' && (
                            sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-800">
                    {sortedAndFilteredAssessments.map((assessment, index, array) => {
                      const status = getReviewStatus(assessment.review_date);
                      const isLastRow = index === array.length - 1;
                      return (
                        <tr 
                          key={assessment.id} 
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                          onClick={() => handleEdit(assessment)}
                        >
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white first:rounded-bl-lg last:rounded-br-lg">
                            {assessment.ra_id}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {assessment.name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(assessment.created_at).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(assessment.review_date).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.className}`}>
                              {status.text}
                            </span>
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                            <div className="flex justify-end space-x-4">
                               <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(assessment);
                                }}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Edit"
                              >
                                <Pencil className="h-5 w-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewPDF(assessment);
                                }}
                                disabled={generatingPdfId === assessment.id}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                                title="View PDF"
                              >
                                {generatingPdfId === assessment.id ? (
                                  <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                                ) : (
                                  <FileText className="h-5 w-5" />
                                )}
                              </button>
                              <button
                                onClick={(e) => {
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile/Tablet Cards */}
            <div className="lg:hidden">
              <div className="p-4 space-y-4">
                {sortedAndFilteredAssessments.map((assessment) => {
                  const status = getReviewStatus(assessment.review_date);
                  return (
                    <div 
                      key={assessment.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-4 cursor-pointer"
                      onClick={() => handleEdit(assessment)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                            {assessment.ra_id}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {assessment.name}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                          {status.text}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Created:</span>
                          <span className="text-gray-900 dark:text-white">
                            {new Date(assessment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Review Date:</span>
                          <span className="text-gray-900 dark:text-white">
                            {new Date(assessment.review_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(assessment);
                          }}
                          className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPDF(assessment);
                          }}
                          disabled={generatingPdfId === assessment.id}
                          className="flex items-center px-3 py-2 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors disabled:opacity-50"
                          title="View PDF"
                        >
                          {generatingPdfId === assessment.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4 mr-1" />
                          )}
                          
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(assessment);
                          }}
                          className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Risk Assessment Form Modal */}
      {showModal && createPortal(
        <RiskAssessmentForm
          onClose={() => {
            setShowModal(false);
            setSelectedAssessment(null);
          }}
          onSuccess={fetchData}
          assessmentToEdit={selectedAssessment}
        />,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <>
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 z-50"></div>
          <div className="fixed inset-0 overflow-y-auto flex items-center justify-center z-50 min-h-screen">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg-xl p-6 max-w-sm w-full m-4 my-8">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
              Confirm Deletion
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Are you sure you want to delete this risk assessment? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAssessment(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
        </>,
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
                  Import - Export Risk Assessments
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
                        Select Risk Assessment to Export
                      </label>
                      <select
                        value={selectedForExport || ''}
                        onChange={(e) => setSelectedForExport(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      >
                        <option value="">Select a risk assessment...</option>
                        {riskAssessments.map((assessment) => (
                          <option key={assessment.id} value={assessment.id}>
                            {assessment.ra_id} - {assessment.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      * Exports all editable fields including name and form data. RA number will be auto-generated on import.
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
                        onClick={handleExport}
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
                      * Import will create a new risk assessment with a new RA number. Select a JSON file exported from this system.
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
    </div>
  );
}
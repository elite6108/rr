'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Plus, Edit, Search, Pencil, FileText, Trash2, X, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { generateAccidentsPDF } from '../../../utils/pdf/accidents/accidentsPDFGenerator';

// Import forms with default import
import SevenDayIncapacitationForm from './forms/reportaccident/7dayincapacitation/SevenDayIncapacitationForm';
import FatalityForm from './forms/reportaccident/fatality/FatalityForm';
import HospitalTreatmentForm from './forms/reportaccident/hospitaltreatment/HospitalTreatmentForm';
import IllHealthForm from './forms/reportaccident/illhealth/IllHealthForm';
import MinorAccidentForm from './forms/reportaccident/minoraccident/MinorAccidentForm';
import NonFatalForm from './forms/reportaccident/nonfatal/NonFatalForm';
import OccupationalDiseaseForm from './forms/reportaccident/occupationaldisease/OccupationalDiseaseForm';
import PersonalInjuryForm from './forms/reportaccident/personalinjury/PersonalInjuryForm';
import SpecifiedInjuriesForm from './forms/reportaccident/specifiedinjuries/SpecifiedInjuriesForm';

// Near miss forms
import DangerousOccurrenceForm from './forms/reportnearmiss/dangerousoccurrence/DangerousOccurrenceForm';
import NearMissForm from './forms/reportnearmiss/nearmiss/NearMissForm';

// Incident forms
import EnvironmentalForm from './forms/reportincident/environmental/EnvironmentalForm';
import PropertyDamageForm from './forms/reportincident/propertydamage/PropertyDamageForm';
import UnsafeActionsForm from './forms/reportincident/unsafeactions/UnsafeActionsForm';
import UnsafeConditionsForm from './forms/reportincident/unsafeconditions/UnsafeConditionsForm';
import UtilityDamageForm from './forms/reportincident/utilitydamage/UtilityDamageForm';

interface HSAccidentsReportsProps {
  onBack: () => void;
}

interface Report {
  id: string;
  auto_id: string;
  report_type: string;
  category: string;
  created_at: string;
  incident_date?: string;
  table_name: string;
}

export function HSAccidentsReports({ onBack }: HSAccidentsReportsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('accident');
  const [selectedFormType, setSelectedFormType] = useState<string>('');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedReportData, setSelectedReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // List of all accident report tables
  const accidentTables = [
    'accidents_dangerousoccurrence',
    'accidents_environmental',
    'accidents_fatality',
    'accidents_hospitaltreatment',
    'accidents_illhealth',
    'accidents_minoraccident',
    'accidents_nearmiss',
    'accidents_nonfatal',
    'accidents_occupationaldisease',
    'accidents_personalinjury',
    'accidents_propertydamage',
    'accidents_sevendayincapacitation',
    'accidents_specifiedinjuries',
    'accidents_unsafeactions',
    'accidents_unsafeconditions',
    'accidents_utilitydamage'
  ];

  // Fetch reports from all tables
  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const allReports: Report[] = [];
      const processedIds = new Set();
      
      for (const table of accidentTables) {
        const { data, error } = await supabase
          .from(table)
          .select('id, auto_id, report_type, category, created_at, incident_date')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data) {
          data.forEach((report: any) => {
            if (!processedIds.has(report.auto_id)) {
              processedIds.add(report.auto_id);
              allReports.push({
                ...report,
                table_name: table
              });
            }
          });
        }
      }

      setReports(allReports);
    } catch (err) {
      setError('Failed to fetch reports');
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filter reports based on search query
  const filteredReports = reports.filter((report) => {
    const searchString = searchQuery.toLowerCase();
    return (
      report.report_type.toLowerCase().includes(searchString) ||
      report.category.toLowerCase().includes(searchString) ||
      report.auto_id.toLowerCase().includes(searchString) ||
      new Date(report.created_at).toLocaleDateString().toLowerCase().includes(searchString)
    );
  });

  // Handle PDF generation
  const handleGeneratePDF = async (report: Report) => {
    try {
      setError(null);
      setPdfError(null);
      setGeneratingPdfId(report.id);
      
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
      
      // Fetch the complete record data from the specific table
      const { data, error } = await supabase
        .from(report.table_name)
        .select('*')
        .eq('id', report.id)
        .single();

      if (error) {
        console.error('Supabase fetch error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('Report data not found');
      }

      // Generate PDF
      const pdfDataUrl = await generateAccidentsPDF({
        reportData: data,
        tableName: report.table_name
      });

      // Format filename
      const formattedFilename = `${report.auto_id || 'report'}-${report.report_type.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      
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
        const htmlContent = createPdfViewerHtml(pdfDataUrl, formattedFilename);
        
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      }
    } catch (err) {
      setError(`Failed to generate PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setPdfError(`Failed to generate PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error generating PDF:', err);
    } finally {
      setGeneratingPdfId(null);
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
          font-family: Arial, sans-serif;
          text-decoration: none;
        }
        .download-button:hover { background: #0055aa; }
        .pdf-view { margin-top: 50px; height: calc(100% - 50px); }
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
          // Safari-specific handling
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

  // Handle delete report
  const handleDelete = async () => {
    if (!selectedReport) return;

    try {
      const { error } = await supabase
        .from(selectedReport.table_name)
        .delete()
        .eq('id', selectedReport.id);

      if (error) throw error;

      setReports(reports.filter(r => r.id !== selectedReport.id));
      setShowDeleteModal(false);
      setSelectedReport(null);
    } catch (err) {
      setError('Failed to delete report');
      console.error('Error deleting report:', err);
    }
  };

  // Handle edit report
  const handleEdit = async (report: Report) => {
    try {
      console.log('Editing report:', report);
      console.log('Table name:', report.table_name);
      console.log('Report ID:', report.id);

      // Fetch the complete record data from the specific table
      const { data, error } = await supabase
        .from(report.table_name)
        .select('*')
        .eq('id', report.id)
        .single();

      if (error) {
        console.error('Supabase fetch error:', error);
        throw error;
      }

      console.log('Fetched data:', data);

      if (data) {
        // Convert snake_case to camelCase for form fields
        const formattedData = Object.entries(data).reduce((acc: any, [key, value]) => {
          // Convert snake_case to camelCase
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          acc[camelKey] = value;
          return acc;
        }, {});

        console.log('Formatted data:', formattedData);

        setSelectedReport(report);
        setSelectedReportData(formattedData);
        setSelectedFormType(report.table_name.replace('accidents_', ''));
        setShowFormModal(true);
      }
    } catch (err) {
      console.error('Error in handleEdit:', err);
      setError('Failed to fetch report data');
    }
  };

  // Form options organized by category
  const formOptions = {
    accident: [
      { id: '7dayincapacitation', label: '7 Day Incapacitation', formType: 'sevendayincapacitation' },
      { id: 'fatality', label: 'Fatality', formType: 'fatality' },
      { id: 'hospitaltreatment', label: 'Hospital Treatment', formType: 'hospitaltreatment' },
      { id: 'illhealth', label: 'Ill Health', formType: 'illhealth' },
      { id: 'minoraccident', label: 'Minor Accident', formType: 'minoraccident' },
      { id: 'nonfatal', label: 'Non Fatal', formType: 'nonfatal' },
      { id: 'occupationaldisease', label: 'Occupational Disease', formType: 'occupationaldisease' },
      { id: 'personalinjury', label: 'Personal Injury', formType: 'personalinjury' },
      { id: 'specifiedinjuries', label: 'Specified Injuries', formType: 'specifiedinjuries' },
    ],
    nearmiss: [
      { id: 'dangerousoccurrence', label: 'Dangerous Occurrence', formType: 'dangerousoccurrence' },
      { id: 'nearmiss', label: 'Near Miss', formType: 'nearmiss' },
    ],
    incident: [
      { id: 'environmental', label: 'Environmental', formType: 'environmental' },
      { id: 'propertydamage', label: 'Property Damage', formType: 'propertydamage' },
      { id: 'unsafeactions', label: 'Unsafe Actions', formType: 'unsafeactions' },
      { id: 'unsafeconditions', label: 'Unsafe Conditions', formType: 'unsafeconditions' },
      { id: 'utilitydamage', label: 'Utility Damage', formType: 'utilitydamage' },
    ],
  };

  const handleFormSelect = (formType: string) => {
    setSelectedFormType(formType);
    setShowFormModal(true);
    setShowAddModal(false);
  };

  // Render the appropriate form component based on the selected form type
  const renderForm = () => {
    const handleFormClose = () => {
      setShowFormModal(false);
      setSelectedReport(null);
      setSelectedReportData(null);
      // Ensure we refresh the reports list
      fetchReports();
    };

    const formProps = {
      onClose: handleFormClose,
      onSubmitSuccess: () => {
        // Add an additional callback specifically for submission success
        fetchReports();
        setShowFormModal(false);
        setSelectedReport(null);
        setSelectedReportData(null);
      },
      initialData: selectedReportData,
      isEditing: !!selectedReport
    };

    console.log('Form props:', formProps);

    switch (selectedFormType) {
      // Report accident forms
      case 'sevendayincapacitation':
        return <SevenDayIncapacitationForm {...formProps} />;
      case 'fatality':
        return <FatalityForm {...formProps} />;
      case 'hospitaltreatment':
        return <HospitalTreatmentForm {...formProps} />;
      case 'illhealth':
        return <IllHealthForm {...formProps} />;
      case 'minoraccident':
        return <MinorAccidentForm {...formProps} />;
      case 'nonfatal':
        return <NonFatalForm {...formProps} />;
      case 'occupationaldisease':
        return <OccupationalDiseaseForm {...formProps} />;
      case 'personalinjury':
        return <PersonalInjuryForm {...formProps} />;
      case 'specifiedinjuries':
        return <SpecifiedInjuriesForm {...formProps} />;
      
      // Near miss forms
      case 'dangerousoccurrence':
        return <DangerousOccurrenceForm {...formProps} />;
      case 'nearmiss':
        return <NearMissForm {...formProps} />;
      
      // Incident forms
      case 'environmental':
        return <EnvironmentalForm {...formProps} />;
      case 'propertydamage':
        return <PropertyDamageForm {...formProps} />;
      case 'unsafeactions':
        return <UnsafeActionsForm {...formProps} />;
      case 'unsafeconditions':
        return <UnsafeConditionsForm {...formProps} />;
      case 'utilitydamage':
        return <UtilityDamageForm {...formProps} />;
      
      default:
        console.error('Unknown form type:', selectedFormType);
        return <div className="text-center py-4 text-gray-500 dark:text-gray-400">Form not implemented yet (Type: {selectedFormType})</div>;
    }
  };

  return (
    <div className="container mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Accidents
        </button>
        
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Accident Reports</h2>
      </div>

      {/* Search Box with Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by report type, category, ID or date..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <div className="w-full sm:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Report
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {/* PDF Error Message */}
      {pdfError && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {pdfError}
        </div>
      )}

      {/* Table Section */}
      <>
        {/* Desktop Table */}
        <div className="hidden lg:block">
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Report Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Incident Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Report Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500 dark:text-gray-400">Loading reports...</td>
                  </tr>
                ) : filteredReports.length > 0 ? (
                  filteredReports.map((report) => (
                    <tr 
                      key={report.id} 
                      className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => handleEdit(report)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{report.auto_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {report.incident_date ? new Date(report.incident_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{report.report_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{report.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(report);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          title="Edit"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGeneratePDF(report);
                          }}
                          disabled={generatingPdfId === report.id}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                          title="View PDF"
                        >
                          {generatingPdfId === report.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <FileText className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReport(report);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500 dark:text-gray-400">No reports found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile/Tablet Cards */}
        <div className="lg:hidden">
          <div className="space-y-4">
            {loading ? (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">Loading reports...</p>
              </div>
            ) : filteredReports.length > 0 ? (
              filteredReports.map((report) => (
                <div 
                  key={report.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                        ID: {report.auto_id}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {report.report_type}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Report Date:</span>
                      <span className="text-gray-900 dark:text-white">{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Incident Date:</span>
                      <span className="text-gray-900 dark:text-white">
                        {report.incident_date ? new Date(report.incident_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Category:</span>
                      <span className="text-gray-900 dark:text-white">{report.category}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(report);
                      }}
                      className="p-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGeneratePDF(report);
                      }}
                      disabled={generatingPdfId === report.id}
                      className="p-2 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md disabled:opacity-50"
                      title="View PDF"
                    >
                      {generatingPdfId === report.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReport(report);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">No reports found</p>
              </div>
            )}
          </div>
        </div>
      </>

      {/* Add Report Modal */}
      {showAddModal && (
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 dark:border-gray-600">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Create New Report</h2>
                <button 
                  onClick={() => setShowAddModal(false)} 
                  className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-100 focus:outline-none p-1"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {/* Tabs */}
                <div className="mb-6">
                  {/* Tab Navigation - Responsive */}
                  <div className="flex flex-col sm:flex-row border-b border-gray-200 dark:border-gray-600">
                    <button
                      className={`px-3 py-2 text-sm sm:text-base font-medium whitespace-nowrap ${
                        activeTab === 'accident' 
                          ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                      onClick={() => setActiveTab('accident')}
                    >
                      Report an Accident
                    </button>
                    <button
                      className={`px-3 py-2 text-sm sm:text-base font-medium whitespace-nowrap ${
                        activeTab === 'nearmiss' 
                          ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                      onClick={() => setActiveTab('nearmiss')}
                    >
                      Report a Near Miss
                    </button>
                    <button
                      className={`px-3 py-2 text-sm sm:text-base font-medium whitespace-nowrap ${
                        activeTab === 'incident' 
                          ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                      onClick={() => setActiveTab('incident')}
                    >
                      Report an Incident
                    </button>
                  </div>
                  
                  {/* Tab Content - Responsive Grid */}
                  <div className="mt-4 sm:mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {formOptions[activeTab as keyof typeof formOptions].map((option) => (
                        <button
                          key={option.id}
                          className="w-full p-3 sm:p-4 border border-gray-200 dark:border-gray-600 rounded-lg text-left hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onClick={() => handleFormSelect(option.formType)}
                        >
                          <span className="text-sm sm:text-base font-medium">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      )}

      {/* Form Modal */}
      {showFormModal && (
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg max-w-4xl w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedReport ? 'Edit Report' : 'Complete Report Form'}: {selectedFormType ? selectedFormType.charAt(0).toUpperCase() + selectedFormType.slice(1) : ''}
                </h2>
                <button 
                  onClick={() => {
                    setShowFormModal(false);
                    setSelectedReport(null);
                    setSelectedReportData(null);
                    fetchReports();
                  }} 
                  className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-100 focus:outline-none"
                >
                 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-6 w-6"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {renderForm()}
              </div>
            </div>
          </div>,
          document.body
        )
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedReport && (
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-center mb-4">
                <Trash2 className="h-12 w-12 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-center text-gray-900 dark:text-white mb-4">
                Delete Report
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                Are you sure you want to delete this report? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedReport(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </div>
  );
}

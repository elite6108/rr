import React, { useEffect, useState, ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../../lib/supabase';
import { Search, Plus, X, Check, Pencil, FileText, Trash2, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../../../utils/formatters';
import { generateAdditionalWorkPDF } from '../../../../utils/pdf/additionalwork/additionalworkPDFGenerator';

interface AdditionalWork {
  id: string;
  created_at: string;
  project_id: string;
  title: string;
  description: string;
  agreed_amount: number;
  agreed_with: string;
  vat_type?: string;
}

interface AdditionalWorkTabProps {
  projectId: string;
  projectName: string;
}

const AdditionalWorkTab = ({ projectId, projectName }: AdditionalWorkTabProps) => {
  const [additionalWorks, setAdditionalWorks] = useState<AdditionalWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workToDelete, setWorkToDelete] = useState<AdditionalWork | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [newWork, setNewWork] = useState({
    title: '',
    description: '',
    agreed_amount: '',
    agreed_with: '',
    vat_type: 'Inc VAT'
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdditionalWorks();
  }, [projectId]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const isModalOpen = showAddModal || showDeleteModal;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      // Scroll to top of viewport when modal opens
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal, showDeleteModal]);

  const fetchAdditionalWorks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('additional_work')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdditionalWorks(data || []);
    } catch (err) {
      console.error('Error fetching additional works:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 2));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const renderStepIndicator = () => {
    const stepLabels = ['Details', 'Amounts'];
    
    return (
      <div className="mb-8 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-medium text-indigo-600">
            {stepLabels[currentStep - 1]}
          </div>
          <div className="text-sm text-gray-500">
            Step {currentStep} of 2
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${(currentStep / 2) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 1) {
      nextStep();
      return;
    }

    try {
      if (isEditing) {
        console.warn('Edit functionality needs work ID to be implemented properly');
      } else {
        const { error } = await supabase
          .from('additional_work')
          .insert({
            project_id: projectId,
            title: newWork.title,
            description: newWork.description,
            agreed_amount: parseFloat(newWork.agreed_amount.replace(/[^0-9.]/g, '')),
            agreed_with: newWork.agreed_with,
            vat_type: newWork.vat_type
          });

        if (error) throw error;
      }

      setShowAddModal(false);
      setNewWork({
        title: '',
        description: '',
        agreed_amount: '',
        agreed_with: '',
        vat_type: 'Inc VAT'
      });
      setCurrentStep(1);
      setIsEditing(false);
      fetchAdditionalWorks();
    } catch (err) {
      console.error('Error saving additional work:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const renderFormStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project</label>
              <input
                type="text"
                value={projectName}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={newWork.title}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewWork(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={newWork.description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNewWork(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agreed Amount</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">£</span>
                <input
                  type="text"
                  value={newWork.agreed_amount}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setNewWork(prev => ({ ...prev, agreed_amount: value }));
                  }}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">VAT</label>
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setNewWork(prev => ({ ...prev, vat_type: 'Inc VAT' }))}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    newWork.vat_type === 'Inc VAT'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Inc VAT
                </button>
                <button
                  type="button"
                  onClick={() => setNewWork(prev => ({ ...prev, vat_type: 'Plus VAT' }))}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    newWork.vat_type === 'Plus VAT'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Plus VAT
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agreed With</label>
              <input
                type="text"
                value={newWork.agreed_with}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewWork(prev => ({ ...prev, agreed_with: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleDelete = async (work: AdditionalWork) => {
    try {
      const { error } = await supabase
        .from('additional_work')
        .delete()
        .eq('id', work.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setWorkToDelete(null);
      fetchAdditionalWorks();
    } catch (err) {
      console.error('Error deleting additional work:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEdit = (work: AdditionalWork) => {
    setNewWork({
      title: work.title,
      description: work.description,
      agreed_amount: work.agreed_amount.toString(),
      agreed_with: work.agreed_with,
      vat_type: work.vat_type || 'Inc VAT'
    });
    setIsEditing(true);
    setShowAddModal(true);
    setCurrentStep(1);
  };

  const handleGeneratePDF = async (work: AdditionalWork) => {
    try {
      setGeneratingPdfId(work.id);
      setPdfError(null);
      
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

      const pdfDataUrl = await generateAdditionalWorkPDF({
        additionalWork: work,
        projectName: projectName
      });

      // Format filename
      const formattedDate = new Date(work.created_at).toISOString().split('T')[0];
      const formattedFilename = `Additional-Work-${work.title.replace(/\s+/g, '-')}-${formattedDate}.pdf`;
      
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
      setPdfError(error instanceof Error ? error.message : 'An error occurred generating the PDF');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const filteredWorks = additionalWorks.filter(work =>
    work.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    work.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    work.agreed_with.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Additional Work</h2>

      {/* Search and Add button row */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search additional works..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setCurrentStep(1);
          }}
          className="shrink-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-5 w-5 mr-1" />
          Add Additional Work
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <p>{error}</p>
        </div>
      )}

      {/* Table/Cards View */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agreed Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agreed With</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredWorks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      {searchQuery ? 'No additional works match your search criteria' : 'No additional works found for this project'}
                    </td>
                  </tr>
                ) : (
                  filteredWorks.map((work) => (
                    <tr key={work.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(work.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{work.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">{work.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formatCurrency(work.agreed_amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{work.agreed_with}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(work)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                            title="Edit"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleGeneratePDF(work)}
                            disabled={generatingPdfId === work.id}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 p-1"
                            title="View PDF"
                          >
                            {generatingPdfId === work.id ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <FileText className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setWorkToDelete(work);
                              setShowDeleteModal(true);
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
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="md:hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredWorks.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No additional works match your search criteria' : 'No additional works found for this project'}
              </div>
            ) : (
              filteredWorks.map((work) => (
                <div key={work.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{work.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(work.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(work)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                        title="Edit"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleGeneratePDF(work)}
                        disabled={generatingPdfId === work.id}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 p-1"
                        title="View PDF"
                      >
                        {generatingPdfId === work.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setWorkToDelete(work);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                      <span className="ml-1 text-gray-900 dark:text-white">{formatCurrency(work.agreed_amount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Agreed With:</span>
                      <span className="ml-1 text-gray-900 dark:text-white">{work.agreed_with}</span>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Description:</span>
                    <p className="mt-1 text-gray-900 dark:text-white">{work.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Additional Work Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {isEditing ? 'Edit Additional Work' : 'Add Additional Work'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setCurrentStep(1);
                  setIsEditing(false);
                  setNewWork({
                    title: '',
                    description: '',
                    agreed_amount: '',
                    agreed_with: '',
                    vat_type: 'Inc VAT'
                  });
                }}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              {renderStepIndicator()}
              <form onSubmit={handleSubmit}>
                {renderFormStep()}
                
                <div className="flex justify-end space-x-3 mt-6">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setCurrentStep(1);
                      setIsEditing(false);
                      setNewWork({
                        title: '',
                        description: '',
                        agreed_amount: '',
                        agreed_with: '',
                        vat_type: 'Inc VAT'
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {currentStep === 2 ? 'Save' : 'Next'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && workToDelete && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-100 dark:bg-red-900 rounded-full p-3">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-center text-gray-900 dark:text-white mb-4">
              Delete Additional Work
            </h3>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{workToDelete.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setWorkToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(workToDelete)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {pdfError && (
        <div className="mb-4 p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <p>{pdfError}</p>
        </div>
      )}
    </div>
  );
}

export default AdditionalWorkTab;

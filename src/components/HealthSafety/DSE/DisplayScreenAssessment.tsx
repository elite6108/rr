import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';
import { verifyAdminPassword } from '../../../utils/adminPassword';
import { Plus, Shield, X, Eye, ChevronLeft } from 'lucide-react';
import { DSEForm } from './DSEForm/DSEForm';
import { generateDSEPDF } from '../../../utils/pdf/dse/dsePDFGenerator';

interface DSEAssessment {
  id: string;
  full_name: string;
  submitted_date: string;
  next_due_date: string;
  user_id: string;
}

export function DisplayScreenAssessment({ onBack }: { onBack: () => void }) {
  const [assessments, setAssessments] = useState<DSEAssessment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdminView, setIsAdminView] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    fetchAssessments();
  }, [isAdminView]);

  const fetchAssessments = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      let query = supabase
        .from('dse_assessments')
        .select('id, full_name, submitted_date, next_due_date, user_id')
        .order('submitted_date', { ascending: false });

      if (!isAdminView) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAssessments(data || []);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const isValid = await verifyAdminPassword(adminPassword);
    if (isValid) {
      setIsAdminView(true);
      setShowAdminModal(false);
      setAdminPassword('');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
    }
    setLoading(false);
  };

  const handleExitAdminView = () => {
    setIsAdminView(false);
  };

  const handleViewAssessment = async (assessment: DSEAssessment) => {
    try {
      setGeneratingPDF(true);

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
            <p>Generating DSE Assessment PDF...</p>
          </div>
        </body>
        </html>
      `);

      const { data, error } = await supabase
        .from('dse_assessments')
        .select('*')
        .eq('id', assessment.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Assessment not found');

      const pdfDataUrl = await generateDSEPDF(data);
      const formattedFilename = `DSE-Assessment-${assessment.full_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

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
                <h2>DSE Assessment PDF Ready for Download</h2>
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
                if (confirm('Would you like to download the DSE Assessment PDF now?')) {
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
      console.error('Error generating PDF:', error);
      alert('Error generating DSE Assessment PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
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

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Training
        </button>
              </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-900">
          DSE Assessments
        </h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          {isAdminView ? (
            <button
              onClick={handleExitAdminView}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Shield className="h-4 w-4 mr-2" />
              Exit Admin View
            </button>
          ) : (
            <button
              onClick={() => setShowAdminModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <Shield className="h-4 w-4 mr-2" />
              Admin View
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Complete DSE
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <div className="bg-white shadow-lg overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profile Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Due
                    </th>
                    {isAdminView && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assessments.map((assessment) => (
                    <tr key={assessment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {assessment.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(assessment.submitted_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(assessment.next_due_date)}
                      </td>
                      {isAdminView && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => handleViewAssessment(assessment)}
                            disabled={generatingPDF}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            {generatingPDF ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-1" />
                                View PDF
                              </>
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {assessments.length === 0 && (
                    <tr>
                      <td
                        colSpan={isAdminView ? 4 : 3}
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        No DSE assessments found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="lg:hidden">
            <div className="space-y-4">
              {assessments.map((assessment) => (
                <div 
                  key={assessment.id}
                  className="bg-white rounded-lg shadow-md p-4 border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-indigo-600">
                        {assessment.full_name}
                      </h4>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Submitted Date:</span>
                      <span className="text-gray-900">{formatDate(assessment.submitted_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Next Due:</span>
                      <span className="text-gray-900">{formatDate(assessment.next_due_date)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {isAdminView && (
                    <div className="flex justify-end pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleViewAssessment(assessment)}
                        disabled={generatingPDF}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {generatingPDF ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            View PDF
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {assessments.length === 0 && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-500">No DSE assessments found</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showForm && createPortal(
        <DSEForm
          onClose={() => {
            setShowForm(false);
            fetchAssessments();
          }}
        />,
        document.body
      )}

      {showAdminModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full m-4">
            <button
              onClick={() => {
                setShowAdminModal(false);
                setAdminPassword('');
                setPasswordError('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Admin Access
            </h3>
            <form onSubmit={handleAdminPasswordSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Admin Password
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAdminPassword(e.target.value)
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {passwordError && (
                    <p className="mt-2 text-sm text-red-600">{passwordError}</p>
                  )}
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminModal(false);
                      setAdminPassword('');
                      setPasswordError('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  >
                    Submit
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

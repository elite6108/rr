import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, FileText, Plus, Edit, Pencil, Trash2, Eye } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { SiteSurveyForm } from '../../../SiteSurvey/form/SiteSurveyForm';
import { SiteSurveyView } from '../../../SiteSurvey/view/SiteSurveyView';
import { generateSiteSurveyPDF } from '../../../../utils/pdf/sitesurvey/sitesurveyPDFGenerator';

// Define Project interface since it's not exported from database types
interface Project {
  id: string;
  name: string;
  customer_id: string;
}

// Define the SiteSurvey interface
interface SiteSurvey {
  id: string;
  survey_id?: string;
  created_at: string;
  updated_at?: string | null;
  project_id: string;
  customer_id: string;
  customer_name?: string;
  project_name?: string;
  location_what3words?: string;
  full_address?: string;
  site_contact?: string;
  site_access_description?: string;
  suitable_for_lorry?: boolean;
  site_access_images?: string[];
  site_access_videos?: string[];
  water_handling?: string;
  manholes_description?: string;
  number_of_courts?: number;
  shuttering_required?: boolean;
  tarmac_required?: boolean;
  tarmac_location?: string;
  tarmac_wagon_space?: boolean;
  muckaway_required?: boolean;
  surface_type?: string;
  lighting_required?: boolean;
  lighting_description?: string;
  canopies_required?: boolean;
  number_of_canopies?: number;
  court_dimensions?: string;
  court_height?: number;
  court_enclosure_type?: string;
  court_floor_material?: string;
  court_features?: string[];
  drawings_images?: string[];
  drawings_videos?: string[];
}

interface SiteSurveyTabProps {
  project: Project;
  siteSurveys: SiteSurvey[];
  isLoading: boolean;
  onSiteSurveysChange?: () => void;
}

export function SiteSurveyTab({ project, siteSurveys, isLoading, onSiteSurveysChange }: SiteSurveyTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSiteSurveyForm, setShowSiteSurveyForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSiteSurvey, setSelectedSiteSurvey] = useState<SiteSurvey | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [siteSurveyToDelete, setSiteSurveyToDelete] = useState<SiteSurvey | null>(null);
  const [siteSurveysList, setSiteSurveysList] = useState<SiteSurvey[]>(siteSurveys);
  const [error, setError] = useState<string | null>(null);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    const isModalOpen = showSiteSurveyForm || showViewModal || showDeleteModal;
    
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
  }, [showSiteSurveyForm, showViewModal, showDeleteModal]);

  useEffect(() => {
    if (project && project.id) {
      fetchSiteSurveys();
    }
  }, [project]);

  const fetchSiteSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('site_survey')
        .select(`
          *,
          projects:project_id(name),
          customers:customer_id(customer_name, company_name)
        `)
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform the data to include project and customer names
      const enhancedSurveys = data?.map(survey => ({
        ...survey,
        project_name: survey.projects?.name || 'Unknown Project',
        customer_name: survey.customers ? 
          (survey.customers.company_name || survey.customers.customer_name || 'Unknown Customer') 
          : 'Unknown Customer'
      })) || [];

      console.log('Fetched site surveys:', enhancedSurveys);
      setSiteSurveysList(enhancedSurveys);
      
      if (onSiteSurveysChange) {
        onSiteSurveysChange();
      }
    } catch (error) {
      console.error('Error fetching site surveys:', error);
      setError('Failed to fetch site surveys');
    }
  };

  const handleEdit = (survey: SiteSurvey) => {
    setSelectedSiteSurvey(survey);
    setShowSiteSurveyForm(true);
  };

  const handleView = (survey: SiteSurvey) => {
    setSelectedSiteSurvey(survey);
    setShowViewModal(true);
  };

  const handleDelete = (survey: SiteSurvey) => {
    setSiteSurveyToDelete(survey);
    setShowDeleteModal(true);
  };

  const handleGeneratePDF = async (survey: SiteSurvey) => {
    try {
      const pdfBase64 = await generateSiteSurveyPDF({ siteSurvey: survey });
      const formattedFilename = `site-survey-${survey.survey_id || survey.id}.pdf`;
      
      // Create a custom HTML page that displays the PDF with proper filename
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
          const pdfDataUrl = "${pdfBase64}";
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

      // Create blob and open in new window
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const confirmDelete = async () => {
    if (!siteSurveyToDelete) return;

    try {
      const { error } = await supabase
        .from('site_survey')
        .delete()
        .eq('id', siteSurveyToDelete.id);

      if (error) throw error;

      setSiteSurveysList(prevSurveys => 
        prevSurveys.filter(survey => survey.id !== siteSurveyToDelete.id)
      );
      
      setShowDeleteModal(false);
      setSiteSurveyToDelete(null);

    } catch (err) {
      console.error('Error deleting site survey:', err);
      setError('Failed to delete site survey');
    }
  };

  const filteredSiteSurveys = siteSurveysList.filter(survey => {
    const query = searchQuery.toLowerCase();
    return (
      survey.customer_name?.toLowerCase().includes(query) ||
      survey.project_name?.toLowerCase().includes(query) ||
      (survey.created_at && new Date(survey.created_at).toLocaleDateString().toLowerCase().includes(query))
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Site Surveys</h2>

      {/* Search and Add button row */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, project, or date..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={() => {
            // Create a new survey with the project ID pre-filled
            setSelectedSiteSurvey({
              id: '',
              created_at: new Date().toISOString(),
              project_id: project.id,
              customer_id: project.customer_id || '',
              project_name: project.name
            });
            setShowSiteSurveyForm(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Site Survey
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <p>{error}</p>
        </div>
      )}

      {/* Site Surveys Table/Cards */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Customer ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSiteSurveys.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      {searchQuery ? 'No site surveys match your search criteria' : 'No site surveys found for this project'}
                    </td>
                  </tr>
                ) : (
                  filteredSiteSurveys.map((survey) => (
                    <tr key={survey.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {survey.created_at ? new Date(survey.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {survey.customer_name || survey.customer_id || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {survey.project_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleView(survey)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 mr-2"
                            title="View Site Survey Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(survey)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 mr-2"
                            title="Edit Site Survey"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                          onClick={() => handleGeneratePDF(survey)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 mr-2"
                          title="View PDF"
                        >
                          <FileText className="h-5 w-5" />
                        </button>
                                             <button
                            onClick={() => handleDelete(survey)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                            title="Delete Site Survey"
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
          {filteredSiteSurveys.length === 0 ? (
            <div className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No site surveys match your search criteria' : 'No site surveys found for this project'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSiteSurveys.map((survey) => (
                <div key={survey.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {survey.customer_name || survey.customer_id || 'N/A'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {survey.created_at ? new Date(survey.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(survey)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        title="View Site Survey Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(survey)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit Site Survey"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleGeneratePDF(survey)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        title="View PDF"
                      >
                        <FileText className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(survey)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete Site Survey"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Project:</span>
                      <p className="text-gray-900 dark:text-white">{survey.project_name || 'N/A'}</p>
                    </div>
                    {survey.full_address && (
                      <div className="col-span-2">
                        <span className="font-medium text-gray-500 dark:text-gray-400">Address:</span>
                        <p className="text-gray-900 dark:text-white">{survey.full_address}</p>
                      </div>
                    )}
                    {survey.site_contact && (
                      <div className="col-span-2">
                        <span className="font-medium text-gray-500 dark:text-gray-400">Site Contact:</span>
                        <p className="text-gray-900 dark:text-white">{survey.site_contact}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Site Survey Form Modal */}
      {showSiteSurveyForm && createPortal(
        <SiteSurveyForm
          onClose={() => {
            setShowSiteSurveyForm(false);
            setSelectedSiteSurvey(null);
          }}
          onSuccess={() => {
            setShowSiteSurveyForm(false);
            setSelectedSiteSurvey(null);
            fetchSiteSurveys();
            if (onSiteSurveysChange) {
              onSiteSurveysChange();
            }
          }}
          surveyToEdit={selectedSiteSurvey}
          isProjectContext={true}
        />,
        document.body
      )}
      
      {/* Site Survey View Modal */}
      {showViewModal && selectedSiteSurvey && createPortal(
        <SiteSurveyView
          survey={selectedSiteSurvey}
          customerName={selectedSiteSurvey.customer_name || 'Unknown Customer'}
          projectName={selectedSiteSurvey.project_name || 'Unknown Project'}
          onClose={() => {
            setShowViewModal(false);
            setSelectedSiteSurvey(null);
          }}
        />,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full m-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Confirm Delete
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to delete this site survey? This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
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
        </div>,
        document.body
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, AlertCircle, Plus, Trash2, Camera, Loader2, Image, FileText, Save, Edit } from 'lucide-react';
import { SignatureCanvas } from './SignatureCanvas';
import type { Equipment, ChecklistItem, EquipmentChecklist } from '../../../types/database';

interface ToolboxTalkFormProps {
  talk: {
    id: string;
    title: string;
  };
  onClose: () => void;
  onNavigateToCompletedTalks: () => void;
}

interface Attendee {
  id: string;
  name: string;
  signature: string | null;
}

interface PDFFile {
  id: string;
  name: string;
  displayName: string;
  url: string;
  signed_url?: string;
}

export function ToolboxTalkForm({ talk, onClose, onNavigateToCompletedTalks }: ToolboxTalkFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [allSites, setAllSites] = useState<any[]>([]);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentAttendeeId, setCurrentAttendeeId] = useState<string | null>(null);
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showPDFUpdateModal, setShowPDFUpdateModal] = useState(false);
  const [allPDFs, setAllPDFs] = useState<PDFFile[]>([]);
  const [selectedNewPDF, setSelectedNewPDF] = useState('');
  const [formData, setFormData] = useState({
    title: talk.title,
    siteReference: '',
    projectId: '',
    presenter: '',
    selectedPDF: '',
    attendees: [] as Attendee[]
  });

  useEffect(() => {
    fetchProjects();
    fetchPDFFiles();
    fetchAllSites();
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (formData.projectId) {
      const projectSites = allSites.filter(site => site.project_id === formData.projectId);
      setSites(projectSites);
      
      if (formData.siteReference) {
        const isValidSite = projectSites.some(site => site.name === formData.siteReference);
        if (!isValidSite) {
          setFormData(prev => ({ ...prev, siteReference: '' }));
        }
      }
    } else {
      setSites([]);
      setFormData(prev => ({ ...prev, siteReference: '' }));
    }
  }, [formData.projectId, allSites]);

  const fetchAllSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, project_id')
        .order('name', { ascending: true });

      if (error) throw error;
      setAllSites(data || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setError('Failed to load sites. Please try again later.');
    }
  };

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, project_id')
        .order('name', { ascending: true });

      if (error) throw error;
      setSites(data || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
      setError('Failed to load sites. Please try again later.');
    }
  };

  const generateSignedUrl = async (fileName: string) => {
    try {
      const { data } = await supabase.storage
        .from('toolbox-talks')
        .createSignedUrl(fileName, 60 * 60); // 1 hour expiry
      
      return data?.signedUrl || '';
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return '';
    }
  };

  const fetchPDFFiles = async () => {
    try {
      // Get PDFs associated with this talk ID
      const { data: pdfData, error: pdfError } = await supabase
        .from('toolbox_talk_pdfs')
        .select('*')
        .eq('talk_id', talk.id);

      if (pdfError) throw pdfError;

      if (pdfData && pdfData.length > 0) {
        const pdfFiles = await Promise.all(
          pdfData.map(async (pdf: any) => {
            const signedUrl = await generateSignedUrl(pdf.file_name);
            return {
              id: pdf.file_name,
              name: pdf.file_name,
              displayName: pdf.display_name,
              url: signedUrl,
              signed_url: signedUrl
            };
          })
        );

        setPdfFiles(pdfFiles);
        
        // Auto-select the PDF if one exists
        if (pdfFiles.length > 0) {
          setFormData(prev => ({
            ...prev,
            selectedPDF: pdfFiles[0].name
          }));
        }
        return;
      }

      // If no PDF found, set empty state
      setPdfFiles([]);
      setFormData(prev => ({
        ...prev,
        selectedPDF: ''
      }));
    } catch (err) {
      console.error('Error fetching PDF files:', err);
      setError('Failed to load PDF files. Please try again later.');
    }
  };

  // Add a function to refresh signed URLs
  const refreshSignedUrls = async () => {
    const updatedFiles = await Promise.all(
      pdfFiles.map(async (file) => {
        const signedUrl = await generateSignedUrl(file.name);
        return {
          ...file,
          url: signedUrl,
          signed_url: signedUrl,
        };
      })
    );
    setPdfFiles(updatedFiles);
  };

  // Refresh signed URLs every 45 minutes
  useEffect(() => {
    const interval = setInterval(refreshSignedUrls, 45 * 60 * 1000);
    return () => clearInterval(interval);
  }, [pdfFiles]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects. Please try again later.');
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (user?.user_metadata?.display_name) {
        setFormData(prev => ({
          ...prev,
          presenter: user.user_metadata.display_name
        }));
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to load user profile. Please enter your name manually.');
    }
  };

  const handleAddAttendee = () => {
    setFormData(prev => ({
      ...prev,
      attendees: [
        ...prev.attendees,
        {
          id: crypto.randomUUID(),
          name: '',
          signature: null
        }
      ]
    }));
  };

  const handleRemoveAttendee = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(a => a.id !== id)
    }));
  };

  const handleAttendeeNameChange = (id: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.map(a => 
        a.id === id ? { ...a, name } : a
      )
    }));
  };

  const handleSignatureComplete = (signature: string) => {
    if (currentAttendeeId) {
      setFormData(prev => ({
        ...prev,
        attendees: prev.attendees.map(a => 
          a.id === currentAttendeeId ? { ...a, signature } : a
        )
      }));
    }
    setShowSignatureModal(false);
    setCurrentAttendeeId(null);
  };

  const handleSignatureCancel = () => {
    setShowSignatureModal(false);
    setCurrentAttendeeId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to create a toolbox talk.');

      // Validate form
      if (!formData.projectId) {
        throw new Error('Please select a project.');
      }
      if (!formData.siteReference) {
        throw new Error('Please enter a site reference.');
      }
      if (!formData.presenter) {
        throw new Error('Please enter the presenter\'s name.');
      }
      if (formData.attendees.length === 0) {
        throw new Error('Please add at least one attendee.');
      }
      if (formData.attendees.some(a => !a.name)) {
        throw new Error('All attendees must have a name.');
      }
      if (formData.attendees.some(a => !a.signature)) {
        throw new Error('All attendees must sign the toolbox talk.');
      }

      const { error } = await supabase
        .from('toolbox_talks')
        .insert([{
          talk_number: talk.id,
          title: formData.title,
          site_reference: formData.siteReference,
          project_id: formData.projectId,
          presenter: formData.presenter,
          attendees: formData.attendees,
          completed_by: user.user_metadata?.display_name || 'Unknown',
          user_id: user.id,
          status: 'completed'
        }]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('A toolbox talk with this number already exists.');
        }
        throw new Error(`Failed to save toolbox talk: ${error.message}`);
      }
      
      onClose();
      onNavigateToCompletedTalks();
    } catch (err) {
      console.error('Error saving toolbox talk:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while saving the toolbox talk.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPDFFile = pdfFiles.find(file => file.name === formData.selectedPDF);

  // Add new function to fetch all PDFs
  const fetchAllPDFs = async () => {
    try {
      const { data: pdfData, error: pdfError } = await supabase
        .from('toolbox_talk_pdfs')
        .select('*')
        .order('display_name', { ascending: true });

      if (pdfError) throw pdfError;

      if (pdfData) {
        const pdfFiles = await Promise.all(
          pdfData.map(async (pdf) => {
            const signedUrl = await generateSignedUrl(pdf.file_name);
            return {
              id: pdf.file_name,
              name: pdf.file_name,
              displayName: pdf.display_name,
              url: signedUrl,
              signed_url: signedUrl
            };
          })
        );
        setAllPDFs(pdfFiles);
      }
    } catch (err) {
      console.error('Error fetching all PDFs:', err);
      setError('Failed to load PDFs. Please try again later.');
    }
  };

  // Add function to handle PDF update
  const handlePDFUpdate = async () => {
    if (!selectedNewPDF) return;
    
    setLoading(true);
    try {
      // First, remove any existing association for this talk
      const { error: deleteError } = await supabase
        .from('toolbox_talk_pdfs')
        .update({ talk_id: null })
        .eq('talk_id', talk.id);

      if (deleteError) throw deleteError;

      // Then, update the new PDF with this talk's ID
      const { error: updateError } = await supabase
        .from('toolbox_talk_pdfs')
        .update({ talk_id: talk.id })
        .eq('file_name', selectedNewPDF);

      if (updateError) throw updateError;

      // Get the selected PDF details
      const selectedPDF = allPDFs.find(pdf => pdf.name === selectedNewPDF);
      if (!selectedPDF) throw new Error('Selected PDF not found');

      // Update both states
      setPdfFiles([selectedPDF]);
      setFormData(prev => ({
        ...prev,
        selectedPDF: selectedNewPDF
      }));

      setShowPDFUpdateModal(false);
      setSelectedNewPDF('');
    } catch (err) {
      console.error('Error updating PDF:', err);
      setError('Failed to update PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update useEffect to fetch all PDFs when modal opens
  useEffect(() => {
    if (showPDFUpdateModal) {
      fetchAllPDFs();
    }
  }, [showPDFUpdateModal]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-start sm:items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl p-4 sm:p-8 w-full max-w-2xl my-4 max-h-[calc(100vh-2rem)] sm:max-h-[800px] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{talk.id}</p>
            <h2 className="text-2xl font-bold">New Toolbox Talk</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Toolbox Talk *
            </label>
            <input
              type="text"
              value={formData.title}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-2">
              Project *
            </label>
            <select
              id="project"
              required
              value={formData.projectId}
              onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value, siteReference: '' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          
          
          <div>
            <label htmlFor="siteReference" className="block text-sm font-medium text-gray-700 mb-2">
              Site Reference *
            </label>
            <select
              id="siteReference"
              required
              value={formData.siteReference}
              onChange={(e) => setFormData(prev => ({ ...prev, siteReference: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={!formData.projectId}
            >
              <option value="">
                {!formData.projectId ? 'Select a project first' : 'Select a site'}
              </option>
              {sites.map((site) => (
                <option key={site.id} value={site.name}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          

          <div>
            <label htmlFor="presenter" className="block text-sm font-medium text-gray-700 mb-2">
              Presenter *
            </label>
            <input
              type="text"
              id="presenter"
              required
              value={formData.presenter}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
              placeholder="Loading presenter name..."
            />
          </div>

          <div>
            <label htmlFor="pdf" className="block text-sm font-medium text-gray-700 mb-2">
              PDF Document *
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={selectedPDFFile?.displayName || ''}
                disabled
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
              />
              {selectedPDFFile && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowPDFModal(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPDFUpdateModal(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Update PDF
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Attendees *</h3>
              <button
                type="button"
                onClick={handleAddAttendee}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Attendee
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto pr-2">
              <div className="space-y-4">
                {formData.attendees.map((attendee) => (
                  <div key={attendee.id} className="flex flex-col sm:flex-row sm:items-start sm:space-x-4 space-y-2 sm:space-y-0 bg-gray-50 p-4 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={attendee.name}
                        onChange={(e) => handleAttendeeNameChange(attendee.id, e.target.value)}
                        placeholder="Enter full name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex space-x-2 sm:flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentAttendeeId(attendee.id);
                          setShowSignatureModal(true);
                        }}
                        className={`flex-1 sm:flex-none px-3 py-2 text-sm font-medium rounded-md ${
                          attendee.signature
                            ? 'text-green-700 bg-green-100 hover:bg-green-200'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {attendee.signature ? 'Signed' : 'Sign'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttendee(attendee.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}

                {formData.attendees.length === 0 && (
                  <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                    Click "Add Attendee" to add people to the talk
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-md">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-red-600 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Start Talk'}
            </button>
          </div>
        </form>
      </div>

      {showSignatureModal && (
        <SignatureCanvas
          onComplete={handleSignatureComplete}
          onCancel={handleSignatureCancel}
        />
      )}

      {/* PDF Viewer Modal */}
      {showPDFModal && selectedPDFFile && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl p-8 max-w-6xl w-full m-4 h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedPDFFile.displayName}
              </h3>
              <div className="flex items-center space-x-4">
                <a
                  href={selectedPDFFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
                <button
                  onClick={() => setShowPDFModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden">
              <iframe
                src={selectedPDFFile.signed_url || ''}
                className="w-full h-full"
                title="PDF Viewer"
              />
            </div>
          </div>
        </div>
      )}

      {/* PDF Update Modal */}
      {showPDFUpdateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Update PDF Document
              </h3>
              <button
                onClick={() => {
                  setShowPDFUpdateModal(false);
                  setSelectedNewPDF('');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New PDF
                </label>
                <select
                  value={selectedNewPDF}
                  onChange={(e) => setSelectedNewPDF(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a PDF</option>
                  {allPDFs.map((file) => (
                    <option key={file.id} value={file.name}>
                      {file.displayName || file.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPDFUpdateModal(false);
                    setSelectedNewPDF('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePDFUpdate}
                  disabled={!selectedNewPDF || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
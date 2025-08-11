import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Search, FileText, Pencil, Trash2, X, Upload, Loader2, AlertCircle, ImageIcon, ExternalLink } from 'lucide-react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';

interface CodeOfPracticeDoc {
  id: string;
  title: string;
  file_path: string;
  thumbnail_path: string | null;
  created_at: string;
  updated_at: string;
}

interface CodeOfPracticeProps {
  onBack: () => void;
}

interface UploadModalProps {
  onClose: () => void;
  onUpload: (title: string, pdfFile: File, thumbnailFile: File | null) => void;
  uploading: boolean;
  error: string | null;
}

interface PDFViewerModalProps {
  onClose: () => void;
  pdfUrl: string;
  title: string;
}

const PDFViewerModal: React.FC<PDFViewerModalProps> = ({ onClose, pdfUrl, title }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="relative w-full h-full max-w-6xl max-h-screen m-4 bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{title}</h3>
          <div className="flex items-center space-x-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </a>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="w-full h-full">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={title}
          />
        </div>
      </div>
    </div>
  );
};

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUpload, uploading, error }) => {
  const [title, setTitle] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.type !== 'application/pdf') {
        setLocalError('Only PDF files are allowed');
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        setLocalError('PDF file size must be less than 20MB');
        return;
      }

      setPdfFile(file);
      setLocalError(null);
    }
  };

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (!file.type.startsWith('image/')) {
        setLocalError('Only image files are allowed for thumbnails');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setLocalError('Thumbnail image size must be less than 5MB');
        return;
      }

      setThumbnailFile(file);
      setLocalError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !title) {
      setLocalError('Please provide a title and PDF file');
      return;
    }

    onUpload(title, pdfFile, thumbnailFile);
  };

  const displayError = error || localError;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Code of Practice</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter document title"
              required
            />
          </div>

          {/* PDF Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              PDF File
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md dark:border-gray-600">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label
                    htmlFor="pdf-upload"
                    className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload PDF</span>
                    <input
                      id="pdf-upload"
                      name="pdf-upload"
                      type="file"
                      className="sr-only"
                      accept="application/pdf"
                      onChange={handlePdfFileChange}
                      required
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PDF files up to 20MB
                </p>
              </div>
            </div>
            {pdfFile && (
              <div className="mt-2 flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {pdfFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => setPdfFile(null)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Thumbnail Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Thumbnail Image (Optional)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md dark:border-gray-600">
              <div className="space-y-1 text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label
                    htmlFor="thumbnail-upload"
                    className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload image</span>
                    <input
                      id="thumbnail-upload"
                      name="thumbnail-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleThumbnailFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
            </div>
            {thumbnailFile && (
              <div className="mt-2 flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {thumbnailFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => setThumbnailFile(null)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {displayError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{displayError}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !pdfFile || !title}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload Document'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export function CodeOfPractice({ onBack }: CodeOfPracticeProps) {
  const [documents, setDocuments] = useState<CodeOfPracticeDoc[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<{ url: string; title: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showUploadModal || showPDFModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showUploadModal, showPDFModal]);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('guidance_codeofpractice')
        .select('*')
        .order('title', { ascending: true });

      if (error) throw error;
      setDocuments(data || []);

      if (data && data.length > 0) {
        await fetchThumbnailUrls(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }

  async function fetchThumbnailUrls(docs: CodeOfPracticeDoc[]) {
    const urlMap: Record<string, string> = {};
    
    for (const doc of docs) {
      if (doc.thumbnail_path) {
        try {
          const { data, error } = await supabase.storage
            .from('guidance-images')
            .createSignedUrl(doc.thumbnail_path, 3600); // 1 hour expiry

          if (data && !error) {
            urlMap[doc.id] = data.signedUrl;
          }
        } catch (error) {
          console.error(`Error fetching thumbnail URL for doc ${doc.id}:`, error);
        }
      }
    }
    
    setThumbnailUrls(urlMap);
  }

  const handleViewPDF = async (doc: CodeOfPracticeDoc) => {
    try {
      const { data, error } = await supabase.storage
        .from('guidance-codeofpractice')
        .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

      if (error) throw error;

      setSelectedPDF({
        url: data.signedUrl,
        title: doc.title
      });
      setShowPDFModal(true);
    } catch (error) {
      console.error('Error getting PDF URL:', error);
      setError('Failed to load PDF');
    }
  };

  const handleUpload = async (title: string, pdfFile: File, thumbnailFile: File | null) => {
    setUploading(true);
    setError(null);

    try {
      // Upload PDF to guidance-codeofpractice bucket
      const pdfFileName = `${Date.now()}-${pdfFile.name}`;
      const { error: pdfError } = await supabase.storage
        .from('guidance-codeofpractice')
        .upload(pdfFileName, pdfFile);
      if (pdfError) throw pdfError;

      // Upload thumbnail to private guidance-images bucket if provided
      let thumbnailPath = null;
      if (thumbnailFile) {
        const thumbnailFileName = `${Date.now()}-${thumbnailFile.name}`;
        const { error: thumbnailError } = await supabase.storage
          .from('guidance-images')
          .upload(thumbnailFileName, thumbnailFile);
        if (thumbnailError) throw thumbnailError;
        thumbnailPath = thumbnailFileName;
      }

      // Create database record
      const { error: dbError } = await supabase.from('guidance_codeofpractice').insert([
        {
          title,
          file_path: pdfFileName,
          thumbnail_path: thumbnailPath,
        },
      ]);

      if (dbError) throw dbError;

      // Reset form and refresh documents
      setShowUploadModal(false);
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Error uploading document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Filter documents based on search query
  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Guidance
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Code of Practice Documents</h2>
      </div>

      {/* Search Box with Upload Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </button>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
            No documents found
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm p-4 text-center flex flex-col justify-between border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex-grow flex flex-col items-center justify-center pt-4">
                {doc.thumbnail_path && thumbnailUrls[doc.id] ? (
                  <img
                    src={thumbnailUrls[doc.id]}
                    alt={doc.title}
                    className="h-30 w-30 rounded object-cover mb-4"
                  />
                ) : (
                  <FileText className="h-20 w-20 text-gray-400 mb-4" />
                )}
                <h3 className="text-md font-medium text-gray-900 dark:text-white truncate w-full px-2">
                  {doc.title}
                </h3>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => handleViewPDF(doc)}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  View PDF
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && createPortal(
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          uploading={uploading}
          error={error}
        />,
        document.body
      )}

      {/* PDF Viewer Modal */}
      {showPDFModal && selectedPDF && createPortal(
        <PDFViewerModal
          onClose={() => {
            setShowPDFModal(false);
            setSelectedPDF(null);
          }}
          pdfUrl={selectedPDF.url}
          title={selectedPDF.title}
        />,
        document.body
      )}
    </div>
  );
}

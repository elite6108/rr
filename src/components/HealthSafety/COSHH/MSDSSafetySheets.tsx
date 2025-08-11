import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, FileCheck, Search, Plus, FileText, X, Eye, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface MSDSSafetySheetsProps {
  onBack: () => void;
}

interface CoshhMSDS {
  id: string;
  substance_name: string;
  manufacturer: string;
  file_name: string;
  file_path: string;
  file_size: number;
  upload_date: string;
  uploaded_by: string;
  coshh_register_id?: string;
  created_at: string;
}

interface CoshhRegisterItem {
  id: string;
  substance_name: string;
  manufacturer: string;
}

export function MSDSSafetySheets({ onBack }: MSDSSafetySheetsProps) {
  const [msdsSheets, setMsdsSheets] = useState<CoshhMSDS[]>([]);
  const [coshhRegister, setCoshhRegister] = useState<CoshhRegisterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSheetForDelete, setSelectedSheetForDelete] = useState<CoshhMSDS | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form data for upload
  const [formData, setFormData] = useState({
    substance_name: '',
    manufacturer: '',
    coshh_register_id: ''
  });

  useEffect(() => {
    fetchMSDSSheets();
    fetchCoshhRegister();
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showUploadModal || showDeleteModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showUploadModal, showDeleteModal]);

  const fetchMSDSSheets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coshh_msds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMsdsSheets(data || []);
    } catch (error) {
      console.error('Error fetching MSDS sheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoshhRegister = async () => {
    try {
      const { data, error } = await supabase
        .from('coshh_register')
        .select('id, substance_name, manufacturer')
        .order('substance_name', { ascending: true });

      if (error) throw error;
      setCoshhRegister(data || []);
    } catch (error) {
      console.error('Error fetching COSHH register:', error);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file only.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: any) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0] as File);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRegisterSelection = (registerId: string) => {
    const selected = coshhRegister.find(item => item.id === registerId);
    if (selected) {
      setFormData({
        ...formData,
        coshh_register_id: registerId,
        substance_name: selected.substance_name,
        manufacturer: selected.manufacturer
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !formData.substance_name || !formData.manufacturer) {
      alert('Please fill in all required fields and select a file.');
      return;
    }

    try {
      setUploading(true);

      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${formData.substance_name.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('coshh-msds')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Save record to database
      const { error: dbError } = await supabase
        .from('coshh_msds')
        .insert({
          substance_name: formData.substance_name,
          manufacturer: formData.manufacturer,
          file_name: selectedFile.name,
          file_path: uploadData.path,
          file_size: selectedFile.size,
          coshh_register_id: formData.coshh_register_id || null,
          uploaded_by: user?.id
        });

      if (dbError) throw dbError;

      // Reset form and close modal
      setFormData({ substance_name: '', manufacturer: '', coshh_register_id: '' });
      setSelectedFile(null);
      setShowUploadModal(false);
      
      // Refresh the list
      fetchMSDSSheets();

    } catch (error) {
      console.error('Error uploading MSDS:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (msds: CoshhMSDS) => {
    try {
      const { data, error } = await supabase.storage
        .from('coshh-msds')
        .download(msds.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = msds.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file.');
    }
  };

  const handlePreview = async (msds: CoshhMSDS) => {
    try {
      const { data, error } = await supabase.storage
        .from('coshh-msds')
        .download(msds.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error previewing file:', error);
      alert('Error previewing file.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredSheets = msdsSheets.filter(sheet =>
    sheet.substance_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteClick = (sheet: CoshhMSDS) => {
    setSelectedSheetForDelete(sheet);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedSheetForDelete) return;

    try {
      setDeleting(true);

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('coshh-msds')
        .remove([selectedSheetForDelete.file_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete record from database
      const { error: dbError } = await supabase
        .from('coshh_msds')
        .delete()
        .eq('id', selectedSheetForDelete.id);

      if (dbError) throw dbError;

      // Close modal and refresh list
      setShowDeleteModal(false);
      setSelectedSheetForDelete(null);
      fetchMSDSSheets();

    } catch (error) {
      console.error('Error deleting MSDS:', error);
      alert('Error deleting MSDS sheet. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedSheetForDelete(null);
  };

  const renderUploadModal = () => {
    if (!showUploadModal) return null;

    return createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Upload MSDS Sheet
            </h3>
            <button
              onClick={() => setShowUploadModal(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Link to COSHH Register */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Link to COSHH Register (Optional)
              </label>
              <select
                value={formData.coshh_register_id}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRegisterSelection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select from COSHH Register...</option>
                {coshhRegister.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.substance_name} - {item.manufacturer}
                  </option>
                ))}
              </select>
            </div>

            {/* Substance Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Substance Name *
              </label>
              <input
                type="text"
                value={formData.substance_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, substance_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter substance name"
                required
              />
            </div>

            {/* Manufacturer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Manufacturer *
              </label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, manufacturer: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter manufacturer name"
                required
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                MSDS File (PDF only) *
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  dragOver 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileCheck className="h-8 w-8 text-green-500 mx-auto" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Drag and drop a PDF file here, or{' '}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        browse
                      </button>
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF files only, max 10MB
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !formData.substance_name || !formData.manufacturer}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload MSDS'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  const renderDeleteModal = () => {
    if (!showDeleteModal || !selectedSheetForDelete) return null;

    return createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
          <div className="flex items-center justify-center p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete MSDS Sheet
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete the MSDS sheet for:
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
              <p className="font-medium text-gray-900 dark:text-white">
                {selectedSheetForDelete.substance_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {selectedSheetForDelete.manufacturer}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedSheetForDelete.file_name}
              </p>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">
              This action cannot be undone.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCancelDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete MSDS'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
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

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            MSDS Safety Sheets
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage Material Safety Data Sheets for hazardous substances
          </p>
        </div>
      </div>

      {/* Search and Add Section */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search MSDS sheets..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add MSDS Sheet
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg">
        {loading ? (
          <div className="p-6 text-center">
            <div className="text-gray-600 dark:text-gray-300">Loading MSDS sheets...</div>
          </div>
        ) : filteredSheets.length === 0 ? (
          <div className="p-6">
            <div className="text-center py-12">
              <FileCheck className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm ? 'No MSDS sheets found' : 'No MSDS Safety Sheets Found'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {searchTerm 
                  ? `No MSDS sheets match "${searchTerm}"`
                  : 'Get started by adding your first Material Safety Data Sheet'
                }
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First MSDS Sheet
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Substance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Manufacturer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      File Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSheets.map((sheet) => (
                    <tr key={sheet.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {sheet.substance_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {sheet.manufacturer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {sheet.file_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatFileSize(sheet.file_size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {new Date(sheet.upload_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handlePreview(sheet)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(sheet)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            title="Download"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(sheet)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Cards */}
            <div className="lg:hidden">
              <div className="p-4 space-y-4">
                {filteredSheets.map((sheet) => (
                  <div 
                    key={sheet.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                          {sheet.substance_name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {sheet.manufacturer}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">File Name:</span>
                        <span className="text-gray-900 dark:text-white truncate ml-2">
                          {sheet.file_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">File Size:</span>
                        <span className="text-gray-900 dark:text-white">
                          {formatFileSize(sheet.file_size)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Upload Date:</span>
                        <span className="text-gray-900 dark:text-white">
                          {new Date(sheet.upload_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={() => handlePreview(sheet)}
                        className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </button>
                      <button
                        onClick={() => handleDownload(sheet)}
                        className="flex items-center px-3 py-2 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
                        title="Download"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Download
                      </button>
                      <button
                        onClick={() => handleDeleteClick(sheet)}
                        className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {renderUploadModal()}
      {renderDeleteModal()}
    </div>
  );
}

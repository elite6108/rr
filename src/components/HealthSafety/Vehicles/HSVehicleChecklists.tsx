import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';
import {
  ChevronLeft,
  FileCheck,
  AlertTriangle,
  Plus,
  FileText,
  Loader2,
  Edit,
  Trash2,
  Pencil,
  Search
} from 'lucide-react';
import VehicleChecklistForm from './VehicleChecklistForm';
import { generateVehicleChecklistPDF } from '../../../utils/pdf/vehicles/vehicleChecklistPDFGenerator';
import type { Vehicle, VehicleChecklist } from '../../../types/database';

// Add the font face definition
const fontFaceStyle = `
  @font-face {
    font-family: 'UKNumberPlate';
    src: url('/src/styles/font/UKNumberPlate.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }
`;

// Create a style element and add it to the head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = fontFaceStyle;
  document.head.appendChild(styleElement);
}

interface HSVehicleChecklistsProps {
  onBack: () => void;
}

export const HSVehicleChecklists: React.FC<HSVehicleChecklistsProps> = ({
  onBack,
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [checklists, setChecklists] = useState<VehicleChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedChecklist, setSelectedChecklist] =
    useState<VehicleChecklist | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [checklistToDelete, setChecklistToDelete] = useState<VehicleChecklist | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [vehiclesResponse, checklistsResponse] = await Promise.all([
        supabase
          .from('vehicles')
          .select('*')
          .order('registration', { ascending: true }),
        supabase
          .from('vehicle_checklists')
          .select('*')
          .order('check_date', { ascending: false }),
      ]);

      if (vehiclesResponse.error) throw vehiclesResponse.error;
      if (checklistsResponse.error) throw checklistsResponse.error;

      setVehicles(vehiclesResponse.data || []);
      setChecklists(checklistsResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while fetching data'
      );
    } finally {
      setLoading(false);
    }
  };

  const getLastCheckInfo = (vehicleId: string) => {
    const vehicleChecklists = checklists.filter(
      (c) => c.vehicle_id === vehicleId
    );
    if (vehicleChecklists.length === 0) return { date: null, frequency: null };

    const lastChecklist = vehicleChecklists[0];
    const lastCheckDate = new Date(lastChecklist.check_date);
    const today = new Date();
    let isOverdue = false;

    switch (lastChecklist.frequency) {
      case 'daily':
        isOverdue =
          today.getTime() - lastCheckDate.getTime() > 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        isOverdue =
          today.getTime() - lastCheckDate.getTime() > 7 * 24 * 60 * 60 * 1000;
        break;
      case 'monthly':
        isOverdue =
          today.getTime() - lastCheckDate.getTime() > 30 * 24 * 60 * 60 * 1000;
        break;
    }

    return {
      date: lastCheckDate.toLocaleDateString(),
      frequency: lastChecklist.frequency,
      isOverdue,
    };
  };

  const handleNewChecklist = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setSelectedChecklist(null);
    setShowChecklistModal(true);
  };

  const handleEditChecklist = (
    vehicle: Vehicle,
    checklist: VehicleChecklist
  ) => {
    setSelectedVehicle(vehicle);
    setSelectedChecklist(checklist);
    setShowChecklistModal(true);
  };

  const handleViewPDF = async (checklist: VehicleChecklist) => {
    try {
      setGeneratingPdfId(checklist.id);
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

      // Get vehicle details
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', checklist.vehicle_id)
        .single();
      if (vehicleError) throw new Error(`Failed to load vehicle details: ${vehicleError.message}`);
      if (!vehicle) throw new Error('Vehicle not found');
      
      // Generate PDF
      const pdfDataUrl = await generateVehicleChecklistPDF({
        checklist,
        vehicle,
      });
      
      // Format filename using vehicle registration and date
      const formattedDate = new Date(checklist.check_date).toISOString().split('T')[0];
      const formattedFilename = `Vehicle-Checklist-${vehicle.registration}-${formattedDate}.pdf`;
      
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
      console.error('Error generating PDF:', error);
      setPdfError(error instanceof Error ? error.message : 'An unexpected error occurred while generating the PDF');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleDeleteChecklist = (checklist: VehicleChecklist) => {
    setChecklistToDelete(checklist);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!checklistToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('vehicle_checklists')
        .delete()
        .eq('id', checklistToDelete.id);

      if (error) throw error;
      
      fetchData(); // Refresh the data
      setShowDeleteModal(false);
      setChecklistToDelete(null);
    } catch (err) {
      console.error('Error deleting checklist:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting the checklist');
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setChecklistToDelete(null);
  };

  // Filter vehicles based on search query
  const filteredVehicles = vehicles.filter((vehicle) =>
    vehicle.registration.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchQuery.toLowerCase())
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
          Back to Vehicle Management
        </button>
        
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Vehicle Checklists</h2>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search vehicles by registration, make, or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {pdfError && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error generating PDF</p>
            <p>{pdfError}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden sm:rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No vehicles available</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No vehicles match your search</p>
          </div>
        ) : (
          <div className="space">
            {filteredVehicles.map((vehicle) => {
              const vehicleChecklists = checklists.filter(
                (c) => c.vehicle_id === vehicle.id
              );
              const checkInfo = getLastCheckInfo(vehicle.id);
              const textColorClass = checkInfo.isOverdue
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 dark:text-gray-400';

              return (
                <div key={vehicle.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white break-words mb-2">
                        <span
                          style={{ 
                            backgroundColor: '#FFDD00', 
                            fontFamily: 'UKNumberPlate, monospace',
                            fontWeight: 'bold',
                            color: '#000000',
                            textAlign: 'center',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            minWidth: '120px',
                            display: 'inline-block',
                            marginRight: '12px'
                          }}
                        >
                          {vehicle.registration}
                        </span>
                        - {vehicle.make} {vehicle.model}
                      </h3>
                      <p className={`text-sm ${textColorClass}`}>
                        Last Check: {checkInfo.date || 'Not checked yet'}
                        {checkInfo.frequency && ` (${checkInfo.frequency})`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleNewChecklist(vehicle)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600 w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Checklist
                    </button>
                  </div>

                  {vehicleChecklists.length > 0 && (
                    <div className="mt-4">
                      {/* Desktop Table */}
                      <div className="hidden lg:block overflow-hidden rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700">
                              <th scope="col" className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider first:rounded-tl-lg">
                                Date
                              </th>
                              <th scope="col" className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Frequency
                              </th>
                              <th scope="col" className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Created By
                              </th>
                              <th scope="col" className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status
                              </th>
                              <th scope="col" className="py-3 px-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider last:rounded-tr-lg">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {vehicleChecklists.map((checklist, index) => (
                              <tr key={checklist.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                                <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400 first:rounded-bl-lg">
                                  {new Date(checklist.check_date).toLocaleDateString()}
                                </td>
                                <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                                  {checklist.frequency.charAt(0).toUpperCase() + checklist.frequency.slice(1)}
                                </td>
                                <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                                  {checklist.created_by_name}
                                </td>
                                <td className="py-2 px-3 text-sm">
                                  <span className={checklist.status === 'pass' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                    {checklist.status.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right text-sm font-medium last:rounded-br-lg">
                                  <div className="flex justify-end space-x-3">
                                    <button
                                      onClick={() => handleEditChecklist(vehicle, checklist)}
                                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                      title="Edit"
                                    >
                                      <Pencil className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => handleViewPDF(checklist)}
                                      disabled={generatingPdfId === checklist.id}
                                      className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                                      title="View PDF"
                                    >
                                      {generatingPdfId === checklist.id ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                                      ) : (
                                        <FileText className="h-5 w-5" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteChecklist(checklist)}
                                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile/Tablet Cards */}
                      <div className="lg:hidden space-y-4">
                        {vehicleChecklists.map((checklist) => (
                          <div 
                            key={checklist.id}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => handleEditChecklist(vehicle, checklist)}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                                  {new Date(checklist.check_date).toLocaleDateString()}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {checklist.frequency.charAt(0).toUpperCase() + checklist.frequency.slice(1)} Check
                                </p>
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                checklist.status === 'pass' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                  : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                              }`}>
                                {checklist.status.toUpperCase()}
                              </span>
                            </div>
                            
                            <div className="space-y-2 text-sm mb-4">
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Created By:</span>
                                <span className="text-gray-900 dark:text-white">
                                  {checklist.created_by_name}
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditChecklist(vehicle, checklist);
                                }}
                                className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewPDF(checklist);
                                }}
                                disabled={generatingPdfId === checklist.id}
                                className="flex items-center px-3 py-2 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors disabled:opacity-50"
                                title="View PDF"
                              >
                                {generatingPdfId === checklist.id ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <FileText className="h-4 w-4 mr-1" />
                                )}
                                PDF
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteChecklist(checklist);
                                }}
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
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Checklist Form Modal */}
      {showChecklistModal && (
        createPortal(
          <VehicleChecklistForm
            vehicle={selectedVehicle!}
            checklistToEdit={selectedChecklist}
            onClose={() => {
              setShowChecklistModal(false);
              setSelectedVehicle(null);
              setSelectedChecklist(null);
            }}
            onSuccess={() => {
              fetchData();
              setShowChecklistModal(false);
              setSelectedVehicle(null);
              setSelectedChecklist(null);
            }}
          />,
          document.body
        )
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        createPortal(
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full m-4">
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Delete Checklist</h3>
              </div>
              
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete this checklist? This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </div>
  );
};

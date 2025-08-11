import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, FileCheck, AlertTriangle, Plus, FileText, Loader2, Edit, Search, Pencil, Trash2 } from 'lucide-react';
import { EquipmentChecklistForm } from './EquipmentChecklistForm';
import { generateEquipmentChecklistPDF } from '../../../utils/pdf/equipment/equipmentChecklistPDFGenerator';
import type { Equipment, EquipmentChecklist } from '../../../types/database';

interface HSEquipmentChecklistsProps {
  onBack: () => void;
}

export function HSEquipmentChecklists({ onBack }: HSEquipmentChecklistsProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [checklists, setChecklists] = useState<EquipmentChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedChecklist, setSelectedChecklist] = useState<EquipmentChecklist | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [checklistToDelete, setChecklistToDelete] = useState<EquipmentChecklist | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [equipmentResponse, checklistsResponse] = await Promise.all([
        supabase
          .from('equipment')
          .select('*')
          .order('name', { ascending: true }),
        supabase
          .from('equipment_checklists')
          .select('*')
          .order('check_date', { ascending: false })
      ]);

      if (equipmentResponse.error) throw equipmentResponse.error;
      if (checklistsResponse.error) throw checklistsResponse.error;

      setEquipment(equipmentResponse.data || []);
      setChecklists(checklistsResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  const getLastCheckInfo = (equipmentId: string) => {
    const equipmentChecklists = checklists.filter(c => c.equipment_id === equipmentId);
    if (equipmentChecklists.length === 0) return { date: null, frequency: null };
    
    const lastChecklist = equipmentChecklists[0];
    const lastCheckDate = new Date(lastChecklist.check_date);
    const today = new Date();
    let isOverdue = false;

    switch (lastChecklist.frequency) {
      case 'daily':
        isOverdue = (today.getTime() - lastCheckDate.getTime()) > 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        isOverdue = (today.getTime() - lastCheckDate.getTime()) > 7 * 24 * 60 * 60 * 1000;
        break;
      case 'monthly':
        isOverdue = (today.getTime() - lastCheckDate.getTime()) > 30 * 24 * 60 * 60 * 1000;
        break;
    }

    return {
      date: lastCheckDate.toLocaleDateString(),
      frequency: lastChecklist.frequency,
      isOverdue
    };
  };

  const handleNewChecklist = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setSelectedChecklist(null);
    setShowChecklistModal(true);
  };

  const handleEditChecklist = (equipment: Equipment, checklist: EquipmentChecklist) => {
    setSelectedEquipment(equipment);
    setSelectedChecklist(checklist);
    setShowChecklistModal(true);
  };

  const handleViewPDF = async (checklist: EquipmentChecklist) => {
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

      // Get equipment details
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('*')
        .eq('id', checklist.equipment_id)
        .single();

      if (equipmentError) throw new Error(`Failed to load equipment details: ${equipmentError.message}`);
      if (!equipment) throw new Error('Equipment not found');

      // Generate PDF
      const pdfDataUrl = await generateEquipmentChecklistPDF({
        checklist,
        equipment
      });

      // Format filename using equipment name and date
      const formattedDate = new Date(checklist.check_date).toISOString().split('T')[0];
      const formattedFilename = `Equipment-Checklist-${equipment.name}-${formattedDate}.pdf`;
      
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

  const handleDeleteChecklist = (checklist: EquipmentChecklist) => {
    setChecklistToDelete(checklist);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!checklistToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('equipment_checklists')
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

  // Add filtered equipment
  const filteredEquipment = equipment.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.serial_number.toLowerCase().includes(searchQuery.toLowerCase())
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
          Back to Equipment Management
        </button>
       
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Equipment Checklists</h2>
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

      {/* Search Bar */}
      <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by equipment name or serial number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          </div>
        ) : equipment.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-gray-500 dark:text-gray-400">No equipment available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredEquipment.map((item) => {
              const equipmentChecklists = checklists.filter(c => c.equipment_id === item.id);
              const checkInfo = getLastCheckInfo(item.id);
              const textColorClass = checkInfo.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400';

              return (
                <div key={item.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white break-words">
                        {item.name} - {item.serial_number}
                      </h3>
                      <p className={`text-sm ${textColorClass} mt-1`}>
                        Last Check: {checkInfo.date || 'Not checked yet'}
                        {checkInfo.frequency && ` (${checkInfo.frequency})`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleNewChecklist(item)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600 w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Checklist
                    </button>
                  </div>

                  {equipmentChecklists.length > 0 && (
                    <div className="mt-4">
                      {/* Desktop Table */}
                      <div className="hidden lg:block">
                        <div className="overflow-hidden rounded-lg">
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
                              {equipmentChecklists.map((checklist, index) => (
                                <tr 
                                  key={checklist.id} 
                                  className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer`}
                                  onClick={() => handleEditChecklist(item, checklist)}
                                >
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditChecklist(item, checklist);
                                        }}
                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                        title="Edit"
                                      >
                                        <Pencil className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewPDF(checklist);
                                        }}
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteChecklist(checklist);
                                        }}
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
                      </div>

                      {/* Mobile/Tablet Cards */}
                      <div className="lg:hidden">
                        <div className="space-y-3">
                          {equipmentChecklists.map((checklist) => (
                            <div 
                              key={checklist.id}
                              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-lg transition-shadow"
                              onClick={() => handleEditChecklist(item, checklist)}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h4 className="text-base font-medium text-gray-900 dark:text-white">
                                    {new Date(checklist.check_date).toLocaleDateString()}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {checklist.frequency.charAt(0).toUpperCase() + checklist.frequency.slice(1)} Frequency
                                  </p>
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  checklist.status === 'pass' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                  {checklist.status.toUpperCase()}
                                </span>
                              </div>
                              
                              <div className="space-y-2 text-sm mb-4">
                                <div className="flex justify-between">
                                  <span className="text-gray-500 dark:text-gray-400">Created By:</span>
                                  <span className="text-gray-900 dark:text-white">{checklist.created_by_name}</span>
                                </div>
                              </div>

                              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditChecklist(item, checklist);
                                  }}
                                  className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4 mr-1" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewPDF(checklist);
                                  }}
                                  disabled={generatingPdfId === checklist.id}
                                  className="flex items-center px-3 py-2 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
                                  title="View PDF"
                                >
                                  {generatingPdfId === checklist.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                  ) : (
                                    <FileText className="h-4 w-4 mr-1" />
                                  )}
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
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
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
          <EquipmentChecklistForm
            equipment={selectedEquipment!}
            checklistToEdit={selectedChecklist}
            onClose={() => {
              setShowChecklistModal(false);
              setSelectedEquipment(null);
              setSelectedChecklist(null);
            }}
            onSuccess={() => {
              fetchData();
              setShowChecklistModal(false);
              setSelectedEquipment(null);
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
}
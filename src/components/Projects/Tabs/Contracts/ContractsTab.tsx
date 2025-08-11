import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import { generateContractPDF } from '../../../../utils/pdf/contracts/contractPDFGenerator';
import { supabase } from '../../../../lib/supabase';
import type { Project } from '../../../../types/database';
import { ContractsForm } from '../../../Contracts/ContractsForm/ContractsForm';

interface Contract {
  id: string;
  created_at: string;
  updated_at: string;
  contract_date: string;
  customer_id: string;
  customer?: {
    company_name: string | null;
    customer_name: string | null;
  };
  project_id: string;
  project_name?: string;
  projects?: {
    name: string | null;
  };
  site_id?: string;
  site_address: string;
  quote_id: string;
  description_of_works: string;
  payment_amount: number;
  deposit_required: boolean;
  deposit_amount: number;
  installments_required: boolean;
  installment_frequency: string;
  custom_installments: string;
  statutory_interest_rate: string;
  is_signed: boolean;
  signed_at: string | null;
  signed_by: string | null;
}

interface ContractsTabProps {
  project: Project;
  contracts: Contract[];
  isLoading: boolean;
  onContractsChange?: () => void;
}

export function ContractsTab({ project, contracts, isLoading, onContractsChange }: ContractsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showContractsForm, setShowContractsForm] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [contractsList, setContractsList] = useState<Contract[]>(contracts);
  
  useEffect(() => {
    if (project && project.id) {
      fetchContracts();
    }
  }, [project]);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          projects:project_id(name),
          customer:customer_id(company_name, customer_name)
        `)
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform the data to match expected format
      const contractsWithProjectNames = data?.map(contract => ({
        ...contract,
        project_name: contract.projects?.name || 'Unknown Project'
      })) || [];

      console.log('Fetched contracts:', contractsWithProjectNames);
      setContractsList(contractsWithProjectNames);
      
      if (onContractsChange) {
        onContractsChange();
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setPdfError('Failed to fetch contracts');
    }
  };

  const handleGeneratePDF = async (contract: Contract) => {
    try {
      setGeneratingPDF(true);
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

      // Fetch company settings
      const { data: companySettings, error: companyError } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (companyError) throw new Error(`Failed to load company settings: ${companyError.message}`);
      if (!companySettings) throw new Error('Company settings not found. Please set up your company details first.');

      // Ensure all required fields are present before generating PDF
      const contractForPDF = {
        ...contract,
        // Add necessary fields that might be missing
        site_address_line1: contract.site_address || '',
        site_address_line2: '',
        site_town: '',
        site_county: '',
        site_postcode: '',
        other_party_name: contract.customer?.company_name || contract.customer?.customer_name || 'Client',
        other_party_address_line1: '',
        other_party_address_line2: '',
        other_party_town: '',
        other_party_county: '',
        other_party_postcode: '',
        site_id: contract.site_id || null,
        site_manager: '',
        // Ensure description_of_works is never undefined
        description_of_works: contract.description_of_works || 'No description provided',
        // Ensure all numeric fields are properly formatted
        payment_amount: typeof contract.payment_amount === 'number' ? contract.payment_amount : 0,
        deposit_amount: typeof contract.deposit_amount === 'number' ? contract.deposit_amount : 0
      };

      const pdfUrl = await generateContractPDF({
        contract: contractForPDF,
        companySettings
      });
      
      // Format filename for better clarity
      const contractDate = contract.contract_date ? new Date(contract.contract_date).toISOString().split('T')[0] : 'undated';
      const customerName = contract.customer ? 
        (contract.customer.company_name || contract.customer.customer_name || 'Unknown') : 'Unknown';
      const formattedFilename = `Contract-${customerName.replace(/\s+/g, '-')}-${contractDate}.pdf`;
      
      // Check if window is still open
      if (newWindow.closed) {
        alert('PDF window was closed. Please try again.');
        return;
      }
      
      // For iOS Safari, try direct PDF display first
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        // iOS Safari - direct PDF approach
        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        const pdfBlobUrl = URL.createObjectURL(blob);
        
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
                <a id="direct-link" href="${pdfBlobUrl}" download="${formattedFilename}">
                  Direct Download Link
                </a>
              </div>
            </div>
            <script>
              const pdfBlobUrl = "${pdfBlobUrl}";
              const fileName = "${formattedFilename}";
              
              // Download function
              function downloadPDF() {
                const a = document.createElement('a');
                a.href = pdfBlobUrl;
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
                URL.revokeObjectURL(pdfBlobUrl);
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
            const pdfUrl = "${pdfUrl}";
            const fileName = "${formattedFilename}";
            document.title = fileName;
            
            // Set iframe source to view PDF
            document.getElementById('pdf-iframe').src = pdfUrl;
            
            // Set up download button
            const downloadBtn = document.getElementById('download-btn');
            downloadBtn.addEventListener('click', function(e) {
              e.preventDefault();
              
              // Create a temporary anchor for download
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
      setGeneratingPDF(false);
    }
  };

  const handleEdit = (contract: Contract) => {
    setSelectedContract(contract);
    setShowContractsForm(true);
  };

  const handleDelete = (contract: Contract) => {
    setContractToDelete(contract);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!contractToDelete) return;

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractToDelete.id);

      if (error) throw error;

      setShowDeleteModal(false);
      setContractToDelete(null);
      fetchContracts();
    } catch (error) {
      console.error('Error deleting contract:', error);
      setPdfError('Failed to delete contract');
    }
  };

  const filteredContracts = contractsList.filter(contract => {
    const query = searchQuery.toLowerCase();
    return (
      contract.customer?.company_name?.toLowerCase().includes(query) ||
      contract.customer?.customer_name?.toLowerCase().includes(query) ||
      contract.project_name?.toLowerCase().includes(query) ||
      contract.description_of_works?.toLowerCase().includes(query) ||
      contract.site_address?.toLowerCase().includes(query) ||
      (contract.contract_date && new Date(contract.contract_date).toLocaleDateString().toLowerCase().includes(query))
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
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Contracts</h2>

      {/* Search and Add button row */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client, project, site address, description of works..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={() => {
            setSelectedContract(null);
            setShowContractsForm(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Contract
        </button>
      </div>

      {pdfError && (
        <div className="mb-4 p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <p>{pdfError}</p>
        </div>
      )}

      {/* Contracts Table/Cards */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contract Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Client / Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Site
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      {searchQuery ? 'No contracts match your search criteria' : 'No contracts found for this project'}
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {contract.contract_date ? new Date(contract.contract_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {contract.customer
                          ? [contract.customer.company_name, contract.customer.customer_name].filter(Boolean).join(' - ')
                          : 'Unknown Customer'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {contract.project_name || project.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {contract.site_address || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        £{(contract.payment_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(contract);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit Contract"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGeneratePDF(contract);
                            }}
                            disabled={generatingPDF}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Generate PDF"
                          >
                            {generatingPDF ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <FileText className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(contract);
                            }}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete Contract"
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
          {filteredContracts.length === 0 ? (
            <div className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No contracts match your search criteria' : 'No contracts found for this project'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredContracts.map((contract) => (
                <div key={contract.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {contract.customer
                          ? [contract.customer.company_name, contract.customer.customer_name].filter(Boolean).join(' - ')
                          : 'Unknown Customer'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {contract.contract_date ? new Date(contract.contract_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(contract);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Edit Contract"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGeneratePDF(contract);
                        }}
                        disabled={generatingPDF}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        title="Generate PDF"
                      >
                        {generatingPDF ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <FileText className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(contract);
                        }}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete Contract"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Project:</span>
                      <p className="text-gray-900 dark:text-white">{contract.project_name || project.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Amount:</span>
                      <p className="text-gray-900 dark:text-white">£{(contract.payment_amount || 0).toLocaleString()}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-gray-500 dark:text-gray-400">Site:</span>
                      <p className="text-gray-900 dark:text-white">{contract.site_address || 'N/A'}</p>
                    </div>
                    {contract.description_of_works && (
                      <div className="col-span-2">
                        <span className="font-medium text-gray-500 dark:text-gray-400">Description:</span>
                        <p className="text-gray-900 dark:text-white">{contract.description_of_works}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contracts Form Modal */}
      {showContractsForm && createPortal(
        <ContractsForm
          onClose={() => {
            setShowContractsForm(false);
            setSelectedContract(null);
          }}
          onSuccess={() => {
            setShowContractsForm(false);
            setSelectedContract(null);
            fetchContracts();
          }}
          contract={selectedContract}
          preSelectedProjectId={project.id}
          disableCustomerAndProject={selectedContract !== null}
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
                Are you sure you want to delete this contract? This action cannot be undone.
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
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import {
  Plus,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  Edit,
  FileText,
  Loader2,
  PoundSterling,
  Pencil,
  Search,
  AlertCircle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { QuoteForm } from './QuoteForm';
import { generateQuotePDF } from '../../utils/pdf/quotes/quotePDFGenerator';
import type { Quote, Project } from '../../types/database';

type SortField = 'quote_number' | 'quote_date' | 'customer' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

const statusColors = {
  new: 'bg-blue-100 text-blue-800 dark:bg-[rgb(13,50,99)] dark:text-white',
  accepted: 'bg-green-100 text-green-800 dark:bg-[rgb(4,97,36)] dark:text-white',
  rejected: 'bg-red-100 text-red-800 dark:bg-[rgb(136,19,55)] dark:text-white',
};

interface QuotesListProps {
  quotes: Quote[];
  onQuoteChange: () => void;
  onBack: () => void;
  hideBreadcrumbs?: boolean;
  customerName?: string;
  preselectedProject?: Project | null;
  disableProjectSelection?: boolean;
}

export function QuotesList({
  quotes,
  onQuoteChange,
  onBack,
  hideBreadcrumbs = false,
  customerName,
  preselectedProject = null,
  disableProjectSelection = false,
}: QuotesListProps) {
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [quoteToEdit, setQuoteToEdit] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('quote_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Prevent body scroll when modal is open
  useEffect(() => {
    const isModalOpen = showQuoteModal || showDeleteModal;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showQuoteModal, showDeleteModal]);

  const filterQuotes = (quotes: Quote[]) => {
    const query = searchQuery.toLowerCase();
    return quotes.filter(
      (quote) =>
        quote.quote_number.toLowerCase().includes(query) ||
        quote.customer?.company_name?.toLowerCase().includes(query) ||
        quote.customer?.customer_name.toLowerCase().includes(query) ||
        false
    );
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusDisplayText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Sort quotes
  const sortedQuotes = [...filterQuotes(quotes)].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case 'quote_number':
        aValue = a.quote_number.toLowerCase();
        bValue = b.quote_number.toLowerCase();
        break;
      case 'quote_date':
        aValue = new Date(a.quote_date).getTime();
        bValue = new Date(b.quote_date).getTime();
        break;
      case 'customer':
        aValue = (a.customer?.company_name || a.customer?.customer_name || '').toLowerCase();
        bValue = (b.customer?.company_name || b.customer?.customer_name || '').toLowerCase();
        break;
      case 'amount':
        aValue = a.amount;
        bValue = b.amount;
        break;
      case 'status':
        const statusOrder = { 'new': 3, 'accepted': 2, 'rejected': 1 };
        aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
        bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
        break;
      default:
        aValue = '';
        bValue = '';
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> : 
      <ChevronDown className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
  };

  const handleDeleteQuote = async (quoteId: string) => {
    setQuoteToDelete(quoteId);
    setShowDeleteModal(true);
  };

  const handleEditQuote = (quote: Quote) => {
    setQuoteToEdit(quote);
    setShowQuoteModal(true);
    
    // Scroll to top on mobile when modal opens
    if (window.innerWidth < 640) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRowClick = (quote: Quote, event: React.MouseEvent<HTMLTableRowElement>) => {
    // Don't trigger row click if clicking on action buttons
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('svg')) {
      return;
    }
    
    handleEditQuote(quote);
  };

  const handleViewPDF = async (quote: Quote) => {
    try {
      setGeneratingPdfId(quote.id);
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

      if (companyError)
        throw new Error(
          `Failed to load company settings: ${companyError.message}`
        );
      if (!companySettings)
        throw new Error(
          'Company settings not found. Please set up your company details first.'
        );

      // Fetch project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('name')
        .eq('id', quote.project_id)
        .single();

      if (projectError)
        throw new Error(
          `Failed to load project details: ${projectError.message}`
        );
      if (!project) throw new Error('Project not found');

      // Fetch customer details
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', quote.customer_id)
        .single();

      if (customerError)
        throw new Error(
          `Failed to load customer details: ${customerError.message}`
        );
      if (!customer) throw new Error('Customer not found');

      // Format customer address
      const customerAddress = [
        customer.address_line1,
        customer.address_line2,
        customer.town,
        customer.county,
        customer.post_code,
      ]
        .filter(Boolean)
        .join(', ');

      // Format customer name
      const customerName = customer.company_name
        ? `${customer.company_name} (${customer.customer_name})`
        : customer.customer_name;

      // Format quote number for filename
      const formattedQuoteNumber = quote.quote_number.startsWith('OPG-Q-') 
        ? quote.quote_number 
        : `OPG-Q-${quote.quote_number.padStart(6, '0')}`;

      // Generate PDF
      const pdfDataUrl = await generateQuotePDF({
        quote,
        companySettings,
        customerName,
        customerAddress,
        projectName: project.name,
      });
      
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
            <title>${formattedQuoteNumber}.pdf</title>
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
              <button id="download-btn" class="download-button">Download ${formattedQuoteNumber}.pdf</button>
            </div>
            <div class="pdf-view">
              <div class="pdf-fallback">
                <h2>PDF Ready for Download</h2>
                <p>Click the download button above to save the PDF file.</p>
                <a id="direct-link" href="${pdfUrl}" download="${formattedQuoteNumber}.pdf">
                  Direct Download Link
                </a>
              </div>
            </div>
            <script>
              const pdfUrl = "${pdfUrl}";
              const fileName = "${formattedQuoteNumber}.pdf";
              
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
        const htmlContent = createPdfViewerHtml(pdfDataUrl, `${formattedQuoteNumber}.pdf`);
        
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      setPdfError(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while generating the PDF'
      );
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

  const confirmDelete = async () => {
    if (!quoteToDelete) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteToDelete);

      if (error) throw error;
      onQuoteChange();
      setShowDeleteModal(false);
      setQuoteToDelete(null);
    } catch (err) {
      console.error('Error deleting quote:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while deleting the quote'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      {!hideBreadcrumbs && (
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Quote Management
          </button>
          
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Quotes</h2>
          {customerName && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              for {customerName}
            </p>
          )}
        </div>
      </div>

      {/* Search Box with Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search by quote number, company or customer name..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white sm:text-sm"
          />
        </div>
        <div className="w-full sm:w-auto">
          <button
            onClick={() => {
              setQuoteToEdit(null);
              setShowQuoteModal(true);
              
              // Scroll to top on mobile when modal opens
              if (window.innerWidth < 640) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Quote
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
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

      {/* Main Content - Table */}
      <div className="bg-white dark:bg-gray-800 shadow-lg overflow-hidden sm:rounded-lg">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th 
                      className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('quote_number')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Quote Number</span>
                        {renderSortIcon('quote_number')}
                      </div>
                    </th>
                    <th 
                      className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('quote_date')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Quote Date</span>
                        {renderSortIcon('quote_date')}
                      </div>
                    </th>
                    <th 
                      className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('customer')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Customer</span>
                        {renderSortIcon('customer')}
                      </div>
                    </th>
                    <th 
                      className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Amount</span>
                        {renderSortIcon('amount')}
                      </div>
                    </th>
                    <th 
                      className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Status</span>
                        {renderSortIcon('status')}
                      </div>
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'No quotes found matching your search.' : 'No quotes found.'}
                      </td>
                    </tr>
                  ) : (
                    sortedQuotes.map((quote) => (
                      <tr 
                        key={quote.id}
                        onClick={(e) => handleRowClick(quote, e)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {quote.quote_number}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {formatDate(quote.quote_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {quote.customer?.company_name || quote.customer?.customer_name}
                          </div>
                          {quote.customer?.company_name && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {quote.customer.customer_name}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            £{formatNumber(quote.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[quote.status as keyof typeof statusColors]}`}>
                            {getStatusDisplayText(quote.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditQuote(quote);
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Edit"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewPDF(quote);
                              }}
                              disabled={generatingPdfId === quote.id}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                              title="View PDF"
                            >
                              {generatingPdfId === quote.id ? (
                                <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                              ) : (
                                <FileText className="h-5 w-5" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuote(quote.id);
                              }}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
        )}
      </div>

      {/* Quote Form Modal */}
      {showQuoteModal && createPortal(
        <QuoteForm
          onClose={() => {
            setShowQuoteModal(false);
            setQuoteToEdit(null);
          }}
          onSuccess={() => {
            onQuoteChange();
            setShowQuoteModal(false);
            setQuoteToEdit(null);
          }}
          quoteToEdit={quoteToEdit}
          preselectedProject={preselectedProject}
          disableProjectSelection={disableProjectSelection}
        />,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-opacity-50 overflow-y-auto flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full m-4">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
              Confirm Deletion
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Are you sure you want to delete this quote? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setQuoteToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 dark:hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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

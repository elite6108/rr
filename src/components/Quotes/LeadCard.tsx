import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lead, LeadStatus } from './LeadManagement';
import {
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Phone,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LeadForm } from './LeadForm';

interface LeadCardProps {
  lead: Lead;
  onUpdate: () => void;
}

const statusColors = {
  new: 'bg-blue-100 text-blue-800 dark:bg-[rgb(13,50,99)] dark:text-white',
  cold: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white',
  hot: 'bg-emerald-100 text-emerald-800 dark:bg-[rgb(4,120,87)] dark:text-white',
  sent: 'bg-emerald-100 text-emerald-800 dark:bg-[rgb(4,120,87)] dark:text-white',
  converted: 'bg-green-100 text-green-800 dark:bg-[rgb(4,97,36)] dark:text-white',
};

const borderColors = {
  new: 'border-l-blue-500',
  cold: 'border-l-gray-500',
  hot: 'border-l-emerald-500',
  sent: 'border-l-emerald-500',
  converted: 'border-l-green-500',
};

export function LeadCard({ lead, onUpdate }: LeadCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const isModalOpen = showDeleteModal || showEditModal;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showDeleteModal, showEditModal]);

  const handleDelete = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.from('leads').delete().eq('id', lead.id);

      if (error) throw error;
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCardClick = () => {
    setShowEditModal(true);
    
    // Scroll to top on mobile when modal opens
    if (window.innerWidth < 640) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Map hot status to sent for display
  const displayStatus = lead.status === 'hot' ? 'sent' : lead.status;
  const displayStatusText = (displayStatus === 'sent' || lead.status === 'hot') ? 'Quote Sent' : displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1);

  return (
    <>
      <div 
        onClick={handleCardClick}
        className={`bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 border-l-4 ${borderColors[displayStatus as keyof typeof borderColors]} hover:shadow-md transition-shadow cursor-pointer relative`}
      >
        {/* Absolute positioned value and date in top right */}
        <div className="absolute top-4 right-4 flex flex-col items-end text-right space-y-1">
          {/* Value */}
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            £{parseFloat(lead.budget || '0').toLocaleString()}
          </div>
          
          {/* Date */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(lead.created_at)}
          </div>
        </div>

        {/* Header with action buttons */}
        <div className="flex justify-end mb-2 mr-20">
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
            <button
              onClick={(e: any) => {
                e.stopPropagation();
                setShowEditModal(true);
                
                // Scroll to top on mobile when modal opens
                if (window.innerWidth < 640) {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
              title="Edit"  
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={(e: any) => {
                e.stopPropagation();
                setShowDeleteModal(true);
              }}
              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main content - Lead details */}
        <div className="pr-24">
          {/* Name */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight mb-2">
            {lead.name}
          </h3>
          
          {/* Company - only show if company exists */}
          {lead.company && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
              <span className="text-gray-400 mr-2">🏢</span>
              <span className="truncate">{lead.company}</span>
            </div>
          )}
          
          {/* Email */}
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
            <span className="text-gray-400 mr-2">@</span>
            <span className="truncate">{lead.email}</span>
          </div>
          
          {/* Phone */}
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-4">
            <Phone className="h-4 w-4 mr-2 flex-shrink-0 text-gray-400" />
            <span>{lead.phone}</span>
          </div>
        </div>

        {/* Status badge at bottom */}
        <div className="mt-4">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              statusColors[displayStatus as keyof typeof statusColors]
            }`}
          >
            {displayStatusText}
          </span>
        </div>

        {error && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Lead
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
              <p className="text-gray-600 dark:text-gray-300">
                Are you sure you want to delete this lead? This action cannot be
                undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                title="Cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                title="Delete"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {showEditModal && createPortal(
        <LeadForm
          leadToEdit={lead}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onUpdate();
          }}
        />,
        document.body
      )}
    </>
  );
}

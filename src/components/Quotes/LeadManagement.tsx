import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LeadCard } from './LeadCard';
import { LeadForm } from './LeadForm';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, Plus, AlertTriangle, Pencil, Trash2, X, Search, Activity, ChevronUp, ChevronDown, Snowflake, TrendingUp } from 'lucide-react';
import SpotlightCard from '../../styles/spotlight/SpotlightCard';

export type LeadStatus = 'new' | 'cold' | 'hot' | 'converted';

type SortField = 'name' | 'email' | 'phone' | 'budget' | 'priority' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

const statusColors = {
  new: 'bg-blue-100 text-blue-800 dark:bg-[rgb(13,50,99)] dark:text-white',
  cold: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white',
  hot: 'bg-emerald-100 text-emerald-800 dark:bg-[rgb(4,120,87)] dark:text-white',
  converted: 'bg-green-100 text-green-800 dark:bg-[rgb(4,97,36)] dark:text-white',
};

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  message: string;
  budget: string;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

interface LeadManagementProps {
  onBack: () => void;
}

export function LeadManagement({ onBack }: LeadManagementProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activityLeadId, setActivityLeadId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchLeads();
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const isModalOpen = showLeadForm || !!leadToEdit || !!leadToDelete || !!activityLeadId;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showLeadForm, leadToEdit, leadToDelete, activityLeadId]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Filter leads based on search term
  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone.includes(searchTerm)
  );

  // Statistics helper functions
  const getLeadsByStatusAndPeriod = (status: LeadStatus, days: number | null) => {
    const now = new Date();
    
    return leads.filter(lead => {
      if (lead.status !== status) return false;
      
      if (days === null) return true; // All time
      
      const leadDate = new Date(lead.created_at);
      const daysDiff = Math.floor((now.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= days;
    }).length;
  };

  const getColdLeads30Days = () => getLeadsByStatusAndPeriod('cold', 30);
  const getColdLeads6Months = () => getLeadsByStatusAndPeriod('cold', 180);
  const getColdLeads12Months = () => getLeadsByStatusAndPeriod('cold', 365);
  const getColdLeadsAllTime = () => getLeadsByStatusAndPeriod('cold', null);

  const getConvertedLeads30Days = () => getLeadsByStatusAndPeriod('converted', 30);
  const getConvertedLeads6Months = () => getLeadsByStatusAndPeriod('converted', 180);
  const getConvertedLeads12Months = () => getLeadsByStatusAndPeriod('converted', 365);
  const getConvertedLeadsAllTime = () => getLeadsByStatusAndPeriod('converted', null);

  // Helper function to get display status text
  const getStatusDisplayText = (status: string) => {
    if (status === 'hot') return 'Quote Sent';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Sort leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'email':
        aValue = a.email.toLowerCase();
        bValue = b.email.toLowerCase();
        break;
      case 'phone':
        aValue = a.phone;
        bValue = b.phone;
        break;
      case 'budget':
        aValue = parseFloat(a.budget || '0');
        bValue = parseFloat(b.budget || '0');
        break;
      case 'priority':
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        aValue = priorityOrder[getPriority(a) as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[getPriority(b) as keyof typeof priorityOrder] || 0;
        break;
      case 'status':
        const statusOrder = { 'hot': 4, 'new': 3, 'cold': 2, 'converted': 1 };
        aValue = statusOrder[a.status] || 0;
        bValue = statusOrder[b.status] || 0;
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
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

  const handleDeleteLead = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchLeads();
      setLeadToDelete(null); // Close modal on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleStatusChange = async (id: string, newStatus: LeadStatus) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      fetchLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Get priority based on status and budget (placeholder logic)
  const getPriority = (lead: Lead) => {
    const budget = parseFloat(lead.budget || '0');
    if (lead.status === 'hot' && budget > 50000) return 'High';
    if (lead.status === 'hot' || budget > 25000) return 'Medium';
    return 'Low';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-600 dark:text-red-400';
      case 'Medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'Low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleRowClick = (lead: Lead, event: React.MouseEvent) => {
    // Don't trigger row click if clicking on action buttons
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('svg')) {
      return;
    }
    
    setLeadToEdit(lead);
  };

  const handleActivityClick = (leadId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setActivityLeadId(leadId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
          Back to Quote Management
        </button>
      </div>

      {/* Header */}
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Lead Management</h2>

      {/* Statistics Widgets */}
      <div className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Cold Leads 30 Days */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(156, 163, 175, 0.4)"
            darkSpotlightColor="rgba(156, 163, 175, 0.2)"
            size={400}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
          >
            <div className="relative z-10">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Cold Leads
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Past 30 Days</p>
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-white text-left">
                {getColdLeads30Days()}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#F3F4F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <Snowflake className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#9ca3af' }} />
            </div>
          </SpotlightCard>

          {/* Cold Leads 6 Months */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(156, 163, 175, 0.4)"
            darkSpotlightColor="rgba(156, 163, 175, 0.2)"
            size={400}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
          >
            <div className="relative z-10">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Cold Leads
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Past 6 Months</p>
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-white text-left">
                {getColdLeads6Months()}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#F3F4F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <Snowflake className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#9ca3af' }} />
            </div>
          </SpotlightCard>

          {/* Cold Leads 12 Months */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(156, 163, 175, 0.4)"
            darkSpotlightColor="rgba(156, 163, 175, 0.2)"
            size={400}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
          >
            <div className="relative z-10">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Cold Leads
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Past 12 Months</p>
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-white text-left">
                {getColdLeads12Months()}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#F3F4F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <Snowflake className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#9ca3af' }} />
            </div>
          </SpotlightCard>

          {/* Cold Leads All Time */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(156, 163, 175, 0.4)"
            darkSpotlightColor="rgba(156, 163, 175, 0.2)"
            size={400}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
          >
            <div className="relative z-10">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Cold Leads
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">All Time</p>
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-white text-left">
                {getColdLeadsAllTime()}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#F3F4F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <Snowflake className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#9ca3af' }} />
            </div>
          </SpotlightCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Converted Leads 30 Days */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(34, 197, 94, 0.4)"
            darkSpotlightColor="rgba(34, 197, 94, 0.2)"
            size={400}
            className="bg-green-50 dark:bg-green-900/20 rounded-2xl shadow-lg p-6 overflow-hidden relative border border-green-200 dark:border-green-800"
          >
            <div className="relative z-10">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Converted Leads
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">Past 30 Days</p>
              </div>
              <div className="text-lg font-medium text-green-600 dark:text-green-400 text-left">
                {getConvertedLeads30Days()}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#DCFCE7" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <TrendingUp className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#22c55e' }} />
            </div>
          </SpotlightCard>

          {/* Converted Leads 6 Months */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(34, 197, 94, 0.4)"
            darkSpotlightColor="rgba(34, 197, 94, 0.2)"
            size={400}
            className="bg-green-50 dark:bg-green-900/20 rounded-2xl shadow-lg p-6 overflow-hidden relative border border-green-200 dark:border-green-800"
          >
            <div className="relative z-10">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Converted Leads
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">Past 6 Months</p>
              </div>
              <div className="text-lg font-medium text-green-600 dark:text-green-400 text-left">
                {getConvertedLeads6Months()}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#DCFCE7" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <TrendingUp className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#22c55e' }} />
            </div>
          </SpotlightCard>

          {/* Converted Leads 12 Months */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(34, 197, 94, 0.4)"
            darkSpotlightColor="rgba(34, 197, 94, 0.2)"
            size={400}
            className="bg-green-50 dark:bg-green-900/20 rounded-2xl shadow-lg p-6 overflow-hidden relative border border-green-200 dark:border-green-800"
          >
            <div className="relative z-10">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Converted Leads
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">Past 12 Months</p>
              </div>
              <div className="text-lg font-medium text-green-600 dark:text-green-400 text-left">
                {getConvertedLeads12Months()}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#DCFCE7" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <TrendingUp className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#22c55e' }} />
            </div>
          </SpotlightCard>

          {/* Converted Leads All Time */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(34, 197, 94, 0.4)"
            darkSpotlightColor="rgba(34, 197, 94, 0.2)"
            size={400}
            className="bg-green-50 dark:bg-green-900/20 rounded-2xl shadow-lg p-6 overflow-hidden relative border border-green-200 dark:border-green-800"
          >
            <div className="relative z-10">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Converted Leads
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">All Time</p>
              </div>
              <div className="text-lg font-medium text-green-600 dark:text-green-400 text-left">
                {getConvertedLeadsAllTime()}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#DCFCE7" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <TrendingUp className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#22c55e' }} />
            </div>
          </SpotlightCard>
        </div>
      </div>

      {/* Search Bar and Controls */}
      <div className="flex gap-4 items-center">
        {/* Search Bar - Full Width */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Controls - Far Right */}
        <div className="flex items-center gap-4 flex-shrink-0">
            <button
              onClick={() => {
                setShowLeadForm(true);
                
                // Scroll to top on mobile when modal opens
                if (window.innerWidth < 640) {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Lead
            </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Main Content - List View Only */}
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
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Company / Name</span>
                        {renderSortIcon('name')}
                      </div>
                    </th>
                    <th 
                      className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Contact</span>
                        {renderSortIcon('email')}
                      </div>
                    </th>
                    <th 
                      className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('budget')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Budget</span>
                        {renderSortIcon('budget')}
                      </div>
                    </th>
                    <th 
                      className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('priority')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Priority</span>
                        {renderSortIcon('priority')}
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
                    <th 
                      className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Created Date</span>
                        {renderSortIcon('created_at')}
                      </div>
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        {searchTerm ? 'No leads found matching your search.' : 'No leads found.'}
                      </td>
                    </tr>
                  ) : (
                    sortedLeads.map(lead => {
                      const priority = getPriority(lead);
                      return (
                        <tr 
                          key={lead.id}
                          onClick={(e: React.MouseEvent<HTMLTableRowElement>) => handleRowClick(lead, e)}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{lead.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{lead.company}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{lead.email}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{lead.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">£{parseFloat(lead.budget || '0').toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-medium ${getPriorityColor(priority)}`}>
                              {priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>
                              {getStatusDisplayText(lead.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {formatDate(lead.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button 
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleActivityClick(lead.id, e)} 
                                className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                                title="View Activity"
                              >
                                <Activity className="h-5 w-5" />
                              </button>
                              <button 
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                  e.stopPropagation();
                                  setLeadToEdit(lead);
                                }} 
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                title="Edit Lead"
                              >
                                <Pencil className="h-5 w-5" />
                              </button>
                              <button 
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                  e.stopPropagation();
                                  setLeadToDelete(lead);
                                }} 
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete Lead"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add New Lead Form Modal */}
      {showLeadForm && createPortal(
            <LeadForm
              onClose={() => setShowLeadForm(false)}
              onSuccess={() => {
                setShowLeadForm(false);
                fetchLeads();
              }}
        />,
        document.body
      )}

      {/* Edit Lead Form Modal */}
      {leadToEdit && createPortal(
        <LeadForm
          leadToEdit={leadToEdit}
          onClose={() => setLeadToEdit(null)}
          onSuccess={() => {
            setLeadToEdit(null);
            fetchLeads();
          }}
        />,
        document.body
      )}

      {/* Activity Modal */}
      {activityLeadId && createPortal(
        <LeadForm
          leadToEdit={leads.find(l => l.id === activityLeadId) || null}
          onClose={() => setActivityLeadId(null)}
          onSuccess={() => {
            setActivityLeadId(null);
            fetchLeads();
          }}
          initialStep={2}
        />,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {leadToDelete && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Lead
              </h3>
              <button
                onClick={() => setLeadToDelete(null)}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
              <p className="text-gray-600 dark:text-gray-300">
                Are you sure you want to delete {leadToDelete.name}? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setLeadToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteLead(leadToDelete.id)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
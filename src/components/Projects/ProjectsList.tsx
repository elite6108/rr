import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Search, 
  X, 
  FileText, 
  QrCode, 
  ChevronLeft, 
  Pencil, 
  Edit, 
  ChevronDown, 
  ChevronRight, 
  Eye,
  Calendar,
  Receipt,
  Building2
} from 'lucide-react';
import SpotlightCard from '../../styles/spotlight/SpotlightCard';
import { ProjectForm } from './ProjectForm';
import { PurchaseOrdersList } from '../PurchaseOrders/PurchaseOrders/PurchaseOrdersList';
import { QuotesList } from '../Quotes/QuotesList';
import { GanttList } from './Gantt/GanttList';
import { Project, PurchaseOrder, Quote } from '../../types/database';
import { User } from '@supabase/supabase-js';
// Import the tab components
import { 
  QuotesTab, 
  PurchaseOrdersTab,
  SitesTab,
  RamsTab,
  CppTab,
  ContractsTab,
  SiteSurveyTab,
  FilesTab,
  AdditionalWorkTab,
  TodoTab
} from './Tabs';
import { GanttChartTab } from './Tabs/GanttChart/GanttChartTab';
import { SignOffTab } from './Tabs/SignOff/SignOffTab';
import { createPortal } from 'react-dom';

// Define Site interface
interface Site {
  id: string;
  name: string;
  address: string;
  town: string;
  county: string;
  postcode: string;
  site_manager: string;
  phone: string;
  what3words?: string;
  created_at: string;
  project_id: string;
}

interface ProjectsListProps {
  projects: Project[];
  onProjectChange: () => void;
  setShowCustomerProjectsDashboard: (show: boolean) => void;
  setActiveSection: (section: string | null) => void;
}

export function ProjectsList({
  projects,
  onProjectChange,
  setShowCustomerProjectsDashboard,
  setActiveSection,
}: ProjectsListProps) {
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectOrders, setProjectOrders] = useState<PurchaseOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'quotes' | 'orders' | 'gantt' | 'sites' | 'rams' | 'cpp' | 'contracts' | 'site_survey' | 'files' | 'additional_work' | 'signoff' | 'todo'>('files');
  const [projectQuotes, setProjectQuotes] = useState<Quote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [projectSites, setProjectSites] = useState<Site[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [projectRams, setProjectRams] = useState<any[]>([]);
  const [loadingRams, setLoadingRams] = useState(false);
  const [projectCpp, setProjectCpp] = useState<any[]>([]);
  const [loadingCpp, setLoadingCpp] = useState(false);
  const [projectContracts, setProjectContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [projectSiteSurveys, setProjectSiteSurveys] = useState<any[]>([]);
  const [loadingSiteSurveys, setLoadingSiteSurveys] = useState(false);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [projectAdditionalWorks, setProjectAdditionalWorks] = useState<any[]>([]);
  const [loadingAdditionalWorks, setLoadingAdditionalWorks] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const isModalOpen = showProjectModal || showDeleteModal;
    
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showProjectModal, showDeleteModal]);

  const handleDeleteProject = async (projectId: string) => {
    setProjectToDelete(projectId);
    setShowDeleteModal(true);
  };

  const handleEditProject = (project: Project) => {
    setProjectToEdit(project);
    setShowProjectModal(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete);

      if (error) throw error;
      onProjectChange();
      setShowDeleteModal(false);
      setProjectToDelete(null);
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while deleting the project'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = async (project: Project) => {
    setSelectedProject(project);
    setLoadingOrders(true);
    setLoadingQuotes(true);
    setLoadingSites(true);
    setLoadingRams(true);
    setLoadingCpp(true);
    setLoadingContracts(true);
    setLoadingSiteSurveys(true);
    setLoadingFiles(true);
    setError(null);

    try {
      // Fetch purchase orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('purchase_orders')
        .select(
          `
          *,
          project:projects(name),
          supplier:suppliers(name)
        `
        )
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setProjectOrders(ordersData || []);

      // Fetch quotes
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(
          `
          *,
          project:projects(name),
          customer:customers(id, customer_name, company_name)
        `
        )
        .eq('project_id', project.id)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;
      setProjectQuotes(quotesData || []);

      // Fetch sites
      await fetchSites(project.id);

      // Fetch RAMS
      await fetchRams(project.id);

      // Fetch CPP
      await fetchCpp(project.id);

      // Fetch Contracts
      await fetchContracts(project.id);
      
      // Fetch Site Surveys
      await fetchSiteSurveys(project.id);
      
      // Fetch Files
      await fetchFiles(project.id);

      // Fetch Additional Works
      await fetchAdditionalWorks(project.id);
    } catch (err) {
      console.error('Error fetching project data:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while fetching project data'
      );
    } finally {
      setLoadingOrders(false);
      setLoadingQuotes(false);
      setLoadingSites(false);
      setLoadingRams(false);
      setLoadingCpp(false);
      setLoadingContracts(false);
      setLoadingSiteSurveys(false);
      setLoadingFiles(false);
      setLoadingAdditionalWorks(false);
    }
  };

  // Function to fetch sites for a specific project
  const fetchSites = async (projectId: string) => {
    try {
      setLoadingSites(true);
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (sitesError) throw sitesError;
      setProjectSites(sitesData || []);
    } catch (err) {
      console.error('Error fetching sites:', err);
    } finally {
      setLoadingSites(false);
    }
  };

  // Function to fetch RAMS for a specific project
  const fetchRams = async (projectId: string) => {
    try {
      setLoadingRams(true);
      const { data: ramsData, error: ramsError } = await supabase
        .from('rams')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (ramsError) throw ramsError;
      setProjectRams(ramsData || []);
    } catch (err) {
      console.error('Error fetching RAMS:', err);
    } finally {
      setLoadingRams(false);
    }
  };

  // Function to fetch CPP for a specific project
  const fetchCpp = async (projectId: string) => {
    try {
      setLoadingCpp(true);
      console.log('=== FETCHING CPPs for Project ID ===', projectId);
      
      // Just fetch all CPPs without filtering
      const { data: cppData, error: cppError } = await supabase
        .from('cpps')
        .select('*')
        .order('created_at', { ascending: false });

      if (cppError) {
        console.error('Supabase CPP fetch error:', cppError);
        throw cppError;
      }
      
      console.log('=== ALL CPPs FETCHED ===', cppData);
      
      // Debug: Log data structure of all CPPs
      if (cppData && cppData.length > 0) {
        cppData.forEach((cpp, index) => {
          console.log(`=== CPP #${index + 1} ===`);
          console.log('ID:', cpp.id);
          console.log('front_cover:', cpp.front_cover);
          
          // Try to find any potential project ID
          let frontCover = cpp.front_cover;
          if (typeof frontCover === 'string') {
            try {
              frontCover = JSON.parse(frontCover);
              console.log('Parsed front_cover:', frontCover);
            } catch (e) {
              console.log('Failed to parse front_cover as JSON');
            }
          }
          
          // List all properties that might contain project ID
          console.log('Potential project ID matches:');
          console.log('- cpp.project_id:', cpp.project_id);
          console.log('- frontCover?.projectId:', frontCover?.projectId);
          console.log('- frontCover?.project_id:', frontCover?.project_id);
          
          // Check for partial string matches
          if (typeof frontCover?.projectId === 'string') {
            console.log(`projectId string match: ${frontCover.projectId.includes(projectId)}`);
          }
        });
      } else {
        console.log('No CPPs found in the database');
      }
      
      // TEMP: Send all CPPs to component regardless of project match
      // This will help us see if there are any CPPs at all
      setProjectCpp(cppData || []);
      
      // Comment out the filtering for now
      /*
      // Filter CPPs here instead of in the database query
      const filteredCppData = cppData ? cppData.filter(cpp => {
        // Handle different ways the project ID might be stored
        let frontCover = cpp.front_cover;
        
        // Parse front_cover if it's a string
        if (typeof frontCover === 'string') {
          try {
            frontCover = JSON.parse(frontCover);
          } catch (e) {
            console.log('Failed to parse front_cover string:', e);
            return false;
          }
        }
        
        // Check if this CPP belongs to the current project
        return frontCover?.projectId === projectId;
      }) : [];
      
      setProjectCpp(filteredCppData);
      */
    } catch (err) {
      console.error('Error fetching CPP:', err);
    } finally {
      setLoadingCpp(false);
    }
  };

  // Function to fetch Contracts for a specific project
  const fetchContracts = async (projectId: string) => {
    try {
      setLoadingContracts(true);
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;
      setProjectContracts(contractsData || []);
    } catch (err) {
      console.error('Error fetching contracts:', err);
    } finally {
      setLoadingContracts(false);
    }
  };

  // Function to fetch Site Surveys for a specific project
  const fetchSiteSurveys = async (projectId: string) => {
    try {
      setLoadingSiteSurveys(true);
      const { data: siteSurveysData, error: siteSurveysError } = await supabase
        .from('site_survey')
        .select(`
          *,
          projects:project_id(name),
          customers:customer_id(customer_name, company_name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (siteSurveysError) throw siteSurveysError;
      
      // Transform the data to include customer and project names
      const enhancedSurveys = siteSurveysData?.map(survey => ({
        ...survey,
        project_name: survey.projects?.name || 'Unknown Project',
        customer_name: survey.customers ? 
          (survey.customers.company_name || survey.customers.customer_name || 'Unknown Customer') 
          : 'Unknown Customer'
      })) || [];
      
      setProjectSiteSurveys(enhancedSurveys);
    } catch (err) {
      console.error('Error fetching site surveys:', err);
    } finally {
      setLoadingSiteSurveys(false);
    }
  };

  // Function to fetch Files for a specific project
  const fetchFiles = async (projectId: string) => {
    try {
      setLoadingFiles(true);
      // Placeholder for files fetching logic
      // You can implement this based on your file storage structure
      setProjectFiles([]);
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchAdditionalWorks = async (projectId: string) => {
    try {
      setLoadingAdditionalWorks(true);
      const { data, error } = await supabase
        .from('additional_work')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjectAdditionalWorks(data || []);
    } catch (err) {
      console.error('Error fetching additional works:', err);
    } finally {
      setLoadingAdditionalWorks(false);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.toLowerCase();
    return (
      project.name?.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query) ||
      project.location?.toLowerCase().includes(query)
    );
  });

  if (selectedProject) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] dark:bg-[#171E29]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            
            
            {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
            onClick={() => setSelectedProject(null)}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Project Management
        </button>
       
      </div>
                        
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {selectedProject.name}
              </h1>
            </div>
            
            {/* Widgets Section */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Widget 01 - Project Name */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(233, 213, 255, 0.4)"
                darkSpotlightColor="rgba(233, 213, 255, 0.2)"
                size={400}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
              >
                <div className="z-10">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1">
                      Project Name
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                      {selectedProject.name}
                    </p>
                  </div>
                </div>
                <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                      <path fill="#E9D5FF" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                    </svg>
                  </div>
                  <FileText className="w-full h-full object-contain text-gray-400/20 dark:text-white/20" />
                </div>
              </SpotlightCard>

              {/* Widget 02 - Created */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(167, 243, 208, 0.4)"
                darkSpotlightColor="rgba(167, 243, 208, 0.2)"
                size={400}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
              >
                <div className="z-10">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1">
                      Created
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                      {new Date(selectedProject.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                      <path fill="#A7F3D0" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                    </svg>
                  </div>
                  <Calendar className="w-full h-full object-contain text-gray-400/20 dark:text-white/20" />
                </div>
              </SpotlightCard>

              {/* Widget 03 - Quotes */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(253, 230, 138, 0.4)"
                darkSpotlightColor="rgba(253, 230, 138, 0.2)"
                size={400}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
              >
                <div className="z-10">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1">
                      Quotes
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                      {projectQuotes.length}
                    </p>
                  </div>
                </div>
                <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                      <path fill="#FDE68A" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                    </svg>
                  </div>
                  <FileText className="w-full h-full object-contain text-gray-400/20 dark:text-white/20" />
                </div>
              </SpotlightCard>

              {/* Widget 04 - Purchase Orders */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(196, 181, 253, 0.4)"
                darkSpotlightColor="rgba(196, 181, 253, 0.2)"
                size={400}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
              >
                <div className="z-10">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1">
                      Purchase Orders
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                      {projectOrders.length}
                    </p>
                  </div>
                </div>
                <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                      <path fill="#C4B5FD" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                    </svg>
                  </div>
                  <Receipt className="w-full h-full object-contain text-gray-400/20 dark:text-white/20" />
                </div>
              </SpotlightCard>

              {/* Widget 05 - Sites */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(254, 202, 202, 0.4)"
                darkSpotlightColor="rgba(254, 202, 202, 0.2)"
                size={400}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
              >
                <div className="z-10">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1">
                      Sites
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                      {projectSites.length}
                    </p>
                  </div>
                </div>
                <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                      <path fill="#FECACA" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                    </svg>
                  </div>
                  <Building2 className="w-full h-full object-contain text-gray-400/20 dark:text-white/20" />
                </div>
              </SpotlightCard>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <button
                  onClick={() => setActiveTab('files')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'files'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 shadow-lg'
                  }`}
                >
                  Files
                </button>
                <button
                  onClick={() => setActiveTab('todo')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'todo'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 shadow-lg'
                  }`}
                >
                  To Do
                </button>
                <button
                  onClick={() => setActiveTab('quotes')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'quotes'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 shadow-lg'
                  }`}
                >
                  Quotes
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'orders'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 shadow-lg'
                  }`}
                >
                  Purchase Orders
                </button>
                <button
                  onClick={() => setActiveTab('sites')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'sites'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 shadow-lg'
                  }`}
                >
                  Sites
                </button>
                <button
                  onClick={() => setActiveTab('rams')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'rams'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 shadow-lg'
                  }`}
                >
                  RAMS
                </button>
                <button
                  onClick={() => setActiveTab('cpp')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'cpp'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 shadow-lg'
                  }`}
                >
                  CPP
                </button>
                <button
                  onClick={() => setActiveTab('contracts')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'contracts'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 shadow-lg'
                  }`}
                >
                  Contracts
                </button>
                <button
                  onClick={() => setActiveTab('site_survey')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'site_survey'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 shadow-lg'
                  }`}
                >
                  Site Survey
                </button>
                <button
                  onClick={() => setActiveTab('gantt')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'gantt'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 shadow-lg'
                  }`}
                >
                  Gantt Timeline
                </button>
                <button
                  onClick={() => setActiveTab('additional_work')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'additional_work'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 shadow-lg'
                  }`}
                >
                  Additional Work
                </button>
                <button
                  onClick={() => setActiveTab('signoff')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'signoff'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 shadow-lg'
                  }`}
                >
                  Sign Off
                </button>
              </div>
            </div>
          </div>

          {activeTab === 'files' ? (
            <FilesTab
              project={selectedProject}
              files={projectFiles}
              isLoading={loadingFiles}
              onFilesChange={() => {
                fetchFiles(selectedProject.id);
              }}
            />
          ) : activeTab === 'orders' ? (
            <PurchaseOrdersTab
              project={selectedProject}
              orders={projectOrders}
              onOrderChange={() => handleProjectClick(selectedProject)}
              isLoading={loadingOrders}
            />
          ) : activeTab === 'quotes' ? (
            <QuotesTab 
              project={selectedProject}
              quotes={projectQuotes}
              onQuoteChange={() => handleProjectClick(selectedProject)}
              isLoading={loadingQuotes}
            />
          ) : activeTab === 'contracts' ? (
            <ContractsTab
              project={selectedProject}
              contracts={projectContracts}
              isLoading={loadingContracts}
              onContractsChange={() => {
                fetchContracts(selectedProject.id);
              }}
            />
          ) : activeTab === 'sites' ? (
            <SitesTab
              project={selectedProject}
              sites={projectSites}
              isLoading={loadingSites}
              onSitesChange={() => {
                // Refresh the sites list
                fetchSites(selectedProject.id);
              }}
            />
          ) : activeTab === 'site_survey' ? (
            <SiteSurveyTab
              project={selectedProject}
              siteSurveys={projectSiteSurveys}
              isLoading={loadingSiteSurveys}
              onSiteSurveysChange={() => {
                // Refresh the site surveys list
                fetchSiteSurveys(selectedProject.id);
              }}
            />
          ) : activeTab === 'rams' ? (
            <RamsTab
              project={selectedProject}
              rams={projectRams}
              isLoading={loadingRams}
              onRamsChange={() => {
                fetchRams(selectedProject.id);
              }}
            />
          ) : activeTab === 'cpp' ? (
            <CppTab
              project={selectedProject}
              cpps={projectCpp}
              isLoading={loadingCpp}
              onCppChange={() => {
                fetchCpp(selectedProject.id);
              }}
            />
          ) : activeTab === 'additional_work' ? (
            <AdditionalWorkTab
              projectId={selectedProject.id}
              projectName={selectedProject.name}
            />
          ) : activeTab === 'signoff' ? (
            <SignOffTab
              project={selectedProject}
            />
          ) : activeTab === 'todo' ? (
            <TodoTab
              projectId={selectedProject.id}
            />
          ) : (
            <GanttChartTab
              project={selectedProject}
              onBack={() => setActiveTab('orders')}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={() => {
            setShowCustomerProjectsDashboard(true);
            setActiveSection('customers');
          }}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Admin Section
        </button>
      
      </div>
          
    
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Projects Management</h2>
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
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project name, description or location..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <div className="w-full sm:w-auto">
          <button
            onClick={() => {
              setProjectToEdit(null);
              setShowProjectModal(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Projects Table */}
      <div className="bg-white dark:bg-gray-800 shadow-lg overflow-hidden sm:rounded-lg">
        {/* Desktop Table */}
        <div className="hidden lg:block">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                      Project Name
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                      Created
                    </th>
                    <th className="sticky top-0 px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No projects found. Add a project to access project files, to do lists, rams, site survey, contracts, gantt timeline, additional work and the sign off sheet.                   </td>
                    </tr>
                  ) : (
                    filteredProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
                            onClick={() => handleProjectClick(project)}
                            title="View Project"
                            >
                          {project.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {new Date(project.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-4">
                           <button
                              onClick={() => handleEditProject(project)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Edit"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProject(project.id)}
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
        </div>

        {/* Mobile/Tablet Cards */}
        <div className="lg:hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No projects found. Add a project to access project files, to do lists, rams, site survey, contracts, gantt timeline, additional work and the sign off sheet.
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {filteredProjects.map((project) => (
                <div 
                  key={project.id} 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => handleProjectClick(project)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{project.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProject(project);
                        }}
                        className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Created:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {project.location && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Location:</span>
                        <span className="text-gray-900 dark:text-white text-right">{project.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Project Form Modal */}
      {showProjectModal && createPortal(
        <ProjectForm
          onClose={() => {
            setShowProjectModal(false);
            setProjectToEdit(null);
          }}
          onSuccess={() => {
            onProjectChange();
            setShowProjectModal(false);
            setProjectToEdit(null);
          }}
          projectToEdit={projectToEdit}
        />,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg-xl p-6 max-w-sm w-full m-4">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
              Confirm Deletion
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setProjectToDelete(null);
                }}
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

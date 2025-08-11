import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  FileText,
  Clipboard,
  BarChart,
  ChevronLeft,
  Calendar,
  FileCheck,
  ClipboardCheck,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { HSAccidentsActions } from './HSAccidentsActions';
import { HSAccidentsReports } from './HSAccidentsReports';
import { HSAccidentsStatistics } from './HSAccidentsStatistics';
import { HSAccidentsAnnualStats } from './HSAccidentsAnnualStats';
import SpotlightCard from '../../../styles/spotlight/SpotlightCard';

interface HSAccidentsProps {
  onBack: () => void;
  onShowReportingDashboard?: () => void;
}

interface AccidentReport {
  id: string;
  actions: Array<{
    id?: string;
    title?: string;
    dueDate?: string;
  }>;
  incident_date?: string;
}

export function HSAccidents({ onBack, onShowReportingDashboard }: HSAccidentsProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showAnnualStats, setShowAnnualStats] = useState(false);
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingActions: 0,
    daysSinceLastIncident: 0,
    // Year to date statistics
    sevenDayIncapacitation: 0,
    fatality: 0,
    hospitalTreatment: 0,
    illHealth: 0,
    minorAccident: 0,
    nonFatal: 0,
    occupationalDisease: 0,
    personalInjury: 0,
    specifiedInjuries: 0,
    dangerousOccurrence: 0,
    nearMiss: 0,
    environmental: 0,
    propertyDamage: 0,
    unsafeActions: 0,
    unsafeConditions: 0,
    utilityDamage: 0
  });

  // Map of report types to their table names
  const reportTypeToTable = {
    sevenDayIncapacitation: 'accidents_sevendayincapacitation',
    fatality: 'accidents_fatality',
    hospitalTreatment: 'accidents_hospitaltreatment',
    illHealth: 'accidents_illhealth',
    minorAccident: 'accidents_minoraccident',
    nonFatal: 'accidents_nonfatal',
    occupationalDisease: 'accidents_occupationaldisease',
    personalInjury: 'accidents_personalinjury',
    specifiedInjuries: 'accidents_specifiedinjuries',
    dangerousOccurrence: 'accidents_dangerousoccurrence',
    nearMiss: 'accidents_nearmiss',
    environmental: 'accidents_environmental',
    propertyDamage: 'accidents_propertydamage',
    unsafeActions: 'accidents_unsafeactions',
    unsafeConditions: 'accidents_unsafeconditions',
    utilityDamage: 'accidents_utilitydamage'
  };

  const fetchStats = async () => {
    try {
      // Fetch total reports count
      let totalReports = 0;
      const newStats = { ...stats };
      let allActions: Array<{
        report_id: string;
        table_name: string;
        action_id: string;
      }> = [];
      let allIncidentDates: Date[] = [];

      // Fetch counts for each report type and collect actions
      for (const [type, table] of Object.entries(reportTypeToTable)) {
        const { data, error } = await supabase
          .from(table)
          .select('id, actions')
          .not('actions', 'is', null);

        if (error) throw error;
        
        // Count reports
        const countValue = data?.length || 0;
        totalReports += countValue;
        newStats[type as keyof typeof newStats] = countValue;

        // Collect actions from this table
        if (data) {
          data.forEach((report: AccidentReport) => {
            if (report.actions && Array.isArray(report.actions)) {
              report.actions.forEach((action) => {
                allActions.push({
                  report_id: report.id,
                  table_name: table,
                  action_id: action.id || Math.random().toString()
                });
              });
            }
          });
        }
      }

      // Separately collect incident dates from all tables (without any filters)
      for (const [type, table] of Object.entries(reportTypeToTable)) {
        const { data: incidentReports, error: incidentError } = await supabase
          .from(table)
          .select('incident_date')
          .not('incident_date', 'is', null);

        if (incidentError) throw incidentError;

        if (incidentReports) {
          incidentReports.forEach((report: { incident_date: string }) => {
            if (report.incident_date) {
              allIncidentDates.push(new Date(report.incident_date));
            }
          });
        }
      }

      // Fetch completed actions
      const { data: completedActions, error: completedError } = await supabase
        .from('report_actions')
        .select('*')
        .eq('is_completed', true);

      if (completedError) throw completedError;

      // Calculate pending actions by subtracting completed actions
      const completedCount = completedActions?.length || 0;
      const totalActions = allActions.length;
      const pendingActions = totalActions - completedCount;

      // Calculate days since last incident across all tables
      let daysSinceLastIncident = 0;
      if (allIncidentDates.length > 0) {
        // Find the most recent incident date across all tables
        const mostRecentIncident = new Date(Math.max(...allIncidentDates.map(date => date.getTime())));
        daysSinceLastIncident = Math.max(0, Math.floor((new Date().getTime() - mostRecentIncident.getTime()) / (1000 * 60 * 60 * 24)));
      }

      setStats({
        ...newStats,
        totalReports,
        pendingActions,
        daysSinceLastIncident
      });

    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    // Fetch stats immediately when component mounts
    fetchStats();

    // Set up interval to fetch stats every minute
    const interval = setInterval(fetchStats, 60000);

    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);

  if (showActions) {
    return <HSAccidentsActions onBack={() => setShowActions(false)} />;
  }

  if (showReports) {
    return <HSAccidentsReports onBack={() => setShowReports(false)} />;
  }

  if (showStatistics) {
    return <HSAccidentsStatistics onBack={() => setShowStatistics(false)} />;
  }

  if (showAnnualStats) {
    return <HSAccidentsAnnualStats onBack={() => setShowAnnualStats(false)} />;
  }

  return (
    <>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={onShowReportingDashboard || onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Reporting
        </button>
      
      </div>


      <div className="space-y-6">
        {/* Accident Overview - Horizontal Layout */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Accident Overview
          </h2>
          <p>The system will check every minute for new reports and update the counts below.</p>
          
          {/* Main Statistics - 3 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Reports */}
            <SpotlightCard
              isDarkMode={document.documentElement.classList.contains('dark')}
              spotlightColor="rgba(251, 113, 133, 0.4)"
              darkSpotlightColor="rgba(251, 113, 133, 0.2)"
              size={400}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
            >
              <div className="relative z-10">
                <div className="mb-6">
                 
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                    Total Reports
                  </h3>
                </div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 text-left">
                  {stats.totalReports}
                </div>
              </div>
              <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                    <path fill="#fff7f6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                  </svg>
                </div>
                <FileText className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#e84943' }} />
              </div>
            </SpotlightCard>

            {/* Pending Actions */}
            <SpotlightCard
              isDarkMode={document.documentElement.classList.contains('dark')}
              spotlightColor="rgba(251, 113, 133, 0.4)"
              darkSpotlightColor="rgba(251, 113, 133, 0.2)"
              size={400}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
            >
              <div className="relative z-10">
                <div className="mb-6">
                 
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                    Pending Actions
                  </h3>
                </div>
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 text-left">
                  {stats.pendingActions}
                </div>
              </div>
              <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                    <path fill="#fff7f6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                  </svg>
                </div>
                <FileCheck className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#e84943' }} />
              </div>
            </SpotlightCard>

            {/* Days Since Last Incident */}
            <SpotlightCard
              isDarkMode={document.documentElement.classList.contains('dark')}
              spotlightColor="rgba(251, 113, 133, 0.4)"
              darkSpotlightColor="rgba(251, 113, 133, 0.2)"
              size={400}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
            >
              <div className="relative z-10">
                <div className="mb-6">
                  
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                    Days Since Last Incident
                  </h3>
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 text-left">
                  {stats.daysSinceLastIncident}
                </div>
              </div>
              <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                    <path fill="#fff7f6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                  </svg>
                </div>
                <ClipboardCheck className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#e84943' }} />
              </div>
            </SpotlightCard>
          </div>

          {/* YTD Statistics */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Year to Date Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {/* 7 Day Incapacitation */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(233, 213, 255, 0.4)"
                darkSpotlightColor="rgba(233, 213, 255, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                    
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      7 Day Incapacitation
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.sevenDayIncapacitation}
                  </div>
                </div>
              </SpotlightCard>

              {/* Fatality */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(254, 202, 202, 0.4)"
                darkSpotlightColor="rgba(254, 202, 202, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                   
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Fatality
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-red-600 dark:text-red-400 text-left">
                    {stats.fatality}
                  </div>
                </div>
              </SpotlightCard>

              {/* Hospital Treatment */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(167, 243, 208, 0.4)"
                darkSpotlightColor="rgba(167, 243, 208, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                   
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Hospital Treatment
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.hospitalTreatment}
                  </div>
                </div>
              </SpotlightCard>

              {/* Ill Health */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(253, 230, 138, 0.4)"
                darkSpotlightColor="rgba(253, 230, 138, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                  
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Ill Health
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.illHealth}
                  </div>
                </div>
              </SpotlightCard>

              {/* Minor Accident */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(196, 181, 253, 0.4)"
                darkSpotlightColor="rgba(196, 181, 253, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                  
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Minor Accident
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.minorAccident}
                  </div>
                </div>
              </SpotlightCard>

              {/* Non Fatal */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(134, 239, 172, 0.4)"
                darkSpotlightColor="rgba(134, 239, 172, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                   
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Non Fatal
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.nonFatal}
                  </div>
                </div>
              </SpotlightCard>

              {/* Occupational Disease */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(252, 211, 77, 0.4)"
                darkSpotlightColor="rgba(252, 211, 77, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                  
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Occupational Disease
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.occupationalDisease}
                  </div>
                </div>
              </SpotlightCard>

              {/* Personal Injury */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(147, 197, 253, 0.4)"
                darkSpotlightColor="rgba(147, 197, 253, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                    
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Personal Injury
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.personalInjury}
                  </div>
                </div>
              </SpotlightCard>

              {/* Specified Injuries */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(233, 213, 255, 0.4)"
                darkSpotlightColor="rgba(233, 213, 255, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                    
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Specified Injuries
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.specifiedInjuries}
                  </div>
                </div>
              </SpotlightCard>

              {/* Dangerous Occurrence */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(254, 202, 202, 0.4)"
                darkSpotlightColor="rgba(254, 202, 202, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                   
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Dangerous Occurrence
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.dangerousOccurrence}
                  </div>
                </div>
              </SpotlightCard>

              {/* Near Miss */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(167, 243, 208, 0.4)"
                darkSpotlightColor="rgba(167, 243, 208, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                  
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Near Miss
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.nearMiss}
                  </div>
                </div>
              </SpotlightCard>

              {/* Environmental */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(253, 230, 138, 0.4)"
                darkSpotlightColor="rgba(253, 230, 138, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                   
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Environmental
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.environmental}
                  </div>
                </div>
              </SpotlightCard>

              {/* Property Damage */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(196, 181, 253, 0.4)"
                darkSpotlightColor="rgba(196, 181, 253, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                   
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Property Damage
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.propertyDamage}
                  </div>
                </div>
              </SpotlightCard>

              {/* Unsafe Actions */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(134, 239, 172, 0.4)"
                darkSpotlightColor="rgba(134, 239, 172, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                  
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Unsafe Actions
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.unsafeActions}
                  </div>
                </div>
              </SpotlightCard>

              {/* Unsafe Conditions */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(252, 211, 77, 0.4)"
                darkSpotlightColor="rgba(252, 211, 77, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                  
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Unsafe Conditions
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.unsafeConditions}
                  </div>
                </div>
              </SpotlightCard>

              {/* Utility Damage */}
              <SpotlightCard
                isDarkMode={document.documentElement.classList.contains('dark')}
                spotlightColor="rgba(147, 197, 253, 0.4)"
                darkSpotlightColor="rgba(147, 197, 253, 0.2)"
                size={200}
                className="bg-grey dark:bg-gray-800 rounded-2xl shadow-lg p-4 overflow-hidden relative"
              >
                <div className="relative z-10">
                  <div className="mb-3">
                   
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white text-left">
                      Utility Damage
                    </h4>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white text-left">
                    {stats.utilityDamage}
                  </div>
                </div>
              </SpotlightCard>
            </div>
          </div>
        </div>

        {/* Other Cards - Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Actions Widget */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(251, 113, 133, 0.4)"
            darkSpotlightColor="rgba(251, 113, 133, 0.2)"
            size={400}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
          >
            <button
              onClick={() => setShowActions(true)}
              className="w-full text-left focus:outline-none"
            >
              <div className="relative z-10">
                <div className="mb-6">
                  <p className="text-3xl font-bold text-pink-300 dark:text-pink-400 text-left">
                    01
                  </p>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                    Actions
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 text-left">
                  View and manage accident actions
                </p>
              </div>
              <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                    <path fill="#fff7f6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                  </svg>
                </div>
                <Clipboard className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#e84943' }} />
              </div>
            </button>
          </SpotlightCard>

          {/* Reports Widget */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(251, 113, 133, 0.4)"
            darkSpotlightColor="rgba(251, 113, 133, 0.2)"
            size={400}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
          >
            <button
              onClick={() => setShowReports(true)}
              className="w-full text-left focus:outline-none"
            >
              <div className="relative z-10">
                <div className="mb-6">
                  <p className="text-3xl font-bold text-pink-300 dark:text-pink-400 text-left">
                    02
                  </p>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                    Reports
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 text-left">
                  Access accident reports
                </p>
              </div>
              <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                    <path fill="#fff7f6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                  </svg>
                </div>
                <FileText className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#e84943' }} />
              </div>
            </button>
          </SpotlightCard>

          {/* Statistics Widget */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(251, 113, 133, 0.4)"
            darkSpotlightColor="rgba(251, 113, 133, 0.2)"
            size={400}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
          >
            <button
              onClick={() => setShowStatistics(true)}
              className="w-full text-left focus:outline-none"
            >
              <div className="relative z-10">
                <div className="mb-6">
                  <p className="text-3xl font-bold text-pink-300 dark:text-pink-400 text-left">
                    03
                  </p>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                    Statistics
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 text-left">
                  View accident statistics
                </p>
              </div>
              <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                    <path fill="#fff7f6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                  </svg>
                </div>
                <BarChart className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#e84943' }} />
              </div>
            </button>
          </SpotlightCard>

          {/* Annual Statistics Widget */}
          <SpotlightCard
            isDarkMode={document.documentElement.classList.contains('dark')}
            spotlightColor="rgba(251, 113, 133, 0.4)"
            darkSpotlightColor="rgba(251, 113, 133, 0.2)"
            size={400}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
          >
            <button
              onClick={() => setShowAnnualStats(true)}
              className="w-full text-left focus:outline-none"
            >
              <div className="relative z-10">
                <div className="mb-6">
                  <p className="text-3xl font-bold text-pink-300 dark:text-pink-400 text-left">
                    04
                  </p>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                    Annual Statistics
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 text-left">
                  View yearly accident data
                </p>
              </div>
              <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                    <path fill="#fff7f6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                  </svg>
                </div>
                <Calendar className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#e84943' }} />
              </div>
            </button>
          </SpotlightCard>
        </div>
      </div>
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { ChevronLeft, FileText, BookOpen } from 'lucide-react';
import SpotlightCard from '../../../styles/spotlight/SpotlightCard';
import { GuidanceGuides } from './GuidanceGuides';
import { CodeOfPractice } from './CodeOfPractice';
import { supabase } from '../../../lib/supabase';

interface HSGuidanceProps {
  onBack: () => void;
}

export function HSGuidance({ onBack }: HSGuidanceProps) {
  const [showGuides, setShowGuides] = useState(false);
  const [showCodeOfPractice, setShowCodeOfPractice] = useState(false);
  
  // State for counts
  const [guidesCount, setGuidesCount] = useState(0);
  const [codeOfPracticeCount, setCodeOfPracticeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Detect dark mode from document class
  const isDarkMode = document.documentElement.classList.contains('dark');

  // Fetch counts on component mount
  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      setLoading(true);

      // Fetch guides count
      const { count: guidesCountResult, error: guidesError } = await supabase
        .from('guidance_guides')
        .select('*', { count: 'exact', head: true });

      if (guidesError) throw guidesError;
      setGuidesCount(guidesCountResult || 0);

      // Fetch code of practice count
      const { count: codeOfPracticeCountResult, error: codeOfPracticeError } = await supabase
        .from('guidance_codeofpractice')
        .select('*', { count: 'exact', head: true });

      if (codeOfPracticeError) throw codeOfPracticeError;
      setCodeOfPracticeCount(codeOfPracticeCountResult || 0);

    } catch (error) {
      console.error('Error fetching counts:', error);
      // Set fallback values on error
      setGuidesCount(0);
      setCodeOfPracticeCount(0);
    } finally {
      setLoading(false);
    }
  };

  if (showGuides) {
    return <GuidanceGuides onBack={() => setShowGuides(false)} />;
  }

  if (showCodeOfPractice) {
    return <CodeOfPractice onBack={() => setShowCodeOfPractice(false)} />;
  }

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-white mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-gray-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Health & Safety
        </button>
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        Health & Safety Guidance
      </h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Guides Widget */}
        <SpotlightCard
          isDarkMode={isDarkMode}
          spotlightColor="rgba(255, 214, 92, 0.4)"
          darkSpotlightColor="rgba(255, 214, 92, 0.2)"
          size={400}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
        >
          <button
            onClick={() => setShowGuides(true)}
            className="w-full h-full text-left"
          >
            <div className="relative z-10">
              <div className="mb-6">
                <p className="text-3xl font-bold text-pink-300 dark:text-pink-400 text-left">
                  01
                </p>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Guides
                </h3>
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-white text-left">
                {loading ? '...' : guidesCount}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#FFF6F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <BookOpen className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#FCA5A5' }} />
            </div>
          </button>
        </SpotlightCard>

        {/* Code of Practice Widget */}
        <SpotlightCard
          isDarkMode={isDarkMode}
          spotlightColor="rgba(255, 214, 92, 0.4)"
          darkSpotlightColor="rgba(255, 214, 92, 0.2)"
          size={400}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
        >
          <button
            onClick={() => setShowCodeOfPractice(true)}
            className="w-full h-full text-left"
          >
            <div className="relative z-10">
              <div className="mb-6">
                <p className="text-3xl font-bold text-pink-300 dark:text-pink-400 text-left">
                  02
                </p>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Code of Practice
                </h3>
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-white text-left">
                {loading ? '...' : codeOfPracticeCount}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#FFF6F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <FileText className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#FCA5A5' }} />
            </div>
          </button>
        </SpotlightCard>
      </div>
    </div>
  );
}

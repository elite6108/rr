import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  ArrowRight,
  PenTool as Tool,
  ClipboardCheck,
  Bell,
  ChevronLeft,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import SpotlightCard from '../../../styles/spotlight/SpotlightCard';
import { HSEquipmentList } from './HSEquipmentList';
import { HSEquipmentChecklists } from './HSEquipmentChecklists';
import type { Equipment, EquipmentChecklist } from '../../../types/database';

interface Reminder {
  type: 'equipment' | 'checklist';
  title: string;
  date: Date;
  description: string;
  severity: 'warning' | 'danger';
}

interface HSEquipmentProps {
  onBack: () => void;
  onOverdueChecklistsChange?: (count: number) => void;
}

export function HSEquipment({ onBack, onOverdueChecklistsChange }: HSEquipmentProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [checklists, setChecklists] = useState<EquipmentChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEquipmentList, setShowEquipmentList] = useState(false);
  const [showChecklists, setShowChecklists] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isRemindersExpanded, setIsRemindersExpanded] = useState(false);

  // Detect dark mode from document class
  const isDarkMode = document.documentElement.classList.contains('dark');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Update reminders whenever equipment or checklists change
    const newReminders = getReminders();
    setReminders(newReminders);
    
    // Count overdue checklist reminders and notify parent component
    if (onOverdueChecklistsChange) {
      const overdueChecklists = newReminders.filter(
        reminder => reminder.type === 'checklist' && reminder.severity === 'danger'
      ).length;
      onOverdueChecklistsChange(overdueChecklists);
    }
  }, [equipment, checklists, onOverdueChecklistsChange]);

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
          .order('check_date', { ascending: false }),
      ]);

      if (equipmentResponse.error) throw equipmentResponse.error;
      if (checklistsResponse.error) throw checklistsResponse.error;

      setEquipment(equipmentResponse.data || []);
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

  const getReminders = (): Reminder[] => {
    const today = new Date();
    const reminders: Reminder[] = [];

    // Equipment calibration/service reminders
    equipment.forEach((item) => {
      const dates = [
        { name: 'Calibration', date: item.calibration_date },
        { name: 'Service', date: item.service_date },
      ];

      dates.forEach(({ name, date }) => {
        if (date) {
          const expiryDate = new Date(date);
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 30 || diffDays < 0) {
            reminders.push({
              type: 'equipment',
              title: item.name,
              date: expiryDate,
              description:
                diffDays < 0
                  ? `${name} expired - ${expiryDate.toLocaleDateString()}`
                  : `${name} due in ${diffDays} days`,
              severity: diffDays <= 7 ? 'danger' : 'warning',
            });
          }
        }
      });

      // Check for checklist reminders
      const latestChecklist = checklists
        .filter((c) => c.equipment_id === item.id)
        .sort(
          (a, b) =>
            new Date(b.check_date).getTime() - new Date(a.check_date).getTime()
        )[0];

      if (latestChecklist) {
        const lastCheckDate = new Date(latestChecklist.check_date);
        let nextCheckDate = new Date(lastCheckDate);

        // Calculate next check date based on frequency
        switch (latestChecklist.frequency) {
          case 'daily':
            nextCheckDate.setDate(lastCheckDate.getDate() + 1);
            break;
          case 'weekly':
            nextCheckDate.setDate(lastCheckDate.getDate() + 7);
            break;
          case 'monthly':
            nextCheckDate.setMonth(lastCheckDate.getMonth() + 1);
            break;
        }

        const diffTime = nextCheckDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 7 || diffDays < 0) {
          reminders.push({
            type: 'checklist',
            title: item.name,
            date: nextCheckDate,
            description:
              diffDays < 0
                ? `${latestChecklist.frequency} checklist overdue by ${Math.abs(
                    diffDays
                  )} days`
                : `${latestChecklist.frequency} checklist due in ${diffDays} days`,
            severity: diffDays < 0 ? 'danger' : 'warning',
          });
        }
      } else {
        // No checklist exists for this equipment
        reminders.push({
          type: 'checklist',
          title: item.name,
          date: today,
          description: 'No checklist records found',
          severity: 'danger',
        });
      }
    });

    // Sort reminders by date
    return reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  if (showEquipmentList) {
    return (
      <HSEquipmentList
        onBack={() => {
          setShowEquipmentList(false);
          fetchData();
        }}
      />
    );
  }

  if (showChecklists) {
    return (
      <HSEquipmentChecklists
        onBack={() => {
          setShowChecklists(false);
          fetchData();
        }}
      />
    );
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
        Equipment Management
      </h2>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Equipment Widget */}
          <SpotlightCard
            isDarkMode={isDarkMode}
            spotlightColor="rgba(255, 214, 92, 0.4)"
            darkSpotlightColor="rgba(255, 214, 92, 0.2)"
            size={400}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
          >
            <button
              onClick={() => setShowEquipmentList(true)}
              className="w-full h-full text-left"
            >
              <div className="relative z-10">
                <div className="mb-6">
                  <p className="text-3xl font-bold text-pink-300 dark:text-pink-400 text-left">
                    01
                  </p>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                    Total Equipment
                  </h3>
                </div>
                <div className="text-lg font-medium text-gray-900 dark:text-white text-left">
                  {equipment.length}
                </div>
              </div>
              <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                    <path fill="#FFF6F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                  </svg>
                </div>
                <Tool className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#FCA5A5' }} />
              </div>
            </button>
          </SpotlightCard>

          {/* Checklists Widget */}
          <SpotlightCard
            isDarkMode={isDarkMode}
            spotlightColor="rgba(255, 214, 92, 0.4)"
            darkSpotlightColor="rgba(255, 214, 92, 0.2)"
            size={400}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
          >
            <button
              onClick={() => setShowChecklists(true)}
              className="w-full h-full text-left"
            >
              <div className="relative z-10">
                <div className="mb-6">
                  <p className="text-3xl font-bold text-pink-300 dark:text-pink-400 text-left">
                    02
                  </p>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                    Checklists
                  </h3>
                </div>
                <div className="text-lg font-medium text-gray-900 dark:text-white text-left">
                  {checklists.length}
                </div>
              </div>
              <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                    <path fill="#FFF6F6" d="M48.1,-58.9C61.4,-47-2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                  </svg>
                </div>
                <ClipboardCheck className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#FCA5A5' }} />
              </div>
            </button>
          </SpotlightCard>

          {/* Reminders Widget */}
          <SpotlightCard
            isDarkMode={isDarkMode}
            spotlightColor="rgba(255, 214, 92, 0.4)"
            darkSpotlightColor="rgba(255, 214, 92, 0.2)"
            size={400}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
          >
            <button
              onClick={() => setIsRemindersExpanded(!isRemindersExpanded)}
              className="w-full h-full text-left"
            >
              <div className="relative z-10">
                <div className="mb-6">
                  <p className="text-3xl font-bold text-pink-300 dark:text-pink-400 text-left">
                    03
                  </p>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                    Reminders
                  </h3>
                </div>
                <div className="text-lg font-medium text-gray-900 dark:text-white text-left">
                  {reminders.length}
                </div>
              </div>
              <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                    <path fill="#FFF6F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                  </svg>
                </div>
                <Bell className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#FCA5A5' }} />
              </div>
            </button>
          </SpotlightCard>
        </div>

        {reminders.length > 0 && (
          <div className="mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden shadow-lg">
              <button
                onClick={() => setIsRemindersExpanded(!isRemindersExpanded)}
                className="flex items-center justify-between w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Upcoming Reminders
                </h3>
                <ChevronDown 
                  className={`h-5 w-5 text-gray-500 dark:text-gray-400 transform transition-transform duration-200 ${
                    isRemindersExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isRemindersExpanded && (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {reminders.map((reminder, index) => (
                    <div
                      key={index}
                      className={`p-4 ${
                        reminder.severity === 'danger'
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : 'bg-yellow-50 dark:bg-yellow-900/20'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {reminder.title}
                          </h4>
                          <p
                            className={`text-sm ${
                              reminder.severity === 'danger'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-yellow-600 dark:text-yellow-400'
                            }`}
                          >
                            {reminder.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

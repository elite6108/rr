import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';
import {
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  Car,
  Users,
  Bell,
  Pencil,
  AlertCircle,
  ClipboardCheck,
  Search,
  ChevronDown,
} from 'lucide-react';
import SpotlightCard from '../../../styles/spotlight/SpotlightCard';
import { VehicleForm } from './VehicleForm';
import { DriversList } from './DriversList';
import { HSVehicleChecklists } from './HSVehicleChecklists';
import type { Vehicle, Driver } from '../../../types/database';

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

interface HSVehiclesProps {
  onBack: () => void;
  onOverdueDriversChange?: (count: number) => void;
  onOverdueVehiclesChange?: (count: number) => void;
}

interface Reminder {
  type: 'vehicle' | 'driver';
  title: string;
  date: Date;
  description: string;
  severity: 'warning' | 'danger';
}

interface DriverWithStaff extends Driver {
  staff: {
    name: string;
  };
}

const getDateStatus = (date: string | null) => {
  if (!date) return { text: '-', color: 'text-gray-500' };

  const expiryDate = new Date(date);
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: new Date(date).toLocaleDateString(),
      color: 'text-red-600',
    };
  } else if (diffDays <= 30) {
    return {
      text: new Date(date).toLocaleDateString(),
      color: 'text-orange-500',
    };
  }
  return {
    text: new Date(date).toLocaleDateString(),
    color: 'text-gray-500',
  };
};

export function HSVehicles({
  onBack,
  onOverdueDriversChange,
  onOverdueVehiclesChange,
}: HSVehiclesProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<DriverWithStaff[]>([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVehicleList, setShowVehicleList] = useState(false);
  const [showDriversList, setShowDriversList] = useState(false);
  const [showChecklists, setShowChecklists] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRemindersExpanded, setIsRemindersExpanded] = useState(true);

  // Detect dark mode from document class
  const isDarkMode = document.documentElement.classList.contains('dark');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Update reminders whenever vehicles or drivers change
    setReminders(getReminders());

    // Calculate and pass overdue drivers count
    if (onOverdueDriversChange) {
      const today = new Date();
      const overdueDrivers = drivers.filter((driver) => {
        if (!driver.licence_expiry) return false;
        const expiryDate = new Date(driver.licence_expiry);
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30 || diffDays < 0;
      }).length;
      onOverdueDriversChange(overdueDrivers);
    }

    // Calculate and pass overdue vehicles count
    if (onOverdueVehiclesChange) {
      const today = new Date();
      const overdueItems = vehicles.reduce((count, vehicle) => {
        const dates = [
          { name: 'MOT', date: vehicle.mot_date },
          { name: 'Tax', date: vehicle.tax_date },
          { name: 'Service', date: vehicle.service_date },
          { name: 'Insurance', date: vehicle.insurance_date },
          { name: 'Breakdown Cover', date: vehicle.breakdown_date },
          { name: 'Congestion Charge', date: vehicle.congestion_date },
          { name: 'Dartford Crossing', date: vehicle.dartford_date },
          { name: 'Clean Air Zone', date: vehicle.clean_air_date },
        ];

        return (
          count +
          dates.filter(({ date }) => {
            if (!date) return false;
            const expiryDate = new Date(date);
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 30 || diffDays < 0;
          }).length
        );
      }, 0);
      onOverdueVehiclesChange(overdueItems);
    }
  }, [vehicles, drivers, onOverdueDriversChange, onOverdueVehiclesChange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [vehiclesResponse, driversResponse] = await Promise.all([
        supabase
          .from('vehicles')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('drivers')
          .select(
            `
            *,
            staff (
              name
            )
          `
          )
          .order('staff(name)', { ascending: true }),
      ]);

      if (vehiclesResponse.error) throw vehiclesResponse.error;
      if (driversResponse.error) throw driversResponse.error;

      setVehicles(vehiclesResponse.data || []);
      setDrivers(driversResponse.data || []);

      // Calculate overdue vehicles count from reminders
      const today = new Date();
      const overdueItems =
        vehiclesResponse.data?.reduce((count, vehicle) => {
          const dates = [
            { name: 'MOT', date: vehicle.mot_date },
            { name: 'Tax', date: vehicle.tax_date },
            { name: 'Service', date: vehicle.service_date },
            { name: 'Insurance', date: vehicle.insurance_date },
            { name: 'Breakdown Cover', date: vehicle.breakdown_date },
            { name: 'Congestion Charge', date: vehicle.congestion_date },
            { name: 'Dartford Crossing', date: vehicle.dartford_date },
            { name: 'Clean Air Zone', date: vehicle.clean_air_date },
          ];

          return (
            count +
            dates.filter(({ date }) => {
              if (!date) return false;
              const expiryDate = new Date(date);
              const diffTime = expiryDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= 30 || diffDays < 0;
            }).length
          );
        }, 0) || 0;

      if (onOverdueVehiclesChange) {
        onOverdueVehiclesChange(overdueItems);
      }
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

    // Vehicle reminders
    vehicles.forEach((vehicle) => {
      const dates = [
        { name: 'MOT', date: vehicle.mot_date },
        { name: 'Tax', date: vehicle.tax_date },
        { name: 'Service', date: vehicle.service_date },
        { name: 'Insurance', date: vehicle.insurance_date },
        { name: 'Breakdown Cover', date: vehicle.breakdown_date },
        { name: 'Congestion Charge', date: vehicle.congestion_date },
        { name: 'Dartford Crossing', date: vehicle.dartford_date },
        { name: 'Clean Air Zone', date: vehicle.clean_air_date },
      ];

      dates.forEach(({ name, date }) => {
        if (date) {
          const expiryDate = new Date(date);
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 30 || diffDays < 0) {
            reminders.push({
              type: 'vehicle',
              title: `${vehicle.make} ${vehicle.model} (${vehicle.registration})`,
              date: expiryDate,
              description:
                diffDays < 0
                  ? `${name} expired - ${expiryDate.toLocaleDateString()}`
                  : `${name} expires in ${diffDays} days`,
              severity: diffDays <= 7 ? 'danger' : 'warning',
            });
          }
        }
      });
    });

    // Driver reminders
    drivers.forEach((driver) => {
      if (!driver.licence_expiry) return;

      const expiryDate = new Date(driver.licence_expiry);
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 30 || diffDays < 0) {
        reminders.push({
          type: 'driver',
          title: driver.staff?.name || 'Unknown Driver',
          date: expiryDate,
          description:
            diffDays < 0
              ? `Licence expired - ${expiryDate.toLocaleDateString()}`
              : `Licence expires in ${diffDays} days`,
          severity: diffDays <= 7 ? 'danger' : 'warning',
        });
      }
    });

    // Sort reminders by date
    return reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    setVehicleToDelete(vehicleId);
    setShowDeleteModal(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setVehicleToEdit(vehicle);
    setShowVehicleModal(true);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleToDelete);

      if (error) throw error;

      await fetchData();
      setShowDeleteModal(false);
      setVehicleToDelete(null);
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while deleting the vehicle'
      );
    } finally {
      setLoading(false);
    }
  };

  // Add filtered vehicles
  const filteredVehicles = vehicles.filter((vehicle) =>
    vehicle.registration.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showDriversList) {
    return (
      <DriversList
        onBack={() => {
          setShowDriversList(false);
          fetchData();
        }}
        onDriverUpdate={fetchData}
      />
    );
  }

  if (showChecklists) {
    return (
      <HSVehicleChecklists
        onBack={() => {
          setShowChecklists(false);
          fetchData();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Vehicle Management
        </h2>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Drivers Widget */}
        <SpotlightCard
          isDarkMode={isDarkMode}
          spotlightColor="rgba(255, 214, 92, 0.4)"
          darkSpotlightColor="rgba(255, 214, 92, 0.2)"
          size={400}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 overflow-hidden relative"
        >
          <button
            onClick={() => setShowDriversList(true)}
            className="w-full h-full text-left"
          >
            <div className="relative z-10">
              <div className="mb-6">
                <p className="text-3xl font-bold text-pink-300 dark:text-pink-400 text-left">
                  01
                </p>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-1 text-left">
                  Drivers
                </h3>
              </div>
              <div className="text-lg font-medium text-gray-900 dark:text-white text-left">
                {drivers.length}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#FFF6F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
                </svg>
              </div>
              <Users className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8" style={{ color: '#FCA5A5' }} />
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
                {vehicles.length}
              </div>
            </div>
            <div className="absolute -top-5 -right-1 w-16 h-16 pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10 dark:opacity-20">
                  <path fill="#FFF6F6" d="M48.1,-58.9C61.4,-47.2,70.5,-31.1,74.9,-12.8C79.3,5.5,79,26,70.5,41.2C62,56.4,45.3,66.3,27.5,72.1C9.7,77.9,-9.2,79.5,-25.9,73.8C-42.6,68.1,-57.1,55.1,-66,39.1C-74.9,23.1,-78.2,4.1,-74.6,-13C-71,-30.1,-60.5,-45.2,-47.1,-57C-33.7,-68.8,-16.8,-77.3,0.9,-78.1C18.7,-78.9,37.3,-71.9,48.1,-58.9Z" transform="translate(100 100)" />
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

      {/* Reminders Section */}
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

      {/* Search Bar with Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search by registration..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        <button
          onClick={() => {
            setVehicleToEdit(null);
            setShowVehicleModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Vehicle
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-gray-500 dark:text-gray-400">
              No vehicles available
            </p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-gray-500 dark:text-gray-400">
              No vehicles match your search
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-hidden">
              <table
                id="vehicle-table"
                className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
              >
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider first:rounded-tl-lg"
                    >
                      REG
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      MAKE
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      MODEL
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      DRIVER
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      MOT
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      TAX
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      LAST SERVICE
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      SERVICE DUE
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      INSURANCE
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      BREAKDOWN
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      CONGESTION
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      DARTFORD
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      CLEAN AIR
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      ULEZ
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider last:rounded-tr-lg"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredVehicles.map((vehicle, index) => {
                    const motStatus = getDateStatus(vehicle.mot_date);
                    const taxStatus = getDateStatus(vehicle.tax_date);
                    const serviceStatus = getDateStatus(vehicle.service_date);
                    const insuranceStatus = getDateStatus(vehicle.insurance_date);
                    const breakdownStatus = getDateStatus(vehicle.breakdown_date);
                    const lastServiceStatus = getDateStatus(vehicle.last_service_date);

                    return (
                      <tr
                        key={vehicle.id}
                        className={`${
                          index % 2 === 0
                            ? 'bg-white dark:bg-gray-800'
                            : 'bg-gray-50 dark:bg-gray-700'
                        } hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer`}
                        onClick={() => handleEditVehicle(vehicle)}
                      >
                        <td className="py-2 px-3 text-sm text-gray-900 dark:text-white first:rounded-bl-lg" 
                            style={{ 
                              backgroundColor: '#FFDD00', 
                              fontFamily: 'UKNumberPlate, monospace',
                              fontWeight: 'bold',
                              color: '#000000',
                              textAlign: 'center',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              minWidth: '120px'
                            }}>
                          {vehicle.registration}
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                          {vehicle.make}
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                          {vehicle.model}
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                          {vehicle.driver}
                        </td>
                        <td className="py-2 px-3 text-sm">
                          <span className={motStatus.color}>
                            {motStatus.text}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm">
                          <span className={taxStatus.color}>
                            {taxStatus.text}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm">
                          <span className={lastServiceStatus.color}>
                            {lastServiceStatus.text}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm">
                          <span className={serviceStatus.color}>
                            {serviceStatus.text}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm">
                          <span className={insuranceStatus.color}>
                            {insuranceStatus.text}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm">
                          <span className={breakdownStatus.color}>
                            {breakdownStatus.text}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                          {vehicle.has_congestion ? '✔️' : '❌'}
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                          {vehicle.has_dartford ? '✔️' : '❌'}
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                          {vehicle.has_clean_air ? '✔️' : '❌'}
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                          {vehicle.ulez === 'should_be_paid' ? 'Should be paid' : 
                           vehicle.ulez === 'meets_standard' ? 'Meets standard' : 
                           '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-sm font-medium last:rounded-br-lg">
                          <div className="flex justify-end space-x-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditVehicle(vehicle);
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Edit"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVehicle(vehicle.id);
                              }}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Cards */}
            <div className="lg:hidden">
              <div className="p-4 space-y-4">
                {filteredVehicles.map((vehicle) => {
                  const motStatus = getDateStatus(vehicle.mot_date);
                  const taxStatus = getDateStatus(vehicle.tax_date);
                  const serviceStatus = getDateStatus(vehicle.service_date);
                  const insuranceStatus = getDateStatus(vehicle.insurance_date);
                  const breakdownStatus = getDateStatus(vehicle.breakdown_date);
                  const congestionStatus = getDateStatus(vehicle.congestion_date);
                  const dartfordStatus = getDateStatus(vehicle.dartford_date);
                  const cleanAirStatus = getDateStatus(vehicle.clean_air_date);
                  const lastServiceStatus = getDateStatus(vehicle.last_service_date);

                  return (
                    <div 
                      key={vehicle.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleEditVehicle(vehicle)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400"
                              style={{ 
                                backgroundColor: '#FFDD00', 
                                fontFamily: 'UKNumberPlate, monospace',
                                fontWeight: 'bold',
                                color: '#000000',
                                textAlign: 'center',
                                padding: '8px 12px',
                                borderRadius: '4px',
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                                minWidth: '120px'
                              }}>
                            {vehicle.registration}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {vehicle.make} {vehicle.model}
                          </p>
                          {vehicle.driver && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Driver: {vehicle.driver}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">MOT:</span>
                            <span className={motStatus.color}>
                              {motStatus.text}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Tax:</span>
                            <span className={taxStatus.color}>
                              {taxStatus.text}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Last Service:</span>
                            <span className={lastServiceStatus.color}>
                              {lastServiceStatus.text}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Service:</span>
                            <span className={serviceStatus.color}>
                              {serviceStatus.text}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Insurance:</span>
                            <span className={insuranceStatus.color}>
                              {insuranceStatus.text}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Breakdown:</span>
                            <span className={breakdownStatus.color}>
                              {breakdownStatus.text}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Congestion:</span>
                            <span className="text-gray-900 dark:text-white">
                              {vehicle.has_congestion ? '✔️' : '❌'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Dartford:</span>
                            <span className="text-gray-900 dark:text-white">
                              {vehicle.has_dartford ? '✔️' : '❌'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Clean Air:</span>
                            <span className="text-gray-900 dark:text-white">
                              {vehicle.has_clean_air ? '✔️' : '❌'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">ULEZ:</span>
                            <span className="text-gray-900 dark:text-white">
                              {vehicle.ulez === 'should_be_paid' ? 'Should be paid' : 
                               vehicle.ulez === 'meets_standard' ? 'Meets standard' : 
                               '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditVehicle(vehicle);
                          }}
                          className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVehicle(vehicle.id);
                          }}
                          className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Vehicle Form Modal */}
      {showVehicleModal && (
        createPortal(
          <VehicleForm
            onClose={() => {
              setShowVehicleModal(false);
              setVehicleToEdit(null);
            }}
            onSuccess={() => {
              fetchData();
              setShowVehicleModal(false);
              setVehicleToEdit(null);
            }}
            vehicleToEdit={vehicleToEdit}
          />,
          document.body
        )
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        createPortal(
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg-xl p-6 max-w-sm w-full m-4">
              <div className="flex items-center justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                Confirm Deletion
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                Are you sure you want to delete this vehicle? This action cannot
                be undone.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setVehicleToDelete(null);
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
        )
      )}
    </div>
  );
}

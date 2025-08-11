import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';
import { ChevronLeft, Plus, Edit, Trash2, AlertTriangle, Search, Pencil } from 'lucide-react';
import { EquipmentForm } from './EquipmentForm';
import type { Equipment } from '../../../types/database';

interface HSEquipmentListProps {
  onBack: () => void;
}

export function HSEquipmentList({ onBack }: HSEquipmentListProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<string | null>(null);
  const [equipmentToEdit, setEquipmentToEdit] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setEquipment(data || []);
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while fetching equipment'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    setEquipmentToDelete(equipmentId);
    setShowDeleteModal(true);
  };

  const handleEditEquipment = (equipment: Equipment) => {
    setEquipmentToEdit(equipment);
    setShowEquipmentModal(true);
  };

  const confirmDelete = async () => {
    if (!equipmentToDelete) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', equipmentToDelete);

      if (error) throw error;

      await fetchEquipment();
      setShowDeleteModal(false);
      setEquipmentToDelete(null);
    } catch (err) {
      console.error('Error deleting equipment:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while deleting the equipment'
      );
    } finally {
      setLoading(false);
    }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Equipment List</h2>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Search Bar with Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search by name or serial number..."
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
            setEquipmentToEdit(null);
            setShowEquipmentModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Equipment
        </button>
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
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <div className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <th scope="col" className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider first:rounded-tl-lg">
                          Name
                        </th>
                        <th scope="col" className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Serial
                        </th>
                        <th scope="col" className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Inspection Frequency
                        </th>
                        <th scope="col" className="py-3 px-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Service Frequency
                        </th>
                        <th scope="col" className="py-3 px-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider last:rounded-tr-lg">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredEquipment.map((item, index) => (
                        <tr 
                          key={item.id} 
                          className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer`}
                          onClick={() => handleEditEquipment(item)}
                        >
                          <td className="py-2 px-3 text-sm text-gray-900 dark:text-white first:rounded-bl-lg">
                            {item.name}
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                            {item.serial_number}
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                            {item.inspection_interval} {item.inspection_frequency}
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                            {item.service_interval_value} {item.service_interval_unit}
                          </td>
                          <td className="py-2 px-3 text-right text-sm font-medium last:rounded-br-lg">
                            <div className="flex justify-end space-x-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditEquipment(item);
                                }}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Edit"
                              >
                                <Pencil className="h-5 w-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEquipment(item.id);
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
            </div>

            {/* Mobile/Tablet Cards */}
            <div className="lg:hidden">
              <div className="p-4 space-y-4">
                {filteredEquipment.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleEditEquipment(item)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                          {item.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Serial: {item.serial_number}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Inspection Frequency:</span>
                        <span className="text-gray-900 dark:text-white">
                          {item.inspection_interval} {item.inspection_frequency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Service Frequency:</span>
                        <span className="text-gray-900 dark:text-white">
                          {item.service_interval_value} {item.service_interval_unit}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEquipment(item);
                        }}
                        className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEquipment(item.id);
                        }}
                        className="flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Equipment Form Modal */}
      {showEquipmentModal && (
        createPortal(
          <EquipmentForm
            onClose={() => {
              setShowEquipmentModal(false);
              setEquipmentToEdit(null);
            }}
            onSuccess={() => {
              fetchEquipment();
              setShowEquipmentModal(false);
              setEquipmentToEdit(null);
            }}
            equipmentToEdit={equipmentToEdit}
          />,
          document.body
        )
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        createPortal(
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full m-4">
              <div className="flex items-center justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                Confirm Deletion
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                Are you sure you want to delete this equipment? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEquipmentToDelete(null);
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

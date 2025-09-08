import { useState } from 'react';
import { supabase } from '../../../../../lib/supabase';
import type { Equipment, EquipmentFormData } from '../types';

export function useEquipmentForm(equipmentToEdit?: Equipment | null) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<EquipmentFormData>({
    category: (equipmentToEdit as any)?.category || '',
    name: equipmentToEdit?.name || '',
    serial_number: equipmentToEdit?.serial_number || '',
    location: (equipmentToEdit as any)?.location || '',
    purchase_date: (equipmentToEdit as any)?.purchase_date || '',
    warranty_expiry: (equipmentToEdit as any)?.warranty_expiry || '',
    inspection_interval: (equipmentToEdit as any)?.inspection_interval || '',
    inspection_frequency: (equipmentToEdit as any)?.inspection_frequency || 'Monthly',
    inspection_notes: (equipmentToEdit as any)?.inspection_notes || '',
    service_interval_value: (equipmentToEdit as any)?.service_interval_value || '',
    service_interval_unit: (equipmentToEdit as any)?.service_interval_unit || 'Month',
    service_notes: (equipmentToEdit as any)?.service_notes || '',
    notes: (equipmentToEdit as any)?.notes || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (onSuccess: () => void, onClose: () => void) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let error;
      if (equipmentToEdit) {
        // Update existing equipment
        ({ error } = await supabase
          .from('equipment')
          .update({
            ...formData,
            warranty_expiry: formData.warranty_expiry || null,
            notes: formData.notes || null
          })
          .eq('id', equipmentToEdit.id));
      } else {
        // Create new equipment
        ({ error } = await supabase
          .from('equipment')
          .insert([{
            ...formData,
            user_id: user.id,
            warranty_expiry: formData.warranty_expiry || null,
            notes: formData.notes || null
          }]));
      }

      if (error) throw error;
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving equipment:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return {
    currentStep,
    loading,
    error,
    formData,
    handleChange,
    handleSubmit,
    handleNextStep,
    handlePrevStep,
    setError
  };
}

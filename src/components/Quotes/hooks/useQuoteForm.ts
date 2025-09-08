import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Quote, Project, Customer, QuoteItem } from '../types';
import { FormStep } from '../types';

interface UseQuoteFormProps {
  quoteToEdit?: Quote | null;
  preselectedProject?: Project | null;
  onSuccess: () => void;
  onClose: () => void;
}

export const useQuoteForm = ({ 
  quoteToEdit, 
  preselectedProject, 
  onSuccess, 
  onClose 
}: UseQuoteFormProps) => {
  const [currentStep, setCurrentStep] = useState<FormStep>(FormStep.DETAILS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [createdByName, setCreatedByName] = useState('');
  const [includeVat, setIncludeVat] = useState(false);
  const [overrideSubtotal, setOverrideSubtotal] = useState(false);
  const [manualSubtotal, setManualSubtotal] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState<{ seven_days: string; thirty_days: string } | null>(null);
  const [customPaymentTerms, setCustomPaymentTerms] = useState(false);
  const [formData, setFormData] = useState({
    project_id: quoteToEdit?.project_id || preselectedProject?.id || '',
    customer_id: quoteToEdit?.customer_id || '',
    project_location: quoteToEdit?.project_location || '',
    status: quoteToEdit?.status || 'new',
    notes: quoteToEdit?.notes || '',
    due_payable: quoteToEdit?.due_payable || '',
    payment_terms: quoteToEdit?.payment_terms || '',
    override_subtotal: quoteToEdit?.override_subtotal || null,
    is_subtotal_overridden: quoteToEdit?.is_subtotal_overridden || false,
    items: (quoteToEdit?.items || []).map((item, index) => ({
      ...item,
      id: crypto.randomUUID(),
      number: item.number || (index + 1).toString()
    })) as QuoteItem[],
  });

  const fetchPaymentTerms = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_terms')
        .select('seven_days, thirty_days')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPaymentTerms(data);
      }
    } catch (err) {
      console.error('Error fetching payment terms:', err);
    }
  };

  const fetchData = async () => {
    try {
      const [projectsResponse, customersResponse] = await Promise.all([
        supabase.from('projects').select('*').order('name', { ascending: true }),
        supabase.from('customers').select('*').order('customer_name', { ascending: true })
      ]);

      if (projectsResponse.error) throw projectsResponse.error;
      if (customersResponse.error) throw customersResponse.error;

      setProjects(projectsResponse.data || []);
      setCustomers(customersResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.display_name) {
        setCreatedByName(user.user_metadata.display_name);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const calculateSubtotal = () => {
    if (overrideSubtotal) {
      return Number(manualSubtotal);
    }
    return formData.items.reduce((sum, item) => sum + (item.price || 0), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return includeVat ? subtotal * 1.2 : subtotal;
  };

  const addItem = () => {
    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      number: (formData.items.length + 1).toString(),
      description: '',
      price: null
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          if (field === 'price') {
            // Handle price updates
            const numValue = value === '' ? null : parseFloat(value);
            if (isNaN(numValue)) {
              return { ...item, price: null };
            }
            return { ...item, price: numValue };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  const removeItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id).map((item, index) => ({
        ...item,
        number: (index + 1).toString()
      }))
    }));
  };

  const nextStep = () => {
    if (currentStep < FormStep.NOTES) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > FormStep.DETAILS) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Clean up items before sending to the database
      const cleanItems = formData.items.map(({ id, ...item }) => ({
        ...item,
        price: item.price === null ? null : item.price
      }));

      const quoteData = {
        project_id: formData.project_id,
        customer_id: formData.customer_id,
        project_location: formData.project_location || null,
        status: formData.status,
        created_by_name: createdByName,
        quote_date: new Date().toISOString().split('T')[0],
        items: cleanItems,
        amount: calculateTotal(),
        notes: formData.notes || null,
        due_payable: formData.due_payable || null,
        payment_terms: formData.payment_terms || null,
        user_id: user.id,
        override_subtotal: overrideSubtotal ? manualSubtotal : null,
        is_subtotal_overridden: overrideSubtotal
      };

      let error;
      
      if (quoteToEdit) {
        ({ error } = await supabase
          .from('quotes')
          .update(quoteData)
          .eq('id', quoteToEdit.id));
      } else {
        ({ error } = await supabase
          .from('quotes')
          .insert([quoteData]));
      }

      if (error) throw error;
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUserProfile();
    fetchPaymentTerms();
    
    if (quoteToEdit) {
      setFormData({
        project_id: quoteToEdit.project_id,
        customer_id: quoteToEdit.customer_id,
        project_location: quoteToEdit.project_location || '',
        status: quoteToEdit.status,
        notes: quoteToEdit.notes || '',
        due_payable: quoteToEdit.due_payable || '',
        payment_terms: quoteToEdit.payment_terms || '',
        override_subtotal: quoteToEdit.override_subtotal || null,
        is_subtotal_overridden: quoteToEdit.is_subtotal_overridden || false,
        items: (quoteToEdit.items || []).map((item, index) => ({
          ...item,
          id: crypto.randomUUID(),
          number: item.number || (index + 1).toString()
        })),
      });
      setOverrideSubtotal(quoteToEdit.is_subtotal_overridden || false);
      setManualSubtotal(quoteToEdit.override_subtotal || 0);
      setIncludeVat(quoteToEdit.amount > calculateSubtotal());
      setCustomPaymentTerms(!!quoteToEdit.payment_terms);
    } else if (preselectedProject) {
      setFormData(prev => ({
        ...prev,
        project_id: preselectedProject.id
      }));
    }
  }, [quoteToEdit, preselectedProject]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return {
    currentStep,
    setCurrentStep,
    loading,
    error,
    projects,
    customers,
    createdByName,
    includeVat,
    setIncludeVat,
    overrideSubtotal,
    setOverrideSubtotal,
    manualSubtotal,
    setManualSubtotal,
    paymentTerms,
    customPaymentTerms,
    setCustomPaymentTerms,
    formData,
    setFormData,
    calculateSubtotal,
    calculateTotal,
    addItem,
    updateItem,
    removeItem,
    nextStep,
    prevStep,
    handleSubmit,
  };
};

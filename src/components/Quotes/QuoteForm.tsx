import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Trash2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Quote, Project, Customer, QuoteItem } from '../../types/database';

interface QuoteFormProps {
  onClose: () => void;
  onSuccess: () => void;
  quoteToEdit?: Quote | null;
  preselectedProject?: Project | null;
  disableProjectSelection?: boolean;
}

// Enum for form steps
enum FormStep {
  DETAILS = 0,
  ITEMS = 1,
  NOTES = 2
}

export function QuoteForm({ 
  onClose, 
  onSuccess, 
  quoteToEdit,
  preselectedProject = null,
  disableProjectSelection = false
}: QuoteFormProps) {
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

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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

  const renderStepIndicator = () => {
    const stepLabels = ['Details', 'Items', 'Notes'];
    
    return (
      <div className="mb-8 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-medium text-indigo-600">
            {stepLabels[currentStep]}
          </div>
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of 3
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${((currentStep + 1) / 3) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  // Step 1: Details
  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Created By *
          </label>
          <input
            type="text"
            value={createdByName}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quote Date *
          </label>
          <input
            type="date"
            value={new Date().toISOString().split('T')[0]}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-2">
            Project *
          </label>
          <select
            id="project"
            required
            value={formData.project_id}
            onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
            disabled={disableProjectSelection}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${
              disableProjectSelection 
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed' 
                : 'focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
            }`}
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
            Status *
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="new">New</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-2">
            Customer *
          </label>
          <select
            id="customer"
            required
            value={formData.customer_id}
            onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.company_name ? `${customer.company_name} (${customer.customer_name})` : customer.customer_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="project_location" className="block text-sm font-medium text-gray-700 mb-2">
            Project Location *
          </label>
          <input
            type="text"
            id="project_location"
            value={formData.project_location}
            onChange={(e) => setFormData(prev => ({ ...prev, project_location: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter project location"
          />
        </div>
      </div>
    </div>
  );

  // Step 2: Items
  const renderItemsStep = () => (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <h3 className="text-lg font-medium">Items * (at least one item required)</h3>
          <button
            type="button"
            onClick={addItem}
            className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </button>
        </div>

        <div className="space-y-4">
          <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-4">
            {formData.items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start bg-gray-50 p-4 rounded-lg">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    #
                  </label>
                  <input
                    type="text"
                    required
                    value={item.number}
                    onChange={(e) => updateItem(item.id, 'number', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-8">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    required
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    rows={2}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Amount (£) <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={item.price === null ? '' : item.price}
                    onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Optional"
                  />
                </div>

                <div className="flex justify-end sm:col-span-1">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="inline-flex items-center px-2 py-1 text-sm text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {formData.items.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No items added yet
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <button
          type="button"
          onClick={() => setOverrideSubtotal(!overrideSubtotal)}
          className={`w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            overrideSubtotal 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {overrideSubtotal ? 'Using Manual Subtotal' : 'Override Subtotal'} <span className="text-gray-400 text-xs">(optional)</span>
        </button>

        <button
          type="button"
          onClick={() => setIncludeVat(!includeVat)}
          className={`w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            includeVat 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {includeVat ? 'VAT Included (20%)' : 'Add 20% VAT'} <span className="text-gray-400 text-xs">(optional)</span>
        </button>
      </div>
      
      <div className="text-lg font-medium space-y-1 p-4 bg-gray-50 rounded-lg">
        {overrideSubtotal ? (
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Subtotal: £</span>
            <input
              type="text"
              value={manualSubtotal.toFixed(2)}
              onChange={(e) => setManualSubtotal(parseFloat(e.target.value) || 0)}
              className="w-32 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        ) : (
          <div className="text-gray-600">
            Subtotal: £{calculateSubtotal().toFixed(2)}
          </div>
        )}
        {includeVat && (
          <div className="text-gray-600">
            VAT (20%): £{formatNumber(calculateSubtotal() * 0.2)}
          </div>
        )}
        <div className="text-gray-900 font-bold">
          Total: £{formatNumber(calculateTotal())}
        </div>
      </div>
    </div>
  );

  // Step 3: Notes & Terms
  const renderNotesStep = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Notes <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={4}
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Enter any additional notes"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Payment Terms <span className="text-gray-400 text-xs">(optional)</span>
          </label>
          <button
            type="button"
            onClick={() => {
              setCustomPaymentTerms(!customPaymentTerms);
              if (customPaymentTerms) {
                // Clear payment terms when switching back to standard terms
                setFormData(prev => ({ ...prev, payment_terms: '' }));
              }
            }}
            className={`text-sm font-medium ${
              customPaymentTerms ? 'text-indigo-600' : 'text-gray-500'
            } hover:text-indigo-500`}
          >
            {customPaymentTerms ? 'Use Standard Terms' : 'Add Custom Terms'}
          </button>
        </div>
        {customPaymentTerms ? (
          <textarea
            value={formData.payment_terms}
            onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter custom payment terms"
          />
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
            {paymentTerms ? `${paymentTerms.seven_days} / ${paymentTerms.thirty_days}` : 'Standard payment terms will be applied'}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="due_payable" className="block text-sm font-medium text-gray-700 mb-2">
          Due & Payable <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <select
          id="due_payable"
          value={formData.due_payable}
          onChange={(e) => setFormData(prev => ({ ...prev, due_payable: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Select payment terms</option>
          <option value="Payment Due Instantly">Payment Due Instantly</option>
          <option value="Payment Due Upon Receipt">Payment Due Upon Receipt</option>
          <option value="7 Days">7 Days</option>
          <option value="30 Days">30 Days</option>
        </select>
      </div>

      {/* Quote Summary Section */}
      <div className="mt-6 border-t pt-6">
        <h3 className="text-lg font-medium mb-4">Quote Summary</h3>
        <div className="text-lg font-medium space-y-1 p-4 bg-gray-50 rounded-lg">
          <div className="text-gray-600">
            Subtotal: £{calculateSubtotal().toFixed(2)}
          </div>
          {includeVat && (
            <div className="text-gray-600">
              VAT (20%): £{formatNumber(calculateSubtotal() * 0.2)}
            </div>
          )}
          <div className="text-gray-900 font-bold">
            Total: £{formatNumber(calculateTotal())}
          </div>
          
          <div className="mt-3 text-sm text-gray-500 flex items-center gap-2">
            <div className="flex items-center">
              <span className={`inline-block w-3 h-3 rounded-full mr-1 ${overrideSubtotal ? 'bg-indigo-600' : 'bg-gray-400'}`}></span>
              {overrideSubtotal ? 'Using manual subtotal' : 'Calculated from items'}
            </div>
            <div className="flex items-center ml-4">
              <span className={`inline-block w-3 h-3 rounded-full mr-1 ${includeVat ? 'bg-indigo-600' : 'bg-gray-400'}`}></span>
              {includeVat ? 'Including 20% VAT' : 'Excluding VAT'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render appropriate step content
  const renderStepContent = () => {
    switch (currentStep) {
      case FormStep.DETAILS:
        return renderDetailsStep();
      case FormStep.ITEMS:
        return renderItemsStep();
      case FormStep.NOTES:
        return renderNotesStep();
      default:
        return renderDetailsStep();
    }
  };

  // Navigation buttons for steps
  const renderStepNavigation = () => (
    <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0">
      <button
        type="button"
        onClick={onClose}
        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-red-600 dark:hover:text-white"
      >
        Cancel
      </button>
      <div className="flex flex-col sm:flex-row gap-3">
        {currentStep > FormStep.DETAILS && (
          <button
            type="button"
            onClick={prevStep}
            className="w-full sm:w-auto inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </button>
        )}
        {currentStep < FormStep.NOTES ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={currentStep === FormStep.ITEMS && formData.items.length === 0}
            className="w-full sm:w-auto inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || formData.items.length === 0}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading
              ? 'Saving...'
              : quoteToEdit
              ? 'Update Quote'
              : 'Create Quote'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-screen w-screen flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl p-6 sm:p-8 w-full max-w-4xl m-4 my-4 sm:my-8 max-h-[90vh] sm:max-h-[800px] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 pb-4 mb-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {quoteToEdit ? 'Edit Quote' : 'New Quote'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        {renderStepIndicator()}

        <div className="space-y-6">
          {renderStepContent()}
          
          {renderStepNavigation()}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-md mt-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';
import { FormField, TextInput, TextArea, NumberInput } from '../../../../utils/form';
import type { QuoteItem } from '../../types';

interface ItemsStepProps {
  formData: {
    items: QuoteItem[];
  };
  addItem: () => void;
  updateItem: (id: string, field: keyof QuoteItem, value: any) => void;
  removeItem: (id: string) => void;
  overrideSubtotal: boolean;
  setOverrideSubtotal: (value: boolean) => void;
  includeVat: boolean;
  setIncludeVat: (value: boolean) => void;
  manualSubtotal: number;
  setManualSubtotal: (value: number) => void;
  calculateSubtotal: () => number;
  calculateTotal: () => number;
}

export const ItemsStep = ({
  formData,
  addItem,
  updateItem,
  removeItem,
  overrideSubtotal,
  setOverrideSubtotal,
  includeVat,
  setIncludeVat,
  manualSubtotal,
  setManualSubtotal,
  calculateSubtotal,
  calculateTotal,
}) => {
  return (
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
                  <FormField label="#" required>
                    <TextInput
                      value={item.number}
                      onChange={(e) => updateItem(item.id, 'number', e.target.value)}
                      className="px-2 py-1 text-sm"
                    />
                  </FormField>
                </div>

                <div className="sm:col-span-8">
                  <FormField label="Description" required>
                    <TextArea
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      rows={2}
                      className="px-2 py-1 text-sm"
                    />
                  </FormField>
                </div>

                <div className="sm:col-span-2">
                  <FormField label="Amount (£)" description="(optional)">
                    <TextInput
                      value={item.price === null ? '' : item.price}
                      onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                      placeholder="Optional"
                      className="px-2 py-1 text-sm"
                    />
                  </FormField>
                </div>

                <div className="flex justify-end sm:col-span-1 mt-6">
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
            <NumberInput
              value={manualSubtotal}
              onChange={(e) => setManualSubtotal(parseFloat(e.target.value) || 0)}
              step={0.01}
              min={0}
              className="w-32 px-2 py-1 text-sm"
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
};

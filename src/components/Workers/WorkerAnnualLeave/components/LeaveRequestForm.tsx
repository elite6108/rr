import React from 'react';
import { X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useLeaveSubmission } from '../hooks/useLeaveSubmission';

interface LeaveRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onSuccess: () => void;
}

export const LeaveRequestForm: React.FC<LeaveRequestFormProps> = ({
  isOpen,
  onClose,
  userEmail,
  onSuccess
}) => {
  const {
    dateRange,
    setDateRange,
    leaveType,
    setLeaveType,
    reason,
    setReason,
    loading,
    error,
    submitLeaveRequest,
    resetForm,
    clearMessages
  } = useLeaveSubmission();

  const handleClose = () => {
    resetForm();
    clearMessages();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return;

    await submitLeaveRequest(userEmail, () => {
      onSuccess();
      handleClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Leave Request</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Leave Type
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="full_day">Full Day(s)</option>
                <option value="half_day_morning">Half Day (Morning)</option>
                <option value="half_day_afternoon">Half Day (Afternoon)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Date{leaveType === 'full_day' ? 's' : ''}
              </label>
              <div className="border border-gray-300 rounded-md p-4 dark:border-gray-600">
                <DayPicker
                  mode={leaveType === 'full_day' ? 'range' : 'single'}
                  selected={dateRange}
                  onSelect={setDateRange}
                  disabled={{ before: new Date() }}
                  className="mx-auto"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter reason for leave..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!dateRange?.from || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
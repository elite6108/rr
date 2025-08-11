import React from 'react';
import { X } from 'lucide-react';

interface PasswordModalProps {
  // Name management
  selectedName: string;
  setSelectedName: (name: string) => void;
  nameError: string | null;
  nameSuccess: boolean;
  loadingName: boolean;
  onNameUpdate: () => void;

  // Password management
  newPassword: string;
  setNewPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  passwordError: string | null;
  passwordSuccess: boolean;
  onPasswordUpdate: (e: React.FormEvent) => void;

  // Modal management
  canCloseUserModal: () => boolean;
  onClose: () => void;
}

export function PasswordModal({
  selectedName,
  setSelectedName,
  nameError,
  nameSuccess,
  loadingName,
  onNameUpdate,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordError,
  passwordSuccess,
  onPasswordUpdate,
  canCloseUserModal,
  onClose,
}: PasswordModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-lg-xl p-6 max-w-md w-full m-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            User Settings {!canCloseUserModal() && <span className="text-red-500">(Full Name Required)</span>}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-100 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You will have to enter your full name the first time using this app.
          </p>
          <br />
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name *
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={selectedName}
              onChange={(e) => setSelectedName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your full name"
            />
            <button
              onClick={onNameUpdate}
              disabled={loadingName}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingName ? 'Saving...' : 'Save'}
            </button>
          </div>
          {nameError && (
            <p className="mt-2 text-sm text-red-600">{nameError}</p>
          )}
          {nameSuccess && (
            <p className="mt-2 text-sm text-green-600">
              Name updated successfully!
            </p>
          )}
        </div>

        <hr />
        <br />

        <form onSubmit={onPasswordUpdate}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                New Password *
              </label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password *
              </label>
              <input
                type="password"
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-lg-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Confirm new password"
              />
            </div>
            {passwordError && (
              <p className="text-sm text-red-600">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-green-600">
                Password updated successfully!
              </p>
            )}
          </div>
          <div className="mt-6 flex justify-between items-center">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-red-600 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Update Password
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={!canCloseUserModal()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
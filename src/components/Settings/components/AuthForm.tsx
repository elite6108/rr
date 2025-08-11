import React from 'react';
import type { AuthFormProps } from '../types';

interface AuthFormComponentProps extends AuthFormProps {
  password: string;
  setPassword: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  loading: boolean;
}

export function AuthForm({ 
  password, 
  setPassword, 
  onSubmit, 
  error, 
  loading 
}: AuthFormComponentProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Enter Admin Password
        </label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setPassword(e.target.value)
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter password to modify modules"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Authenticating...' : 'Authenticate'}
      </button>
    </form>
  );
}
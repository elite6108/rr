import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { ModulesModalProps, TabType, Domain } from './types';
import { useAuthentication } from './hooks/useAuthentication';
import { useDomains } from './hooks/useDomains';
import { useTokens } from './hooks/useTokens';
import { usePasswordManagement } from './hooks/usePasswordManagement';
import { AuthForm } from './components/AuthForm';
import { TabNavigation } from './components/TabNavigation';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ModulesTab, DomainsTab, TokensTab, PasswordTab } from './components/tabs';



export function ModulesModal({
  onClose,
  modules,
  onModuleChange,
}: ModulesModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('modules');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState('');
  
  // Custom hooks
  const { password, setPassword, isAuthenticated, error, loading: authLoading, handlePasswordSubmit } = useAuthentication();
  const { domains, newDomain, setNewDomain, loading: domainsLoading, handleAddDomain, handleDeleteDomain } = useDomains(isAuthenticated);
  const { tokens, loading: tokensLoading, handleGenerateToken } = useTokens(isAuthenticated);
  const {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordError,
    passwordSuccess,
    loading: passwordLoading,
    handlePasswordUpdate
  } = usePasswordManagement();

  // Handle domain deletion with confirmation
  const handleDeleteDomainWithConfirm = (domain: Domain) => {
    setDomainToDelete(domain.domain_name);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteDomain = async () => {
    await handleDeleteDomain(domainToDelete);
    setShowDeleteConfirm(false);
    setDomainToDelete('');
  };

  const cancelDeleteDomain = () => {
    setShowDeleteConfirm(false);
    setDomainToDelete('');
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {!isAuthenticated ? (
          <AuthForm
            password={password}
            setPassword={setPassword}
            onSubmit={handlePasswordSubmit}
            error={error}
            loading={authLoading}
            onAuthenticated={() => {}}
          />
        ) : (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Tab Content */}
            {activeTab === 'modules' && (
              <ModulesTab modules={modules} onModuleChange={onModuleChange} />
            )}

            {activeTab === 'domains' && (
              <DomainsTab
                domains={domains}
                newDomain={newDomain}
                setNewDomain={setNewDomain}
                onAddDomain={handleAddDomain}
                onDeleteDomain={handleDeleteDomainWithConfirm}
                loading={domainsLoading}
              />
            )}

            {activeTab === 'tokens' && (
              <TokensTab
                domains={domains}
                tokens={tokens}
                onGenerateToken={handleGenerateToken}
                loading={tokensLoading}
              />
            )}

            {activeTab === 'password' && (
              <PasswordTab
                currentPassword={currentPassword}
                setCurrentPassword={setCurrentPassword}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                onSubmit={handlePasswordUpdate}
                passwordError={passwordError}
                passwordSuccess={passwordSuccess}
                loading={passwordLoading}
              />
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          domainToDelete={domainToDelete}
          onConfirm={confirmDeleteDomain}
          onCancel={cancelDeleteDomain}
        />
      </div>
    </div>
  );
}

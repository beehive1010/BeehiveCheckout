import React from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import MemberGuard from '../components/guards/MemberGuard';
import ComprehensiveMemberDashboard from '../components/dashboard/ComprehensiveMemberDashboard';

// Simple Dashboard Page that uses the new ComprehensiveMemberDashboard
function Dashboard() {
  const { walletAddress, isConnected } = useWallet();
  const { t } = useI18n();

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('wallet.connect') || 'Connect Wallet'}</h2>
          <p className="text-muted-foreground">
            {t('dashboard.connectWalletDescription') || 'Please connect your wallet to access the dashboard'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <ComprehensiveMemberDashboard />
    </div>
  );
}

// Export Dashboard wrapped with MemberGuard for Level 1 requirement
export default function ProtectedDashboard() {
  return (
    <MemberGuard requireLevel={1}>
      <Dashboard />
    </MemberGuard>
  );
}
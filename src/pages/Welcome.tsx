import React, { useEffect, useState } from 'react';
import MemberGuard from '../components/guards/MemberGuard';
import { ERC5115ClaimComponent } from '../components/membership/ERC5115ClaimComponent';
import { useLocation } from 'wouter';
import { useActiveAccount } from 'thirdweb/react';

export default function Welcome() {
  const [, setLocation] = useLocation();
  const account = useActiveAccount();
  const [referrerWallet, setReferrerWallet] = useState<string>('');

  // Get referrer from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      setReferrerWallet(ref);
      console.log('🔗 Referrer detected from URL:', ref);
    }
  }, []);

  const handleActivationComplete = () => {
    console.log('✅ NFT claim and activation completed - redirecting to dashboard');
    setLocation('/dashboard');
  };

  return (
    <MemberGuard requireActivation={false} redirectTo="/welcome">
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Welcome to Beehive Community
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Activate your Level 1 membership by claiming your ERC-5115 NFT
            </p>
            {referrerWallet && (
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-honey/10 border border-honey/30 text-honey font-mono text-sm">
                🔗 Referred by: {referrerWallet.slice(0, 8)}...{referrerWallet.slice(-6)}
              </div>
            )}
          </div>
          
          <ERC5115ClaimComponent 
            onSuccess={handleActivationComplete}
            referrerWallet={referrerWallet}
          />
          
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p className="mb-2">🎯 Connect your wallet and claim your NFT to activate Level 1 membership</p>
            <p>⚡ This will enable access to the 3x3 referral matrix and BCC reward system</p>
          </div>
        </div>
      </div>
    </MemberGuard>
  );
}

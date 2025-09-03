import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useActiveAccount } from 'thirdweb/react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { Loader2, Crown, Shield, Zap, Users, Database } from 'lucide-react';
import DemoClaimButton from '../components/DemoClaimButton';


export default function Welcome() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const account = useActiveAccount();
  const [demoClaimState, setDemoClaimState] = useState<'idle' | 'claiming' | 'success' | 'error'>('idle');
  const [fakeClaimState, setFakeClaimState] = useState<'idle' | 'claiming' | 'success' | 'error'>('idle');
  const [hasLevel1NFT, setHasLevel1NFT] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Mock NFT verification
  useEffect(() => {
    const checkNFT = async () => {
      setIsLoading(true);
      // Mock check - in real implementation this would verify NFT ownership
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasLevel1NFT(false); // For demo, assume user doesn't have NFT
      setIsLoading(false);
    };
    
    if (account?.address) {
      checkNFT();
    }
  }, [account?.address]);


  // Handle redirects in useEffect to avoid setState during render
  useEffect(() => {
    if (hasLevel1NFT && !isLoading) {
      setLocation('/dashboard');
      return;
    }
    
    if (!account?.address) {
      setLocation('/');
      return;
    }
  }, [hasLevel1NFT, isLoading, account?.address, setLocation]);

  // Show loading or return early for redirects
  if ((hasLevel1NFT && !isLoading) || !account?.address) {
    return null;
  }

  const handlePurchaseSuccess = () => {
    toast({
      title: t('welcome.success.title') || 'Success!',
      description: t('welcome.success.description') || 'Level 1 NFT claimed successfully!',
    });
    
    // Small delay to allow NFT ownership to update
    setTimeout(() => {
      setLocation('/dashboard');
    }, 2000);
  };

  const handlePurchaseError = (error: string) => {
    console.error('Purchase error:', error);
    toast({
      title: t('welcome.error.title') || 'Error',
      description: error || t('welcome.error.description') || 'Failed to claim NFT',
      variant: "destructive",
    });
  };

  const handleDemoClaim = async () => {
    if (!account?.address) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    try {
      setFakeClaimState('claiming');
      
      toast({
        title: "Fake Claim Started",
        description: "Processing database-only claim...",
      });

      // Simulate the fake claiming process
      await new Promise(resolve => setTimeout(resolve, 1500));

      const result = {
        transactionHash: "fake_tx_" + Date.now(),
        mintResult: {
          success: true,
          message: 'Level 1 Membership activated (database test)',
          nftLevel: 1,
          userWallet: account.address,
          mintTxHash: "fake_mint_" + Date.now()
        }
      };

      console.log('Fake claim result:', result);
      
      toast({
        title: "Test Claim Complete! 🎉",
        description: "Database-only claim successful (no blockchain transaction)",
      });

      setFakeClaimState('success');
      
      // Actually update the backend database
      try {
        console.log('🔄 Updating user membership in database (fake claim)...');
        
        const claimResponse = await fetch('/api/auth/claim-nft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Wallet-Address': account.address,
          },
          body: JSON.stringify({
            level: 1,
            transactionHash: result.transactionHash,
            mintTxHash: result.mintResult.mintTxHash,
            isFakeClaim: true
          }),
        });

        if (!claimResponse.ok) {
          throw new Error('Failed to update membership status');
        }

        const claimResult = await claimResponse.json();
        console.log('✅ Database updated:', claimResult);

        toast({
          title: "Membership Activated! 🎉",
          description: `Level 1 activated! You received ${claimResult.rewards?.bccTransferable || 500} BCC + ${claimResult.rewards?.bccLocked || 100} BCC locked`,
        });

        // Redirect to dashboard after successful backend update
        setTimeout(() => {
          handlePurchaseSuccess();
        }, 1500);

      } catch (dbError: any) {
        console.error('❌ Database update failed:', dbError);
        toast({
          title: "Test Claim Failed",
          description: "Database update failed during test claim.",
          variant: "destructive",
        });
        setFakeClaimState('error');
      }

    } catch (error: any) {
      console.error('Fake claim error:', error);
      handlePurchaseError(error.message || 'Failed to process fake claim');
      setFakeClaimState('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNGRkI4MDAiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCA0LTRoMTZjMiAwIDQgMiA0IDR2MTZjMCAyLTIgNC00IDRIMzZWMzR6Ii8+PC9nPjwvZz48L3N2Zz4=')] bg-repeat"></div>
        </div>
      </div>

      {/* Membership Section */}
      <div className="container mx-auto px-2 sm:px-4 pt-20 pb-20">
        <div className="max-w-2xl mx-auto px-2 sm:px-0">
          <Card className="bg-secondary border-honey/30 shadow-2xl backdrop-blur">
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-honey/20 to-honey/10 flex items-center justify-center">
                <Crown className="text-honey text-3xl" />
              </div>
              <CardTitle className="text-2xl md:text-3xl font-bold text-honey mb-3">
                {t('welcome.title') || 'Welcome to Beehive!'}
              </CardTitle>
              <p className="text-muted-foreground text-lg mb-4">
                {t('welcome.subtitle') || 'Claim your Level 1 Membership NFT to begin your journey'}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-8">
              {/* NFT Info Card */}
              <div className="bg-gradient-to-r from-honey/5 to-honey/10 rounded-xl p-6 border border-honey/20">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-honey/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-honey" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-honey">Level 1 Membership NFT</h3>
                    <p className="text-sm text-muted-foreground">Your gateway to the Beehive ecosystem</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <Zap className="w-5 h-5 text-honey mx-auto mb-1" />
                    <p className="text-xs font-medium">500 BCC</p>
                    <p className="text-xs text-muted-foreground">Transferable</p>
                  </div>
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <Users className="w-5 h-5 text-honey mx-auto mb-1" />
                    <p className="text-xs font-medium">100 BCC</p>
                    <p className="text-xs text-muted-foreground">Locked Rewards</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-honey"></div>
                    <span>Access to educational content</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-honey"></div>
                    <span>Referral system participation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-honey"></div>
                    <span>BCC reward distributions</span>
                  </div>
                </div>
              </div>

              {/* Claim Buttons */}
              <div className="space-y-4">
                {isLoading ? (
                  <Button disabled className="w-full h-14 text-lg">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Checking NFT Status...
                  </Button>
                ) : (
                  <>
                    {/* Onchain NFT Claim Button */}
                    <DemoClaimButton 
                      className="w-full"
                      onSuccess={handlePurchaseSuccess}
                      onError={handlePurchaseError}
                      disabled={demoClaimState === 'claiming' || fakeClaimState === 'claiming'}
                    />
                    
                    {/* Fake Database Claim Button */}
                    <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30">
                      <CardHeader className="text-center pb-4">
                        <CardTitle className="text-honey flex items-center justify-center gap-2">
                          <Database className="h-5 w-5" />
                          Database Test Claim
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Test claim for database-only (no blockchain)
                        </p>
                      </CardHeader>
                      <CardContent>
                        {fakeClaimState === 'claiming' && (
                          <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-3 text-center mb-4">
                            <div className="flex items-center justify-center gap-2 text-blue-400 font-medium">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                              Processing...
                            </div>
                          </div>
                        )}
                        
                        {fakeClaimState === 'success' && (
                          <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-3 text-center mb-4">
                            <div className="text-green-400 font-medium">✅ Success!</div>
                          </div>
                        )}
                        
                        {fakeClaimState === 'error' && (
                          <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-3 text-center mb-4">
                            <div className="text-red-400 font-medium">❌ Failed</div>
                          </div>
                        )}
                        
                        <Button
                          onClick={handleDemoClaim}
                          disabled={demoClaimState === 'claiming' || fakeClaimState === 'claiming'}
                          className="w-full h-12 text-white font-medium bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-0"
                          data-testid="button-fake-claim-nft"
                        >
                          {fakeClaimState === 'claiming' ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : fakeClaimState === 'success' ? (
                            'Test Claim Complete! 🎉'
                          ) : (
                            'Fake Claim Test (Database Only)'
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              {/* Help Text */}
              <div className="text-center text-sm text-muted-foreground">
                <p>Connected: {account?.address?.slice(0, 8)}...{account?.address?.slice(-6)}</p>
                <p className="mt-2">Need help? Contact our support team.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
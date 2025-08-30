import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useActiveAccount } from 'thirdweb/react';
import { getContract, prepareContractCall, sendTransaction } from 'thirdweb';
import { arbitrum, arbitrumSepolia } from 'thirdweb/chains';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { Loader2, Crown, Shield, Zap, Users } from 'lucide-react';

// Mock dependencies for now - these would need to be implemented
const client = { clientId: "mock", secretKey: undefined } as any; // Mock thirdweb client
const getAdminWalletAddress = () => "0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0"; // Mock admin address
const contractAddresses = {
  BBC_MEMBERSHIP: { alphaCentauri: "0x0000000000000000000000000000000000000000" },
  USDT: { arbitrumSepolia: "0x0000000000000000000000000000000000000000" }
};
const MemberNFTAbi: any[] = []; // Mock NFT ABI
const transactionRateLimiter = { waitForAvailableSlot: async () => {} };
const retryWithBackoff = async (fn: any) => await fn();

export default function Welcome() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const account = useActiveAccount();
  const [demoClaimState, setDemoClaimState] = useState<'idle' | 'claiming' | 'success' | 'error'>('idle');
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

  // Demo NFT contract on Arbitrum
  const demoContract = getContract({
    client,
    address: contractAddresses.BBC_MEMBERSHIP.alphaCentauri,
    chain: arbitrumSepolia,
    abi: MemberNFTAbi,
  });

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
      setDemoClaimState('claiming');
      
      toast({
        title: "Demo Purchase Started",
        description: "Processing payment...",
      });

      // Simulate the complex claiming process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = {
        transactionHash: "0x1234567890123456789012345678901234567890",
        mintResult: {
          success: true,
          message: 'Level 1 Membership NFT minted successfully',
          nftLevel: 1,
          userWallet: account.address,
          mintTxHash: "0x0987654321098765432109876543210987654321"
        }
      };

      console.log('Demo claim result:', result);
      
      const successMessage = result.mintResult?.success 
        ? `Payment & NFT minting successful! Payment TX: ${result.transactionHash.slice(0, 10)}... | Mint TX: ${result.mintResult.mintTxHash.slice(0, 10)}...`
        : `Payment successful! TX: ${result.transactionHash.slice(0, 10)}... | NFT minting failed`;

      toast({
        title: result.mintResult?.success ? "Purchase Complete! 🎉" : "Payment Complete! ⚠️",
        description: successMessage,
        variant: result.mintResult?.success ? "default" : "destructive",
      });

      setDemoClaimState('success');
      
      // Simulate successful claim
      setTimeout(() => {
        handlePurchaseSuccess();
      }, 1000);

    } catch (error: any) {
      console.error('Demo claim error:', error);
      handlePurchaseError(error.message || 'Failed to claim demo NFT');
      setDemoClaimState('error');
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

              {/* Claim Button */}
              <div className="text-center">
                {isLoading ? (
                  <Button disabled className="w-full h-14 text-lg">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Checking NFT Status...
                  </Button>
                ) : (
                  <Button
                    onClick={handleDemoClaim}
                    disabled={demoClaimState === 'claiming'}
                    className="w-full h-14 text-lg bg-honey text-secondary hover:bg-honey/90 font-semibold"
                    data-testid="button-claim-nft"
                  >
                    {demoClaimState === 'claiming' ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Claiming NFT...
                      </>
                    ) : demoClaimState === 'success' ? (
                      'NFT Claimed Successfully! 🎉'
                    ) : (
                      'Claim Level 1 NFT (130 USDT)'
                    )}
                  </Button>
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
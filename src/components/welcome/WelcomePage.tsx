import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Crown, Gift, ArrowRight, Clock } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { nftService, memberService, activationService } from '../../lib/supabaseClient';
import { referralService } from '../../api/landing/referral.client';
import { useI18n } from '../../contexts/I18nContext';
import { useLocation } from 'wouter';

interface NFTClaimState {
  nftLevel: number;
  priceUsdc: number;
  activationFee: number;
  totalCost: number;
  currentTier: number;
  bccUnlockAmount: number;
}

export default function WelcomePage() {
  const { walletAddress } = useWallet();
  const { toast } = useToast();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [claimState, setClaimState] = useState<NFTClaimState>({
    nftLevel: 1,
    priceUsdc: 100,
    activationFee: 30,
    totalCost: 130,
    currentTier: 1,
    bccUnlockAmount: 100,
  });

  useEffect(() => {
    if (walletAddress) {
      loadNFTClaimData();
    }
  }, [walletAddress]);

  const loadNFTClaimData = async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    try {
      // Get NFT level 1 information
      const { data: nftLevel1 } = await nftService.getNFTLevel(1);
      
      // Get current activation tier
      const currentTier = await memberService.getCurrentActivationTier();

      if (nftLevel1) {
        setClaimState({
          nftLevel: 1,
          priceUsdc: nftLevel1.price_usdc,
          activationFee: 30, // Platform activation fee
          totalCost: nftLevel1.price_usdc + 30,
          currentTier,
          bccUnlockAmount: nftLevel1.bcc_reward,
        });
      }

    } catch (error) {
      console.error('Error loading NFT claim data:', error);
      toast({
        title: t('welcome.errorLoading'),
        description: t('welcome.pleaseRefresh'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNFTClaim = async (network: 'mainnet' | 'testnet' | 'simulation') => {
    if (!walletAddress) return;

    setIsProcessing(true);

    try {
      let transactionHash = '';
      
      if (network === 'simulation') {
        // Generate mock transaction hash for simulation
        transactionHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`;
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // TODO: Integrate with actual Thirdweb EditionDrop contract
        // This would involve calling the contract's claim function
        
        toast({
          title: t('welcome.comingSoon'),
          description: t('welcome.blockchainIntegrationPending'),
          variant: 'default',
        });
        return;
      }

      // Get referrer wallet from stored referral link
      const referrerWallet = referralService.getReferrerWallet();

      // Step 1: Process NFT upgrade using Edge Function
      const upgradeResult = await nftService.processNFTUpgrade(walletAddress, {
        level: 1,
        transactionHash,
        payment_amount_usdc: claimState.totalCost,
        paymentMethod: 'USDC',
        network: network === 'mainnet' ? 'arbitrum-one' : 'arbitrum-sepolia',
      });

      if (!upgradeResult.success) {
        throw new Error(upgradeResult.error || 'NFT upgrade failed');
      }

      // Step 2: Complete member activation with referrer data
      const activationResult = await activationService.completeMemberActivation(walletAddress, {
        transactionHash,
        nftLevel: 1,
        paymentMethod: 'USDC',
        paymentAmountUsdc: claimState.totalCost,
        referrerWallet,
      });

      if (!activationResult.success) {
        console.warn('Activation processing incomplete:', activationResult.error);
        // Continue with basic success flow even if activation rewards fail
      }

      // Step 3: Process activation rewards (500 BCC + tier-based locked BCC)
      try {
        await activationService.processActivationRewards(walletAddress, 1);
      } catch (rewardsError) {
        console.warn('Activation rewards processing failed:', rewardsError);
        // Non-critical error, continue with success flow
      }

      toast({
        title: t('welcome.activationSuccess'),
        description: t('welcome.welcomeToBeehive'),
      });

      // Clear stored referrer after successful activation
      referralService.clearReferrer();

      // Activation complete, redirect to dashboard
      setTimeout(() => {
        setLocation('/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error('NFT claim error:', error);
      toast({
        title: t('welcome.activationFailed'),
        description: error.message || t('welcome.unknownError'),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-honey" />
            <p className="text-honey">{t('welcome.checkingStatus') || 'Loading NFT data...'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-honey/10 p-3 rounded-full">
            <Crown className="h-8 w-8 text-honey" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">{t('welcome.title')}</h1>
        <p className="text-lg text-muted-foreground">{t('welcome.subtitle')}</p>
      </div>

      {/* Activation Information */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* NFT Level 1 Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-honey" />
              {t('welcome.membershipNFT')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>{t('welcome.nftLevel')}</span>
              <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                Level {claimState.nftLevel}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span>{t('welcome.nftPrice')}</span>
              <span className="font-semibold">${claimState.priceUsdc} USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span>{t('welcome.activationFee')}</span>
              <span className="font-semibold">${claimState.activationFee} USDC</span>
            </div>
            <hr />
            <div className="flex justify-between items-center text-lg font-bold">
              <span>{t('welcome.totalCost')}</span>
              <span className="text-honey">${claimState.totalCost} USDC</span>
            </div>
          </CardContent>
        </Card>

        {/* Rewards Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              {t('welcome.activationRewards')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>{t('welcome.bccUnlocked')}</span>
              <span className="font-semibold text-honey">{claimState.bccUnlockAmount} BCC</span>
            </div>
            <div className="flex justify-between items-center">
              <span>{t('welcome.welcomeBonus')}</span>
              <span className="font-semibold text-green-500">500 BCC</span>
            </div>
            <div className="flex justify-between items-center">
              <span>{t('welcome.currentTier')}</span>
              <Badge variant="secondary">
                Tier {claimState.currentTier}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>{t('welcome.tierExplanation')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activation Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>{t('welcome.claimMembership')}</CardTitle>
          <p className="text-muted-foreground">{t('welcome.chooseNetwork')}</p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Mainnet Button */}
            <Button
              onClick={() => handleNFTClaim('mainnet')}
              disabled={isProcessing}
              className="h-auto flex-col gap-2 py-4"
              variant="outline"
            >
              <div className="text-lg font-semibold">Arbitrum One</div>
              <div className="text-sm text-muted-foreground">{t('welcome.mainnet')}</div>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>

            {/* Testnet Button */}
            <Button
              onClick={() => handleNFTClaim('testnet')}
              disabled={isProcessing}
              className="h-auto flex-col gap-2 py-4"
              variant="outline"
            >
              <div className="text-lg font-semibold">Arbitrum Sepolia</div>
              <div className="text-sm text-muted-foreground">{t('welcome.testnet')}</div>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>

            {/* Simulation Button */}
            <Button
              onClick={() => handleNFTClaim('simulation')}
              disabled={isProcessing}
              className="h-auto flex-col gap-2 py-4 bg-honey hover:bg-honey/90"
            >
              <div className="text-lg font-semibold">{t('welcome.simulation')}</div>
              <div className="text-sm opacity-90">{t('welcome.testMode')}</div>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isProcessing && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 text-honey">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('welcome.processingActivation')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
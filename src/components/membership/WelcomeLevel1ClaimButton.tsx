import { useState, useEffect } from 'react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { getContract, prepareContractCall, sendTransaction, waitForReceipt, readContract } from 'thirdweb';
import { arbitrumSepolia } from 'thirdweb/chains';
import { createThirdwebClient } from 'thirdweb';
import { claimTo, balanceOf } from 'thirdweb/extensions/erc1155';
import { approve, balanceOf as erc20BalanceOf, allowance } from 'thirdweb/extensions/erc20';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Zap, Crown, Gift, Coins, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../contexts/I18nContext';
import RegistrationModal from '../modals/RegistrationModal';

interface WelcomeLevel1ClaimButtonProps {
  onSuccess?: () => void;
  referrerWallet?: string;
  className?: string;
}

export function WelcomeLevel1ClaimButton({ onSuccess, referrerWallet, className = '' }: WelcomeLevel1ClaimButtonProps): JSX.Element {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  
  // Fixed Level 1 pricing and info
  const LEVEL_1_PRICE_USDC = 130;
  const LEVEL_1_PRICE_WEI = BigInt(LEVEL_1_PRICE_USDC) * BigInt('1000000000000000000'); // 130 * 10^18
  
  const API_BASE = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';
  const PAYMENT_TOKEN_CONTRACT = "0x4470734620414168Aa1673A30849DB25E5886E2A";
  const NFT_CONTRACT = "0x2Cb47141485754371c24Efcc65d46Ccf004f769a";
  const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

  // Initialize Thirdweb client
  const client = createThirdwebClient({
    clientId: THIRDWEB_CLIENT_ID,
  });

  const sendTransactionWithRetry = async (transaction: unknown, account: unknown, description: string = 'transaction') => {
    let lastError: any = null;
    const maxRetries = 3;
    const baseDelay = 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 Sending ${description} (attempt ${attempt}/${maxRetries})...`);
        
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, baseDelay * attempt));
        }
        
        const result = await sendTransaction({
          transaction,
          account
        });
        
        console.log(`✅ ${description} successful on attempt ${attempt}`);
        return result;
        
      } catch (error: any) {
        lastError = error;
        console.error(`❌ ${description} failed on attempt ${attempt}:`, error.message);
        
        if (error.message?.includes('User rejected') || 
            error.message?.includes('user denied') ||
            error.message?.includes('User cancelled')) {
          throw new Error('Transaction cancelled by user');
        }
        
        if (attempt === maxRetries) {
          break;
        }
        
        console.log(`🔄 Retrying ${description} in ${baseDelay * attempt}ms...`);
      }
    }
    
    throw new Error(`${description} failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  };

  const handleRegistrationComplete = () => {
    console.log('✅ Registration completed - closing modal and retrying claim');
    setShowRegistrationModal(false);
    setTimeout(() => {
      handleClaimLevel1NFT();
    }, 500);
  };

  const handleClaimLevel1NFT = async () => {
    console.log('🎯 Level 1 NFT Claim attempt started');
    
    if (!account?.address) {
      toast({
        title: t('claim.walletNotConnected'),
        description: t('claim.connectWalletToClaimNFT'),
        variant: "destructive",
      });
      return;
    }

    // Validate referrer requirements
    if (!referrerWallet) {
      toast({
        title: t('claim.referrerRequired'),
        description: t('claim.referrerRequiredDesc'),
        variant: "destructive",
      });
      return;
    }

    // Prevent self-referral
    if (referrerWallet.toLowerCase() === account.address.toLowerCase()) {
      toast({
        title: t('claim.selfReferralNotAllowed'),
        description: t('claim.selfReferralNotAllowedDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Check if user is registered
      console.log('🔍 Checking user registration status...');
      setCurrentStep(t('claim.checkingRegistration') || 'Checking registration status...');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', account.address)
        .single();
      
      if (userError || !userData) {
        console.log('❌ User not registered:', {
          error: userError,
          hasUserData: !!userData,
          walletAddress: account.address
        });
        setIsProcessing(false);
        setShowRegistrationModal(true);
        return;
      }
      
      console.log('✅ User registration confirmed:', {
        walletAddress: userData.wallet_address,
        username: userData.username
      });
      
      console.log('✅ User registration verified');
      
      // Step 2: Validate referrer
      setCurrentStep(t('claim.validatingReferrer'));
      
      const { data: referrerData, error: referrerError } = await supabase
        .from('members')
        .select('wallet_address, current_level')
        .eq('wallet_address', referrerWallet)
        .single();
      
      if (referrerError || !referrerData || referrerData.current_level <= 0) {
        console.log('❌ Referrer validation failed');
        toast({
          title: t('claim.invalidReferrer'),
          description: t('claim.useValidReferrer'),
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log('✅ Referrer validation passed');

      // Step 3: Check network - must be Arbitrum Sepolia
      const chainId = activeChain?.id;
      if (chainId !== arbitrumSepolia.id) {
        throw new Error(`Please switch to Arbitrum Sepolia network. Current: ${chainId}, Required: ${arbitrumSepolia.id}`);
      }

      // Step 4: Check ETH balance for gas
      try {
        const ethBalance = await (window as any).ethereum.request({
          method: 'eth_getBalance',
          params: [account.address, 'latest']
        });
        const balanceInETH = parseInt(ethBalance, 16) / 1e18;
        
        if (balanceInETH < 0.001) {
          throw new Error(`Insufficient ETH for gas fees. Current balance: ${balanceInETH.toFixed(6)} ETH. Get test ETH from: https://sepolia-faucet.arbitrum.io/`);
        }
      } catch (balanceError: any) {
        if (balanceError.message.includes('Insufficient ETH')) {
          throw balanceError;
        }
        console.warn('⚠️ Could not check ETH balance:', balanceError);
      }

      // Step 5: Setup contracts
      const usdcContract = getContract({
        client,
        address: PAYMENT_TOKEN_CONTRACT,
        chain: arbitrumSepolia
      });

      const nftContract = getContract({
        client,
        address: NFT_CONTRACT,
        chain: arbitrumSepolia
      });

      // Step 6: Check if user already owns Level 1 NFT
      console.log('🔍 Checking Level 1 NFT ownership...');
      try {
        const existingBalance = await balanceOf({
          contract: nftContract,
          owner: account.address,
          tokenId: BigInt(1)
        });
        
        if (Number(existingBalance) > 0) {
          console.log('✅ User already owns Level 1 NFT - redirecting');
          toast({
            title: t('claim.welcomeBack'),
            description: 'You already own Level 1 NFT. Redirecting to dashboard.',
            variant: "default",
            duration: 3000,
          });
          
          if (onSuccess) {
            setTimeout(() => onSuccess(), 1500);
          }
          return;
        }
      } catch (balanceCheckError) {
        console.warn('⚠️ Could not check NFT balance:', balanceCheckError);
      }

      // Step 7: Check and approve USDC
      console.log('💰 Checking USDC balance and approval...');
      setCurrentStep(t('claim.checkingBalance'));
      
      // Check USDC balance
      try {
        const tokenBalance = await erc20BalanceOf({
          contract: usdcContract,
          address: account.address
        });
        
        if (tokenBalance < LEVEL_1_PRICE_WEI) {
          throw new Error(`Insufficient USDC balance. You have ${(Number(tokenBalance) / 1e18).toFixed(2)} USDC but need ${LEVEL_1_PRICE_USDC} USDC for Level 1`);
        }
      } catch (balanceError: any) {
        if (balanceError.message.includes('Insufficient USDC')) {
          throw balanceError;
        }
        console.warn('⚠️ Could not check USDC balance:', balanceError);
      }

      // Check and request approval
      setCurrentStep(t('claim.checkingApproval'));
      
      try {
        const currentAllowance = await allowance({
          contract: usdcContract,
          owner: account.address,
          spender: NFT_CONTRACT
        });
        
        if (currentAllowance < LEVEL_1_PRICE_WEI) {
          console.log('💰 Requesting USDC approval...');
          
          const approveTransaction = approve({
            contract: usdcContract,
            spender: NFT_CONTRACT,
            amount: LEVEL_1_PRICE_WEI.toString()
          });

          setCurrentStep(t('claim.waitingApproval'));
          
          const approveTxResult = await sendTransactionWithRetry(
            approveTransaction, 
            account, 
            'USDC approval transaction'
          );

          await waitForReceipt({
            client,
            chain: arbitrumSepolia,
            transactionHash: approveTxResult?.transactionHash,
          });
          
          console.log('✅ USDC approval confirmed');
        }
      } catch (allowanceError) {
        console.warn('⚠️ Could not check/set allowance:', allowanceError);
      }

      // Step 8: Claim Level 1 NFT
      console.log('🎁 Claiming Level 1 NFT...');
      setCurrentStep(t('claim.mintingNFT'));
      
      // Use Thirdweb v5 claimTo extension with proper parameters
      const claimTransaction = claimTo({
        contract: nftContract,
        to: account.address,
        tokenId: BigInt(1),
        quantity: BigInt(1),
        pricePerToken: LEVEL_1_PRICE_WEI,
        currency: PAYMENT_TOKEN_CONTRACT
      });

      const claimTxResult = await sendTransactionWithRetry(
        claimTransaction,
        account,
        'Level 1 NFT claim transaction'
      );

      // Wait for confirmation and get receipt
      setCurrentStep(t('claim.waitingNFTConfirmation'));
      const receipt = await waitForReceipt({
        client,
        chain: arbitrumSepolia,
        transactionHash: claimTxResult.transactionHash,
      });
      
      console.log('✅ Level 1 NFT claim confirmed');
      console.log('📦 Claim成功，区块号:', receipt.blockNumber);
      console.log('🔗 交易哈希:', claimTxResult.transactionHash);
      console.log('📋 事件 logs:', receipt.logs);
      console.log('✅ Receipt status:', receipt.status);

      // Step 9: Activate Level 1 membership (welcome users - includes matrix placement)
      console.log('🚀 Activating Level 1 membership with matrix placement...');
      setCurrentStep('Activating membership...');
      
      let backendProcessed = false;
      let membershipActivated = false;
      
      // Use activate-membership endpoint directly for new user membership activation
      let activationSuccess = false;
      const maxRetries = 5;
      const retryDelay = 10000; // 10 seconds
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📞 Membership activation attempt ${attempt}/${maxRetries}`);
          
          const activateResponse = await fetch(`${API_BASE}/activate-membership`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-wallet-address': account.address
            },
            body: JSON.stringify({
              transactionHash: claimTxResult.transactionHash,
              level: 1,
              paymentMethod: 'token_payment',
              paymentAmount: LEVEL_1_PRICE_USDC,
              referrerWallet: referrerWallet
            })
          });

          if (activateResponse.ok) {
            const result = await activateResponse.json();
            console.log(`✅ Level 1 membership activated on attempt ${attempt}:`, result);
            activationSuccess = true;
            membershipActivated = true;
            backendProcessed = true;
            break;
          } else {
            throw new Error(`Activation failed with status: ${activateResponse.status}`);
          }
          
        } catch (activationError: any) {
          console.warn(`⚠️ Membership activation attempt ${attempt} failed:`, activationError.message);
          
          // Check if it's a registration error
          if (activationError.message && activationError.message.includes('User must be registered')) {
            console.log('❌ User registration required, showing registration modal');
            setIsProcessing(false);
            setShowRegistrationModal(true);
            return;
          }
          
          if (attempt < maxRetries) {
            console.log(`🔄 Retrying activation in ${retryDelay/1000} seconds...`);
            setCurrentStep(`Activation failed, retrying in ${retryDelay/1000}s... (${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
      
      if (!activationSuccess) {
        console.error('❌ All activation attempts failed');
        throw new Error('Membership activation failed after multiple attempts');
      }

      // Membership activation successful

      toast({
        title: '🎉 Level 1 NFT Claimed!',
        description: 'Welcome to BEEHIVE! Your Level 1 membership is now active.',
        variant: "default",
        duration: 6000,
      });

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('❌ Level 1 NFT claim error:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('User rejected') || errorMessage.includes('user denied')) {
        toast({
          title: 'Transaction Cancelled',
          description: 'You cancelled the transaction.',
          variant: "destructive",
        });
      } else if (errorMessage.includes('Insufficient ETH')) {
        toast({
          title: 'Insufficient ETH',
          description: errorMessage,
          variant: "destructive",
        });
      } else if (errorMessage.includes('Insufficient USDC')) {
        toast({
          title: 'Insufficient USDC',
          description: errorMessage,
          variant: "destructive",
        });
      } else if (errorMessage.includes('network')) {
        toast({
          title: 'Network Error',
          description: 'Please switch to Arbitrum Sepolia network.',
          variant: "destructive",
        });
      } else {
        toast({
          title: 'Claim Failed',
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Card className={`bg-gradient-to-br from-honey/5 to-honey/15 border-honey/30 ${className}`}>
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-3">
            <Crown className="h-8 w-8 text-honey mr-2" />
            <Badge className="bg-honey/20 text-honey border-honey/50">
              Welcome Level 1 NFT
            </Badge>
          </div>
          <CardTitle className="text-2xl text-honey mb-2">
            Claim Level 1 NFT
          </CardTitle>
          <p className="text-muted-foreground">
            Join the BEEHIVE community with your first membership NFT
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Benefits Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
              <Coins className="h-6 w-6 text-orange-400 mx-auto mb-2" />
              <h3 className="font-semibold text-orange-400 mb-1">{LEVEL_1_PRICE_USDC} USDC</h3>
              <p className="text-xs text-muted-foreground">Level 1 Price</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
              <Crown className="h-6 w-6 text-purple-400 mx-auto mb-2" />
              <h3 className="font-semibold text-purple-400 mb-1">Level 1</h3>
              <p className="text-xs text-muted-foreground">Membership NFT</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
              <Gift className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <h3 className="font-semibold text-blue-400 mb-1">Matrix</h3>
              <p className="text-xs text-muted-foreground">3×3 referral system</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20">
              <Zap className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <h3 className="font-semibold text-green-400 mb-1">Instant</h3>
              <p className="text-xs text-muted-foreground">Activation</p>
            </div>
          </div>

          {/* Claim Button */}
          <div className="space-y-4">
            <Button 
              onClick={handleClaimLevel1NFT}
              disabled={isProcessing || !account?.address}
              className="w-full h-12 bg-gradient-to-r from-honey to-orange-500 hover:from-honey/90 hover:to-orange-500/90 text-background font-semibold text-lg shadow-lg disabled:opacity-50"
            >
              {!account?.address ? (
                <>
                  <Crown className="mr-2 h-5 w-5" />
                  {t('claim.connectWalletToClaimNFT')}
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {currentStep || t('claim.processing')}
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-5 w-5" />
                  Claim Level 1 - {LEVEL_1_PRICE_USDC} USDC
                </>
              )}
            </Button>
            
            {/* Progress indicator */}
            {isProcessing && currentStep && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 text-sm">
                  {currentStep.includes('等待') || currentStep.includes('确认') ? (
                    <Clock className="h-4 w-4 text-blue-400 animate-pulse" />
                  ) : (
                    <Loader2 className="h-4 w-4 text-honey animate-spin" />
                  )}
                  <span className="text-muted-foreground">{currentStep}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('claim.doNotClosePageWarning')}
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="text-center text-xs text-muted-foreground pt-2 space-y-1">
            <p>💳 USDC payment required</p>
            <p>⚡ Instant membership activation</p>
            <p>🎭 NFT minted to your wallet</p>
            <p>🔄 Two transactions: Approve + Claim</p>
          </div>
        </CardContent>
      </Card>

      {/* Registration Modal */}
      <RegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        walletAddress={account?.address || ''}
        referrerWallet={referrerWallet}
        onRegistrationComplete={handleRegistrationComplete}
      />
    </>
  );
}
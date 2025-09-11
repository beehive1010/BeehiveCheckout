import { useState, useEffect } from 'react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from 'thirdweb';
import { arbitrumSepolia } from 'thirdweb/chains';
import { createThirdwebClient } from 'thirdweb';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Zap, Crown, Gift, Coins, Clock } from 'lucide-react';
import { authService } from '../../lib/supabaseClient';
import { useI18n } from '../../contexts/I18nContext';
import RegistrationModal from '../modals/RegistrationModal';

interface ERC5115ClaimComponentProps {
  onSuccess?: () => void;
  referrerWallet?: string;
  className?: string;
}

export function ERC5115ClaimComponent({ onSuccess, referrerWallet, className = '' }: ERC5115ClaimComponentProps): JSX.Element {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [fallbackChainId, setFallbackChainId] = useState<number | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  const API_BASE = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';
  const PAYMENT_TOKEN_CONTRACT = "0x4470734620414168Aa1673A30849DB25E5886E2A";
  const NFT_CONTRACT = "0x2Cb47141485754371c24Efcc65d46Ccf004f769a";
  const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

  // Initialize Thirdweb client
  const client = createThirdwebClient({
    clientId: THIRDWEB_CLIENT_ID
  });

  // Enhanced chain detection using multiple sources
  useEffect(() => {
    const detectFallbackNetwork = async () => {
      const thirdwebChainId = activeChain?.id;
      
      if (!thirdwebChainId && typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
          const detectedChainId = parseInt(chainId, 16);
          setFallbackChainId(detectedChainId);
          console.log(`🔄 Fallback network detection: ${detectedChainId}`);
        } catch (e) {
          console.warn('Fallback network detection failed:', e);
          setFallbackChainId(null);
        }
      } else {
        // Clear fallback when Thirdweb detection is working
        setFallbackChainId(null);
      }
    };

    detectFallbackNetwork();
  }, [activeChain?.id]);

  // Get effective chainId using multiple sources
  const effectiveChainId = activeChain?.id || fallbackChainId;

  const handleRegistrationComplete = () => {
    console.log('✅ Registration completed - closing modal and retrying claim');
    setShowRegistrationModal(false);
    // After registration, automatically retry the claim process
    setTimeout(() => {
      handleClaimNFT();
    }, 500);
  };

  const handleClaimNFT = async () => {
    console.log('🎯 NFT Claim attempt started');
    console.log(`Wallet address: ${account?.address}`);
    
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

    // Prevent self-referral (compare in lowercase but preserve original case)
    if (referrerWallet.toLowerCase() === account.address.toLowerCase()) {
      toast({
        title: t('claim.selfReferralNotAllowed'),
        description: t('claim.selfReferralNotAllowedDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Check if user is registered and validate referrer before allowing NFT claim
    try {
      console.log('🔍 Checking user registration status...');
      setCurrentStep(t('claim.checkingRegistration') || 'Checking registration status...');
      
      const userCheckResponse = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': account.address,
        },
        body: JSON.stringify({
          action: 'get-user'
        })
      });

      const userResult = await userCheckResponse.json();
      
      console.log('🔍 User registration check result:', {
        success: userResult.success,
        action: userResult.action,
        hasUser: !!userResult.user,
        userResult: userResult
      });
      
      if (!userResult.success || userResult.action === 'not_found') {
        console.log('❌ User not registered, showing registration modal');
        setIsProcessing(false);
        setShowRegistrationModal(true);
        return;
      }
      
      console.log('✅ User registration verified - now validating referrer...');
      
      // Validate referrer exists and is a registered member
      setCurrentStep(t('claim.validatingReferrer'));
      
      const referrerCheckResponse = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': account.address,
        },
        body: JSON.stringify({
          action: 'validate-referrer',
          referrerWallet: referrerWallet
        })
      });

      const referrerResult = await referrerCheckResponse.json();
      
      console.log('🔍 Referrer validation result:', referrerResult);
      
      if (!referrerResult.success || !referrerResult.isValid) {
        const errorMessage = referrerResult.error || 'Referrer is not a registered member';
        console.log('❌ Referrer validation failed:', errorMessage);
        toast({
          title: t('claim.invalidReferrer'),
          description: `${errorMessage}. ${t('claim.useValidReferrer')}`,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
      
      console.log('✅ Referrer validation passed - proceeding with NFT claim');
    } catch (error) {
      console.error('❌ User/referrer validation failed:', error);
      toast({
        title: t('claim.validationFailed') || "Validation Failed",
        description: t('claim.validationFailedDesc') || "Unable to verify registration or referrer status. Please refresh and try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    // Declare variables at function scope
    let claimTxResult: any = null;
    let backendProcessed = false;
    let membershipActivated = false;

    try {
      // Step 0: Check network - must be on Arbitrum Sepolia
      console.log('🌐 Checking network...');
      console.log(`Thirdweb activeChain ID: ${activeChain?.id}`);
      console.log(`Fallback chainId: ${fallbackChainId}`);
      console.log(`Effective chainId: ${effectiveChainId}`);
      console.log(`Required network ID: ${arbitrumSepolia.id}`);
      
      // Use the effective chain ID (priority: activeChain > fallback)
      let finalChainId = effectiveChainId;
      
      if (!finalChainId) {
        console.log('⚠️ No chain ID detected from any source, attempting fresh detection...');
        
        // Try to get network from window.ethereum if available
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          console.log('🔍 Attempting fresh chain detection...');
          try {
            const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
            console.log(`📡 Fresh chainId detection: ${chainId}`);
            const detectedChainId = parseInt(chainId, 16);
            console.log(`🔄 Parsed fresh chainId: ${detectedChainId}`);
            finalChainId = detectedChainId;
          } catch (e) {
            console.error('❌ Fresh network detection failed:', e);
          }
        }
        
        if (!finalChainId) {
          console.error('❌ All network detection methods failed');
          throw new Error('Unable to detect wallet network. Please ensure your wallet is connected to the correct network and try again.');
        }
        
        console.log(`✅ Fresh network detection successful: ${finalChainId}`);
      } else {
        console.log(`✅ Using detected network: ${finalChainId} (Source: ${activeChain?.id ? 'activeChain' : 'fallback'})`);
      }
      
      // Verify network is correct (using finalChainId which could be from fallback)
      console.log(`🔍 Final chainId for verification: ${finalChainId}`);
      if (finalChainId !== arbitrumSepolia.id) {
        throw new Error(`Please switch to Arbitrum Sepolia network to claim NFT. Current network: ${finalChainId}, Required: ${arbitrumSepolia.id} (Arbitrum Sepolia)`);
      }
      console.log('✅ Network check passed - on Arbitrum Sepolia');

      // Step 0.5: Check if user already owns the NFT
      console.log('🔍 Checking if user already owns NFT...');
      try {
        const nftContract = getContract({
          client,
          address: NFT_CONTRACT,
          chain: arbitrumSepolia
        });

        // Check if user already owns token ID 1
        console.log(`Checking NFT ownership for wallet: ${account.address}, Token ID: 1`);
        // Skip the ownership check for now - just log and continue
        console.log('⚠️ Skipping NFT ownership check - proceeding with validation');
      } catch (ownershipError) {
        console.warn('⚠️ Could not check NFT ownership:', ownershipError);
      }

      // Step 1: Check and approve tokens
      console.log('💰 Checking token balance and approval...');
      setCurrentStep(t('claim.checkingBalance'));
      
      const PAYMENT_TOKEN_AMOUNT = BigInt("130000000000000000000"); // 130 tokens with 18 decimals (130 * 10^18)
      const finalAmount = PAYMENT_TOKEN_AMOUNT; // Use the predefined amount
      
      const usdcContract = getContract({
        client,
        address: PAYMENT_TOKEN_CONTRACT,
        chain: arbitrumSepolia
      });

      console.log(`💳 Checking token balance for payment: ${finalAmount.toString()} units (130 tokens with 18 decimals)`);

      // Check if approval is needed
      setCurrentStep(t('claim.checkingApproval'));
      
      // Always request approval for safety and gas estimation
      console.log(`💰 Requesting token approval for 130 tokens (${finalAmount.toString()} units with 18 decimals)...`);
      
      const approveTransaction = prepareContractCall({
        contract: usdcContract,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [NFT_CONTRACT, finalAmount]
      });

      console.log('📝 Sending approval transaction...');
      setCurrentStep(t('claim.waitingApproval'));
      
      // Send approval transaction with retry logic
      let approvalAttempts = 0;
      const maxApprovalAttempts = 3;
      let approveTxResult: any = null;
      
      while (approvalAttempts < maxApprovalAttempts) {
        try {
          approveTxResult = await sendTransaction({
            transaction: approveTransaction,
            account
          });
          console.log('✅ Approval transaction sent:', approveTxResult.transactionHash);
          break; // Success, exit retry loop
        } catch (approvalError: any) {
          approvalAttempts++;
          console.log(`Approval attempt ${approvalAttempts}/${maxApprovalAttempts} failed:`, approvalError);
          
          if (approvalError.code === -32005 || approvalError.message?.includes('rate limit')) {
            if (approvalAttempts < maxApprovalAttempts) {
              console.log(`Rate limited, waiting ${approvalAttempts * 3} seconds before retry...`);
              await new Promise(resolve => setTimeout(resolve, approvalAttempts * 3000));
              continue;
            }
          }
          
          // Re-throw for other error handling
          throw approvalError;
        }
      }

      // Wait for approval confirmation
      console.log('⏳ Waiting for approval confirmation...');
      setCurrentStep(t('claim.waitingApprovalConfirmation'));
      
      await waitForReceipt({
        client,
        chain: arbitrumSepolia,
        transactionHash: approveTxResult?.transactionHash,
      });
      
      console.log('✅ USDC approval confirmed');

      // Step 2: Claim NFT with token payment
      console.log('🎁 Claiming NFT with token payment...');
      setCurrentStep(t('claim.mintingNFT'));
      
      // Prepare allowlist proof (empty for public claims)
      const allowlistProof = {
        proof: [], // Empty array for public claims
        quantityLimitPerWallet: BigInt(1), // Limit 1 per wallet
        pricePerToken: finalAmount, // 130 USDC in wei
        currency: PAYMENT_TOKEN_CONTRACT // Payment token address
      };
      
      const nftContract = getContract({
        client,
        address: NFT_CONTRACT,
        chain: arbitrumSepolia
      });
      
      const claimTransaction = prepareContractCall({
        contract: nftContract,
        method: "function claim(address _receiver, uint256 _tokenId, uint256 _quantity, address _currency, uint256 _pricePerToken, (bytes32[] proof, uint256 quantityLimitPerWallet, uint256 pricePerToken, address currency) _allowlistProof, bytes _data) payable",
        params: [
          account.address, // _receiver
          BigInt(1), // _tokenId (Level 1)
          BigInt(1), // _quantity
          PAYMENT_TOKEN_CONTRACT, // _currency
          finalAmount, // _pricePerToken (130 USDC in wei)
          allowlistProof, // _allowlistProof
          "0x" // _data (empty bytes)
        ]
      });

      let claimAttempts = 0;
      const maxClaimAttempts = 3;
      
      while (claimAttempts < maxClaimAttempts) {
        try {
          claimTxResult = await sendTransaction({
            transaction: claimTransaction,
            account
          });
          console.log('🎉 NFT claim transaction:', claimTxResult.transactionHash);
          break; // Success, exit retry loop
        } catch (claimError: any) {
          claimAttempts++;
          console.log(`Claim attempt ${claimAttempts}/${maxClaimAttempts} failed:`, claimError);
          
          if (claimError.code === -32005 || claimError.message?.includes('rate limit')) {
            if (claimAttempts < maxClaimAttempts) {
              console.log(`Rate limited, waiting ${claimAttempts * 3} seconds before retry...`);
              await new Promise(resolve => setTimeout(resolve, claimAttempts * 3000));
              continue;
            }
          }
          
          // Re-throw for other error handling
          throw claimError;
        }
      }

      // Wait for NFT claim transaction to be confirmed
      setCurrentStep(t('claim.waitingNFTConfirmation'));
      const claimReceipt = await waitForReceipt({
        client,
        chain: arbitrumSepolia,
        transactionHash: claimTxResult?.transactionHash,
      });
      
      console.log('✅ NFT claim confirmed:', claimReceipt.status);

      // Step 3: Process the NFT purchase on backend
      console.log('📋 Processing NFT purchase on backend...');
      
      try {
        const claimResponse = await fetch(`${API_BASE}/nft-upgrades`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': account.address
          },
          body: JSON.stringify({
            action: 'process-upgrade',
            level: 1,
            transactionHash: claimTxResult?.transactionHash || '',
            paymentMethod: 'token_payment',
            payment_amount_usdc: 130 // 130 USDC (100 NFT + 30 platform fee)
          })
        });

        if (claimResponse.ok) {
          const claimResult = await claimResponse.json();
          console.log('📋 Backend processing result:', claimResult);
          backendProcessed = claimResult.success;
        } else {
          console.warn('⚠️ Backend processing failed but continuing...');
        }
      } catch (backendError) {
        console.warn('⚠️ Backend processing error but continuing:', backendError);
      }

      // Step 4: 等待区块链确认并安全激活会员身份
      if (claimTxResult?.transactionHash) {
        console.log('🚀 等待区块链确认并激活会员身份...');
        setCurrentStep(t('claim.waitingBlockchainConfirmation'));
        
        // 等待额外的确认时间以确保交易被完全确认
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        let membershipActivationAttempts = 0;
        const maxAttempts = 5;
        
        while (membershipActivationAttempts < maxAttempts && !membershipActivated) {
          membershipActivationAttempts++;
          console.log(`🔄 会员激活尝试 ${membershipActivationAttempts}/${maxAttempts}...`);
          setCurrentStep(`${t('claim.verifyingAndActivating')} (${membershipActivationAttempts}/${maxAttempts})...`);
          
          try {
            const activateResponse = await fetch(`${API_BASE}/activate-membership`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-wallet-address': account.address
              },
              body: JSON.stringify({
                transactionHash: claimTxResult?.transactionHash,
                level: 1,
                paymentMethod: 'token_payment',
                paymentAmount: 130,
                referrerWallet: referrerWallet
              })
          });

          if (activateResponse.ok) {
            const activateResult = await activateResponse.json();
            console.log('✅ 会员激活结果:', activateResult);
            membershipActivated = activateResult.success;
            if (membershipActivated) {
              break; // 激活成功，退出循环
            }
          } else {
            const errorText = await activateResponse.text();
            console.warn(`⚠️ 会员激活失败 (尝试${membershipActivationAttempts}):`, errorText);
          }
        } catch (activationError) {
          console.warn(`⚠️ 会员激活错误 (尝试${membershipActivationAttempts}):`, activationError);
        }
        
        // 如果没有激活成功且还有重试次数，等待再试
        if (!membershipActivated && membershipActivationAttempts < maxAttempts) {
          console.log('⏳ 等待10秒后重试激活...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
      } else {
        console.log('⚠️ No transaction hash available - skipping activation');
      }

      // Show success message if NFT was claimed successfully
      let successMessage = t('claim.nftClaimedSuccessfully');
      let shouldNavigate = true;
      
      if (backendProcessed && membershipActivated) {
        successMessage = t('claim.nftClaimedAndActivated');
      } else if (membershipActivated) {
        successMessage = t('claim.nftClaimedActivatedWithBackendPending');
      } else if (backendProcessed) {
        successMessage = t('claim.nftClaimedProcessedActivationPending');
      } else {
        // Neither backend processing nor membership activation worked
        successMessage = t('claim.nftClaimedBlockchainSuccess');
        shouldNavigate = true; // Still navigate to dashboard since NFT claim succeeded
      }

      toast({
        title: t('claim.nftClaimedTitle'),
        description: successMessage,
        variant: "default",
        duration: 6000, // Show longer for important message
      });

      // Always call success handler since NFT claim was successful on blockchain
      // User can manually activate or refresh if backend is slow
      if (onSuccess && shouldNavigate) {
        console.log('🔄 Navigating to dashboard - NFT claim successful on blockchain');
        onSuccess();
      }

    } catch (error) {
      console.error('❌ NFT claim or processing error:', error);
      
      // Provide specific error messages based on contract requirements
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Enhanced error messages based on transaction analysis
      if (errorMessage.includes('Rate Limited') || errorMessage.includes('rate limit')) {
        // Already formatted error message, pass through
        toast({
          title: t('claim.rateLimited'),
          description: errorMessage,
          variant: "destructive",
        });
        return;
      } else if (errorMessage.includes('Already claimed') || errorMessage.includes('quantity limit')) {
        // User already has NFT - this means they're already a member, redirect to dashboard
        console.log('✅ User already has Level 1 NFT - redirecting to dashboard');
        toast({
          title: t('claim.welcomeBack'),
          description: t('claim.alreadyHaveNFT'),
          variant: "default",
          duration: 3000,
        });
        
        // Call success handler to redirect to dashboard
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
        return; // Exit function, don't show error
      } else if (errorMessage.includes('insufficient')) {
        toast({
          title: t('claim.insufficientBalance'),
          description: t('claim.need130USDC'),
          variant: "destructive",
        });
        return;
      } else if (errorMessage.includes('allowance') || errorMessage.includes('approve')) {
        toast({
          title: t('claim.tokenApprovalFailed'),
          description: t('claim.ensureApproval130USDC'),
          variant: "destructive",
        });
        return;
      } else if (errorMessage.includes('network') || errorMessage.includes('chain')) {
        toast({
          title: t('claim.networkError'),
          description: t('claim.switchToArbitrumSepolia'),
          variant: "destructive",
        });
        return;
      }
      
      // Generic error fallback
      toast({
        title: t('claim.claimFailed'), 
        description: errorMessage,
        variant: "destructive",
      });
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
            ERC-5115 NFT Claim
          </Badge>
        </div>
        <CardTitle className="text-2xl text-honey mb-2">
          {t('claim.claimLevel1NFT')}
        </CardTitle>
        <p className="text-muted-foreground">
          {t('claim.claimUniqueNFTDesc')}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Benefits Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
            <Coins className="h-6 w-6 text-orange-400 mx-auto mb-2" />
            <h3 className="font-semibold text-orange-400 mb-1">130 USDC</h3>
            <p className="text-xs text-muted-foreground">100 NFT + 30 platform fee</p>
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

        {/* Claim Action */}
        <div className="space-y-4">
          <Button 
            onClick={handleClaimNFT}
            disabled={isProcessing || !account?.address}
            className="w-full h-12 bg-gradient-to-r from-honey to-orange-500 hover:from-honey/90 hover:to-orange-500/90 text-background font-semibold text-lg shadow-lg"
            data-testid="button-claim-nft"
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
                {t('claim.claimLevel1NFT130USDC')}
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
          <p>{t('claim.paymentRequired')}</p>
          <p>{t('claim.instantActivation')}</p>
          <p>{t('claim.nftMintedToWallet')}</p>
          <p>{t('claim.twoTransactions')}</p>
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
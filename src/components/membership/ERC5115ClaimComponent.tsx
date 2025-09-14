import { useState, useEffect } from 'react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { getContract, prepareContractCall, sendTransaction, waitForReceipt, readContract } from 'thirdweb';
import { arbitrumSepolia } from 'thirdweb/chains';
import { createThirdwebClient } from 'thirdweb';
import { claimTo, balanceOf } from 'thirdweb/extensions/erc1155';
import { approve, balanceOf as erc20BalanceOf, allowance } from 'thirdweb/extensions/erc20';
import { importWithRetry, importThirdwebTransaction } from '../../utils/moduleLoader';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Zap, Crown, Gift, Coins, Clock } from 'lucide-react';
import { authService, supabase } from '../../lib/supabase';
import { useI18n } from '../../contexts/I18nContext';
import RegistrationModal from '../modals/RegistrationModal';
import { useNFTLevelClaim } from '../../hooks/useNFTLevelClaim';

interface ERC5115ClaimComponentProps {
  onSuccess?: () => void;
  referrerWallet?: string;
  className?: string;
  targetLevel?: number; // Optional target level, if not provided will auto-detect next level
}

export function ERC5115ClaimComponent({ onSuccess, referrerWallet, className = '', targetLevel }: ERC5115ClaimComponentProps): JSX.Element {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [fallbackChainId, setFallbackChainId] = useState<number | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  
  // Use the custom hook for level management
  const { levelInfo, isLoading: isLevelLoading, refetch: refetchLevel, getLevelName, formatPrice } = useNFTLevelClaim(targetLevel);
  
  // Enhanced transaction wrapper with retry logic and better error handling
  const sendTransactionWithRetry = async (transaction: unknown, account: unknown, description: string = 'transaction') => {
    let lastError: any = null;
    const maxRetries = 3;
    const baseDelay = 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 Sending ${description} (attempt ${attempt}/${maxRetries})...`);
        
        // Add a small delay between attempts
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
        
        // Check for specific error types that we should not retry
        if (error.message?.includes('User rejected') || 
            error.message?.includes('user denied') ||
            error.message?.includes('User cancelled')) {
          throw new Error('Transaction cancelled by user');
        }
        
        // If this is the last attempt, don't continue
        if (attempt === maxRetries) {
          break;
        }
        
        console.log(`🔄 Retrying ${description} in ${baseDelay * attempt}ms...`);
      }
    }
    
    // All attempts failed, throw the last error
    throw new Error(`${description} failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  };

  const API_BASE = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';
  const PAYMENT_TOKEN_CONTRACT = "0x4470734620414168Aa1673A30849DB25E5886E2A";
  const NFT_CONTRACT = "0x2Cb47141485754371c24Efcc65d46Ccf004f769a";
  const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

  console.log('🔧 Contract Configuration:', {
    paymentToken: PAYMENT_TOKEN_CONTRACT,
    nftContract: NFT_CONTRACT,
    network: arbitrumSepolia.id,
    thirdwebClientId: THIRDWEB_CLIENT_ID ? 'Set' : 'Missing',
    levelInfo: levelInfo
  });

  // Initialize Thirdweb v5 client with optimized config
  const client = createThirdwebClient({
    clientId: THIRDWEB_CLIENT_ID,
    // v5 doesn't need the config object in the same way
    // Most configuration is now handled per-contract or per-transaction
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
    console.log('✅ Registration completed - closing modal and refreshing level info');
    setShowRegistrationModal(false);
    // Refresh level information after registration
    refetchLevel();
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
      
      // Use direct database query instead of Edge Function
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', account.address)
        .single();
      
      const userResult = {
        success: !userError,
        user: userData,
        action: userData ? 'found' : 'not_found'
      };
      
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
      
      // Check if referrer exists in members table (activated member)
      const { data: referrerData, error: referrerError } = await supabase
        .from('members')
        .select('wallet_address, current_level')
        .eq('wallet_address', referrerWallet)
        .single();
      
      const referrerResult = {
        success: !referrerError && referrerData,
        isValid: !referrerError && referrerData && referrerData.current_level > 0,
        referrer: referrerData,
        error: referrerError?.message
      };
      
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
      console.log(`🔍 Network verification details:`, {
        finalChainId: finalChainId,
        requiredChainId: arbitrumSepolia.id,
        arbitrumSepoliaInfo: {
          id: arbitrumSepolia.id,
          name: arbitrumSepolia.name,
          rpc: arbitrumSepolia.rpc
        },
        isCorrectNetwork: finalChainId === arbitrumSepolia.id
      });
      
      if (finalChainId !== arbitrumSepolia.id) {
        throw new Error(`Please switch to Arbitrum Sepolia network to claim NFT. Current network: ${finalChainId}, Required: ${arbitrumSepolia.id} (Arbitrum Sepolia). Expected network name: ${arbitrumSepolia.name}`);
      }
      console.log('✅ Network check passed - on Arbitrum Sepolia');

      // Step 0.05: Check ETH balance for gas fees on Arbitrum Sepolia
      console.log('⛽ Checking ETH balance for gas fees...');
      try {
        const ethBalance = await (window as any).ethereum.request({
          method: 'eth_getBalance',
          params: [account.address, 'latest']
        });
        const balanceInETH = parseInt(ethBalance, 16) / 1e18;
        console.log(`💰 ETH Balance: ${balanceInETH} ETH`);
        
        if (balanceInETH < 0.001) { // Less than 0.001 ETH
          throw new Error(`Insufficient ETH for gas fees. You need ETH on Arbitrum Sepolia to pay for transaction fees. Current balance: ${balanceInETH.toFixed(6)} ETH. Please add some ETH to your wallet first.\n\nGet test ETH from: https://sepolia-faucet.arbitrum.io/`);
        }
        console.log('✅ ETH balance sufficient for gas fees');
      } catch (balanceError) {
        if (balanceError.message.includes('Insufficient ETH')) {
          throw balanceError; // Re-throw our custom insufficient balance error
        }
        console.warn('⚠️ Could not check ETH balance:', balanceError);
        // Continue anyway since balance check is not critical
      }

      // Step 0.1: Validate contracts are accessible
      console.log('🔍 Validating contract accessibility...');
      try {
        const tokenContract = getContract({
          client,
          address: PAYMENT_TOKEN_CONTRACT,
          chain: arbitrumSepolia
        });
        
        const nftContractTest = getContract({
          client,
          address: NFT_CONTRACT,
          chain: arbitrumSepolia
        });
        
        console.log('✅ Contracts initialized successfully');
        console.log('📋 Token contract:', PAYMENT_TOKEN_CONTRACT);
        console.log('🎭 NFT contract:', NFT_CONTRACT);
        
        // Try to call a simple read function to test contract accessibility
        try {
          // Most thirdweb contracts have a 'totalSupply' function
          const testCall = prepareContractCall({
            contract: nftContractTest,
            method: "function totalSupply() view returns (uint256)"
          });
          console.log('📊 Contract read test prepared successfully');
        } catch (readTestError) {
          console.warn('⚠️ Contract read test failed (might be normal):', readTestError);
        }
      } catch (contractError) {
        console.error('❌ Contract initialization failed:', contractError);
        throw new Error(`Contract initialization failed: ${contractError}`);
      }

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
      
      // Use dynamic pricing from levelInfo
      const finalAmount = levelInfo.priceInWei;
      console.log(`💳 Using dynamic pricing for ${getLevelName(levelInfo.tokenId)}: ${formatPrice(levelInfo.priceInUSDC)} USDC (${finalAmount.toString()} wei)`);
      
      const usdcContract = getContract({
        client,
        address: PAYMENT_TOKEN_CONTRACT,
        chain: arbitrumSepolia
      });

      console.log(`💳 Checking token balance for payment: ${finalAmount.toString()} units (${formatPrice(levelInfo.priceInUSDC)} USDC with 18 decimals)`);
      
      // Check token balance using Thirdweb v5 ERC20 extension
      console.log('💰 Checking USDC balance with Thirdweb v5...');
      try {
        const tokenBalance = await erc20BalanceOf({
          contract: usdcContract,
          address: account.address
        });
        
        console.log(`📊 USDC Balance: ${tokenBalance.toString()}, Required: ${finalAmount.toString()}`);
        
        if (tokenBalance < finalAmount) {
          throw new Error(`Insufficient USDC balance. You have ${(Number(tokenBalance) / 1e18).toFixed(2)} USDC but need ${formatPrice(levelInfo.priceInUSDC)} USDC for ${getLevelName(levelInfo.tokenId)}`);
        }
        
        console.log('✅ Sufficient USDC balance confirmed');
      } catch (balanceError: any) {
        if (balanceError.message.includes('Insufficient USDC')) {
          throw balanceError; // Re-throw our custom insufficient balance error
        }
        console.warn('⚠️ Could not check USDC balance via Thirdweb, proceeding with transaction:', balanceError);
      }

      // Check current allowance first using Thirdweb v5
      setCurrentStep(t('claim.checkingApproval'));
      
      console.log('💰 Checking USDC allowance with Thirdweb v5...');
      try {
        const currentAllowance = await allowance({
          contract: usdcContract,
          owner: account.address,
          spender: NFT_CONTRACT
        });
        
        console.log(`📊 Current allowance: ${currentAllowance.toString()}, Required: ${finalAmount.toString()}`);
        
        if (currentAllowance >= finalAmount) {
          console.log('✅ Sufficient allowance already exists, skipping approval');
        } else {
          console.log('💰 Insufficient allowance, requesting approval...');
        }
      } catch (allowanceError) {
        console.warn('⚠️ Could not check allowance, proceeding with approval:', allowanceError);
      }
      
      // Use Thirdweb v5 ERC20 approve extension for better compatibility
      console.log(`💰 Requesting token approval for ${formatPrice(levelInfo.priceInUSDC)} USDC (${finalAmount.toString()} units with 18 decimals) for ${getLevelName(levelInfo.tokenId)}...`);
      
      const approveTransaction = approve({
        contract: usdcContract,
        spender: NFT_CONTRACT,
        amount: finalAmount
      });

      console.log('📝 Sending approval transaction...');
      setCurrentStep(t('claim.waitingApproval'));
      
      // Send approval transaction with retry logic and better error handling
      let approvalAttempts = 0;
      const maxApprovalAttempts = 3;
      let approveTxResult: any = null;
      
      while (approvalAttempts < maxApprovalAttempts) {
        try {
          console.log(`📝 Approval attempt ${approvalAttempts + 1}/${maxApprovalAttempts}`);
          
          approveTxResult = await sendTransactionWithRetry(
            approveTransaction, 
            account, 
            'USDC approval transaction'
          );
          console.log('✅ Approval transaction sent:', approveTxResult.transactionHash);
          break; // Success, exit retry loop
        } catch (approvalError: any) {
          approvalAttempts++;
          console.error(`❌ Approval attempt ${approvalAttempts}/${maxApprovalAttempts} failed:`, {
            error: approvalError,
            message: approvalError.message,
            name: approvalError.name,
            code: approvalError.code
          });
          
          // Check for insufficient gas funds first
          if (approvalError.code === -32000 && (approvalError.message?.includes('insufficient funds for gas') || approvalError.message?.includes('have 0 want'))) {
            console.error('💸 Insufficient gas funds detected during approval');
            throw new Error('Insufficient ETH for gas fees. You need ETH on Arbitrum Sepolia network to pay for transaction fees. Please add some ETH to your wallet first.');
          }
          
          // Enhanced error detection for thirdweb issues
          if (approvalError.message?.includes('Failed to fetch dynamically imported module') || 
              approvalError.message?.includes('eth_getTransactionCount') ||
              approvalError.message?.includes('Network configuration error')) {
            console.error('🚨 Thirdweb dynamic import or network error detected');
            throw new Error('Network module loading error. Please refresh the page and ensure you have a stable internet connection.');
          }
          
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
      
      // Prepare allowlist proof (empty for public claims) - using thirdweb format
      const allowlistProof = {
        proof: [], // Empty array for public claims
        quantityLimitPerWallet: BigInt(0), // 0 for no limit in public claims
        pricePerToken: finalAmount, // 130 USDC in wei  
        currency: PAYMENT_TOKEN_CONTRACT // Payment token address
      };
      
      console.log('🎫 Allowlist proof structure:', allowlistProof);
      
      const nftContract = getContract({
        client,
        address: NFT_CONTRACT,
        chain: arbitrumSepolia
      });
      
      console.log('🎯 Preparing claim transaction with params:', {
        receiver: account.address,
        tokenId: levelInfo.tokenId,
        quantity: 1,
        currency: PAYMENT_TOKEN_CONTRACT,
        pricePerToken: finalAmount.toString(),
        level: getLevelName(levelInfo.tokenId),
        priceUSDC: formatPrice(levelInfo.priceInUSDC),
        allowlistProof: allowlistProof,
        data: "0x"
      });

      // Use Thirdweb v5 ERC1155 balanceOf extension for better compatibility
      console.log('🔍 Checking if user already owns this NFT with Thirdweb v5...');
      try {
        const existingBalance = await balanceOf({
          contract: nftContract,
          owner: account.address,
          tokenId: BigInt(levelInfo.tokenId)
        });
        
        const currentBalance = Number(existingBalance);
        console.log(`📊 Current NFT balance for Level ${levelInfo.tokenId}: ${currentBalance}`);
        
        if (currentBalance > 0) {
          console.log('✅ User already owns this NFT - redirecting to dashboard');
          toast({
            title: t('claim.welcomeBack'),
            description: `You already own Level ${levelInfo.tokenId} NFT. Redirecting to dashboard.`,
            variant: "default",
            duration: 3000,
          });
          
          if (onSuccess) {
            setTimeout(() => {
              onSuccess();
            }, 1500);
          }
          return;
        }
        
        console.log('✅ NFT ownership check passed - user does not own this level yet');
      } catch (balanceCheckError) {
        console.warn('⚠️ Could not check NFT balance via Thirdweb v5, proceeding with claim:', balanceCheckError);
      }

      // Use Thirdweb v5 optimized approach
      let claimTransaction;
      
      console.log('🔍 Preparing Thirdweb v5 optimized claim transaction...');
      
      try {
        // Method 1: Try using Thirdweb's built-in ERC1155 claimTo extension with v5 optimizations
        console.log('📝 Attempting Thirdweb v5 ERC1155 claimTo extension with enhanced parameters...');
        
        // Enhanced claimTo call with additional v5 parameters
        claimTransaction = claimTo({
          contract: nftContract,
          to: account.address,
          tokenId: BigInt(levelInfo.tokenId),
          quantity: BigInt(1),
          // v5 supports additional parameters for claim conditions
          currency: PAYMENT_TOKEN_CONTRACT,
          pricePerToken: finalAmount,
          data: "0x" // Additional data parameter for v5
        });
        console.log('✅ Using enhanced Thirdweb v5 ERC1155 claimTo extension');
      } catch (extensionError) {
        console.warn('⚠️ ERC1155 extension failed, trying manual contract call:', extensionError);
        
        try {
          // Method 2: Enhanced manual contract call with v5 optimizations
          console.log('📝 Attempting enhanced manual contract call with v5 syntax...');
          claimTransaction = prepareContractCall({
            contract: nftContract,
            method: "function claim(address _receiver, uint256 _quantity, address _currency, uint256 _pricePerToken, (bytes32[] proof, uint256 quantityLimitPerWallet, uint256 pricePerToken, address currency) _allowlistProof, bytes _data) payable",
            params: [
              account.address, // _receiver
              BigInt(1), // _quantity
              PAYMENT_TOKEN_CONTRACT, // _currency
              finalAmount, // _pricePerToken
              {
                proof: [],
                quantityLimitPerWallet: BigInt(0),
                pricePerToken: finalAmount,
                currency: PAYMENT_TOKEN_CONTRACT
              }, // _allowlistProof struct
              "0x" // _data
            ],
            // v5 gas optimizations
            gas: BigInt(500000), // Reasonable gas limit
            gasPrice: undefined, // Let wallet handle gas pricing
          });
          console.log('✅ Using enhanced manual contract call with v5 optimizations');
        } catch (method1Error) {
          console.warn('⚠️ Method 1 failed, trying with tokenId parameter:', method1Error);
          
          try {
            // Method 3: With tokenId parameter
            claimTransaction = prepareContractCall({
              contract: nftContract,
              method: "function claim(address _receiver, uint256 _tokenId, uint256 _quantity, address _currency, uint256 _pricePerToken, (bytes32[] proof, uint256 quantityLimitPerWallet, uint256 pricePerToken, address currency) _allowlistProof, bytes _data) payable",
              params: [
                account.address, // _receiver
                BigInt(levelInfo.tokenId), // _tokenId
                BigInt(1), // _quantity
                PAYMENT_TOKEN_CONTRACT, // _currency
                finalAmount, // _pricePerToken
                {
                  proof: [],
                  quantityLimitPerWallet: BigInt(0),
                  pricePerToken: finalAmount,
                  currency: PAYMENT_TOKEN_CONTRACT
                }, // _allowlistProof struct with all required fields
                "0x" // _data
              ],
              // v5 enhanced transaction parameters
              gas: BigInt(600000), // Higher gas limit for complex claim
              value: BigInt(0), // No ETH value for ERC20 payments
            });
            console.log('✅ Using manual contract call with tokenId (method 2)');
          } catch (method2Error) {
            console.error('❌ All claim methods failed:', method2Error);
            throw new Error(`All Thirdweb v5 claim methods failed. Last error: ${method2Error.message}`);
          }
        }
      }

      let claimAttempts = 0;
      const maxClaimAttempts = 3;
      
      while (claimAttempts < maxClaimAttempts) {
        try {
          // Try Thirdweb transaction first
          try {
            claimTxResult = await sendTransactionWithRetry(
              claimTransaction,
              account,
              `NFT claim transaction for ${getLevelName(levelInfo.tokenId)}`
            );
            console.log('🎉 NFT claim transaction via Thirdweb:', claimTxResult.transactionHash);
            break; // Success, exit retry loop
          } catch (thirdwebError: any) {
            console.error(`❌ Thirdweb claim failed:`, thirdwebError.message);
            
            // If it's a module import error, try direct wallet interaction
            if (thirdwebError.message?.includes('Module import failed') || 
                thirdwebError.message?.includes('Failed to fetch dynamically imported module')) {
              
              console.log('🔄 Attempting direct wallet interaction as fallback...');
              
              // If Thirdweb modules fail to load, we can't proceed with the transaction
              console.error('❌ Thirdweb module loading failed, cannot proceed without proper contract interaction');
              throw new Error('Module loading error. Please refresh the page and try again. If the issue persists, check your internet connection.');
            } else {
              throw thirdwebError; // Re-throw for non-module-import errors
            }
          }
        } catch (claimError: any) {
          claimAttempts++;
          console.error(`❌ Claim attempt ${claimAttempts}/${maxClaimAttempts} failed:`, {
            error: claimError,
            message: claimError.message,
            code: claimError.code,
            data: claimError.data,
            reason: claimError.reason
          });
          
          // Check for insufficient gas funds first
          if (claimError.code === -32000 && (claimError.message?.includes('insufficient funds for gas') || claimError.message?.includes('have 0 want'))) {
            console.error('💸 Insufficient gas funds detected during NFT claim');
            throw new Error('Insufficient ETH for gas fees. You need ETH on Arbitrum Sepolia network to pay for transaction fees. Please add some ETH to your wallet first.');
          }
          
          // Enhanced error detection for thirdweb issues  
          if (claimError.message?.includes('Failed to fetch dynamically imported module') || 
              claimError.message?.includes('eth_getTransactionCount') ||
              claimError.message?.includes('Network configuration error') ||
              claimError.message?.includes('Network module loading error')) {
            console.error('🚨 Thirdweb dynamic import or network error detected during claim');
            throw new Error('Network module loading error during NFT claim. Please refresh the page and try again with a stable internet connection.');
          }
          
          if (claimError.code === -32005 || claimError.message?.includes('rate limit')) {
            if (claimAttempts < maxClaimAttempts) {
              console.log(`Rate limited, waiting ${claimAttempts * 3} seconds before retry...`);
              await new Promise(resolve => setTimeout(resolve, claimAttempts * 3000));
              continue;
            }
          }
          
          // Log detailed error information for debugging
          console.error('🚨 Detailed claim error analysis:', {
            errorType: typeof claimError,
            errorString: String(claimError),
            errorStack: claimError.stack,
            contractAddress: NFT_CONTRACT,
            paymentToken: PAYMENT_TOKEN_CONTRACT,
            amount: finalAmount.toString(),
            networkId: effectiveChainId,
            level: levelInfo.tokenId,
            levelName: getLevelName(levelInfo.tokenId)
          });
          
          // Re-throw for other error handling
          throw claimError;
        }
      }

      // Wait for NFT claim transaction to be confirmed with enhanced v5 tracking
      setCurrentStep(t('claim.waitingNFTConfirmation'));
      console.log('⏳ Waiting for NFT claim transaction confirmation with enhanced v5 tracking...');
      
      const claimReceipt = await waitForReceipt({
        client,
        chain: arbitrumSepolia,
        transactionHash: claimTxResult?.transactionHash,
        // v5 enhanced confirmation options
        maxBlocksWaitTime: 50, // Maximum blocks to wait
        pollingInterval: 2000, // Poll every 2 seconds
      });
      
      console.log('✅ NFT claim confirmed with enhanced status:', {
        status: claimReceipt.status,
        blockNumber: claimReceipt.blockNumber,
        gasUsed: claimReceipt.gasUsed?.toString(),
        transactionHash: claimReceipt.transactionHash,
        effectiveGasPrice: claimReceipt.effectiveGasPrice?.toString()
      });

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
            level: levelInfo.tokenId,
            transactionHash: claimTxResult?.transactionHash || '',
            paymentMethod: 'token_payment',
            payment_amount_usdc: levelInfo.priceInUSDC
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
                level: levelInfo.tokenId,
                paymentMethod: 'token_payment',
                paymentAmount: levelInfo.priceInUSDC,
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
        if (levelInfo.tokenId === 1) {
          console.log('🎯 Level 1 NFT claim successful - activating membership and redirecting to dashboard');
        } else {
          console.log('🔄 Level', levelInfo.tokenId, 'NFT claim successful - navigating to dashboard');
        }
        onSuccess();
      }

    } catch (error) {
      console.error('❌ NFT claim or processing error:', error);
      
      // Provide specific error messages based on contract requirements
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;
      
      // Enhanced error messages based on transaction analysis
      if (errorCode === -32000 && (errorMessage.includes('insufficient funds for gas') || errorMessage.includes('have 0 want'))) {
        // Insufficient gas funds for transaction
        console.log('💸 Insufficient gas funds detected');
        toast({
          title: t('claim.insufficientGasFunds'),
          description: t('claim.needETHForGas'),
          variant: "destructive",
          duration: 8000,
        });
        return;
      } else if (errorMessage.includes('Module import failed') || errorMessage.includes('Failed to fetch dynamically imported module')) {
        // Thirdweb module loading issue - suggest page refresh
        toast({
          title: 'Network Module Error',
          description: 'Please refresh the page and try again. If the problem persists, check your internet connection.',
          variant: "destructive",
        });
        return;
      } else if (errorMessage.includes('Rate Limited') || errorMessage.includes('rate limit')) {
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
      } else if (errorMessage.includes('Insufficient ETH for gas fees') || errorMessage.includes('insufficient funds for gas')) {
        toast({
          title: t('claim.insufficientGasFunds'),
          description: t('claim.needETHForGas'),
          variant: "destructive",
          duration: 8000,
        });
        return;
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
          {isLevelLoading ? t('loading') || 'Loading...' : `Claim ${getLevelName(levelInfo.tokenId)} NFT`}
        </CardTitle>
        <p className="text-muted-foreground">
          {isLevelLoading ? 'Loading membership info...' : 
           levelInfo.currentLevel > 0 ? 
           `Current Level: ${levelInfo.currentLevel} | Next: ${getLevelName(levelInfo.tokenId)}` :
           'Claim your first membership NFT to join the BEEHIVE community'
          }
        </p>
        
        {/* Level progress indicator */}
        {!isLevelLoading && levelInfo.currentLevel > 0 && (
          <div className="mt-2 px-3 py-1 bg-honey/10 rounded-full text-xs text-honey border border-honey/20">
            Upgrading from Level {levelInfo.currentLevel} to {getLevelName(levelInfo.tokenId)}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Benefits Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
            <Coins className="h-6 w-6 text-orange-400 mx-auto mb-2" />
            <h3 className="font-semibold text-orange-400 mb-1">
              {isLevelLoading ? '...' : `${formatPrice(levelInfo.priceInUSDC)} USDC`}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isLevelLoading ? 'Loading...' : `${getLevelName(levelInfo.tokenId)} Price`}
            </p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
            <Crown className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-400 mb-1">
              {isLevelLoading ? '...' : getLevelName(levelInfo.tokenId)}
            </h3>
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
            disabled={isProcessing || !account?.address || isLevelLoading || !levelInfo.canClaim}
            className="w-full h-12 bg-gradient-to-r from-honey to-orange-500 hover:from-honey/90 hover:to-orange-500/90 text-background font-semibold text-lg shadow-lg disabled:opacity-50"
            data-testid="button-claim-nft"
          >
            {!account?.address ? (
              <>
                <Crown className="mr-2 h-5 w-5" />
                {t('claim.connectWalletToClaimNFT')}
              </>
            ) : isLevelLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading level info...
              </>
            ) : !levelInfo.canClaim ? (
              <>
                <Crown className="mr-2 h-5 w-5" />
                {levelInfo.isMaxLevel ? 'Max Level Reached' : 'Cannot Claim This Level'}
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {currentStep || t('claim.processing')}
              </>
            ) : (
              <>
                <Crown className="mr-2 h-5 w-5" />
                {`Claim ${getLevelName(levelInfo.tokenId)} - ${formatPrice(levelInfo.priceInUSDC)} USDC`}
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
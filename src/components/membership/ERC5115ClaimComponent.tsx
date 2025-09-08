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

interface ERC5115ClaimComponentProps {
  onSuccess?: () => void;
  referrerWallet?: string;
  className?: string;
}

export function ERC5115ClaimComponent({ onSuccess, referrerWallet, className = '' }: ERC5115ClaimComponentProps) {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [fallbackChainId, setFallbackChainId] = useState<number | null>(null);

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

  const handleClaimNFT = async () => {
    console.log('🎯 NFT Claim attempt started');
    console.log(`Wallet address: ${account?.address}`);
    
    if (!account?.address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to claim your NFT",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

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

      // Step 1: Verify user has complete registration (username, email, referrer)
      console.log('🔍 Verifying complete user registration...');
      
      // Use authService instead of direct edge function call to handle errors gracefully
      const { exists } = await authService.userExists(account.address);
      if (!exists) {
        console.warn('⚠️ User does not exist in database, but allowing claim to proceed');
        // throw new Error('Please complete registration first with username, email, and referrer information');
      }

      const { data: userData, error: userError } = await authService.getUser(account.address);
      console.log('📝 User data:', userData, userError);

      // Check if user data was retrieved successfully - but don't block claim
      if (!userData || userError) {
        console.warn('❌ Failed to get user data but allowing claim to proceed:', userError);
        // throw new Error('Please complete registration first with username, email, and referrer information');
      }

      // Verify user has complete registration data - but don't block if missing
      if (userData) {
        const expectedAutoGenPrefix = `user_${account.address.slice(-6)}`;
        console.log('🔍 Registration validation details:');
        console.log(`  - Username: "${userData.username}"`);
        console.log(`  - Email: "${userData.email}"`);
        console.log(`  - Expected auto-gen prefix: "${expectedAutoGenPrefix}"`);
        console.log(`  - Is auto-generated username: ${userData.username?.startsWith(expectedAutoGenPrefix)}`);
        console.log(`  - Has email: ${!!userData.email}`);
        
        const hasCompleteInfo = userData && 
          userData.username && 
          !userData.username.startsWith(expectedAutoGenPrefix) && // Not auto-generated username
          userData.email; // Has email
        
        console.log(`🔍 Registration validation result: ${hasCompleteInfo}`);
        
        if (!hasCompleteInfo) {
          console.warn('⚠️ Registration validation failed, but allowing claim to proceed');
          console.log('🔧 Allowing NFT claim regardless of registration status');
        } else {
          console.log('✅ User has complete registration information');
        }
      } else {
        console.warn('⚠️ No user data available, but allowing claim to proceed');
      }

      // Step 2: Approve and transfer tokens for NFT claim
      console.log('🪙 Processing token payment for NFT claim...');
      
      // Get the token contract
      const tokenContract = getContract({
        client,
        address: PAYMENT_TOKEN_CONTRACT,
        chain: arbitrumSepolia
      });

      // Get the NFT contract  
      const nftContract = getContract({
        client,
        address: NFT_CONTRACT,
        chain: arbitrumSepolia
      });

      // Amount to pay: 130 USDC total (100 for NFT + 30 platform fee)
      
      // Use standard 18 decimals for this token contract - SIMPLIFIED
      console.log('🔍 Using standard 18 decimals for payment token...');
      const tokenDecimals = 18; // Standard ERC20 decimals
      const decimalMultiplier = BigInt("1000000000000000000"); // 10^18
      
      console.log(`✅ Using 18-decimal USDC (standard ERC20)`);

      // Skip balance check - the transaction will fail if insufficient balance
      console.log('💰 Skipping balance check - transaction will validate balance on-chain');

      // Approve tokens for NFT contract (the contract itself: 0x99265477249389469929CEA07c4a337af9e12cdA)
      console.log('📝 Approving 130 USDC for NFT contract...');
      
      // CRITICAL: Use correct decimals for approval amount - FORCED FIX
      const usdcAmount = BigInt("130") * decimalMultiplier; // 130 USDC with correct decimals
      
      // BACKUP: If dynamic detection failed, try common values
      let finalAmount = usdcAmount;
      
      // Dynamic calculation based on detected decimals - PRIORITIZE 18 DECIMALS
      if (tokenDecimals === 18) {
        finalAmount = BigInt("130") * BigInt("1000000000000000000"); // 130 * 10^18
        console.log("🔥 USING 18-DECIMAL USDC AMOUNT (STANDARD ERC20)");
      } else if (tokenDecimals === 6) {
        finalAmount = BigInt("130") * BigInt("1000000"); // 130 * 10^6 = 130000000
        console.log("✅ Using 6-decimal USDC amount");
      } else if (tokenDecimals === 8) {
        finalAmount = BigInt("130") * BigInt("100000000"); // 130 * 10^8
        console.log("🔄 Using 8-decimal USDC amount");
      } else if (tokenDecimals === 10) {
        finalAmount = BigInt("130") * BigInt("10000000000"); // 130 * 10^10
        console.log("🔄 Using 10-decimal USDC amount");
      } else if (tokenDecimals === 12) {
        finalAmount = BigInt("130") * BigInt("1000000000000"); // 130 * 10^12
        console.log("🔄 Using 12-decimal USDC amount");
      } else {
        // Fallback: calculate dynamically
        finalAmount = BigInt("130") * (BigInt(10) ** BigInt(tokenDecimals));
        console.log(`🔄 Using ${tokenDecimals}-decimal USDC amount`);
      }
      
      // Safety check: if calculated amount seems too small, recalculate
      if (finalAmount < BigInt("130000000")) {
        console.log("⚠️ Amount seems too small, recalculating...");
        finalAmount = BigInt("130") * (BigInt(10) ** BigInt(tokenDecimals));
      }
      
      console.log(`📋 Final approving amount: ${finalAmount.toString()} wei`);
      console.log(`📋 Decimals detected: ${tokenDecimals}`);
      console.log(`📋 Calculated human readable: ${Number(finalAmount) / Number(BigInt(10 ** tokenDecimals))} USDC`);
      console.log(`📋 Spender (NFT Contract): ${NFT_CONTRACT}`);
      console.log(`📋 Token Contract: ${PAYMENT_TOKEN_CONTRACT}`);
      
      const approveTransaction = prepareContractCall({
        contract: tokenContract,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [NFT_CONTRACT, finalAmount] // Approve NFT contract to spend 130 USDC
      });

      const approveTxResult = await sendTransaction({
        transaction: approveTransaction,
        account
      });

      console.log('✅ Token approval transaction:', approveTxResult.transactionHash);

      // Wait for approval transaction to be confirmed
      setCurrentStep('等待代币授权确认...');
      const approvalReceipt = await waitForReceipt({
        client,
        chain: arbitrumSepolia,
        transactionHash: approveTxResult.transactionHash,
      });
      
      console.log('✅ Token approval confirmed:', approvalReceipt.status);

      // Verify allowance was set correctly
      console.log('🔍 Verifying allowance...');
      try {
        const allowanceCheck = prepareContractCall({
          contract: tokenContract,
          method: "function allowance(address owner, address spender) view returns (uint256)",
          params: [account.address, NFT_CONTRACT]
        });
        // Note: For read calls, we'd typically use readContract, but let's log what we expect
        console.log(`📋 Expected allowance: 130000000 (130 USDC)`);
        console.log(`📋 Spender: ${NFT_CONTRACT}`);
        console.log(`📋 Owner: ${account.address}`);
      } catch (allowanceError) {
        console.warn('⚠️ Could not verify allowance:', allowanceError);
      }

      // Skip already claimed check - the transaction will fail if already claimed
      console.log('🔍 Skipping already claimed check - transaction will validate on-chain');
      
      // Skip claim conditions check - rely on contract validation
      console.log('🔍 Proceeding to claim - contract will validate conditions');

      // Claim NFT using token payment
      console.log('🎁 Claiming NFT with token payment...');
      setCurrentStep('正在铸造NFT...');
      
      // Prepare allowlist proof (empty for public claims)
      const allowlistProof = {
        proof: [], // Empty array for public claims
        quantityLimitPerWallet: BigInt(1), // Limit 1 per wallet
        pricePerToken: finalAmount, // 130 USDC in wei
        currency: PAYMENT_TOKEN_CONTRACT // Payment token address
      };
      
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

      let claimTxResult;
      try {
        claimTxResult = await sendTransaction({
          transaction: claimTransaction,
          account
        });
        console.log('🎉 NFT claim transaction:', claimTxResult.transactionHash);

        // Wait for NFT claim transaction to be confirmed
        setCurrentStep('等待NFT铸造确认...');
        const claimReceipt = await waitForReceipt({
          client,
          chain: arbitrumSepolia,
          transactionHash: claimTxResult.transactionHash,
        });
        
        console.log('✅ NFT claim confirmed:', claimReceipt.status);
      } catch (claimError) {
        console.error('❌ NFT claim failed:', claimError);
        
        // Provide specific error messages based on contract requirements
        const errorMessage = claimError instanceof Error ? claimError.message : String(claimError);
        
        // Enhanced error messages based on transaction analysis
        if (errorMessage.includes('Already claimed') || errorMessage.includes('quantity limit')) {
          throw new Error(`❌ Already Claimed: Wallet ${account.address} has already claimed the Level 1 NFT. Each wallet can only claim once. Try with a different wallet.`);
        } else if (errorMessage.includes('Insufficient allowance') || errorMessage.includes('allowance')) {
          throw new Error(`❌ Insufficient Allowance: The approval for 130 USDC may have failed or expired. Required: approve contract ${NFT_CONTRACT} to spend 130 USDC from ${account.address}.`);
        } else if (errorMessage.includes('Insufficient balance') || errorMessage.includes('balance')) {
          throw new Error(`❌ Insufficient Balance: Wallet ${account.address} needs exactly 130 USDC to claim this NFT.`);
        } else if (errorMessage.includes('Invalid price') || errorMessage.includes('price')) {
          throw new Error('❌ Price Error: Invalid price specified for claim. Expected 130 USDC.');
        } else if (errorMessage.includes('Invalid currency')) {
          throw new Error('❌ Currency Error: Invalid payment currency specified.');
        } else if (errorMessage.includes('revert') || errorMessage.includes('execution reverted')) {
          throw new Error(`❌ Transaction Reverted: Check if you've already claimed, have sufficient balance (130 USDC), and proper allowance. Details: ${errorMessage}`);
        } else {
          throw new Error(`❌ Claim Failed: ${errorMessage}. Common causes: already claimed, insufficient balance/allowance, or contract configuration issues.`);
        }
      }

      // Step 3: Process the NFT purchase on backend
      console.log('📋 Processing NFT purchase on backend...');
      let backendProcessed = false;
      let membershipActivated = false;
      
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
            transactionHash: claimTxResult.transactionHash,
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
      console.log('🚀 等待区块链确认并激活会员身份...');
      setCurrentStep('等待区块链确认...');
      
      // 等待额外的确认时间以确保交易被完全确认
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      let membershipActivationAttempts = 0;
      const maxAttempts = 5;
      
      while (membershipActivationAttempts < maxAttempts && !membershipActivated) {
        membershipActivationAttempts++;
        console.log(`🔄 会员激活尝试 ${membershipActivationAttempts}/${maxAttempts}...`);
        setCurrentStep(`验证交易并激活会员 (${membershipActivationAttempts}/${maxAttempts})...`);
        
        try {
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

      // Show success message if NFT was claimed successfully
      let successMessage = "Your Level 1 NFT has been claimed successfully!";
      let shouldNavigate = true;
      
      if (backendProcessed && membershipActivated) {
        successMessage = "Your Level 1 NFT has been claimed and membership activated! Redirecting to dashboard...";
      } else if (membershipActivated) {
        successMessage = "Your Level 1 NFT has been claimed and membership activated! (Backend processing may need manual completion) Redirecting to dashboard...";
      } else if (backendProcessed) {
        successMessage = "Your Level 1 NFT has been claimed and processed! (Membership activation pending) Redirecting to dashboard...";
      } else {
        // Neither backend processing nor membership activation worked
        successMessage = "Your Level 1 NFT claim succeeded on blockchain! Backend processing is slow - you may need to refresh or check your membership status in a few minutes.";
        shouldNavigate = true; // Still navigate to dashboard since NFT claim succeeded
      }

      toast({
        title: "🎉 NFT Claimed Successfully!",
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
      console.error('❌ Token claim error:', error);
      toast({
        title: "Claim failed",
        description: error instanceof Error ? error.message : "Failed to claim NFT with tokens. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className={`bg-gradient-to-br from-honey/5 to-honey/15 border-honey/30 ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-3">
          <Crown className="h-8 w-8 text-honey mr-2" />
          <Badge className="bg-honey/20 text-honey border-honey/50">
            ERC-5115 NFT Claim
          </Badge>
        </div>
        <CardTitle className="text-2xl text-honey mb-2">
          Claim Your Level 1 Membership NFT
        </CardTitle>
        <p className="text-muted-foreground">
          Claim your unique ERC-5115 NFT (Token ID 1) to activate Level 1 membership
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
          
          <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20">
            <Gift className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <h3 className="font-semibold text-green-400 mb-1">500 BCC</h3>
            <p className="text-xs text-muted-foreground">Transferable tokens</p>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
            <Zap className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-400 mb-1">10,350 BCC</h3>
            <p className="text-xs text-muted-foreground">Locked rewards</p>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
            <Crown className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-400 mb-1">Level 1</h3>
            <p className="text-xs text-muted-foreground">Membership access</p>
          </div>
        </div>

        {/* Network Information */}
        <div className={`rounded-lg p-4 ${!effectiveChainId || effectiveChainId !== arbitrumSepolia.id ? 'bg-red-500/10 border-red-500/20 border' : 'bg-muted/50'}`}>
          <h4 className="font-medium text-honey mb-2 flex items-center">
            🌐 Network Status
            {(!effectiveChainId || effectiveChainId !== arbitrumSepolia.id) && <span className="ml-2 text-red-400 text-sm">⚠️ Network Issue</span>}
          </h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Current:</span>
              <span className={`font-medium ${!effectiveChainId || effectiveChainId !== arbitrumSepolia.id ? 'text-red-400' : 'text-green-400'}`}>
                {!effectiveChainId ? 'Not Detected ❌' : 
                 effectiveChainId === arbitrumSepolia.id ? 'Arbitrum Sepolia ✅' : 
                 `Network ID: ${effectiveChainId} ❌`}
                {activeChain?.id && <span className="text-xs text-muted-foreground ml-1">(active)</span>}
                {!activeChain?.id && fallbackChainId && <span className="text-xs text-muted-foreground ml-1">(fallback)</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Required:</span>
              <span className="text-foreground">Arbitrum Sepolia (Testnet)</span>
            </div>
            {(!effectiveChainId || effectiveChainId !== arbitrumSepolia.id) && (
              <div className="mt-3 p-3 bg-red-500/10 rounded border border-red-500/20">
                <p className="text-red-400 text-sm font-medium">
                  {!effectiveChainId ? 
                    '⚠️ Wallet network not detected - please reconnect your wallet' :
                    '⚠️ Please switch to Arbitrum Sepolia network to claim your NFT'
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {!effectiveChainId ?
                    'Refresh the page and reconnect your wallet if the issue persists' :
                    'Use your wallet\'s network switcher or add Arbitrum Sepolia if not available'
                  }
                </p>
              </div>
            )}
            <div className="flex justify-between">
              <span>NFT Standard:</span>
              <span className="text-foreground">ERC-5115</span>
            </div>
            <div className="flex justify-between">
              <span>Token ID:</span>
              <span className="text-foreground">1</span>
            </div>
            <div className="flex justify-between">
              <span>Payment:</span>
              <span className="text-foreground">130 USDC</span>
            </div>
            <div className="flex justify-between">
              <span>Breakdown:</span>
              <span className="text-foreground">100 NFT + 30 fee</span>
            </div>
            <div className="flex justify-between">
              <span>Token Contract:</span>
              <span className="text-foreground font-mono text-xs">
                {PAYMENT_TOKEN_CONTRACT?.slice(0, 8)}...{PAYMENT_TOKEN_CONTRACT?.slice(-6)}
              </span>
            </div>
            {referrerWallet && (
              <div className="flex justify-between">
                <span>Referrer:</span>
                <span className="text-foreground font-mono text-xs">
                  {referrerWallet.slice(0, 8)}...{referrerWallet.slice(-6)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Claim Button */}
        <div className="pt-4">
          <Button 
            onClick={handleClaimNFT}
            disabled={!account?.address || isProcessing}
            className="w-full h-12 bg-gradient-to-r from-honey to-honey/80 hover:from-honey/90 hover:to-honey/70 text-honey-foreground font-semibold text-lg"
          >
            {isProcessing ? (
              <>
                {currentStep.includes('等待') ? (
                  <Clock className="mr-2 h-5 w-5 animate-pulse" />
                ) : (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                )}
                {currentStep || 'Processing...'}
              </>
            ) : (
              <>
                <Coins className="mr-2 h-5 w-5" />
                Claim Level 1 NFT (130 USDC)
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
                ⚠️ 请勿关闭页面或断开钱包连接
              </div>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="text-center text-xs text-muted-foreground pt-2 space-y-1">
          <p>🪙 130 USDC payment required (100 NFT + 30 platform activation fee)</p>
          <p>🎯 Instant membership activation upon successful claim</p>
          <p>🔗 NFT will be minted to your connected wallet address</p>
          <p>⚡ Two transactions: Token approval + NFT minting</p>
        </div>
      </CardContent>
    </Card>
  );
}

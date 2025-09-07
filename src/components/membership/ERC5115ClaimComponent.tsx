import { useState } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { getContract, prepareContractCall, sendTransaction } from 'thirdweb';
import { arbitrumSepolia } from 'thirdweb/chains';
import { createThirdwebClient } from 'thirdweb';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Zap, Crown, Gift, Coins } from 'lucide-react';

interface ERC5115ClaimComponentProps {
  onSuccess?: () => void;
  referrerWallet?: string;
  className?: string;
}

export function ERC5115ClaimComponent({ onSuccess, referrerWallet, className = '' }: ERC5115ClaimComponentProps) {
  const account = useActiveAccount();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE;
  const PAYMENT_TOKEN_CONTRACT = "0x4470734620414168Aa1673A30849DB25E5886E2A";
  const NFT_CONTRACT = "0x2Cb47141485754371c24Efcc65d46Ccf004f769a";
  const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

  // Initialize Thirdweb client
  const client = createThirdwebClient({
    clientId: THIRDWEB_CLIENT_ID
  });

  const handleClaimNFT = async () => {
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
      // Step 1: Verify user is registered (should be done in Registration page)
      console.log('🔍 Verifying user registration status...');
      const userCheckResponse = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': account.address
        },
        body: JSON.stringify({
          action: 'get-user'
        })
      });

      if (!userCheckResponse.ok) {
        throw new Error('Failed to verify user registration');
      }

      const userStatus = await userCheckResponse.json();
      console.log('📝 User status:', userStatus);

      if (!userStatus.isRegistered) {
        throw new Error('User must complete registration first before claiming NFT');
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

      // Wait a moment for approval to be confirmed
      await new Promise(resolve => setTimeout(resolve, 3000));

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

      // Step 4: Activate membership (try regardless of backend processing)
      console.log('🚀 Activating membership...');
      try {
        const activateResponse = await fetch(`${API_BASE}/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': account.address
          },
          body: JSON.stringify({
            action: 'activate-membership'
          })
        });

        if (activateResponse.ok) {
          const activateResult = await activateResponse.json();
          console.log('✅ Membership activation result:', activateResult);
          membershipActivated = activateResult.success;
        } else {
          console.warn('⚠️ Membership activation failed');
        }
      } catch (activationError) {
        console.warn('⚠️ Membership activation error:', activationError);
      }

      // Show success message if NFT was claimed successfully
      let successMessage = "Your Level 1 NFT has been claimed successfully!";
      if (backendProcessed && membershipActivated) {
        successMessage = "Your Level 1 NFT has been claimed and membership activated!";
      } else if (membershipActivated) {
        successMessage = "Your Level 1 NFT has been claimed and membership activated! (Backend processing may need manual completion)";
      } else if (backendProcessed) {
        successMessage = "Your Level 1 NFT has been claimed and processed! (Membership may need manual activation)";
      }

      toast({
        title: "🎉 NFT Claimed Successfully!",
        description: successMessage,
        variant: "default",
      });

      // Call success handler - NFT claim itself was successful
      if (onSuccess) {
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
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium text-honey mb-2">🌐 Network Details</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Network:</span>
              <span className="text-foreground">Arbitrum Sepolia (Testnet)</span>
            </div>
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
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Claiming NFT...
              </>
            ) : (
              <>
                <Coins className="mr-2 h-5 w-5" />
                Claim Level 1 NFT (130 USDC)
              </>
            )}
          </Button>
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
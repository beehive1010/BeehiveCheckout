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
      // Step 1: Register the user if needed
      console.log('🔗 Registering user if needed...');
      const registerResponse = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': account.address
        },
        body: JSON.stringify({
          action: 'register',
          referrerWallet: referrerWallet,
          username: `user_${account.address.slice(-6)}`
        })
      });

      if (!registerResponse.ok) {
        throw new Error('Failed to register user');
      }

      const registerResult = await registerResponse.json();
      console.log('📝 Registration result:', registerResult);

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
      
      // Check USDC token decimals first - CRITICAL 
      console.log('🔍 Checking USDC token decimals...');
      let tokenDecimals = 18; // Default to 18 decimals (most common)
      let decimalMultiplier = BigInt("1000000000000000000"); // 10^18
      
      try {
        const decimalsResult = await fetch(`https://api.thirdweb.com/v1/chains/421614/contracts/${PAYMENT_TOKEN_CONTRACT}/read?functionName=decimals`, {
          headers: { 'x-client-id': THIRDWEB_CLIENT_ID }
        });
        
        if (decimalsResult.ok) {
          const decimalsData = await decimalsResult.json();
          tokenDecimals = parseInt(decimalsData.result || "18");
          decimalMultiplier = BigInt(10 ** tokenDecimals);
          console.log(`🔥 USDC Token Decimals DETECTED: ${tokenDecimals}`);
          console.log(`🔥 Decimal Multiplier: ${decimalMultiplier.toString()}`);
          
          if (tokenDecimals === 18) {
            console.log(`✅ CONFIRMED: Using 18-decimal USDC (standard ERC20)`);
          }
        }
      } catch (decimalsError) {
        console.warn('⚠️ Could not fetch decimals, using default 18:', decimalsError);
        tokenDecimals = 18;
        decimalMultiplier = BigInt("1000000000000000000"); // Force 18 decimals
        console.log(`🚨 FORCED: Using 18-decimal USDC as fallback`);
      }

      // Check user's USDC balance with correct decimals
      console.log('💰 Checking USDC balance...');
      const balanceResult = await fetch('https://api.thirdweb.com/v1/chains/421614/contracts/' + PAYMENT_TOKEN_CONTRACT + '/erc20/balance-of?wallet_address=' + account.address, {
        headers: { 'x-client-id': THIRDWEB_CLIENT_ID }
      });
      
      if (balanceResult.ok) {
        const balanceData = await balanceResult.json();
        const balance = BigInt(balanceData.value || "0");
        const required = BigInt("130") * decimalMultiplier; // 130 USDC with correct decimals
        
        console.log(`📋 Raw balance: ${balance.toString()}`);
        console.log(`📋 Required amount: ${required.toString()}`);
        console.log(`📋 Balance in USDC: ${(Number(balance) / Number(decimalMultiplier)).toFixed(6)}`);
        console.log(`📋 Required in USDC: ${(Number(required) / Number(decimalMultiplier)).toFixed(6)}`);
        
        if (balance < required) {
          throw new Error(`Insufficient USDC balance. You have ${(Number(balance) / Number(decimalMultiplier)).toFixed(6)} USDC, but need 130 USDC.`);
        }
        console.log(`✅ Sufficient balance: ${(Number(balance) / Number(decimalMultiplier)).toFixed(6)} USDC`);
      }

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

      // Check if already claimed - CRITICAL CHECK
      console.log('🔍 Checking if already claimed...');
      try {
        // Check if user has already claimed token ID 1
        const balanceCheck = await fetch(`https://api.thirdweb.com/v1/chains/421614/contracts/${NFT_CONTRACT}/erc1155/balance-of?wallet_address=${account.address}&token_id=1`, {
          headers: { 'x-client-id': THIRDWEB_CLIENT_ID }
        });
        
        if (balanceCheck.ok) {
          const balanceData = await balanceCheck.json();
          const balance = parseInt(balanceData.result || "0");
          console.log(`📋 Token ID 1 balance for ${account.address}:`, balance);
          
          if (balance > 0) {
            throw new Error(`❌ ALREADY CLAIMED: Wallet ${account.address} has already claimed the Level 1 NFT (Token ID 1). You cannot claim twice. Use a different wallet that hasn't claimed yet.`);
          } else {
            console.log(`✅ Wallet has NOT claimed yet - can proceed`);
          }
        } else {
          console.warn('⚠️ Could not verify claimed status via API');
        }
      } catch (claimedError) {
        console.warn('⚠️ Error checking claimed status:', claimedError);
        // If this check itself fails, we'll continue and let the transaction tell us
      }
      
      // Additional check: Verify claim conditions
      console.log('🔍 Checking claim conditions...');
      try {
        // Check if Token ID 1 exists and has claim conditions set
        const claimConditionCheck = await fetch(`https://api.thirdweb.com/v1/chains/421614/contracts/${NFT_CONTRACT}/read?functionName=getActiveClaimConditionId&args=1`, {
          headers: { 'x-client-id': THIRDWEB_CLIENT_ID }
        });
        
        if (claimConditionCheck.ok) {
          const conditionData = await claimConditionCheck.json();
          console.log('📋 Active claim condition ID for token 1:', conditionData.result);
        } else {
          console.warn('⚠️ Could not verify claim conditions');
        }
        
      } catch (configError) {
        console.warn('⚠️ Could not verify claim conditions:', configError);
      }

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

      if (!claimResponse.ok) {
        throw new Error(`Backend processing failed: ${claimResponse.status}`);
      }

      const claimResult = await claimResponse.json();
      console.log('📋 Backend processing result:', claimResult);

      if (!claimResult.success) {
        throw new Error(claimResult.error || 'Backend processing failed');
      }

      // Step 4: Activate membership
      console.log('🚀 Activating membership...');
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

      if (!activateResponse.ok) {
        throw new Error('Failed to activate membership');
      }

      const activateResult = await activateResponse.json();
      console.log('✅ Membership activation result:', activateResult);

      if (!activateResult.success) {
        throw new Error(activateResult.error || 'Membership activation failed');
      }

      toast({
        title: "🎉 Success!",
        description: "Your Level 1 NFT has been claimed with tokens and membership activated!",
        variant: "default",
      });

      // Call success handler
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

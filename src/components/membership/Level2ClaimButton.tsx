import { useState, useEffect } from 'react';
import { useActiveAccount, useActiveWalletChain } from 'thirdweb/react';
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from 'thirdweb';
import { arbitrum } from 'thirdweb/chains';
import { createThirdwebClient } from 'thirdweb';
import { claimTo, balanceOf } from 'thirdweb/extensions/erc1155';
import { approve, balanceOf as erc20BalanceOf, allowance } from 'thirdweb/extensions/erc20';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Crown, Users, CheckCircle, XCircle, Coins, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../contexts/I18nContext';

interface Level2ClaimButtonProps {
  onSuccess?: () => void;
  className?: string;
}

interface DirectReferralInfo {
  wallet_address: string;
  username: string;
  current_level: number;
  created_at: string;
}

export function Level2ClaimButton({ onSuccess, className = '' }: Level2ClaimButtonProps): JSX.Element {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [directReferrals, setDirectReferrals] = useState<DirectReferralInfo[]>([]);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(true);
  const [canClaimLevel2, setCanClaimLevel2] = useState(false);
  
  // Fixed Level 2 pricing
  const LEVEL_2_PRICE_USDT = 150;
  const LEVEL_2_PRICE_WEI = BigInt(LEVEL_2_PRICE_USDT) * BigInt('1000000');

  const API_BASE = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';
  const PAYMENT_TOKEN_CONTRACT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"; // Arbitrum USDT
  const NFT_CONTRACT = "0x15742D22f64985bC124676e206FCE3fFEb175719"; // ARB ONE Membership Contract
  const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

  const client = createThirdwebClient({
    clientId: THIRDWEB_CLIENT_ID,
  });

  // Load direct referrals and check eligibility
  useEffect(() => {
    if (account?.address) {
      loadDirectReferrals();
    }
  }, [account?.address]);

  const loadDirectReferrals = async () => {
    if (!account?.address) return;
    
    setIsLoadingReferrals(true);
    try {
      console.log('🔍 Loading direct referrals for Level 2 eligibility check...');
      
      // Get current user's member info
      const { data: currentUser, error: userError } = await supabase
        .from('members')
        .select('wallet_address, current_level')
        .eq('wallet_address', account.address)
        .single();
      
      if (userError || !currentUser) {
        console.log('❌ User not found in members table');
        setCanClaimLevel2(false);
        setIsLoadingReferrals(false);
        return;
      }
      
      if (currentUser.current_level !== 1) {
        console.log('❌ User must be Level 1 to claim Level 2');
        setCanClaimLevel2(false);
        setIsLoadingReferrals(false);
        return;
      }
      
      // Get direct referrals (users who have this user as referrer)
      const { data: referrals, error: referralsError } = await supabase
        .from('members')
        .select(`
          wallet_address,
          current_level,
          created_at,
          users!inner(username)
        `)
        .eq('referrer_wallet', account.address)
        .gte('current_level', 1)
        .order('created_at', { ascending: true });
      
      if (referralsError) {
        console.error('❌ Error loading referrals:', referralsError);
        setIsLoadingReferrals(false);
        return;
      }
      
      const formattedReferrals = referrals?.map(ref => ({
        wallet_address: ref.wallet_address,
        username: (ref.users as any).username || 'Unknown',
        current_level: ref.current_level,
        created_at: ref.created_at
      })) || [];
      
      setDirectReferrals(formattedReferrals);
      
      // Check if user has at least 3 direct referrals
      const eligibleReferrals = formattedReferrals.filter(ref => ref.current_level >= 1);
      const hasThreeDirectReferrals = eligibleReferrals.length >= 3;
      
      setCanClaimLevel2(hasThreeDirectReferrals);
      
      console.log(`📊 Direct referrals check: ${eligibleReferrals.length}/3 required`, {
        eligible: hasThreeDirectReferrals,
        referrals: formattedReferrals
      });
      
    } catch (error) {
      console.error('❌ Error checking Level 2 eligibility:', error);
      setCanClaimLevel2(false);
    } finally {
      setIsLoadingReferrals(false);
    }
  };

  const sendTransactionWithRetry = async (transaction: unknown, account: unknown, description: string = 'transaction', useGasless: boolean = true) => {
    let lastError: any = null;
    const maxRetries = 3;
    const baseDelay = 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const gasMode = useGasless ? 'with gas sponsorship' : 'with regular gas';
        console.log(`📤 Sending ${description} ${gasMode} (attempt ${attempt}/${maxRetries})...`);
        
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, baseDelay * attempt));
        }
        
        const result = await sendTransaction({
          transaction,
          account,
          gasless: useGasless, // Enable/disable gas sponsorship based on parameter
        });
        
        console.log(`✅ ${description} successful ${gasMode} on attempt ${attempt}`);
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

  const handleClaimLevel2NFT = async () => {
    console.log('🎯 Level 2 NFT Claim attempt started');
    
    if (!account?.address) {
      toast({
        title: t('claim.walletNotConnected'),
        description: t('claim.connectWalletToClaimNFT'),
        variant: "destructive",
      });
      return;
    }

    if (!canClaimLevel2) {
      toast({
        title: 'Level 2 Requirements Not Met',
        description: 'You need at least 3 direct referrals to claim Level 2 NFT.',
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Network check
      const chainId = activeChain?.id;
      if (chainId !== arbitrum.id) {
        throw new Error(`Please switch to Arbitrum One network. Current: ${chainId}, Required: ${arbitrum.id}`);
      }

      // Step 2: Skip ETH balance check - gas is sponsored
      console.log('⛽ Gas fees are sponsored - skipping ETH balance check');

      // Step 3: Setup contracts
      const usdcContract = getContract({
        client,
        address: PAYMENT_TOKEN_CONTRACT,
        chain: arbitrum
      });

      const nftContract = getContract({
        client,
        address: NFT_CONTRACT,
        chain: arbitrum
      });

      // Step 4: Check if user already owns Level 2 NFT
      console.log('🔍 Checking Level 2 NFT ownership...');
      try {
        const existingBalance = await balanceOf({
          contract: nftContract,
          owner: account.address,
          tokenId: BigInt(2)
        });
        
        if (Number(existingBalance) > 0) {
          console.log('✅ User already owns Level 2 NFT');
          toast({
            title: t('claim.welcomeBack'),
            description: 'You already own Level 2 NFT.',
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

      // Step 5: Check USDT balance and approval
      console.log('💰 Checking USDT balance and approval...');
      setCurrentStep('Checking USDT balance...');
      
      try {
        const tokenBalance = await erc20BalanceOf({
          contract: usdcContract,
          address: account.address
        });
        
        if (tokenBalance < LEVEL_2_PRICE_WEI) {
          throw new Error(`Insufficient USDT balance. You have ${(Number(tokenBalance) / 1e6).toFixed(2)} USDT but need ${LEVEL_2_PRICE_USDT} USDT for Level 2`);
        }
      } catch (balanceError: any) {
        if (balanceError.message.includes('Insufficient USDT')) {
          throw balanceError;
        }
        console.warn('⚠️ Could not check USDT balance:', balanceError);
      }

      // Check and request approval
      setCurrentStep('Checking USDT approval...');
      
      const currentAllowance = await allowance({
        contract: usdcContract,
        owner: account.address,
        spender: NFT_CONTRACT
      });
      
      console.log(`💰 Current allowance: ${Number(currentAllowance) / 1e6} USDT, Required: ${LEVEL_2_PRICE_USDT} USDT`);
      
      if (currentAllowance < LEVEL_2_PRICE_WEI) {
        console.log('💰 Requesting USDT approval...');
        
        const approveTransaction = approve({
          contract: usdcContract,
          spender: NFT_CONTRACT,
          amount: LEVEL_2_PRICE_WEI.toString()
        });

        setCurrentStep('Waiting for approval...');
        
        const approveTxResult = await sendTransactionWithRetry(
          approveTransaction, 
          account, 
          'USDT approval transaction',
          false // Use regular gas for ERC20 approval
        );

        await waitForReceipt({
          client,
          chain: arbitrum,
          transactionHash: approveTxResult?.transactionHash,
        });
        
        console.log('✅ USDT approval confirmed');
        
        // Verify the approval was successful
        const newAllowance = await allowance({
          contract: usdcContract,
          owner: account.address,
          spender: NFT_CONTRACT
        });
        
        console.log(`✅ New allowance after approval: ${Number(newAllowance) / 1e6} USDT`);
        
        if (newAllowance < LEVEL_2_PRICE_WEI) {
          throw new Error(`Approval failed. Current allowance: ${Number(newAllowance) / 1e6} USDT, Required: ${LEVEL_2_PRICE_USDT} USDT`);
        }
      } else {
        console.log('✅ Sufficient allowance already exists');
      }

      // Step 6: Claim Level 2 NFT
      console.log('🎁 Claiming Level 2 NFT...');
      setCurrentStep('Minting Level 2 NFT...');
      
      // Use Thirdweb v5 claimTo extension with proper parameters
      const claimTransaction = claimTo({
        contract: nftContract,
        to: account.address,
        tokenId: BigInt(2),
        quantity: BigInt(1),
        pricePerToken: LEVEL_2_PRICE_WEI,
        currency: PAYMENT_TOKEN_CONTRACT
      });

      const claimTxResult = await sendTransactionWithRetry(
        claimTransaction,
        account,
        'Level 2 NFT claim transaction',
        false // Temporarily disable gasless for NFT claim to test
      );

      // Wait for confirmation
      setCurrentStep('Waiting for NFT confirmation...');
      const receipt = await waitForReceipt({
        client,
        chain: arbitrum,
        transactionHash: claimTxResult.transactionHash,
      });
      
      console.log('✅ Level 2 NFT claim confirmed');
      console.log('📦 Claim成功，区块号:', receipt.blockNumber);
      console.log('🔗 交易哈希:', claimTxResult.transactionHash);
      console.log('📋 事件 logs:', receipt.logs);
      console.log('✅ Receipt status:', receipt.status);

      // Step 7: Process NFT purchase on backend (same as original ERC5115ClaimComponent)
      console.log('📋 Processing Level 2 NFT purchase on backend...');
      
      let backendProcessed = false;
      let membershipActivated = false;
      
      try {
        // Use level-upgrade endpoint for Level 2 (includes direct referrals validation)
        console.log('📊 Calling level-upgrade endpoint for Level 2...');
        const claimResponse = await fetch(`${API_BASE}/level-upgrade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': account.address
          },
          body: JSON.stringify({
            action: 'upgrade_level',
            walletAddress: account.address,
            targetLevel: 2,
            transactionHash: claimTxResult.transactionHash,
            network: 'testnet'
          })
        });

        if (claimResponse.ok) {
          const claimResult = await claimResponse.json();
          console.log('✅ Level 2 upgrade result:', claimResult);
          
          if (claimResult.success) {
            backendProcessed = true;
            membershipActivated = true; // level-upgrade endpoint handles everything
            console.log('✅ Level 2 upgrade completed successfully');
          } else {
            throw new Error(claimResult.error || 'Level 2 upgrade failed');
          }
        } else {
          const errorText = await claimResponse.text();
          throw new Error(`Level 2 upgrade failed: ${errorText}`);
        }
      } catch (upgradeError) {
        console.error('❌ Level 2 upgrade error:', upgradeError);
        // Don't throw - NFT is successfully minted
        backendProcessed = false;
        membershipActivated = false;
      }

      // Show success message based on backend and activation results
      if (backendProcessed && membershipActivated) {
        console.log('✅ Complete success: Level 2 NFT minted and membership activated');
        toast({
          title: '🎉 Level 2 NFT Claimed!',
          description: 'Congratulations! Your Level 2 membership is now active.',
          variant: "default",
          duration: 6000,
        });
      } else {
        console.log('⚠️ Partial success: Level 2 NFT minted but backend activation failed');
        toast({
          title: '✅ Level 2 NFT Claimed!',
          description: 'Your Level 2 NFT is minted on blockchain. Backend activation is pending - please contact support if needed.',
          variant: "default",
          duration: 8000,
        });
      }

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error('❌ Level 2 NFT claim error:', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('User rejected') || errorMessage.includes('user denied')) {
        toast({
          title: 'Transaction Cancelled',
          description: 'You cancelled the transaction.',
          variant: "destructive",
        });
      } else if (false) { // ETH check removed - gas is sponsored
        toast({
          title: 'Gas Sponsored',
          description: errorMessage,
          variant: "destructive",
        });
      } else if (errorMessage.includes('Insufficient USDT')) {
        toast({
          title: 'Insufficient USDT',
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

  const renderReferralsList = () => {
    const eligibleReferrals = directReferrals.filter(ref => ref.current_level >= 1);
    const remainingNeeded = Math.max(0, 3 - eligibleReferrals.length);
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Direct Referrals ({eligibleReferrals.length}/3)</h3>
          <Badge variant={eligibleReferrals.length >= 3 ? "default" : "destructive"} className="text-xs">
            {eligibleReferrals.length >= 3 ? 'Requirements Met' : `Need ${remainingNeeded} more`}
          </Badge>
        </div>
        
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {eligibleReferrals.map((referral, index) => (
            <div key={referral.wallet_address} className="flex items-center justify-between p-2 bg-muted/20 rounded-md">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium">{referral.username}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Level {referral.current_level}
              </Badge>
            </div>
          ))}
          
          {/* Show placeholders for remaining slots */}
          {remainingNeeded > 0 && Array.from({ length: remainingNeeded }).map((_, index) => (
            <div key={`placeholder-${index}`} className="flex items-center justify-between p-2 bg-muted/10 rounded-md border border-dashed">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Waiting for referral #{eligibleReferrals.length + index + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className={`bg-gradient-to-br from-purple/5 to-purple/15 border-purple/30 ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-3">
          <Users className="h-8 w-8 text-purple-400 mr-2" />
          <Badge className="bg-purple-400/20 text-purple-400 border-purple-400/50">
            Level 2 Requirements
          </Badge>
        </div>
        <CardTitle className="text-2xl text-purple-400 mb-2">
          Claim Level 2 NFT
        </CardTitle>
        <p className="text-muted-foreground">
          Requires 3 direct referrals to unlock Level 2 membership
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Requirements Check */}
        <div className="space-y-4">
          <div className="p-4 bg-muted/20 rounded-lg border">
            {isLoadingReferrals ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
                <span className="ml-2 text-sm">Checking referral requirements...</span>
              </div>
            ) : (
              renderReferralsList()
            )}
          </div>
        </div>

        {/* Price Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
            <Coins className="h-6 w-6 text-orange-400 mx-auto mb-2" />
            <h3 className="font-semibold text-orange-400 mb-1">{LEVEL_2_PRICE_USDT} USDT</h3>
            <p className="text-xs text-muted-foreground">Level 2 Price</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
            <Crown className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-400 mb-1">Level 2</h3>
            <p className="text-xs text-muted-foreground">Membership NFT</p>
          </div>
        </div>

        {/* Claim Button */}
        <div className="space-y-4">
          <Button 
            onClick={handleClaimLevel2NFT}
            disabled={isProcessing || !account?.address || !canClaimLevel2 || isLoadingReferrals}
            className="w-full h-12 bg-gradient-to-r from-purple-400 to-purple-600 hover:from-purple-400/90 hover:to-purple-600/90 text-white font-semibold text-lg shadow-lg disabled:opacity-50"
          >
            {!account?.address ? (
              <>
                <Crown className="mr-2 h-5 w-5" />
                Connect Wallet
              </>
            ) : isLoadingReferrals ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Checking Requirements...
              </>
            ) : !canClaimLevel2 ? (
              <>
                <Users className="mr-2 h-5 w-5" />
                Need 3 Direct Referrals
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {currentStep || 'Processing...'}
              </>
            ) : (
              <>
                <Crown className="mr-2 h-5 w-5" />
                Claim Level 2 - {LEVEL_2_PRICE_USDT} USDT
              </>
            )}
          </Button>
          
          {/* Progress indicator */}
          {isProcessing && currentStep && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-purple-400 animate-pulse" />
                <span className="text-muted-foreground">{currentStep}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Do not close this page while processing...
              </div>
            </div>
          )}
        </div>

        {/* Requirements Info */}
        <div className="text-center text-xs text-muted-foreground pt-2 space-y-1">
          <p>📋 Requires 3 active Level 1+ referrals</p>
          <p>💳 USDT payment required</p>
          <p>⚡ Instant Level 2 activation</p>
        </div>
      </CardContent>
    </Card>
  );
}
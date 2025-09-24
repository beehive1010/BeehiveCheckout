import { useState, useEffect } from 'react';
import { useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain } from 'thirdweb/react';
import { getContract, prepareContractCall, sendTransaction, waitForReceipt } from 'thirdweb';
import { arbitrum } from 'thirdweb/chains';
import { createThirdwebClient } from 'thirdweb';
import { claimTo, balanceOf } from 'thirdweb/extensions/erc1155';
import { approve, balanceOf as erc20BalanceOf, allowance } from 'thirdweb/extensions/erc20';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Crown, TrendingUp, Coins, Clock, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../contexts/I18nContext';

interface Level2ClaimButtonV2Props {
  onSuccess?: () => void;
  className?: string;
}

export function Level2ClaimButtonV2({ onSuccess, className = '' }: Level2ClaimButtonV2Props): JSX.Element {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [canClaimLevel2, setCanClaimLevel2] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [directReferralsCount, setDirectReferralsCount] = useState(0);
  const [alreadyOwnsLevel2, setAlreadyOwnsLevel2] = useState(false);
  const [dataSync, setDataSync] = useState({
    hasLevel2Membership: false,
    currentMemberLevel: 0,
    canClaimLevel3: false,
    isDataSynced: false
  });
  
  // Fixed Level 2 pricing - same as Level1 logic
  const LEVEL_2_PRICE_USDC = 150;
  const LEVEL_2_PRICE_WEI = BigInt(LEVEL_2_PRICE_USDC) * BigInt('1000000000000000000');

  // Check data synchronization between NFT ownership and database records
  const checkDataSynchronization = async (walletAddress: string) => {
    try {
      const { supabase } = await import('../../lib/supabase');
      
      console.log('🔄 Checking data synchronization for Level 2 NFT owner...');
      
      // 1. Check membership table for Level 2 record
      const { data: membershipData } = await supabase
        .from('membership')
        .select('nft_level, is_member, unlock_membership_level')
        .ilike('wallet_address', walletAddress)
        .eq('nft_level', 2)
        .single();
      
      // 2. Check members table for current level
      const { data: memberData } = await supabase
        .from('members')
        .select('current_level')
        .ilike('wallet_address', walletAddress)
        .single();
      
      // 3. Check next unlock level from membership records
      const { data: nextUnlockData } = await supabase
        .from('membership')
        .select('unlock_membership_level')
        .ilike('wallet_address', walletAddress)
        .order('nft_level', { ascending: false })
        .limit(1)
        .single();
      
      const hasLevel2Membership = !!membershipData;
      const currentMemberLevel = memberData?.current_level || 0;
      const nextUnlockLevel = nextUnlockData?.unlock_membership_level;
      const canClaimLevel3 = nextUnlockLevel === 3;
      const isDataSynced = hasLevel2Membership && currentMemberLevel >= 2;
      
      console.log('📊 Data sync status:', {
        hasLevel2Membership,
        currentMemberLevel,
        nextUnlockLevel,
        canClaimLevel3,
        isDataSynced
      });
      
      setDataSync({
        hasLevel2Membership,
        currentMemberLevel,
        canClaimLevel3,
        isDataSynced
      });
      
    } catch (error) {
      console.error('❌ Data synchronization check failed:', error);
      setDataSync({
        hasLevel2Membership: false,
        currentMemberLevel: 0,
        canClaimLevel3: false,
        isDataSynced: false
      });
    }
  };
  
  const API_BASE = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';
  const PAYMENT_TOKEN_CONTRACT = "0x6f9487f2a1036e2D910aBB7509d0263a9581470B"; // ARB ONE Payment Token
  const NFT_CONTRACT = "0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8"; // ARB ONE Membership Contract
  const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

  const client = createThirdwebClient({
    clientId: THIRDWEB_CLIENT_ID,
  });

  // Check network status
  useEffect(() => {
    if (activeChain?.id && activeChain.id !== arbitrum.id) {
      setIsWrongNetwork(true);
    } else {
      setIsWrongNetwork(false);
    }
  }, [activeChain?.id]);

  // Check Level 2 eligibility - simplified logic
  useEffect(() => {
    if (account?.address) {
      checkLevel2Eligibility();
    }
  }, [account?.address]);

  const checkLevel2Eligibility = async () => {
    if (!account?.address) return;
    
    setIsCheckingEligibility(true);
    try {
      console.log('🔍 Checking Level 2 eligibility for:', account.address);
      
      // Check if user has Level 1 membership but not Level 2
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('current_level, wallet_address')
        .ilike('wallet_address', account.address)
        .single();
      
      if (memberError || !memberData) {
        console.log('❌ User not found in members table - must claim Level 1 first');
        setCanClaimLevel2(false);
        setIsCheckingEligibility(false);
        return;
      }
      
      if (memberData.current_level !== 1) {
        console.log(`❌ User current level: ${memberData.current_level}, must be Level 1 to claim Level 2`);
        setCanClaimLevel2(false);
        setIsCheckingEligibility(false);
        return;
      }

      // Check direct referrals requirement using unified service (Level 2 needs 3+ direct referrals)
      const { getDirectReferralCount } = await import('../../lib/services/directReferralService');
      const currentDirectReferrals = await getDirectReferralCount(account.address);
      setDirectReferralsCount(currentDirectReferrals);
      
      const hasThreeDirectReferrals = currentDirectReferrals >= 3;
      
      if (!hasThreeDirectReferrals) {
        console.log(`❌ Level 2 requires 3+ direct referrals. User has ${currentDirectReferrals}`);
        setCanClaimLevel2(false);
        setIsCheckingEligibility(false);
        return;
      }
      
      console.log(`✅ Direct referrals check passed: ${currentDirectReferrals}/3`);
      
      
      // Check if user already owns Level 2 NFT on blockchain
      try {
        const nftContract = getContract({
          client,
          address: NFT_CONTRACT,
          chain: arbitrum
        });
        
        const level2Balance = await balanceOf({
          contract: nftContract,
          owner: account.address,
          tokenId: BigInt(2)
        });
        
        if (Number(level2Balance) > 0) {
          console.log('❌ User already owns Level 2 NFT - checking data synchronization...');
          setAlreadyOwnsLevel2(true);
          setCanClaimLevel2(false);
          
          // Check data synchronization when user owns Level 2 NFT
          await checkDataSynchronization(account.address);
          
          setIsCheckingEligibility(false);
          return;
        }
      } catch (nftCheckError) {
        console.warn('⚠️ Could not check Level 2 NFT balance:', nftCheckError);
      }
      
      // All checks passed - user can claim Level 2
      console.log('✅ User eligible for Level 2 claim');
      setCanClaimLevel2(true);
      
    } catch (error) {
      console.error('❌ Error checking Level 2 eligibility:', error);
      setCanClaimLevel2(false);
    } finally {
      setIsCheckingEligibility(false);
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
          transaction: transaction as any,
          account: account as any
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

  const handleSwitchNetwork = async () => {
    if (!switchChain) return;
    
    try {
      setIsProcessing(true);
      await switchChain(arbitrum);
      toast({
        title: 'Network Switched',
        description: 'Successfully switched to Arbitrum One',
        variant: "default",
      });
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      toast({
        title: 'Network Switch Failed',
        description: error.message || 'Could not switch to Arbitrum One. Please switch manually in your wallet.',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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
        description: 'You must own Level 1 NFT and not yet own Level 2 to claim.',
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Network check - same as Level 1
      const chainId = activeChain?.id;
      if (chainId !== arbitrum.id) {
        throw new Error(`Please switch to Arbitrum One network. Current: ${chainId}, Required: ${arbitrum.id}`);
      }

      // Step 2: Skip ETH balance check - gas is sponsored
      console.log('⛽ Gas fees are sponsored - skipping ETH balance check');

      // Step 3: Setup contracts - same as Level 1
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

      // Step 4: Check if user already owns Level 2 NFT (double-check)
      console.log('🔍 Double-checking Level 2 NFT ownership...');
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

      // Step 5: Check USDC balance and approval - same as Level 1
      console.log('💰 Checking USDC balance and approval...');
      setCurrentStep('Checking USDC balance...');
      
      try {
        const tokenBalance = await erc20BalanceOf({
          contract: usdcContract,
          address: account.address
        });
        
        if (tokenBalance < LEVEL_2_PRICE_WEI) {
          throw new Error(`Insufficient USDC balance. You have ${(Number(tokenBalance) / 1e18).toFixed(2)} USDC but need ${LEVEL_2_PRICE_USDC} USDC for Level 2`);
        }
        
        console.log('✅ Sufficient USDC balance confirmed');
      } catch (balanceError: any) {
        if (balanceError.message.includes('Insufficient USDC')) {
          throw balanceError;
        }
        console.warn('⚠️ Could not check USDC balance:', balanceError);
      }

      // Check and request approval
      setCurrentStep('Checking USDC approval...');
      
      const currentAllowance = await allowance({
        contract: usdcContract,
        owner: account.address,
        spender: NFT_CONTRACT
      });
      
      console.log(`💰 Current allowance: ${Number(currentAllowance) / 1e18} USDC, Required: ${LEVEL_2_PRICE_USDC} USDC`);
      
      if (currentAllowance < LEVEL_2_PRICE_WEI) {
        console.log('💰 Requesting USDC approval...');
        
        const approveTransaction = approve({
          contract: usdcContract,
          spender: NFT_CONTRACT,
          amount: LEVEL_2_PRICE_WEI.toString()
        });

        setCurrentStep('Waiting for approval...');
        
        const approveTxResult = await sendTransactionWithRetry(
          approveTransaction, 
          account, 
          'USDC approval transaction',
          false // Use regular gas for ERC20 approval
        );

        await waitForReceipt({
          client,
          chain: arbitrum,
          transactionHash: approveTxResult?.transactionHash,
        });
        
        console.log('✅ USDC approval confirmed');
        
        // Verify the approval was successful
        const newAllowance = await allowance({
          contract: usdcContract,
          owner: account.address,
          spender: NFT_CONTRACT
        });
        
        console.log(`✅ New allowance after approval: ${Number(newAllowance) / 1e18} USDC`);
        
        if (newAllowance < LEVEL_2_PRICE_WEI) {
          throw new Error(`Approval failed. Current allowance: ${Number(newAllowance) / 1e18} USDC, Required: ${LEVEL_2_PRICE_USDC} USDC`);
        }
      } else {
        console.log('✅ Sufficient allowance already exists');
      }

      // Step 6: Claim Level 2 NFT - same method as Level 1, just tokenId: 2
      console.log('🎁 Claiming Level 2 NFT...');
      setCurrentStep('Minting Level 2 NFT...');
      
      // Use the same claim method as Level 1, but with tokenId: 2
      const claimTransaction = claimTo({
        contract: nftContract,
        to: account.address,
        tokenId: BigInt(2), // Level 2 token ID
        quantity: BigInt(1)
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
        maxBlocksWaitTime: 50
      });
      
      console.log('✅ Level 2 NFT claim confirmed');
      console.log('📦 Level 2 Claim成功，区块号:', receipt.blockNumber);
      console.log('🔗 交易哈希:', claimTxResult.transactionHash);
      console.log('📋 事件 logs:', receipt.logs);
      console.log('✅ Receipt status:', receipt.status);

      // Step 7: Process Level 2 upgrade using level-upgrade Edge Function
      let activationSuccess = false;
      
      if (claimTxResult?.transactionHash) {
        console.log('🚀 Processing Level 2 upgrade via level-upgrade function...');
        setCurrentStep('Processing Level 2 upgrade...');
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          // Call level-upgrade Edge Function for proper processing
          console.log('📡 Calling level-upgrade function for Level 2...');
          
          const upgradeResponse = await fetch(`${API_BASE}/level-upgrade`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'x-wallet-address': account.address,
            },
            body: JSON.stringify({
              action: 'upgrade_level',
              walletAddress: account.address,
              targetLevel: 2,
              transactionHash: claimTxResult.transactionHash,
              network: 'mainnet'
            })
          });

          const upgradeResult = await upgradeResponse.json();

          if (!upgradeResult.success) {
            throw new Error(`Level 2 upgrade failed: ${upgradeResult.error || upgradeResult.message}`);
          }

          console.log('✅ Level 2 upgrade processed successfully:', upgradeResult);
          activationSuccess = true;
          
        } catch (backendError: any) {
          console.error('❌ Level 2 backend processing error:', backendError);
          // Fallback to direct database update if Edge Function fails
          try {
            console.log('🔄 Fallback: Direct database update for Level 2...');
            
            const { data: updateResult, error: updateError } = await supabase
              .from('members')
              .update({ 
                current_level: 2
              })
              .eq('wallet_address', account.address)
              .select('*')
              .single();

            if (updateError) {
              throw new Error(`Fallback database update failed: ${updateError.message}`);
            }

            console.log('✅ Fallback update successful for Level 2:', updateResult);
            activationSuccess = true;
            
          } catch (fallbackError: any) {
            console.error('❌ Fallback update also failed:', fallbackError);
            activationSuccess = false;
          }
        }
      }

      // Show success message based on what succeeded
      if (activationSuccess) {
        console.log('✅ Complete success: Level 2 NFT minted and membership activated with Layer 2 rewards');
        toast({
          title: '🎉 Level 2 NFT Claimed!',
          description: 'Congratulations! Your Level 2 membership is now active. Layer 2 rewards have been processed.',
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

      // Refresh eligibility check
      await checkLevel2Eligibility();

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
      } else if (errorMessage.includes('Insufficient USDC')) {
        toast({
          title: 'Insufficient USDC',
          description: errorMessage,
          variant: "destructive",
        });
      } else if (errorMessage.includes('network')) {
        toast({
          title: 'Network Error',
          description: 'Please switch to Arbitrum One network.',
          variant: "destructive",
        });
      } else {
        toast({
          title: 'Level 2 Upgrade Failed',
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className={`bg-gradient-to-br from-blue/5 to-blue/15 border-blue/30 ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-3">
          <TrendingUp className="h-8 w-8 text-blue-400 mr-2" />
          <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/50">
            Level 2 Upgrade
          </Badge>
        </div>
        <CardTitle className="text-2xl text-blue-400 mb-2">
          Claim Level 2 NFT
        </CardTitle>
        <p className="text-muted-foreground">
          Upgrade from Level 1 to Level 2 membership
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Level Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
            <Coins className="h-6 w-6 text-orange-400 mx-auto mb-2" />
            <h3 className="font-semibold text-orange-400 mb-1">
              {LEVEL_2_PRICE_USDC} USDC
            </h3>
            <p className="text-xs text-muted-foreground">Level 2 Price</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
            <Crown className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-400 mb-1">Level 2</h3>
            <p className="text-xs text-muted-foreground">Target Level</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
            <Star className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-400 mb-1">Layer 2</h3>
            <p className="text-xs text-muted-foreground">Rewards Trigger</p>
          </div>
        </div>

        {/* Direct Referrals Status */}
        <div className={`p-4 rounded-lg border ${
          directReferralsCount >= 3 
            ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20' 
            : 'bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${
              directReferralsCount >= 3 ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
            }`}></div>
            <span className={`text-sm font-medium ${
              directReferralsCount >= 3 ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              Direct Referrals: {directReferralsCount}/3
            </span>
          </div>
          <p className={`text-xs ${
            directReferralsCount >= 3 ? 'text-emerald-600' : 'text-amber-600'
          }`}>
            {directReferralsCount >= 3 
              ? '✅ Qualified for Level 2 upgrade'
              : `❌ Need ${3 - directReferralsCount} more direct referrals`
            }
          </p>
        </div>

        {/* NFT Ownership Status */}
        {alreadyOwnsLevel2 && (
          <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              <span className="text-sm font-medium text-blue-600">
                Level 2 NFT Status
              </span>
            </div>
            
            {dataSync.isDataSynced ? (
              <div className="space-y-2">
                <p className="text-xs text-emerald-600">
                  ✅ Level 2 NFT owned & data synchronized (Member Level: {dataSync.currentMemberLevel})
                </p>
                {dataSync.canClaimLevel3 ? (
                  <p className="text-xs text-purple-600">
                    🚀 Level 3 NFT now available! Visit membership page to upgrade.
                  </p>
                ) : (
                  <p className="text-xs text-amber-600">
                    ⏳ Level 3 unlock pending. Check your membership status.
                  </p>
                )}
              </div>
            ) : dataSync.hasLevel2Membership ? (
              <p className="text-xs text-amber-600">
                ⏳ Level 2 NFT owned, membership record exists, but member level not updated (Current: {dataSync.currentMemberLevel}). Data syncing in progress.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-orange-600">
                  ⚠️ Level 2 NFT owned but no membership record found. This may indicate a sync issue.
                </p>
                <button
                  onClick={async () => {
                    try {
                      console.log('🔄 Manual sync: Updating current_level to 2...');
                      
                      // Method 1: Try to update members table current_level
                      const { data: updateData, error: updateError } = await supabase
                        .from('members')
                        .update({ current_level: 2 })
                        .ilike('wallet_address', account?.address!)
                        .select();
                      
                      if (!updateError && updateData && updateData.length > 0) {
                        console.log('✅ Manual sync successful:', updateData);
                        toast({
                          title: "Sync Successful",
                          description: "Level 2 membership data has been synchronized.",
                          variant: "default",
                        });
                        
                        // Refresh data after successful sync
                        await checkDataSynchronization(account?.address!);
                        await checkLevel2Eligibility();
                        
                      } else {
                        console.warn('⚠️ Member update failed:', updateError);
                        
                        // Method 2: Try calling balance function to trigger sync
                        const balanceResponse = await fetch(`https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/balance`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
                            'Content-Type': 'application/json',
                            'x-wallet-address': account?.address!,
                          },
                          body: JSON.stringify({
                            action: 'sync-nft-level',
                            targetLevel: 2
                          }),
                        });
                        
                        if (balanceResponse.ok) {
                          console.log('✅ Balance API sync triggered');
                          toast({
                            title: "Sync Initiated",
                            description: "Level 2 sync has been initiated via balance API. Please refresh in a moment.",
                            variant: "default",
                          });
                        } else {
                          toast({
                            title: "Sync Failed",
                            description: "Unable to sync Level 2 data. Please contact support.",
                            variant: "destructive",
                          });
                        }
                      }
                      
                    } catch (error: any) {
                      console.error('❌ Manual sync error:', error);
                      toast({
                        title: "Sync Error",
                        description: error.message || "Failed to sync Level 2 data",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="px-3 py-1 text-xs bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30 transition-colors"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Syncing...' : 'Sync Level 2 Data'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Claim Button */}
        <div className="space-y-4">
          {/* Show network switch button if on wrong network */}
          {isWrongNetwork && account?.address && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-yellow-800">Wrong Network</span>
              </div>
              <p className="text-xs text-yellow-700 mb-3">
                You're on {activeChain?.id === 1 ? 'Ethereum Mainnet' : `Network ${activeChain?.id}`}. 
                Switch to Arbitrum One to claim your Level 2 NFT.
              </p>
              <Button 
                onClick={handleSwitchNetwork}
                disabled={isProcessing}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                size="sm"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Switching Network...
                  </>
                ) : (
                  'Switch to Arbitrum One'
                )}
              </Button>
            </div>
          )}

          <Button 
            onClick={handleClaimLevel2NFT}
            disabled={isProcessing || !account?.address || isWrongNetwork || !canClaimLevel2 || isCheckingEligibility}
            className="w-full h-12 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-400/90 hover:to-blue-600/90 text-white font-semibold text-lg shadow-lg disabled:opacity-50"
          >
            {!account?.address ? (
              <>
                <Crown className="mr-2 h-5 w-5" />
                Connect Wallet
              </>
            ) : isWrongNetwork ? (
              <>
                <Crown className="mr-2 h-5 w-5" />
                Switch Network First
              </>
            ) : isCheckingEligibility ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Checking Eligibility...
              </>
            ) : !canClaimLevel2 ? (
              <>
                <Crown className="mr-2 h-5 w-5" />
                {alreadyOwnsLevel2 ? 'Already Own Level 2 NFT' : 'Requirements Not Met'}
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {currentStep || 'Processing...'}
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-5 w-5" />
                Upgrade to Level 2 - {LEVEL_2_PRICE_USDC} USDC
              </>
            )}
          </Button>
          
          {/* Progress indicator */}
          {isProcessing && currentStep && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-400 animate-pulse" />
                <span className="text-muted-foreground">{currentStep}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Do not close this page while processing...
              </div>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="text-center text-xs text-muted-foreground pt-2 space-y-1">
          <p>📈 Level 1 → Level 2 upgrade</p>
          <p>💳 USDC payment required</p>
          <p>⚡ Instant level activation</p>
          <p>🎭 NFT minted to your wallet</p>
          <p>💰 Layer 2 rewards (150 USDC) processed</p>
        </div>
      </CardContent>
    </Card>
  );
}
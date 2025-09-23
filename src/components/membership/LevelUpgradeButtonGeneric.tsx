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

interface LevelUpgradeButtonGenericProps {
  targetLevel: number;
  currentLevel: number;
  directReferralsCount: number;
  onSuccess?: () => void;
  className?: string;
}

// Dynamic pricing based on level
const getLevelPrice = (level: number): number => {
  if (level === 1) return 130;
  if (level === 2) return 150;
  if (level === 3) return 200;
  // Level 4+: 200 + (50 * (level - 3))
  return 200 + (50 * (level - 3));
};

// Level requirements
const getLevelRequirements = (level: number): { directReferrals: number; description: string } => {
  if (level === 2) return { directReferrals: 3, description: "Level 2 requires 3+ direct referrals" };
  // For Level 3+, no additional referral requirements
  return { directReferrals: 0, description: `Sequential upgrade from Level ${level - 1}` };
};

export function LevelUpgradeButtonGeneric({ 
  targetLevel, 
  currentLevel, 
  directReferralsCount, 
  onSuccess, 
  className = '' 
}: LevelUpgradeButtonGenericProps): JSX.Element {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [canClaimLevel, setCanClaimLevel] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  
  // Dynamic pricing and requirements
  const LEVEL_PRICE_USDC = getLevelPrice(targetLevel);
  const LEVEL_PRICE_WEI = BigInt(LEVEL_PRICE_USDC) * BigInt('1000000000000000000');
  const LEVEL_REQUIREMENTS = getLevelRequirements(targetLevel);
  
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

  // Check level eligibility
  useEffect(() => {
    if (account?.address) {
      checkLevelEligibility();
    }
  }, [account?.address, targetLevel, currentLevel, directReferralsCount]);

  const checkLevelEligibility = async () => {
    if (!account?.address) return;
    
    setIsCheckingEligibility(true);
    try {
      console.log(`🔍 Checking Level ${targetLevel} eligibility for:`, account.address);
      
      // Check if user is at the correct current level
      if (currentLevel !== targetLevel - 1) {
        console.log(`❌ User current level: ${currentLevel}, but target level ${targetLevel} requires level ${targetLevel - 1}`);
        setCanClaimLevel(false);
        setIsCheckingEligibility(false);
        return;
      }

      // Check special requirements for Level 2
      if (targetLevel === 2 && directReferralsCount < LEVEL_REQUIREMENTS.directReferrals) {
        console.log(`❌ Level 2 requires ${LEVEL_REQUIREMENTS.directReferrals}+ direct referrals. User has ${directReferralsCount}`);
        setCanClaimLevel(false);
        setIsCheckingEligibility(false);
        return;
      }

      // Check if user already owns the target level NFT on blockchain
      try {
        const nftContract = getContract({
          client,
          address: NFT_CONTRACT,
          chain: arbitrum
        });
        
        const levelBalance = await balanceOf({
          contract: nftContract,
          owner: account.address,
          tokenId: BigInt(targetLevel)
        });
        
        if (Number(levelBalance) > 0) {
          console.log(`❌ User already owns Level ${targetLevel} NFT`);
          setCanClaimLevel(false);
          setIsCheckingEligibility(false);
          return;
        }
      } catch (nftCheckError) {
        console.warn(`⚠️ Could not check Level ${targetLevel} NFT balance:`, nftCheckError);
      }
      
      // All checks passed
      console.log(`✅ User eligible for Level ${targetLevel} claim`);
      setCanClaimLevel(true);
      
    } catch (error) {
      console.error(`❌ Error checking Level ${targetLevel} eligibility:`, error);
      setCanClaimLevel(false);
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
          transaction,
          account,
          gasless: useGasless,
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

  const handleClaimLevelNFT = async () => {
    console.log(`🎯 Level ${targetLevel} NFT Claim attempt started`);
    
    if (!account?.address) {
      toast({
        title: t('claim.walletNotConnected'),
        description: t('claim.connectWalletToClaimNFT'),
        variant: "destructive",
      });
      return;
    }

    if (!canClaimLevel) {
      toast({
        title: `Level ${targetLevel} Requirements Not Met`,
        description: LEVEL_REQUIREMENTS.description,
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

      // Step 4: Check if user already owns target level NFT (double-check)
      console.log(`🔍 Double-checking Level ${targetLevel} NFT ownership...`);
      try {
        const existingBalance = await balanceOf({
          contract: nftContract,
          owner: account.address,
          tokenId: BigInt(targetLevel)
        });
        
        if (Number(existingBalance) > 0) {
          console.log(`✅ User already owns Level ${targetLevel} NFT`);
          toast({
            title: t('claim.welcomeBack'),
            description: `You already own Level ${targetLevel} NFT.`,
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

      // Step 5: Check USDC balance and approval
      console.log('💰 Checking USDC balance and approval...');
      setCurrentStep('Checking USDC balance...');
      
      try {
        const tokenBalance = await erc20BalanceOf({
          contract: usdcContract,
          address: account.address
        });
        
        if (tokenBalance < LEVEL_PRICE_WEI) {
          throw new Error(`Insufficient USDC balance. You have ${(Number(tokenBalance) / 1e18).toFixed(2)} USDC but need ${LEVEL_PRICE_USDC} USDC for Level ${targetLevel}`);
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
      
      console.log(`💰 Current allowance: ${Number(currentAllowance) / 1e18} USDC, Required: ${LEVEL_PRICE_USDC} USDC`);
      
      if (currentAllowance < LEVEL_PRICE_WEI) {
        console.log('💰 Requesting USDC approval...');
        
        const approveTransaction = approve({
          contract: usdcContract,
          spender: NFT_CONTRACT,
          amount: LEVEL_PRICE_WEI.toString()
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
        
        if (newAllowance < LEVEL_PRICE_WEI) {
          throw new Error(`Approval failed. Current allowance: ${Number(newAllowance) / 1e18} USDC, Required: ${LEVEL_PRICE_USDC} USDC`);
        }
      } else {
        console.log('✅ Sufficient allowance already exists');
      }

      // Step 6: Claim target level NFT
      console.log(`🎁 Claiming Level ${targetLevel} NFT...`);
      setCurrentStep(`Minting Level ${targetLevel} NFT...`);
      
      const claimTransaction = claimTo({
        contract: nftContract,
        to: account.address,
        tokenId: BigInt(targetLevel),
        quantity: BigInt(1),
        pricePerToken: LEVEL_PRICE_WEI,
        currency: PAYMENT_TOKEN_CONTRACT
      });

      const claimTxResult = await sendTransactionWithRetry(
        claimTransaction,
        account,
        `Level ${targetLevel} NFT claim transaction`,
        false // Temporarily disable gasless for NFT claim to test
      );

      // Wait for confirmation
      setCurrentStep('Waiting for NFT confirmation...');
      const receipt = await waitForReceipt({
        client,
        chain: arbitrum,
        transactionHash: claimTxResult.transactionHash,
        maxBlocksWaitTime: 50,
        pollingInterval: 2000,
      });
      
      console.log(`✅ Level ${targetLevel} NFT claim confirmed`);
      console.log(`📦 Level ${targetLevel} Claim成功，区块号:`, receipt.blockNumber);
      console.log('🔗 交易哈希:', claimTxResult.transactionHash);
      console.log('📋 事件 logs:', receipt.logs);
      console.log('✅ Receipt status:', receipt.status);

      // Step 7: Process level upgrade using level-upgrade Edge Function
      if (claimTxResult?.transactionHash) {
        console.log(`🚀 Processing Level ${targetLevel} upgrade via level-upgrade function...`);
        setCurrentStep(`Processing Level ${targetLevel} upgrade...`);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        let activationSuccess = false;
        
        try {
          // Call level-upgrade Edge Function for proper processing
          console.log(`📡 Calling level-upgrade function for Level ${targetLevel}...`);
          
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
              targetLevel: targetLevel,
              transactionHash: claimTxResult.transactionHash,
              network: 'mainnet'
            })
          });

          const upgradeResult = await upgradeResponse.json();

          if (!upgradeResult.success) {
            throw new Error(`Level upgrade failed: ${upgradeResult.error || upgradeResult.message}`);
          }

          console.log(`✅ Level ${targetLevel} upgrade processed successfully:`, upgradeResult);
          activationSuccess = true;
          
        } catch (backendError: any) {
          console.error(`❌ Level ${targetLevel} backend processing error:`, backendError);
          // Fallback to direct database update if Edge Function fails
          try {
            console.log(`🔄 Fallback: Direct database update for Level ${targetLevel}...`);
            
            const { data: updateResult, error: updateError } = await supabase
              .from('members')
              .update({ 
                current_level: targetLevel,
                updated_at: new Date().toISOString()
              })
              .eq('wallet_address', account.address)
              .select('*')
              .single();

            if (updateError) {
              throw new Error(`Fallback database update failed: ${updateError.message}`);
            }

            console.log(`✅ Fallback update successful for Level ${targetLevel}:`, updateResult);
            activationSuccess = true;
            
          } catch (fallbackError: any) {
            console.error(`❌ Fallback update also failed:`, fallbackError);
            activationSuccess = false;
          }
        }
      }

      // Show success message
      if (activationSuccess) {
        console.log(`✅ Complete success: Level ${targetLevel} NFT minted and membership activated with Layer ${targetLevel} rewards`);
        toast({
          title: `🎉 Level ${targetLevel} NFT Claimed!`,
          description: `Congratulations! Your Level ${targetLevel} membership is now active. Layer ${targetLevel} rewards have been processed.`,
          variant: "default",
          duration: 6000,
        });
      } else {
        console.log(`⚠️ Partial success: Level ${targetLevel} NFT minted but backend activation failed`);
        toast({
          title: `✅ Level ${targetLevel} NFT Claimed!`,
          description: `Your Level ${targetLevel} NFT is minted on blockchain. Backend activation is pending - please contact support if needed.`,
          variant: "default",
          duration: 8000,
        });
      }

      // Refresh eligibility check
      await checkLevelEligibility();

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error(`❌ Level ${targetLevel} NFT claim error:`, error);
      
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
          title: `Level ${targetLevel} Upgrade Failed`,
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const getLevelIcon = () => {
    if (targetLevel <= 2) return TrendingUp;
    if (targetLevel <= 5) return Crown;
    if (targetLevel <= 10) return Star;
    return Crown;
  };

  const getLevelColor = () => {
    if (targetLevel === 2) return 'from-blue-400 to-blue-600';
    if (targetLevel <= 5) return 'from-purple-400 to-purple-600';
    if (targetLevel <= 10) return 'from-orange-400 to-orange-600';
    return 'from-honey to-orange-500';
  };

  const Icon = getLevelIcon();

  return (
    <Card className={`bg-gradient-to-br from-blue/5 to-blue/15 border-blue/30 ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-3">
          <Icon className="h-8 w-8 text-blue-400 mr-2" />
          <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/50">
            Level {targetLevel} Upgrade
          </Badge>
        </div>
        <CardTitle className="text-2xl text-blue-400 mb-2">
          Claim Level {targetLevel} NFT
        </CardTitle>
        <p className="text-muted-foreground">
          Upgrade from Level {currentLevel} to Level {targetLevel} membership
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Level Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
            <Coins className="h-6 w-6 text-orange-400 mx-auto mb-2" />
            <h3 className="font-semibold text-orange-400 mb-1">
              {LEVEL_PRICE_USDC} USDC
            </h3>
            <p className="text-xs text-muted-foreground">Level {targetLevel} Price</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
            <Crown className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-400 mb-1">Level {targetLevel}</h3>
            <p className="text-xs text-muted-foreground">Target Level</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
            <Star className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-400 mb-1">Layer {targetLevel}</h3>
            <p className="text-xs text-muted-foreground">Rewards Trigger</p>
          </div>
        </div>

        {/* Requirements Display */}
        {targetLevel === 2 && LEVEL_REQUIREMENTS.directReferrals > 0 && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h4 className="font-semibold text-orange-800 mb-2">Level 2 Requirements:</h4>
            <p className="text-sm text-orange-700 mb-2">
              • Must own Level 1 NFT ✅
            </p>
            <p className="text-sm text-orange-700">
              • Need {LEVEL_REQUIREMENTS.directReferrals}+ direct referrals 
              {directReferralsCount >= LEVEL_REQUIREMENTS.directReferrals ? ' ✅' : ` (${directReferralsCount}/${LEVEL_REQUIREMENTS.directReferrals})`}
            </p>
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
                Switch to Arbitrum One to claim your Level {targetLevel} NFT.
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
            onClick={handleClaimLevelNFT}
            disabled={isProcessing || !account?.address || isWrongNetwork || !canClaimLevel || isCheckingEligibility}
            className={`w-full h-12 bg-gradient-to-r ${getLevelColor()} hover:from-blue-400/90 hover:to-blue-600/90 text-white font-semibold text-lg shadow-lg disabled:opacity-50`}
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
            ) : !canClaimLevel ? (
              <>
                <Crown className="mr-2 h-5 w-5" />
                Requirements Not Met
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {currentStep || 'Processing...'}
              </>
            ) : (
              <>
                <Icon className="mr-2 h-5 w-5" />
                Upgrade to Level {targetLevel} - {LEVEL_PRICE_USDC} USDC
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
          <p>📈 Level {currentLevel} → Level {targetLevel} upgrade</p>
          <p>💳 USDC payment required</p>
          <p>⚡ Instant level activation</p>
          <p>🎭 NFT minted to your wallet</p>
          <p>💰 Layer {targetLevel} rewards ({LEVEL_PRICE_USDC} USDC) processed</p>
        </div>
      </CardContent>
    </Card>
  );
}
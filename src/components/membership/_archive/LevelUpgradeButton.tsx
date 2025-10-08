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
import { Loader2, Crown, TrendingUp, Coins, Clock, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../contexts/I18nContext';
import { useNFTLevelClaim, LEVEL_PRICING } from '../../hooks/useNFTLevelClaim';

interface LevelUpgradeButtonProps {
  onSuccess?: () => void;
  targetLevel?: number; // If not provided, will auto-detect next level
  className?: string;
}

export function LevelUpgradeButton({ onSuccess, targetLevel, className = '' }: LevelUpgradeButtonProps): JSX.Element {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [currentUserLevel, setCurrentUserLevel] = useState<number>(0);
  const [isLoadingLevel, setIsLoadingLevel] = useState(true);
  
  // Use the custom hook for level management
  const { levelInfo, isLoading: isLevelLoading, refetch: refetchLevel, getLevelName, formatPrice } = useNFTLevelClaim(targetLevel);
  
  const API_BASE = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';
  const PAYMENT_TOKEN_CONTRACT = "0x6B174f1f3B7f92E048f0f15FD2b22c167DA6F008"; // Arbitrum USDT
  const NFT_CONTRACT = "0xe57332db0B8d7e6aF8a260a4fEcfA53104728693"; // ARB ONE Membership Contract
  const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

  const client = createThirdwebClient({
    clientId: THIRDWEB_CLIENT_ID,
  });

  // Load user's current level
  useEffect(() => {
    if (account?.address) {
      loadCurrentLevel();
    }
  }, [account?.address]);

  const loadCurrentLevel = async () => {
    if (!account?.address) return;
    
    setIsLoadingLevel(true);
    try {
      const { data: memberData, error } = await supabase
        .from('members')
        .select('current_level')
        .eq('wallet_address', account.address.toLowerCase())
        .single();
      
      if (!error && memberData) {
        setCurrentUserLevel(memberData.current_level);
        console.log(`📊 Current user level: ${memberData.current_level}`);
      } else {
        console.log('❌ User not found in members table');
        setCurrentUserLevel(0);
      }
    } catch (error) {
      console.error('❌ Error loading current level:', error);
      setCurrentUserLevel(0);
    } finally {
      setIsLoadingLevel(false);
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
          account: account as any,
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

  const handleUpgradeLevel = async () => {
    const upgradeLevel = levelInfo.tokenId;
    console.log(`🎯 Level ${upgradeLevel} NFT Upgrade attempt started`);
    
    if (!account?.address) {
      toast({
        title: t('claim.walletNotConnected'),
        description: t('claim.connectWalletToClaimNFT'),
        variant: "destructive",
      });
      return;
    }

    // Validation checks
    if (!levelInfo.canClaim) {
      toast({
        title: 'Cannot Upgrade',
        description: levelInfo.isMaxLevel ? 'You have reached the maximum level!' : 'You cannot claim this level yet.',
        variant: "destructive",
      });
      return;
    }

    if (upgradeLevel < 3 || upgradeLevel > 19) {
      toast({
        title: 'Invalid Level',
        description: 'This component only handles levels 3-19.',
        variant: "destructive",
      });
      return;
    }

    // Check if user has the previous level (sequential upgrade requirement)
    if (currentUserLevel !== upgradeLevel - 1) {
      toast({
        title: 'Prerequisites Not Met',
        description: `You must own Level ${upgradeLevel - 1} before upgrading to Level ${upgradeLevel}. Current level: ${currentUserLevel}`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Network check
      const chainId = activeChain?.id;
      if (chainId !== arbitrum.id) {
        throw new Error(`Please switch to Arbitrum Sepolia network. Current: ${chainId}, Required: ${arbitrum.id}`);
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

      // Step 4: Check if user already owns this level NFT
      console.log(`🔍 Checking Level ${upgradeLevel} NFT ownership...`);
      try {
        const existingBalance = await balanceOf({
          contract: nftContract,
          owner: account.address,
          tokenId: BigInt(upgradeLevel)
        });
        
        if (Number(existingBalance) > 0) {
          console.log(`✅ User already owns Level ${upgradeLevel} NFT`);
          toast({
            title: t('claim.welcomeBack'),
            description: `You already own Level ${upgradeLevel} NFT.`,
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
      
      const finalAmount = levelInfo.priceInWei;
      
      try {
        const tokenBalance = await erc20BalanceOf({
          contract: usdcContract,
          address: account.address
        });
        
        if (tokenBalance < finalAmount) {
          throw new Error(`Insufficient USDT balance. You have ${(Number(tokenBalance) / 1e18).toFixed(2)} USDT but need ${formatPrice(levelInfo.priceInUSDT)} USDT for Level ${upgradeLevel}`);
        }
        
        console.log('✅ Sufficient USDT balance confirmed');
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
      
      console.log(`💰 Current allowance: ${Number(currentAllowance) / 1e18} USDT, Required: ${formatPrice(levelInfo.priceInUSDT)} USDT`);
      
      if (currentAllowance < finalAmount) {
        console.log('💰 Requesting USDT approval...');
        
        const approveTransaction = approve({
          contract: usdcContract,
          spender: NFT_CONTRACT,
          amount: finalAmount.toString()
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
        
        console.log(`✅ New allowance after approval: ${Number(newAllowance) / 1e18} USDT`);
        
        if (newAllowance < finalAmount) {
          throw new Error(`Approval failed. Current allowance: ${Number(newAllowance) / 1e18} USDT, Required: ${formatPrice(levelInfo.priceInUSDT)} USDT`);
        }
      } else {
        console.log('✅ Sufficient allowance already exists');
      }

      // Step 6: Claim upgrade NFT
      console.log(`🎁 Claiming Level ${upgradeLevel} NFT...`);
      setCurrentStep(`Minting Level ${upgradeLevel} NFT...`);
      
      // Use Thirdweb v5 claimTo extension with proper parameters
      const claimTransaction = claimTo({
        contract: nftContract,
        to: account.address,
        tokenId: BigInt(upgradeLevel),
        quantity: BigInt(1)
      });

      const claimTxResult = await sendTransactionWithRetry(
        claimTransaction,
        account,
        `Level ${upgradeLevel} NFT claim transaction`,
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
      
      console.log(`✅ Level ${upgradeLevel} NFT claim confirmed`);
      console.log('📦 Claim成功，区块号:', receipt.blockNumber);
      console.log('🔗 交易哈希:', claimTxResult.transactionHash);
      console.log('📋 事件 logs:', receipt.logs);
      console.log('✅ Receipt status:', receipt.status);

      // Step 7: Process upgrade with database recording (same as original ERC5115ClaimComponent)
      let activationSuccess = false;
      if (claimTxResult?.transactionHash) {
        console.log(`🚀 Processing Level ${upgradeLevel} upgrade...`);
        setCurrentStep('Processing upgrade...');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
          // Phase 1: Process upgrade
          console.log('📊 Calling level-upgrade endpoint...');
          const upgradeResponse = await fetch(`${API_BASE}/level-upgrade`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'x-wallet-address': account.address
            },
            body: JSON.stringify({
              action: 'upgrade_level',
              walletAddress: account.address,
              targetLevel: upgradeLevel,
              transactionHash: claimTxResult.transactionHash,
              network: 'mainnet'
            })
          });

          if (!upgradeResponse.ok) {
            throw new Error(`Upgrade processing failed: ${upgradeResponse.status}`);
          }

          const upgradeResult = await upgradeResponse.json();
          console.log('✅ Upgrade processed:', upgradeResult);

          // Phase 2: Activate membership with retry logic (matching original pattern)
          console.log('🚀 Activating membership with retry logic...');
          setCurrentStep('Activating membership...');
          
          activationSuccess = false;
          const maxRetries = 5;
          const retryDelay = 10000; // 10 seconds
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              console.log(`📞 Membership activation attempt ${attempt}/${maxRetries}`);
              
              const activateResponse = await fetch(`${API_BASE}/activate-membership`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                  'x-wallet-address': account.address
                },
                body: JSON.stringify({
                  transactionHash: claimTxResult.transactionHash,
                  level: upgradeLevel,
                  paymentMethod: 'token_payment',
                  paymentAmount: levelInfo.priceInUSDT
                })
              });

              if (activateResponse.ok) {
                const result = await activateResponse.json();
                console.log(`✅ Level ${upgradeLevel} membership activated on attempt ${attempt}:`, result);
                activationSuccess = true;
                break;
              } else {
                throw new Error(`Activation failed with status: ${activateResponse.status}`);
              }
              
            } catch (activationError: any) {
              console.warn(`⚠️ Membership activation attempt ${attempt} failed:`, activationError.message);
              
              if (attempt < maxRetries) {
                console.log(`🔄 Retrying activation in ${retryDelay/1000} seconds...`);
                setCurrentStep(`Activation failed, retrying in ${retryDelay/1000}s... (${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              }
            }
          }
          
          if (!activationSuccess) {
            console.error('❌ All activation attempts failed, but NFT is successfully minted');
          }
          
        } catch (backendError: any) {
          console.warn('⚠️ Backend processing error:', backendError);
          activationSuccess = false;
          // Don't throw - NFT is successfully minted
        }
      }

      // Show success message based on what succeeded
      if (activationSuccess) {
        console.log(`✅ Complete success: Level ${upgradeLevel} NFT minted and membership activated`);
        toast({
          title: `🎉 Level ${upgradeLevel} NFT Claimed!`,
          description: `Congratulations! Your Level ${upgradeLevel} membership is now active.`,
          variant: "default",
          duration: 6000,
        });
      } else {
        console.log(`⚠️ Partial success: Level ${upgradeLevel} NFT minted but backend activation failed`);
        toast({
          title: `✅ Level ${upgradeLevel} NFT Claimed!`,
          description: `Your Level ${upgradeLevel} NFT is minted on blockchain. Backend activation is pending - please contact support if needed.`,
          variant: "default",
          duration: 8000,
        });
      }

      // Refresh level info
      await loadCurrentLevel();
      refetchLevel();

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error(`❌ Level ${levelInfo.tokenId} NFT claim error:`, error);
      
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
          title: 'Upgrade Failed',
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = isLevelLoading || isLoadingLevel;
  const upgradeLevel = levelInfo.tokenId;
  const canUpgrade = levelInfo.canClaim && upgradeLevel >= 3 && upgradeLevel <= 19;

  // Debug logging moved to useEffect to avoid render loop
  useEffect(() => {
    console.log('🔧 LevelUpgradeButton DEBUG:', {
      currentUserLevel,
      upgradeLevel,
      'levelInfo.canClaim': levelInfo.canClaim,
      'upgradeLevel >= 3': upgradeLevel >= 3,
      'upgradeLevel <= 19': upgradeLevel <= 19,
      canUpgrade,
      isLoading,
      isProcessing,
      isLevelLoading,
      isLoadingLevel,
      accountAddress: account?.address,
      activeChain: activeChain?.id,
      buttonDisabled: isProcessing || !account?.address || isLoading || !canUpgrade,
      disabledReasons: {
        'isProcessing': isProcessing,
        'noAccount': !account?.address,
        'isLoading (combined)': isLoading,
        'isLevelLoading': isLevelLoading,
        'isLoadingLevel': isLoadingLevel,
        'cantUpgrade': !canUpgrade,
        'cantClaim': !levelInfo.canClaim,
        'wrongLevel': !(upgradeLevel >= 3 && upgradeLevel <= 19)
      },
      'Raw levelInfo': levelInfo
    });

    // Alert if button is disabled
    if (isProcessing || !account?.address || isLoading || !canUpgrade) {
      console.warn('⚠️ UPGRADE BUTTON IS DISABLED:', {
        reason: !account?.address ? 'NO_WALLET' :
                isLoading ? 'LOADING' :
                isProcessing ? 'PROCESSING' :
                !canUpgrade ? 'CANT_UPGRADE' : 'UNKNOWN'
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address, currentUserLevel, upgradeLevel, canUpgrade, isLoading, isProcessing]);

  return (
    <Card className={`bg-gradient-to-br from-blue/5 to-blue/15 border-blue/30 ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-3">
          <TrendingUp className="h-8 w-8 text-blue-400 mr-2" />
          <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/50">
            Level Upgrade
          </Badge>
        </div>
        <CardTitle className="text-2xl text-blue-400 mb-2">
          {isLoading ? 'Loading.tsx...' : `Upgrade to ${getLevelName(upgradeLevel)}`}
        </CardTitle>
        <p className="text-muted-foreground">
          {isLoading ? 'Loading.tsx upgrade info...' :
           currentUserLevel > 0 ? 
           `Current Level: ${currentUserLevel} | Next: ${getLevelName(upgradeLevel)}` :
           'Sequential level upgrade system'
          }
        </p>
        
        {/* Level progress indicator */}
        {!isLoading && currentUserLevel > 0 && currentUserLevel < upgradeLevel && (
          <div className="mt-2 px-3 py-1 bg-blue/10 rounded-full text-xs text-blue-400 border border-blue/20">
            Upgrading from Level {currentUserLevel} to {getLevelName(upgradeLevel)}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Level Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
            <Coins className="h-6 w-6 text-orange-400 mx-auto mb-2" />
            <h3 className="font-semibold text-orange-400 mb-1">
              {isLoading ? '...' : `${formatPrice(levelInfo.priceInUSDT)} USDT`}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Loading.tsx...' : `${getLevelName(upgradeLevel)} Price`}
            </p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
            <Crown className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <h3 className="font-semibold text-blue-400 mb-1">
              {isLoading ? '...' : getLevelName(upgradeLevel)}
            </h3>
            <p className="text-xs text-muted-foreground">Target Level</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
            <Star className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <h3 className="font-semibold text-purple-400 mb-1">Sequential</h3>
            <p className="text-xs text-muted-foreground">Upgrade System</p>
          </div>
        </div>

        {/* Upgrade Button */}
        <div className="space-y-4">
          <Button 
            onClick={handleUpgradeLevel}
            disabled={isProcessing || !account?.address || isLoading || !canUpgrade}
            data-testid="level-upgrade-button"
            className="w-full h-12 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-400/90 hover:to-blue-600/90 text-white font-semibold text-lg shadow-lg disabled:opacity-50"
          >
            {!account?.address ? (
              <>
                <Crown className="mr-2 h-5 w-5" />
                Connect Wallet
              </>
            ) : isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading...
              </>
            ) : !canUpgrade ? (
              <>
                <Crown className="mr-2 h-5 w-5" />
                {levelInfo.isMaxLevel ? 'Max Level Reached' : 
                 upgradeLevel < 3 ? 'Use Level 1/2 Components' : 'Cannot Upgrade Yet'}
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {currentStep || 'Processing...'}
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-5 w-5" />
                Upgrade to {getLevelName(upgradeLevel)} - {formatPrice(levelInfo.priceInUSDT)} USDT
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
          <p>📈 Sequential level progression (3→4→5...→19)</p>
          <p>💳 USDT payment required</p>
          <p>⚡ Instant level activation</p>
          <p>🎭 NFT minted to your wallet</p>
        </div>
      </CardContent>
    </Card>
  );
}
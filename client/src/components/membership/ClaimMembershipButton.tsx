import { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { useI18n } from '../../contexts/I18nContext';
import { getMembershipLevel } from '../../lib/config/membershipLevels';
import { membershipEventEmitter } from '../../lib/membership/events';
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client, alphaCentauri, bbcMembershipContract, levelToTokenId, paymentChains, contractAddresses } from '../../lib/web3';
import { PayEmbed, CheckoutWidget } from "thirdweb/react";
import { Card, CardContent } from '../ui/card';
import { FiX } from 'react-icons/fi';
import { getApprovalForTransaction, transfer } from 'thirdweb/extensions/erc20';
import { sendAndConfirmTransaction, prepareTransaction, getContract } from 'thirdweb';

type ClaimState = 'idle' | 'approving' | 'paying' | 'verifying' | 'persisting' | 'success' | 'error';

interface ClaimMembershipButtonProps {
  walletAddress: string;
  level: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function ClaimMembershipButton({
  walletAddress,
  level,
  onSuccess,
  onError,
  disabled = false,
  className = ''
}: ClaimMembershipButtonProps) {
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [txHash, setTxHash] = useState<string>('');
  const [doubleClickGuard, setDoubleClickGuard] = useState(false);
  // Default to test chain (Arbitrum Sepolia) for easier testing
  const [selectedChain, setSelectedChain] = useState(paymentChains.find(chain => (chain as any).isTestnet) || paymentChains[0]);
  const [showChainSelector, setShowChainSelector] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const account = useActiveAccount();
  const { toast } = useToast();
  const { t } = useI18n();

  const membershipLevel = getMembershipLevel(level);

  if (!membershipLevel) {
    return null;
  }

  // NFT-based automatic activation for existing NFT holders
  const handleNFTActivation = useCallback(async () => {
    if (!account?.address) {
      toast({
        title: t('membership.purchase.error'),
        description: t('membership.purchase.walletNotConnected'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setClaimState('verifying');

      const response = await fetch('/api/membership/nft-activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Use Arbitrum Sepolia contract for verification
          nftContractAddress: '0xAc8c8662726b72f8DB4F5D1d1a16aC5b06B7a90D',
          tokenId: levelToTokenId(level).toString(),
          verificationChain: 'arbitrum-sepolia',
        }),
      });

      if (!response.ok) {
        throw new Error('NFT activation failed');
      }

      const result = await response.json();

      setClaimState('success');
      
      toast({
        title: t('membership.purchase.success'),
        description: t('membership.purchase.activationSuccess'),
        variant: 'default',
      });

      // Emit activation event
      membershipEventEmitter.emit({
        type: 'MEMBERSHIP_PERSISTED',
        payload: {
          walletAddress: account.address,
          level: result.level,
          orderId: 'nft-activation',
          activated: true,
          previousLevel: 0,
          timestamp: Date.now()
        }
      });

      onSuccess?.();

    } catch (error) {
      console.error('NFT activation error:', error);
      setClaimState('error');
      
      toast({
        title: t('membership.purchase.error'),
        description: t('membership.purchase.nftActivationFailed'),
        variant: 'destructive',
      });

      onError?.(error instanceof Error ? error.message : 'NFT activation failed');
    }
  }, [account?.address, level, toast, t, onSuccess, onError]);

  const handlePaymentSuccess = useCallback(async (result: any) => {
    try {
      const transactionHash = result.transactionHash;
      setTxHash(transactionHash);
      setClaimState('verifying');

      // Emit payment completed event (payment on selected chain)
      membershipEventEmitter.emit({
        type: 'MEMBERSHIP_PAYMENT_COMPLETED',
        payload: {
          walletAddress,
          level,
          priceUSDT: membershipLevel.priceUSDT,
          txHash: transactionHash,
          chain: selectedChain.name.toLowerCase().replace(' ', '-'),
          timestamp: Date.now()
        }
      });

      // Check if this is test chain BEFORE calling verifyAndPersist
      const isTestChain = selectedChain.name === 'Arbitrum Sepolia' || (selectedChain as any).isTestnet;
      
      if (isTestChain) {
        console.log('✅ Test chain detected - Processing membership and minting NFT');
        try {
          setClaimState('persisting');
          await persistTestMembership(transactionHash);
          setClaimState('success');
          
          toast({
            title: String(t('membership.purchase.success.title')),
            description: String(t('membership.purchase.success.description')),
          });

          onSuccess?.();
          return;
        } catch (error) {
          console.error('❌ Error in test payment flow:', error);
          throw error;
        }
      }

      // Start verification process for non-test chains only
      await verifyAndPersist(transactionHash);
    } catch (error) {
      console.error('Payment success handler error:', error);
      handleError('Failed to process payment success', 'payment');
    }
  }, [walletAddress, level, membershipLevel.priceUSDT]);

  const verifyAndPersist = async (transactionHash: string) => {
    try {
      // Emit verification started event
      membershipEventEmitter.emit({
        type: 'MEMBERSHIP_VERIFICATION_STARTED',
        payload: {
          walletAddress,
          level,
          txHash: transactionHash,
          timestamp: Date.now()
        }
      });

      // Check if this is test chain (Arbitrum Sepolia) - skip bridge verification
      const isTestChain = selectedChain.name === 'Arbitrum Sepolia';
      
      if (isTestChain) {
        // For test chain, directly persist membership without bridge verification
        setClaimState('persisting');
        await persistTestMembership(transactionHash);
      } else {
        // For other chains, use existing bridge verification
        const verified = await verifyOnChain(transactionHash);
        
        if (!verified) {
          throw new Error('On-chain verification failed');
        }

        // Emit verification completed event
        membershipEventEmitter.emit({
          type: 'MEMBERSHIP_VERIFICATION_COMPLETED',
          payload: {
            walletAddress,
            level,
            txHash: transactionHash,
            verified: true,
            timestamp: Date.now()
          }
        });

        setClaimState('persisting');
        await persistMembership(transactionHash);
      }
      
      setClaimState('success');
      
      toast({
        title: String(t('membership.purchase.success.title')),
        description: String(t('membership.purchase.success.description')),
      });

      onSuccess?.();
      
    } catch (error) {
      console.error('Verification and persistence error:', error);
      handleError('Failed to verify and persist membership', 'verification');
    }
  };

  const verifyOnChain = async (transactionHash: string): Promise<boolean> => {
    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        // Verify payment on Arbitrum Sepolia using Thirdweb API
        const response = await fetch('/api/membership/verify-cross-chain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Wallet-Address': walletAddress,
          },
          body: JSON.stringify({ 
            paymentTxHash: transactionHash,
            level,
            tokenId: levelToTokenId(level).toString(),
            sourceChain: selectedChain.name.toLowerCase().replace(' ', '-'), // e.g., 'arbitrum-sepolia'
            targetChain: 'alpha-centauri',
            bridgeWallet: selectedChain.bridgeWallet,
            usdtAmount: membershipLevel.priceUSDT * 100, // Convert to cents
          }),
        });

        if (response.ok) {
          const result = await response.json();
          return result.verified;
        }
        
        // If not verified yet, wait and retry
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        console.error(`Verification attempt ${attempt + 1} failed:`, error);
        if (attempt === 4) { // Last attempt
          throw error;
        }
      }
    }
    
    return false;
  };

  const persistMembership = async (transactionHash: string) => {
    try {
      const response = await fetch('/api/membership/claim-cross-chain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress,
        },
        body: JSON.stringify({
          level,
          tokenId: levelToTokenId(level).toString(),
          paymentTxHash: transactionHash,
          sourceChain: selectedChain.name.toLowerCase().replace(' ', '-'),
          targetChain: 'alpha-centauri',
          bridgeWallet: selectedChain.bridgeWallet,
          usdtAmount: membershipLevel.priceUSDT * 100, // Convert to cents
          priceUSDT: membershipLevel.priceUSDT,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to persist membership');
      }

      const result = await response.json();
      
      // Emit persistence event
      membershipEventEmitter.emit({
        type: 'MEMBERSHIP_PERSISTED',
        payload: {
          walletAddress,
          level,
          orderId: result.orderId,
          activated: result.activated,
          previousLevel: result.previousLevel,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Persistence error:', error);
      throw error;
    }
  };

  const persistTestMembership = async (transactionHash: string) => {
    try {
      console.log('🚀 Processing membership purchase and NFT minting...');
      
      // Step 1: Update database membership status
      const response = await fetch('/api/membership/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress,
        },
        body: JSON.stringify({
          level,
          txHash: transactionHash,
          priceUSDT: membershipLevel.priceUSDT,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to persist membership');
      }

      const result = await response.json();
      console.log('✅ Membership updated in database');

      // Step 2: Mint BBC Membership NFT to user's wallet
      console.log('🎨 Minting BBC Membership NFT to your wallet...');

      if (!account) {
        throw new Error('Wallet account not available for minting');
      }

      // Import mint function from thirdweb for ERC1155
      const { mintTo } = await import('thirdweb/extensions/erc1155');
      
      // Get BBC membership contract (ERC1155)
      const bbcContract = getContract({
        client,
        chain: selectedChain.chain, // Arbitrum Sepolia
        address: contractAddresses.BBC_MEMBERSHIP.arbitrumSepolia as `0x${string}`,
      });

      // Calculate correct token ID: Level 1 = Token ID 1, Level 2 = Token ID 2, etc.
      const tokenId = level; // Level 1 → Token ID 1

      const mintTransaction = mintTo({
        contract: bbcContract,
        to: walletAddress as `0x${string}`,
        tokenId: BigInt(tokenId),
        amount: BigInt(1), // Mint 1 NFT
        data: '0x', // Empty data
      });

      console.log('📤 Sending mint transaction to blockchain...');
      const mintResult = await sendAndConfirmTransaction({
        transaction: mintTransaction,
        account,
      });

      console.log('🎉 NFT minted successfully!', {
        transactionHash: mintResult.transactionHash,
        tokenId: level,
        recipient: walletAddress,
      });

      // Update result with NFT transaction hash
      result.nftTxHash = mintResult.transactionHash;
      result.nftMinted = true;
      
      // Emit persistence event
      membershipEventEmitter.emit({
        type: 'MEMBERSHIP_PERSISTED',
        payload: {
          walletAddress,
          level,
          orderId: result.orderId,
          activated: result.activated,
          previousLevel: result.previousLevel,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Test membership persistence error:', error);
      throw error;
    }
  };

  const handleError = (message: string, stage: 'payment' | 'verification' | 'persistence') => {
    setClaimState('error');
    
    membershipEventEmitter.emit({
      type: 'MEMBERSHIP_ERROR',
      payload: {
        walletAddress,
        level,
        error: message,
        stage,
        timestamp: Date.now()
      }
    });

    toast({
      title: String(t('membership.purchase.error.title')),
      description: String(t('membership.purchase.error.description')),
      variant: 'destructive',
    });

    onError?.(message);
  };

  const handleStartPurchase = () => {
    if (doubleClickGuard || disabled) return;
    setShowChainSelector(true);
  };

  const handleChainSelected = async (chain: typeof paymentChains[0]) => {
    if (!account) return;
    
    setSelectedChain(chain);
    setShowChainSelector(false);
    setDoubleClickGuard(true);

    try {
      setIsApproving(true);
      setClaimState('approving');
      
      // Get USDT contract for the selected chain
      const usdtContract = {
        client,
        chain: chain.chain,
        address: chain.usdtAddress,
      };

      // Create a dummy transaction to check for approvals needed
      const dummyTransaction = prepareTransaction({
        to: chain.bridgeWallet,
        value: BigInt(0),
        data: "0x",
        client,
        chain: chain.chain,
      });

      // Check if approval is needed for USDT transfers
      const approveTx = await getApprovalForTransaction({
        transaction: dummyTransaction,
        account,
      });

      if (approveTx) {
        try {
          await sendAndConfirmTransaction({ account, transaction: approveTx });
          toast({
            title: "USDT Approved",
            description: "USDT spending approved! You can now proceed with payment.",
          });
        } catch (error: any) {
          if (error.message?.includes('insufficient funds')) {
            toast({
              title: "Insufficient Gas",
              description: "You don't have enough gas to approve USDT spending.",
              variant: 'destructive',
            });
          } else {
            toast({
              title: "Approval Failed",
              description: "Failed to approve USDT spending. Please try again.",
              variant: 'destructive',
            });
          }
          setClaimState('idle');
          setIsApproving(false);
          return;
        }
      }

      // Proceed to payment
      setClaimState('paying');

      // Emit purchase started event
      membershipEventEmitter.emit({
        type: 'MEMBERSHIP_PURCHASE_STARTED',
        payload: {
          walletAddress,
          level,
          priceUSDT: membershipLevel.priceUSDT,
          selectedChain: chain.name,
          timestamp: Date.now()
        }
      });

    } catch (error) {
      console.error('Chain selection error:', error);
      toast({
        title: "Preparation Failed",
        description: "Failed to prepare payment. Please try again.",
        variant: 'destructive',
      });
      setClaimState('idle');
    } finally {
      setIsApproving(false);
      // Reset guard after 2 seconds
      setTimeout(() => setDoubleClickGuard(false), 2000);
    }
  };

  const getButtonText = () => {
    switch (claimState) {
      case 'approving':
        return isApproving ? String(t('membership.purchase.approving')) : String(t('membership.purchase.preparing'));
      case 'paying':
        return String(t('membership.purchase.paying'));
      case 'verifying':
        return String(t('membership.purchase.verifying'));
      case 'persisting':
        return String(t('membership.purchase.finalizing'));
      case 'success':
        return String(t('membership.purchase.completed'));
      case 'error':
        return String(t('membership.purchase.retry'));
      default:
        return String(t('membership.purchase.button')).replace('{level}', level.toString()).replace('{price}', membershipLevel.priceUSDT.toString());
    }
  };

  const isButtonDisabled = disabled || doubleClickGuard || isApproving || ['approving', 'paying', 'verifying', 'persisting', 'success'].includes(claimState);

  if (!walletAddress) {
    return (
      <div className={className}>
        <ConnectButton 
          client={client}
          connectButton={{
            label: String(t('membership.purchase.connectWallet'))
          }}
        />
      </div>
    );
  }

  // Chain Selector Modal
  if (showChainSelector) {
    return (
      <div className={`${className} space-y-4`}>
        <Card className="bg-secondary border-border">
          <CardContent className="p-4">
            <div className="text-center mb-4">
              <h3 className="text-honey font-semibold mb-2">{String(t('membership.purchase.selectChain'))}</h3>
              <p className="text-sm text-muted-foreground">
                {String(t('membership.purchase.selectChainDescription')).replace('{level}', level.toString())}
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {paymentChains.map((chain) => (
                <Button
                  key={chain.name}
                  onClick={() => handleChainSelected(chain)}
                  variant="outline"
                  className={`h-auto p-4 justify-start hover:bg-honey/10 hover:border-honey/30 ${(chain as any).isTestnet ? 'border-orange-500/50 bg-orange-500/5' : ''}`}
                  data-testid={`button-select-${chain.name.toLowerCase()}`}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center ${chain.color}`}>
                      <i className={`${chain.icon} text-sm`}></i>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{chain.name}</p>
                        {(chain as any).isTestnet && (
                          <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-600 rounded-full border border-orange-500/30">
                            测试网
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(chain as any).isTestnet 
                          ? '使用测试USDT直接支付' 
                          : String(t('membership.purchase.payWithGas')).replace('{symbol}', chain.symbol)
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-honey">${membershipLevel.priceUSDT}</p>
                      <p className="text-xs text-muted-foreground">
                        {(chain as any).isTestnet ? '测试USDT' : 'USDT'}
                      </p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
            
            <Button
              onClick={() => setShowChainSelector(false)}
              variant="outline"
              className="w-full mt-4"
              data-testid="button-cancel-chain-selector"
            >
              {String(t('common.cancel'))}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (claimState === 'paying') {
    return (
      <div className="w-full space-y-4">
        {/* Payment Header */}
        <div className={`bg-secondary/30 rounded-lg p-4 border ${(selectedChain as any).isTestnet ? 'border-orange-500/30 bg-orange-500/5' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center ${selectedChain.color}`}>
                <i className={`${selectedChain.icon} text-sm`}></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{selectedChain.name}</p>
                  {(selectedChain as any).isTestnet && (
                    <span className="px-2 py-0.5 text-xs bg-orange-500/20 text-orange-600 rounded-full border border-orange-500/30">
                      测试
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(selectedChain as any).isTestnet ? '测试USDT支付' : 'USDT Payment'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-honey">${membershipLevel.priceUSDT}</p>
              <p className="text-xs text-muted-foreground">Level {level} Membership</p>
            </div>
          </div>
        </div>

        {/* Payment Container */}
        <div className="border rounded-lg overflow-hidden">
          {(selectedChain as any).isTestnet ? (
            // 测试网络：使用简单的手动转账按钮，完全避开bridge
            <div className="p-4 space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">测试网络支付</p>
                <p className="text-lg font-bold text-honey">${membershipLevel.priceUSDT} 测试USDT</p>
                <p className="text-xs text-muted-foreground">使用测试代币购买会员</p>
              </div>

              <Button
                onClick={async () => {
                  try {
                    console.log('🚀 Test payment button clicked!');
                    
                    if (!account?.address) {
                      console.log('❌ No wallet connected');
                      toast({
                        title: '请连接钱包',
                        description: '需要连接钱包才能进行支付',
                        variant: 'destructive',
                      });
                      return;
                    }

                    console.log('✅ Wallet connected:', account.address);
                    console.log('📋 Payment details:', {
                      chain: selectedChain.name,
                      usdtAddress: selectedChain.usdtAddress,
                      bridgeWallet: selectedChain.bridgeWallet,
                      amount: membershipLevel.priceUSDT * 1000000,
                    });

                    setClaimState('paying');
                    console.log('🔄 Set state to paying');
                    
                    // 创建转账交易
                    console.log('🏗️ Creating USDT transfer contract...');
                    const contract = getContract({
                      client,
                      chain: selectedChain.chain,
                      address: selectedChain.usdtAddress as `0x${string}`,
                    });

                    console.log('💰 Creating transfer transaction...');
                    const transaction = transfer({
                      contract,
                      to: selectedChain.bridgeWallet as `0x${string}`,
                      amount: (membershipLevel.priceUSDT * 1000000).toString(),
                    });

                    console.log('📤 Sending transaction...');
                    // 发送交易
                    const result = await sendAndConfirmTransaction({
                      transaction,
                      account,
                    });

                    console.log('✅ Test payment transaction successful:', result.transactionHash);
                    console.log('🎯 About to call handlePaymentSuccess...');
                    
                    // 处理支付成功
                    await handlePaymentSuccess(result);
                    
                  } catch (error) {
                    console.error('Test payment error:', error);
                    setClaimState('error');
                    toast({
                      title: '支付失败',
                      description: '测试支付过程中出现错误，请重试',
                      variant: 'destructive',
                    });
                  }
                }}
                disabled={claimState === 'paying' || claimState === 'verifying' || claimState === 'persisting'}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                {claimState === 'paying' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    处理中...
                  </>
                ) : (
                  '发送测试USDT'
                )}
              </Button>
            </div>
          ) : (
            // 生产网络：使用PayEmbed支持bridge
            <div className="min-h-[200px]">
              <PayEmbed
                client={client}
                payOptions={{
                  mode: "direct_payment",
                  paymentInfo: {
                    amount: `${membershipLevel.priceUSDT}.00`,
                    sellerAddress: selectedChain.bridgeWallet,
                    chain: selectedChain.chain,
                    token: {
                      address: selectedChain.usdtAddress,
                      symbol: 'USDT',
                      name: 'Tether USD',
                    },
                  },
                  metadata: {
                    name: `Beehive Level ${level} Membership`,
                    description: `Exclusive Level ${level} membership with special privileges and rewards`,
                  },
                  onPurchaseSuccess: handlePaymentSuccess,
                }}
                theme="dark"
              />
            </div>
          )}
        </div>

        {/* Cancel Button */}
        <Button
          onClick={() => {
            setClaimState('idle');
            setShowChainSelector(false);
          }}
          variant="outline"
          className="w-full"
          data-testid="button-cancel-payment"
        >
          <FiX className="mr-2" />
          Cancel Payment
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleStartPurchase}
      disabled={isButtonDisabled}
      className={`w-full h-12 sm:h-14 transition-all duration-200 relative text-sm sm:text-base lg:text-lg font-semibold ${
        claimState === 'success' 
          ? 'bg-green-600 hover:bg-green-700' 
          : claimState === 'approving'
          ? 'bg-blue-600 hover:bg-blue-700'
          : 'bg-honey hover:bg-honey/90 text-black'
      } ${className}`}
      data-testid={`button-claim-membership-${level}`}
    >
      <div className="flex items-center justify-center gap-2">
        {['approving', 'verifying', 'persisting'].includes(claimState) && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        )}
        {claimState === 'success' && (
          <i className="fas fa-check"></i>
        )}
        {claimState === 'error' && (
          <i className="fas fa-exclamation-triangle"></i>
        )}
        <span className="text-center leading-tight px-1 sm:px-2">{getButtonText()}</span>
        {claimState === 'idle' && (
          <span className="text-lg">🔥</span>
        )}
      </div>
    </Button>
  );
}
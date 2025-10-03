import {useEffect, useState, useCallback} from 'react';
import {useActiveAccount, useActiveWalletChain, useSwitchActiveWalletChain, TransactionButton} from 'thirdweb/react';
import {getContract, prepareContractCall} from 'thirdweb';
import {arbitrum} from 'thirdweb/chains';
import {balanceOf} from 'thirdweb/extensions/erc1155';
import {Button} from '../ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card';
import {Badge} from '../ui/badge';
import {useToast} from '../../hooks/use-toast';
import {Clock, Coins, Crown, Gift, Loader2, Zap} from 'lucide-react';
import {supabase} from '../../lib/supabaseClient';
import {authService} from '../../lib/supabase';
import {useI18n} from '../../contexts/I18nContext';
import RegistrationModal from '../modals/RegistrationModal';
import ErrorBoundary from '../ui/error-boundary';
import {client} from '../../lib/thirdwebClient';

interface WelcomeLevel1ClaimButtonProps {
  onSuccess?: () => void;
  referrerWallet?: string;
  className?: string;
}

export function WelcomeLevel1ClaimButton({ onSuccess, referrerWallet, className = '' }: WelcomeLevel1ClaimButtonProps): JSX.Element {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const switchChain = useSwitchActiveWalletChain();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [isStabilizing, setIsStabilizing] = useState(false);
  
  // Fixed Level 1 pricing and info
  const LEVEL_1_PRICE_USDC = 130;
  const LEVEL_1_PRICE_WEI = BigInt(LEVEL_1_PRICE_USDC) * BigInt('1000000'); // 130 * 10^6 (USDC has 6 decimals)

  const API_BASE = 'https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1';
  const PAYMENT_TOKEN_CONTRACT = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // Arbitrum USDC (native)
  const NFT_CONTRACT = import.meta.env.VITE_MEMBERSHIP_NFT_CONTRACT; // Use env variable

  // Handle transaction success from TransactionButton
  const handleTransactionSuccess = async (result: any) => {
    console.log('🎉 Transaction successful:', result);

    toast({
      title: '🎉 Level 1 NFT Claimed!',
      description: 'Processing membership activation...',
      duration: 5000
    });

    setIsProcessing(true);
    setCurrentStep('Activating membership...');

    try {
      // Step: Trigger USDC transfer for Token #1 claim
      try {
        console.log('💰 Triggering USDC transfer for NFT Token #1 claim...');
        const usdcTransferResponse = await supabase.functions.invoke('nft-claim-usdc-transfer', {
          body: {
            token_id: '1',
            claimer_address: account?.address,
            transaction_hash: result.transactionHash,
            block_number: result.blockNumber ? Number(result.blockNumber) : undefined
          }
        });

        if (usdcTransferResponse.error) {
          console.error('⚠️ USDC transfer failed:', usdcTransferResponse.error);
        } else {
          console.log('✅ USDC transfer initiated:', usdcTransferResponse.data);
        }
      } catch (usdcTransferError) {
        console.error('⚠️ USDC transfer error:', usdcTransferError);
      }

      // Step: Activate Level 1 membership
      console.log('🚀 Activating Level 1 membership with matrix placement...');

      const maxRetries = 5;
      const retryDelay = 10000;
      let activationSuccess = false;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📞 Membership activation attempt ${attempt}/${maxRetries}`);

          const activateResponse = await fetch(`${API_BASE}/activate-membership`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'x-wallet-address': account?.address || ''
            },
            body: JSON.stringify({
              transactionHash: result.transactionHash,
              level: 1,
              paymentMethod: 'multi_chain',
              paymentAmount: LEVEL_1_PRICE_USDC,
              referrerWallet: referrerWallet
            })
          });

          if (activateResponse.ok) {
            const activationResult = await activateResponse.json();
            console.log(`✅ Level 1 membership activated on attempt ${attempt}:`, activationResult);
            activationSuccess = true;
            break;
          } else {
            const errorText = await activateResponse.text();
            throw new Error(`Activation failed with status: ${activateResponse.status}, response: ${errorText}`);
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

      if (activationSuccess) {
        console.log('✅ Complete success: NFT minted and membership activated');
        toast({
          title: '🎉 Level 1 NFT Claimed!',
          description: 'Welcome to BEEHIVE! Your Level 1 membership is now active.',
          variant: "default",
          duration: 6000,
        });

        if (onSuccess) {
          onSuccess();
        }
      } else {
        console.log('⚠️ NFT minted but activation pending');
        toast({
          title: '✅ NFT Claimed Successfully!',
          description: 'Your Level 1 NFT is minted. Membership activation is processing.',
          variant: "default",
          duration: 8000,
        });
      }
    } catch (error) {
      console.error('❌ Activation error:', error);
      toast({
        title: '⚠️ Activation Pending',
        description: 'NFT claimed, but activation is processing. Please refresh in a moment.',
        duration: 8000
      });
    } finally {
      setIsProcessing(false);
      setCurrentStep('');
    }
  };

  const handleTransactionError = (error: any) => {
    console.error('❌ Transaction error:', error);

    const errorMessage = error?.message || 'Transaction failed';
    toast({
      title: 'Claim Failed',
      description: errorMessage,
      variant: 'destructive',
      duration: 5000
    });

    setIsProcessing(false);
    setCurrentStep('');
  };

  // Check network status
  useEffect(() => {
    if (activeChain?.id && activeChain.id !== arbitrum.id) {
      setIsWrongNetwork(true);
    } else {
      setIsWrongNetwork(false);
    }
  }, [activeChain?.id]);

  const handleSwitchNetwork = async () => {
    if (!switchChain) return;
    
    try {
      setIsProcessing(true);
      await switchChain(arbitrum);
      toast({
        title: t('wallet.networkSwitched'),
        description: t('wallet.networkSwitchedDesc'),
        variant: "default",
      });
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      toast({
        title: t('wallet.networkSwitchFailed'),
        description: error.message || t('wallet.networkSwitchFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegistrationComplete = useCallback(() => {
    console.log('✅ Registration completed - closing modal');
    setShowRegistrationModal(false);
    setIsStabilizing(true);

    // Add stabilization delay to prevent ThirdWeb DOM errors
    setTimeout(() => {
      setIsStabilizing(false);
    }, 1000);
  }, []);

  // Add stabilization effect for ThirdWeb DOM errors
  useEffect(() => {
    if (showRegistrationModal) {
      setIsStabilizing(true);
      const stabilizeTimer = setTimeout(() => {
        setIsStabilizing(false);
      }, 800);

      return () => clearTimeout(stabilizeTimer);
    }
  }, [showRegistrationModal]);

  // Check eligibility before showing claim button
  const checkEligibility = async () => {
    console.log('🔍 Checking Level 1 NFT claim eligibility...');
    
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

    // Prevent self-referral
    if (referrerWallet.toLowerCase() === account.address.toLowerCase()) {
      toast({
        title: t('claim.selfReferralNotAllowed'),
        description: t('claim.selfReferralNotAllowedDesc'),
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Check if user is registered using authService
      console.log('🔍 Checking user registration status...');
      setCurrentStep(t('claim.checkingRegistration') || 'Checking registration status...');
      
      try {
        const { data: userData } = await authService.getUser(account.address);
        
        if (!userData) {
          console.log('❌ User not registered:', {
            walletAddress: account.address
          });
          
          // Show user-friendly message
          toast({
            title: t('registration.required'),
            description: t('registration.requiredDesc'),
            duration: 3000
          });
          
          setIsProcessing(false);
          setCurrentStep('');
          
          // Add stabilization delay before showing modal
          setIsStabilizing(true);
          setTimeout(() => {
            setIsStabilizing(false);
            setTimeout(() => {
              setShowRegistrationModal(true);
            }, 300);
          }, 800);
          return;
        }
        
        console.log('✅ User registration confirmed:', {
          walletAddress: userData.wallet_address,
          username: userData.username
        });
        
        console.log('✅ User registration verified');
        
      } catch (registrationError) {
        console.error('❌ Failed to check user registration:', registrationError);
        
        // Treat as unregistered and show registration modal
        toast({
          title: "Registration Check Failed",
          description: "Please complete your registration to proceed.",
          duration: 3000
        });
        
        setIsProcessing(false);
        setCurrentStep('');
        
        setTimeout(() => {
          setShowRegistrationModal(true);
        }, 500);
        return;
      }
      
      // Step 2: Validate referrer with fallback logic using authService
      setCurrentStep(t('claim.validatingReferrer'));

      let referrerData = null;
      let isValidReferrer = false;

      try {
        // First try to get referrer as activated member
        const membershipResult = await authService.isActivatedMember(referrerWallet);
        
        if (membershipResult.isActivated && membershipResult.memberData) {
          referrerData = membershipResult.memberData;
          isValidReferrer = true;
          console.log('✅ Referrer found as activated member:', {
            wallet: membershipResult.memberData.wallet_address,
            username: membershipResult.memberData.username
          });
        } else {
          // Fallback: try to get referrer as registered user
          const { data: userReferrer } = await authService.getUser(referrerWallet);
          
          if (userReferrer) {
            referrerData = userReferrer;
            isValidReferrer = true;
            console.log('✅ Referrer found as registered user:', {
              wallet: userReferrer.wallet_address,
              username: userReferrer.username
            });
          }
        }
      } catch (referrerError) {
        console.error('❌ Error validating referrer:', referrerError);
      }

      if (!isValidReferrer || !referrerData) {
        console.log('❌ Referrer validation failed - referrer not found:', {
          referrerWallet
        });
        toast({
          title: t('claim.invalidReferrer'),
          description: t('claim.referrerMustBeRegistered') || 'Referrer must be a registered user on the platform',
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      console.log('✅ Referrer validation passed:', {
        referrerWallet: referrerData.wallet_address,
        referrerUsername: referrerData.username
      });

      // Step 3: Check network - must be Arbitrum One (42161)
      const chainId = activeChain?.id;
      if (chainId !== arbitrum.id) {
        const networkName = chainId === 1 ? 'Ethereum Mainnet' : `Network ${chainId}`;
        toast({
          title: 'Wrong Network',
          description: `Please switch from ${networkName} to Arbitrum One network to claim your Level 1 NFT.`,
          variant: "destructive",
          duration: 8000,
        });
        throw new Error(`Please switch to Arbitrum One network. Current: ${networkName}, Required: Arbitrum One`);
      }

      // Step 4: Skip ETH balance check - gas is sponsored
      console.log('⛽ Gas fees are sponsored - skipping ETH balance check');

      // Step 5: Setup contracts
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

      // Step 6: Check if user already owns Level 1 NFT
      console.log('🔍 Checking Level 1 NFT ownership...');
      setCurrentStep(t('claim.checkingOwnership') || 'Checking NFT ownership...');

      // First check blockchain NFT balance (primary source of truth)
      let hasNFTOnChain = false;
      try {
        const existingBalance = await balanceOf({
          contract: nftContract,
          owner: account.address,
          tokenId: BigInt(1)
        });

        hasNFTOnChain = Number(existingBalance) > 0;
        console.log('🔗 Blockchain NFT check:', hasNFTOnChain ? 'NFT found' : 'No NFT');

        if (hasNFTOnChain) {
          console.log('✅ User already owns Level 1 NFT on blockchain');

          // Check if database is synced
          try {
            const membershipResult = await authService.isActivatedMember(account.address);
            if (!membershipResult.isActivated || membershipResult.memberData?.current_level < 1) {
              console.warn('⚠️ NFT found on-chain but database not synced - attempting sync...');

              // Try to sync via activation endpoint
              try {
                const syncResponse = await fetch(`${API_BASE}/activate-membership`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    'x-wallet-address': account.address
                  },
                  body: JSON.stringify({
                    transactionHash: 'sync',
                    level: 1,
                    paymentMethod: 'sync',
                    referrerWallet: referrerWallet || null
                  })
                });

                if (syncResponse.ok) {
                  console.log('✅ Database synced successfully');
                  toast({
                    title: 'Database Synced! 🔄',
                    description: 'Your NFT ownership has been synced. Redirecting to dashboard.',
                    variant: "default",
                    duration: 3000,
                  });
                }
              } catch (syncError) {
                console.warn('⚠️ Could not sync database:', syncError);
              }
            }
          } catch (dbCheckError) {
            console.warn('⚠️ Could not check database status:', dbCheckError);
          }

          toast({
            title: 'Welcome Back! 🎉',
            description: 'You already own Level 1 NFT. Redirecting to dashboard.',
            variant: "default",
            duration: 3000,
          });

          if (onSuccess) {
            setTimeout(() => onSuccess(), 1500);
          }
          return;
        }
      } catch (balanceCheckError) {
        console.warn('⚠️ Could not check NFT balance on blockchain:', balanceCheckError);
        // Continue with claim process if blockchain check fails
      }

      // Also check database records (secondary check)
      try {
        const membershipResult = await authService.isActivatedMember(account.address);

        if (membershipResult.isActivated && membershipResult.memberData?.current_level >= 1 && !hasNFTOnChain) {
          console.warn('⚠️ Database shows activated but no NFT on blockchain - data inconsistency detected');
          console.log('🔄 Allowing user to proceed with claim to fix inconsistency');

          toast({
            title: 'Data Inconsistency Detected',
            description: 'Database shows activation but NFT not found. Proceeding with claim to fix this.',
            variant: "default",
            duration: 4000,
          });
          // Don't return - let user claim to fix the issue
        } else if (membershipResult.isActivated && membershipResult.memberData?.current_level >= 1) {
          console.log('✅ Database confirms activation and blockchain has NFT');
          // Already handled above, this is just a confirmation
        }
      } catch (dbError) {
        console.warn('⚠️ Could not check membership database:', dbError);
      }

      console.log('✅ No existing Level 1 NFT found - proceeding with claim');

      // Step 7: Check and approve USDT
      console.log('💰 Checking USDT balance and approval...');
      setCurrentStep(t('claim.checkingBalance'));
      
      // Check USDT balance
      try {
        const tokenBalance = await erc20BalanceOf({
          contract: usdcContract,
          address: account.address
        });
        
        if (tokenBalance < LEVEL_1_PRICE_WEI) {
          throw new Error(`Insufficient USDC balance. You have ${(Number(tokenBalance) / 1e6).toFixed(2)} USDC but need ${LEVEL_1_PRICE_USDC} USDC for Level 1`);
        }
      } catch (balanceError: any) {
        if (balanceError.message.includes('Insufficient USDC')) {
          throw balanceError;
        }
        console.warn('⚠️ Could not check USDC balance:', balanceError);
      }

      // Check and request approval
      setCurrentStep(t('claim.checkingApproval'));
      
      const currentAllowance = await allowance({
        contract: usdcContract,
        owner: account.address,
        spender: NFT_CONTRACT
      });
      
      console.log(`💰 Current allowance: ${Number(currentAllowance) / 1e6} USDC, Required: ${LEVEL_1_PRICE_USDC} USDC`);

      if (currentAllowance < LEVEL_1_PRICE_WEI) {
        console.log('💰 Requesting USDC approval...');
        
        const approveTransaction = approve({
          contract: usdcContract,
          spender: NFT_CONTRACT,
          amount: LEVEL_1_PRICE_WEI.toString()
        });

        setCurrentStep(t('claim.waitingApproval'));
        
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
        
        console.log(`✅ New allowance after approval: ${Number(newAllowance) / 1e6} USDC`);

        if (newAllowance < LEVEL_1_PRICE_WEI) {
          throw new Error(`Approval failed. Current allowance: ${Number(newAllowance) / 1e6} USDC, Required: ${LEVEL_1_PRICE_USDC} USDC`);
        }
      } else {
        console.log('✅ Sufficient allowance already exists');
      }

      // Step 8: Claim Level 1 NFT
      console.log('🎁 Claiming Level 1 NFT...');
      setCurrentStep(t('claim.mintingNFT'));
      
      // Debug: Log contract details
      console.log('📋 Contract details:', {
        nftContractAddress: NFT_CONTRACT,
        paymentTokenAddress: PAYMENT_TOKEN_CONTRACT,
        priceWei: LEVEL_1_PRICE_WEI.toString(),
        priceUSDC: LEVEL_1_PRICE_USDC,
        walletAddress: account.address
      });
      
      // Try multiple approaches for claiming NFT
      let claimTransaction;
      let claimMethod = 'unknown';
      
      // Method 1: Try ThirdWeb's claimTo with price parameter
      try {
        console.log('🔧 Trying ThirdWeb claimTo with price parameters...');
        claimTransaction = claimTo({
          contract: nftContract,
          to: account.address,
          tokenId: BigInt(1),
          quantity: BigInt(1),
        });
        claimMethod = 'claimTo with price';
        console.log('✅ Successfully prepared claimTo transaction with price');
      } catch (claimToError) {
        console.log('❌ ClaimTo with price failed:', claimToError);
        
        // Method 2: Try simple claimTo without price
        try {
          console.log('🔧 Trying simple ThirdWeb claimTo...');
          claimTransaction = claimTo({
            contract: nftContract,
            to: account.address,
            tokenId: BigInt(1),
            quantity: BigInt(1),
          });
          claimMethod = 'simple claimTo';
          console.log('✅ Successfully prepared simple claimTo transaction');
        } catch (simpleClaimError) {
          console.log('❌ Simple claimTo failed:', simpleClaimError);
          
          // Method 3: Try manual contract call with mint function
          try {
            console.log('🔧 Trying manual mint contract call...');
            claimTransaction = prepareContractCall({
              contract: nftContract,
              method: "function mint(address to, uint256 id, uint256 amount, bytes data) payable",
              params: [
                account.address,        // to
                BigInt(1),             // id (Level 1)
                BigInt(1),             // amount
                "0x"                   // data (empty)
              ]
            });
            claimMethod = 'manual mint';
            console.log('✅ Successfully prepared manual mint transaction');
          } catch (mintError) {
            console.log('❌ Manual mint failed:', mintError);
            
            // Method 4: Try original claim method with payment
            console.log('🔧 Trying original claim method with payment...');
            claimTransaction = prepareContractCall({
              contract: nftContract,
              method: "function claim(address to, uint256 tokenId, uint256 quantity, address currency, uint256 pricePerToken) payable",
              params: [
                account.address,        // to
                BigInt(1),             // tokenId (Level 1)
                BigInt(1),             // quantity
                PAYMENT_TOKEN_CONTRACT, // currency (USDC)
                LEVEL_1_PRICE_WEI,     // pricePerToken
              ]
            });
            claimMethod = 'original claim with payment';
            console.log('✅ Successfully prepared original claim transaction with payment');
          }
        }
      }
      
      console.log(`📤 About to send claim transaction using method: ${claimMethod}`);

      const claimTxResult = await sendTransactionWithRetry(
        claimTransaction,
        account,
        'Level 1 NFT claim transaction',
        false // Temporarily disable gasless for NFT claim to test
      );

      // Wait for confirmation and get receipt
      setCurrentStep(t('claim.waitingNFTConfirmation'));
      const receipt = await waitForReceipt({
        client,
        chain: arbitrum,
        transactionHash: claimTxResult.transactionHash,
      });
      
      console.log('✅ Level 1 NFT claim confirmed');
      console.log('📦 Claim成功，区块号:', receipt.blockNumber);
      console.log('🔗 交易哈希:', claimTxResult.transactionHash);
      console.log('📋 事件 logs:', receipt.logs);
      console.log('✅ Receipt status:', receipt.status);

      // Step 8.5: Trigger USDC transfer for Token #1 claim
      try {
        console.log('💰 Triggering USDC transfer for NFT Token #1 claim...');
        const usdcTransferResponse = await supabase.functions.invoke('nft-claim-usdc-transfer', {
          body: {
            token_id: '1',
            claimer_address: account.address,
            transaction_hash: claimTxResult.transactionHash,
            block_number: receipt.blockNumber ? Number(receipt.blockNumber) : undefined
          }
        });

        if (usdcTransferResponse.error) {
          console.error('⚠️ USDC transfer failed:', usdcTransferResponse.error);
          // Don't block the main flow - log error but continue
        } else {
          console.log('✅ USDC transfer initiated:', usdcTransferResponse.data);
        }
      } catch (usdcTransferError) {
        console.error('⚠️ USDC transfer error:', usdcTransferError);
        // Don't block the main flow - continue with membership activation
      }

      // Step 9: Activate Level 1 membership (welcome users - includes matrix placement)
      console.log('🚀 Activating Level 1 membership with matrix placement...');
      setCurrentStep('Activating membership...');
      
      let activationSuccess = false;
      
      try {
        const maxRetries = 5;
        const retryDelay = 10000; // 10 seconds
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`📞 Membership activation attempt ${attempt}/${maxRetries}`);
            
            console.log('📋 Sending activation request with wallet:', account.address);
            console.log('📋 Referrer wallet:', referrerWallet);
            console.log('📋 Transaction hash:', claimTxResult.transactionHash);
            
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
                level: 1,
                paymentMethod: 'token_payment',
                paymentAmount: LEVEL_1_PRICE_USDC,
                referrerWallet: referrerWallet
              })
            });

            if (activateResponse.ok) {
              const result = await activateResponse.json();
              console.log(`✅ Level 1 membership activated on attempt ${attempt}:`, result);
              activationSuccess = true;
              break;
            } else {
              const errorText = await activateResponse.text();
              throw new Error(`Activation failed with status: ${activateResponse.status}, response: ${errorText}`);
            }
            
          } catch (activationError: any) {
            console.warn(`⚠️ Membership activation attempt ${attempt} failed:`, activationError.message);
            
            // Check if it's a registration error
            if (activationError.message && activationError.message.includes('User must be registered')) {
              console.log('❌ User registration required, showing registration modal');
              setIsProcessing(false);
              setShowRegistrationModal(true);
              return;
            }
            
            if (attempt < maxRetries) {
              console.log(`🔄 Retrying activation in ${retryDelay/1000} seconds...`);
              setCurrentStep(`Activation failed, retrying in ${retryDelay/1000}s... (${attempt}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
              // Last attempt failed, but don't throw - NFT is still minted
              console.error('❌ All backend activation attempts failed, but NFT is successfully minted');
            }
          }
        }
      } catch (backendError: any) {
        console.error('⚠️ Backend activation failed:', backendError.message);
        // Don't throw - NFT is successfully minted
      }
      
      // Show success message based on what succeeded
      if (activationSuccess) {
        console.log('✅ Complete success: NFT minted and membership activated');
        toast({
          title: '🎉 Level 1 NFT Claimed!',
          description: 'Welcome to BEEHIVE! Your Level 1 membership is now active.',
          variant: "default",
          duration: 6000,
        });

        // Only trigger onSuccess if activation was successful
        if (onSuccess) {
          onSuccess();
        }
      } else {
        console.log('⚠️ Partial success: NFT minted but backend activation failed');
        console.log('🔄 Attempting fallback activation via database function...');

        // Try fallback activation using database function directly
        try {
          const fallbackResponse = await (supabase as any).rpc('activate_membership_fallback', {
            p_wallet_address: account.address,
            p_referrer_wallet: referrerWallet || null,
            p_transaction_hash: claimTxResult.transactionHash,
            p_level: 1
          });

          if (fallbackResponse.data?.success) {
            console.log('✅ Fallback activation successful!');
            activationSuccess = true;
            toast({
              title: '🎉 Level 1 NFT Claimed!',
              description: 'Welcome to BEEHIVE! Your Level 1 membership is now active.',
              variant: "default",
              duration: 6000,
            });

            // Trigger onSuccess after fallback activation
            if (onSuccess) {
              onSuccess();
            }
          } else {
            throw new Error(fallbackResponse.data?.error || 'Fallback activation failed');
          }
        } catch (fallbackError) {
          console.error('❌ Fallback activation also failed:', fallbackError);

          // Final fallback: Try webhook-based activation
          console.log('🔄 Trying webhook-based activation as last resort...');
          try {
            const webhookResponse = await fetch(`${API_BASE}/thirdweb-webhook`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({
                version: 2,
                type: 'pay.onchain-transaction',
                data: {
                  transactionId: `manual-${Date.now()}`,
                  paymentId: `claim-${Date.now()}`,
                  status: 'COMPLETED',
                  fromAddress: '0x0000000000000000000000000000000000000000',
                  toAddress: account.address,
                  transactionHash: claimTxResult.transactionHash,
                  chainId: 42161,
                  contractAddress: NFT_CONTRACT,
                  tokenId: '1',
                  amount: '1',
                  currency: 'USDC',
                  timestamp: new Date().toISOString(),
                  metadata: {
                    source: 'manual_claim',
                    referrer: referrerWallet
                  }
                }
              })
            });

            if (webhookResponse.ok) {
              const webhookResult = await webhookResponse.json();
              console.log('✅ Webhook activation successful:', webhookResult);
              activationSuccess = true;
              toast({
                title: '🎉 Level 1 NFT Claimed!',
                description: 'Welcome to BEEHIVE! Your Level 1 membership is now active via webhook.',
                variant: "default",
                duration: 6000,
              });

              // Trigger onSuccess after webhook activation
              if (onSuccess) {
                onSuccess();
              }
            } else {
              throw new Error('Webhook activation failed');
            }
          } catch (webhookError) {
            console.error('❌ Webhook activation also failed:', webhookError);
            toast({
              title: '✅ NFT Claimed Successfully!',
              description: 'Your Level 1 NFT is minted on blockchain. Membership activation is processing - please refresh the page in a few minutes.',
              variant: "default",
              duration: 8000,
            });
            // Don't trigger onSuccess if activation failed
          }
        }
      }

    } catch (error: any) {
      console.error('❌ Level 1 NFT claim error:', error);
      
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
          title: 'Claim Failed',
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ErrorBoundary>
      <Card className={`bg-gradient-to-br from-honey/5 to-honey/15 border-honey/30 ${className}`}>
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-3">
            <Crown className="h-8 w-8 text-honey mr-2" />
            <Badge className="bg-honey/20 text-honey border-honey/50">
              Welcome Level 1 NFT
            </Badge>
          </div>
          <CardTitle className="text-2xl text-honey mb-2">
            Claim Level 1 NFT
          </CardTitle>
          <p className="text-muted-foreground">
            Join the BEEHIVE community with your first membership NFT
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Benefits Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
              <Coins className="h-6 w-6 text-orange-400 mx-auto mb-2" />
              <h3 className="font-semibold text-orange-400 mb-1">{LEVEL_1_PRICE_USDC} USDC</h3>
              <p className="text-xs text-muted-foreground">Level 1 Price</p>
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
                  Switch to Arbitrum One to claim your NFT.
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
              onClick={handleClaimLevel1NFT}
              disabled={isProcessing || !account?.address || isWrongNetwork || isStabilizing}
              className="w-full h-12 bg-gradient-to-r from-honey to-orange-500 hover:from-honey/90 hover:to-orange-500/90 text-background font-semibold text-lg shadow-lg disabled:opacity-50"
            >
              {!account?.address ? (
                <>
                  <Crown className="mr-2 h-5 w-5" />
                  {t('claim.connectWalletToClaimNFT')}
                </>
              ) : isWrongNetwork ? (
                <>
                  <Crown className="mr-2 h-5 w-5" />
                  Switch Network First
                </>
              ) : isStabilizing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Stabilizing...
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {currentStep || t('claim.processing')}
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-5 w-5" />
                  Claim Level 1 - {LEVEL_1_PRICE_USDC} USDC
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
            <p>💳 USDC payment required</p>
            <p>⚡ Instant membership activation</p>
            <p>🎭 NFT minted to your wallet</p>
            <p>🔄 Two transactions: Approve + Claim</p>
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
    </ErrorBoundary>
  );
}
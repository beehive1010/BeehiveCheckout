import React, { useState, useEffect } from 'react';
import { inAppWallet } from "thirdweb/wallets";
import { claimTo } from "thirdweb/extensions/erc1155";
import { approve, allowance } from "thirdweb/extensions/erc20";
import { ConnectButton, TransactionButton } from "thirdweb/react";
import { arbitrum } from "thirdweb/chains";
import { getContract } from "thirdweb";
import { useActiveAccount } from "thirdweb/react";
import { client } from "../../lib/thirdwebClient";
import { toast } from "react-hot-toast";
import { useWallet } from "../../hooks/useWallet";
import { supabase } from "../../lib/supabaseClient";
import { readContract } from "thirdweb";

// Contract addresses from environment
const MEMBERSHIP_NFT_CONTRACT = import.meta.env.VITE_MEMBERSHIP_NFT_CONTRACT;
const USDT_CONTRACT = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'; // Arbitrum USDT

// Configure wallets with ARB One sponsorship
const wallets = [
  inAppWallet({
    auth: {
      options: ["email", "phone", "google", "passkey"],
    },
    smartAccount: {
      chain: arbitrum,
      sponsorGas: true,
    },
  }),
];

// Get contract instances
const nftContract = getContract({
  client,
  chain: arbitrum,
  address: MEMBERSHIP_NFT_CONTRACT,
});

const usdtContract = getContract({
  client,
  chain: arbitrum, 
  address: USDT_CONTRACT,
});

interface ActiveMembershipClaimButtonProps {
  onClaimSuccess?: (txHash: string) => void;
  onClaimError?: (error: Error) => void;
  disabled?: boolean;
  className?: string;
}

export function ActiveMembershipClaimButton({
  onClaimSuccess,
  onClaimError,
  disabled = false,
  className = ""
}: ActiveMembershipClaimButtonProps) {
  const account = useActiveAccount();
  const { refreshUserData } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  
  // USDT has 6 decimals on Arbitrum
  const REQUIRED_AMOUNT = "130000000"; // 130 USDT (6 decimals)
  const DISPLAY_AMOUNT = "130"; // For display purposes

  // Function to check USDT allowance
  const checkUSDTAllowance = async () => {
    if (!account?.address || !USDT_CONTRACT || !MEMBERSHIP_NFT_CONTRACT) {
      console.warn('⚠️ Missing required data for allowance check:', {
        address: account?.address,
        usdtContract: USDT_CONTRACT,
        nftContract: MEMBERSHIP_NFT_CONTRACT
      });
      setNeedsApproval(true);
      setIsCheckingAllowance(false);
      return;
    }
    
    setIsCheckingAllowance(true);
    try {
      console.log('🔍 Checking USDT allowance for:', account.address);
      console.log('🔍 USDT Contract:', USDT_CONTRACT);
      console.log('🔍 NFT Contract:', MEMBERSHIP_NFT_CONTRACT);
      
      // Skip allowance check for now - just set to needs approval
      console.log('⚠️ Skipping allowance check - setting to needs approval');
      setNeedsApproval(true);
      
    } catch (error) {
      console.error('❌ Error checking USDT allowance:', error);
      console.error('❌ Error details:', (error as any)?.message || error);
      // Assume approval is needed on error
      setNeedsApproval(true);
    } finally {
      setIsCheckingAllowance(false);
    }
  };

  // Function to check if user is registered
  const checkUserRegistration = async () => {
    if (!account?.address) return;
    
    try {
      console.log('🔍 Checking user registration status...');
      const { data } = await supabase
        .from('users')
        .select('wallet_address, username')
        .eq('wallet_address', account.address)
        .single();
      
      if (data) {
        console.log('✅ User is already registered:', data);
        setIsUserRegistered(true);
        return true;
      } else {
        console.log('⚠️ User not registered yet');
        setIsUserRegistered(false);
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking user registration:', error);
      setIsUserRegistered(false);
      return false;
    }
  };

  // 🔧 FIX: Do NOT auto-register users - require proper registration first
  // This function has been removed to prevent auto-registration with auto-generated usernames
  // Users must go through the proper registration flow before claiming NFTs
  const registerUser = async () => {
    if (!account?.address) return false;

    // User is not registered - show error and redirect to registration
    console.error('❌ User not registered:', account.address);
    toast.error('Please complete registration before claiming NFT. Redirecting to Welcome page...');

    // Redirect to Welcome page which has proper registration flow
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);

    return false;
  };

  // Check user registration and allowance when account changes
  useEffect(() => {
    let isMounted = true;

    const runChecks = async () => {
      if (account?.address && isMounted) {
        await checkUserRegistration();
        await checkUSDTAllowance();
      }
    };

    runChecks();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [account?.address]);

  // Function to call ThirdWeb webhook for membership activation
  const callThirdWebWebhook = async (transactionHash: string, walletAddress: string) => {
    try {
      console.log('🎯 Calling ThirdWeb webhook for membership activation...');
      
      const webhookResponse = await fetch('/api/thirdweb-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'nft_claimed',
          transactionHash,
          walletAddress,
          contractAddress: MEMBERSHIP_NFT_CONTRACT,
          tokenId: 1,
          quantity: 1,
          paymentAmount: 130,
          network: 'arbitrum-one'
        }),
      });

      if (webhookResponse.ok) {
        console.log('✅ ThirdWeb webhook called successfully');
        return true;
      } else {
        console.error('❌ ThirdWeb webhook failed:', await webhookResponse.text());
        return false;
      }
    } catch (error) {
      console.error('❌ Error calling ThirdWeb webhook:', error);
      return false;
    }
  };

  // Function to activate membership using Supabase Edge Function
  const activateMembership = async (transactionHash: string, walletAddress: string) => {
    try {
      console.log('🚀 Activating membership via Edge Function...');
      
      // 保持原始混合大小写格式，不转换为小写
      const { data, error } = await supabase.rpc('activate_nft_level1_membership', {
        p_wallet_address: walletAddress, // 保持原始格式
        p_referrer_wallet: undefined // Will be auto-detected from users table
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        return false;
      }

      console.log('✅ Membership activated successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Error activating membership:', error);
      return false;
    }
  };

  const handleClaimSuccess = async (result: any) => {
    console.log('🎉 NFT Claim successful:', result);
    setIsProcessing(true);
    
    const transactionHash = result.transactionHash;
    const walletAddress = account?.address;

    if (!walletAddress) {
      console.error('❌ No wallet address available');
      setIsProcessing(false);
      return;
    }

    // Show initial success
    toast.success('Level 1 NFT claimed successfully!');

    try {
      // Step 1: Call ThirdWeb webhook (fallback mechanism)
      const webhookSuccess = await callThirdWebWebhook(transactionHash, walletAddress);
      
      // Step 2: Activate membership via database function
      const membershipSuccess = await activateMembership(transactionHash, walletAddress);
      
      if (membershipSuccess) {
        toast.success('🎉 Membership activated! Welcome to Level 1!');
        
        // Refresh user data to update UI
        refreshUserData();
        
        // Call external success callback
        if (onClaimSuccess) {
          onClaimSuccess(transactionHash);
        }
      } else {
        toast.error('NFT claimed but membership activation failed. Please contact support.');
      }
      
    } catch (error) {
      console.error('❌ Post-claim processing error:', error);
      toast.error('NFT claimed but there was an issue with activation. Please contact support.');
    }
    
    setIsProcessing(false);
  };

  const handleClaimError = (error: Error) => {
    console.error('❌ NFT Claim failed:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    let errorMessage = 'Claim failed';
    if (error.message) {
      errorMessage = `Claim failed: ${error.message}`;
    } else if (error.name) {
      errorMessage = `Claim failed: ${error.name}`;
    }
    
    toast.error(errorMessage);
    
    if (onClaimError) {
      onClaimError(error);
    }
    setIsProcessing(false);
  };

  const handleApprovalSuccess = async (result: any) => {
    console.log('✅ USDT Approval successful:', result);
    toast.success('USDT approval confirmed! You can now claim the NFT.');
    setIsApproving(false);
    
    // Set to not needing approval anymore
    setNeedsApproval(false);
  };

  const handleApprovalError = (error: Error) => {
    console.error('❌ USDT Approval failed:', error);
    console.error('❌ Approval error name:', error.name);
    console.error('❌ Approval error message:', error.message);
    console.error('❌ Approval error stack:', error.stack);
    
    let errorMessage = 'Approval failed';
    if (error.message) {
      errorMessage = `Approval failed: ${error.message}`;
    } else if (error.name) {
      errorMessage = `Approval failed: ${error.name}`;
    }
    
    toast.error(errorMessage);
    setIsApproving(false);
  };

  if (!account) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200">
          <ConnectButton 
            client={client} 
            wallets={wallets}
            chain={arbitrum}
          />
        </div>
        <p className="text-sm text-gray-600 text-center">
          Connect your wallet to claim Level 1 NFT
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          🎫 Claim Level 1 Membership NFT
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Payment: {DISPLAY_AMOUNT} USDT</p>
          <p>• Token ID: 1</p>
          <p>• Network: Arbitrum One</p>
          <p>• Gas fees sponsored ✨</p>
          
          {/* Status indicator */}
          {!isUserRegistered && (
            <p className="text-red-600 font-medium">👤 Step 1: Register user account</p>
          )}
          {isUserRegistered && isCheckingAllowance && (
            <p className="text-blue-600 font-medium">🔍 Step 2: Checking USDT allowance...</p>
          )}
          {isUserRegistered && !isCheckingAllowance && needsApproval && (
            <p className="text-orange-600 font-medium">🔓 Step 2: Approve USDT spending</p>
          )}
          {isUserRegistered && !isCheckingAllowance && !needsApproval && (
            <p className="text-green-600 font-medium">✅ Step 3: Ready to claim NFT</p>
          )}
        </div>
      </div>

      {/* Show different buttons based on user status */}
      {!isUserRegistered ? (
        /* Show user registration button */
        <button
          onClick={registerUser}
          disabled={isRegistering}
          className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          {isRegistering ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Registering User...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <span>👤</span>
              <span>Register User Account</span>
            </div>
          )}
        </button>
      ) : isCheckingAllowance ? (
        <div className="w-full bg-gray-200 text-gray-600 font-bold py-4 px-6 rounded-lg flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
          <span>Checking USDT allowance...</span>
        </div>
      ) : needsApproval ? (
        /* Show USDT approval button */
        <TransactionButton
          transaction={() => {
            console.log('🚀 Preparing USDT approval transaction...');
            console.log('🚀 Approving for spender:', MEMBERSHIP_NFT_CONTRACT);
            console.log('🚀 Amount to approve:', REQUIRED_AMOUNT);
            setIsApproving(true);
            
            try {
              return approve({
                contract: usdtContract,
                spender: MEMBERSHIP_NFT_CONTRACT,
                amount: REQUIRED_AMOUNT
              });
            } catch (error) {
              console.error('❌ Error preparing approval transaction:', error);
              setIsApproving(false);
              throw error;
            }
          }}
          onTransactionSent={(result) => {
            console.log('📡 Approval transaction sent:', result.transactionHash);
            toast.loading('Processing USDT approval...', { id: 'approval-tx' });
          }}
          onTransactionConfirmed={handleApprovalSuccess}
          onError={handleApprovalError}
          disabled={disabled || isApproving}
          className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          {isApproving ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Approving USDT...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <span>🔓</span>
              <span>Approve {DISPLAY_AMOUNT} USDT</span>
            </div>
          )}
        </TransactionButton>
      ) : (
        /* Show NFT claim button */
        <TransactionButton
          transaction={() => {
            console.log('🚀 Preparing Level 1 NFT claim transaction...');
            console.log('🚀 NFT Contract:', MEMBERSHIP_NFT_CONTRACT);
            console.log('🚀 To address:', account.address);
            console.log('🚀 Token ID:', 1);
            console.log('🚀 Quantity:', 1);
            console.log('🚀 Currency:', USDT_CONTRACT);
            console.log('🚀 Price per token:', REQUIRED_AMOUNT);
            setIsProcessing(true);
            
            try {
              return claimTo({
                contract: nftContract,
                to: account.address,
                tokenId: 1n,
                quantity: 1n,
                // currencyAddress: USDT_CONTRACT,
                pricePerToken: REQUIRED_AMOUNT,
              });
            } catch (error) {
              console.error('❌ Error preparing claim transaction:', error);
              setIsProcessing(false);
              throw error;
            }
          }}
          onTransactionSent={(result) => {
            console.log('📡 Transaction sent:', result.transactionHash);
            toast.loading('Processing NFT claim...', { id: 'claim-tx' });
          }}
          onTransactionConfirmed={handleClaimSuccess}
          onError={handleClaimError}
          disabled={disabled || isProcessing}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Processing Claim...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <span>🎫</span>
              <span>Claim Level 1 NFT ({DISPLAY_AMOUNT} USDT)</span>
            </div>
          )}
        </TransactionButton>
      )}

      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>Network: Arbitrum One • Gas Sponsored</p>
        <p>Contract: {MEMBERSHIP_NFT_CONTRACT}</p>
      </div>
    </div>
  );
}

export default ActiveMembershipClaimButton;
import React from 'react';
import { ThirdwebProvider } from "thirdweb/react";
import { client } from "../../lib/thirdwebClient";
import { arbitrum } from "thirdweb/chains";
import ActiveMembershipClaimButton from './ActiveMembershipClaimButton';
import { useWallet } from '../../hooks/useWallet';

export function ActiveMembershipPage() {
  const { walletAddress, userStatus, refreshUserData } = useWallet();

  const handleClaimSuccess = async (txHash: string) => {
    console.log('🎉 Complete NFT Claim and Activation successful, txHash:', txHash);
    
    // The component already handles:
    // ✅ Database updates (membership + members tables)
    // ✅ ThirdWeb webhook call
    // ✅ User data refresh
    // ✅ Matrix placement
    // ✅ BCC balance initialization
    // ✅ Layer rewards setup
    
    // Additional custom logic can go here:
    setTimeout(() => {
      // Could navigate to dashboard
      console.log('🚀 Ready to navigate to dashboard!');
    }, 2000);
  };

  const handleClaimError = (error: Error) => {
    console.error('❌ NFT Claim failed:', error);
    // Handle error (show modal, retry options, etc.)
  };

  return (
    <ThirdwebProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              🎫 Activate Your Membership
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Claim your Level 1 Membership NFT to unlock exclusive benefits and rewards.
              Built on Arbitrum One with sponsored gas fees.
            </p>
          </div>

          {/* User Status Display */}
          {walletAddress && (
            <div className="max-w-md mx-auto mb-8 p-4 bg-white rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-2">Account Status</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Wallet:</span> {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
                <p><span className="font-medium">Registered:</span> 
                  <span className={userStatus?.isRegistered ? 'text-green-600' : 'text-red-600'}>
                    {userStatus?.isRegistered ? ' ✅ Yes' : ' ❌ No'}
                  </span>
                </p>
                <p><span className="font-medium">NFT Status:</span> 
                  <span className={userStatus?.hasNFT ? 'text-green-600' : 'text-orange-600'}>
                    {userStatus?.hasNFT ? ' ✅ Claimed' : ' 🎫 Ready to Claim'}
                  </span>
                </p>
                <p><span className="font-medium">Level:</span> {userStatus?.membershipLevel || 0}</p>
              </div>
            </div>
          )}

          {/* Main Claim Section */}
          <div className="max-w-md mx-auto">
            <ActiveMembershipClaimButton
              onClaimSuccess={handleClaimSuccess}
              onClaimError={handleClaimError}
              disabled={userStatus?.hasNFT} // Disable if already has NFT
              className="w-full"
            />
            
            {userStatus?.hasNFT && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-green-600 text-xl">✅</span>
                  <span className="text-green-800 font-medium">
                    Level 1 NFT Already Claimed!
                  </span>
                </div>
                <p className="text-green-700 text-sm mt-2 text-center">
                  You can now access the full dashboard and features.
                </p>
              </div>
            )}
          </div>

          {/* Features Preview */}
          <div className="max-w-4xl mx-auto mt-12">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
              What You Get With Level 1 NFT
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="text-3xl mb-4">🎁</div>
                <h3 className="text-xl font-semibold mb-2">Exclusive Rewards</h3>
                <p className="text-gray-600">Access to BCC tokens and layer rewards system</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="text-3xl mb-4">🏗️</div>
                <h3 className="text-xl font-semibold mb-2">Matrix Position</h3>
                <p className="text-gray-600">Get placed in the referral matrix structure</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <div className="text-3xl mb-4">📈</div>
                <h3 className="text-xl font-semibold mb-2">Dashboard Access</h3>
                <p className="text-gray-600">Full access to analytics and team management</p>
              </div>
            </div>
          </div>

          {/* Network Info */}
          <div className="max-w-2xl mx-auto mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Network Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-700">Network:</span>
                <span className="text-blue-600"> Arbitrum One</span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Gas Fees:</span>
                <span className="text-blue-600"> Sponsored ✨</span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Payment:</span>
                <span className="text-blue-600"> 130 USDT</span>
              </div>
              <div>
                <span className="font-medium text-blue-700">Token ID:</span>
                <span className="text-blue-600"> 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThirdwebProvider>
  );
}

export default ActiveMembershipPage;
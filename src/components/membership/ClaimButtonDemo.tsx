import React, { useState } from 'react';
import { ThirdwebProvider } from "thirdweb/react";
import { client } from "../../lib/thirdwebClient";
import ActiveMembershipClaimButton from './ActiveMembershipClaimButton';

export function ClaimButtonDemo() {
  const [claimHistory, setClaimHistory] = useState<string[]>([]);

  const handleClaimSuccess = async (txHash: string) => {
    console.log('🎉 Demo: NFT Claim successful, txHash:', txHash);
    
    // Add to history for demo purposes
    setClaimHistory(prev => [...prev, `✅ ${new Date().toLocaleTimeString()}: Claim successful - ${txHash.slice(0, 10)}...`]);
    
    // The ClaimButton component automatically handles:
    // 1. 📊 Database Updates:
    //    - Updates `membership` table with Level 1 status
    //    - Updates `members` table with activation details
    //    - Creates `user_balances` record with initial BCC
    //
    // 2. 🎯 Matrix Placement:
    //    - Places user in referral matrix structure
    //    - Triggers spillover logic if needed
    //
    // 3. 🎁 Rewards System:
    //    - Initializes layer rewards
    //    - Unlocks Level 1 BCC balance (100 BCC)
    //    - Sets up tier multipliers
    //
    // 4. 🔗 Integration:
    //    - Calls ThirdWeb webhook as fallback
    //    - Refreshes user status in UI
    //    - Updates all connected components
  };

  const handleClaimError = (error: Error) => {
    console.error('❌ Demo: NFT Claim failed:', error);
    setClaimHistory(prev => [...prev, `❌ ${new Date().toLocaleTimeString()}: Claim failed - ${error.message}`]);
  };

  return (
    <ThirdwebProvider>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🧪 ActiveMembershipClaimButton Demo
          </h1>
          <p className="text-gray-600">
            Test the new ThirdWeb-powered claim button with complete backend integration
          </p>
        </div>

        {/* Main Claim Component */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <ActiveMembershipClaimButton
            onClaimSuccess={handleClaimSuccess}
            onClaimError={handleClaimError}
            className="w-full"
          />
        </div>

        {/* Integration Details */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            🔧 What Happens After Successful Claim
          </h3>
          <div className="space-y-2 text-sm text-blue-700">
            <div className="flex items-start space-x-2">
              <span className="text-green-600 mt-0.5">✅</span>
              <span><strong>NFT Minted:</strong> Level 1 NFT (Token ID: 1) on Arbitrum One</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600 mt-0.5">✅</span>
              <span><strong>Database Updates:</strong> membership & members tables updated</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600 mt-0.5">✅</span>
              <span><strong>Matrix Placement:</strong> User placed in referral matrix</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600 mt-0.5">✅</span>
              <span><strong>BCC Balance:</strong> Initial 100 BCC unlocked</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600 mt-0.5">✅</span>
              <span><strong>Rewards Setup:</strong> Layer rewards system activated</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-600 mt-0.5">✅</span>
              <span><strong>Webhook Call:</strong> ThirdWeb webhook triggered as fallback</span>
            </div>
          </div>
        </div>

        {/* Technical Specs */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-purple-800 mb-2">🌐 Network Config</h4>
            <div className="space-y-1 text-sm text-purple-700">
              <p><strong>Network:</strong> Arbitrum One</p>
              <p><strong>Payment:</strong> 130 USDC</p>
              <p><strong>Gas:</strong> Sponsored ✨</p>
              <p><strong>Wallet:</strong> ThirdWeb InApp</p>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-green-800 mb-2">🔗 Integration</h4>
            <div className="space-y-1 text-sm text-green-700">
              <p><strong>Function:</strong> activate_nft_level1_membership</p>
              <p><strong>Tables:</strong> membership, members</p>
              <p><strong>Rewards:</strong> layer_rewards, user_balances</p>
              <p><strong>Matrix:</strong> referrals</p>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        {claimHistory.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">📜 Activity Log</h4>
            <div className="space-y-1">
              {claimHistory.map((entry, index) => (
                <div key={index} className="text-sm font-mono text-gray-600">
                  {entry}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </ThirdwebProvider>
  );
}

export default ClaimButtonDemo;
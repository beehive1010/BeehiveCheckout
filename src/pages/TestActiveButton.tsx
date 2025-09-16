import React from 'react';
import ActiveMembershipClaimButton from '../components/membership/ActiveMembershipClaimButton';
import { useLocation } from 'wouter';

export default function TestActiveButton() {
  const [, setLocation] = useLocation();

  const handleClaimSuccess = (txHash: string) => {
    console.log('🎉 Test page: NFT Claim successful, txHash:', txHash);
    alert(`Success! Transaction: ${txHash.slice(0, 10)}...`);
    
    // After success, could redirect to dashboard
    setTimeout(() => {
      setLocation('/dashboard');
    }, 3000);
  };

  const handleClaimError = (error: Error) => {
    console.error('❌ Test page: NFT Claim failed:', error);
    alert(`Error: ${error.message}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🧪 Test Active Membership Claim Button
          </h1>
          <p className="text-gray-600">
            Testing the new ThirdWeb-powered claim button with ARB One network
          </p>
        </div>

        {/* Test Button */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <ActiveMembershipClaimButton
            onClaimSuccess={handleClaimSuccess}
            onClaimError={handleClaimError}
            className="w-full"
          />
        </div>

        {/* Info Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">
            🔍 What This Tests
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-medium mb-2">ThirdWeb Integration:</h4>
              <ul className="space-y-1">
                <li>• InApp Wallet connection</li>
                <li>• Gas sponsorship on ARB One</li>
                <li>• ERC-1155 NFT claiming</li>
                <li>• Transaction confirmation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Backend Integration:</h4>
              <ul className="space-y-1">
                <li>• Database activation function</li>
                <li>• Membership table updates</li>
                <li>• Matrix placement logic</li>
                <li>• BCC balance initialization</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-100 rounded border-l-4 border-blue-400">
            <p className="text-sm text-blue-800">
              <strong>Network:</strong> Arbitrum One • 
              <strong>Contract:</strong> 0x36a1aC6D8F0204827Fad16CA5e222F1Aeae4Adc8 • 
              <strong>Payment:</strong> 130 USDT
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center mt-6">
          <button
            onClick={() => setLocation('/welcome')}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            ← Back to Welcome Page
          </button>
        </div>

      </div>
    </div>
  );
}
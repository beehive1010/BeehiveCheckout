/**
 * Manual Membership Activation Page
 *
 * This page allows users who purchased NFTs via PayEmbed to manually activate their membership
 * if the automatic activation failed.
 */

import { ManualActivationButton } from '@/components/membership/claim/ManualActivationButton';
import { useI18n } from '@/contexts/I18nContext';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export default function ActivateMembership() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();

  // Get level from URL params (default to 1)
  const searchParams = new URLSearchParams(window.location.search);
  const level = parseInt(searchParams.get('level') || '1');

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => setLocation('/membership')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Membership</span>
        </button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-4">
            Activate Your Membership
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Complete your membership activation by verifying NFT ownership and creating database records
          </p>
        </div>
      </div>

      {/* Activation Component */}
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-2xl mx-auto">
          <ManualActivationButton
            level={level}
            onSuccess={() => {
              console.log('Activation successful, redirecting...');
            }}
          />

          {/* FAQ Section */}
          <div className="mt-12 space-y-6">
            <h2 className="text-2xl font-bold text-white text-center mb-6">
              Frequently Asked Questions
            </h2>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-amber-400 mb-2">
                Why do I need to activate manually?
              </h3>
              <p className="text-gray-300 text-sm">
                In some cases, automatic activation after PayEmbed purchase may fail due to network issues or transaction delays. This page allows you to manually complete the activation process.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-amber-400 mb-2">
                What happens during activation?
              </h3>
              <p className="text-gray-300 text-sm mb-2">
                The activation process will:
              </p>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1 ml-4">
                <li>Verify your NFT ownership on the blockchain</li>
                <li>Check your user registration</li>
                <li>Create membership records in the database</li>
                <li>Create member activation records</li>
                <li>Place you in the referral matrix</li>
                <li>Generate initial rewards</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-amber-400 mb-2">
                What if I don't see my NFT?
              </h3>
              <p className="text-gray-300 text-sm">
                If you just purchased the NFT, please wait 1-2 minutes for the blockchain transaction to confirm. You can check your transaction status on{' '}
                <a
                  href={`https://arbiscan.io/address/${window.ethereum?.selectedAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 underline"
                >
                  Arbiscan
                </a>
                .
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-amber-400 mb-2">
                What if activation fails?
              </h3>
              <p className="text-gray-300 text-sm">
                Common issues and solutions:
              </p>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1 ml-4 mt-2">
                <li>
                  <strong>NFT Not Found:</strong> Wait for transaction confirmation (1-2 minutes)
                </li>
                <li>
                  <strong>User Not Registered:</strong> Complete registration first
                </li>
                <li>
                  <strong>No Referrer:</strong> Contact support to update your referrer
                </li>
                <li>
                  <strong>Already Activated:</strong> Your membership is already active!
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-amber-400 mb-2">
                Need Help?
              </h3>
              <p className="text-gray-300 text-sm mb-3">
                If you continue to experience issues with activation, please contact our support team with:
              </p>
              <ul className="list-disc list-inside text-gray-300 text-sm space-y-1 ml-4">
                <li>Your wallet address</li>
                <li>Transaction hash from your NFT purchase</li>
                <li>Level you are trying to activate</li>
                <li>Screenshot of any error messages</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

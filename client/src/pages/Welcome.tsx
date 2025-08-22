import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useActiveAccount } from 'thirdweb/react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { useNFTVerification } from '../hooks/useNFTVerification';
import ClaimMembershipButton from '../components/membership/ClaimMembershipButton';

export default function Welcome() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const account = useActiveAccount();
  const { hasLevel1NFT, isLoading } = useNFTVerification();

  // If user already has Level 1 NFT, redirect to dashboard
  if (hasLevel1NFT && !isLoading) {
    setLocation('/dashboard');
    return null;
  }

  // If no wallet connected, redirect to landing
  if (!account?.address) {
    setLocation('/');
    return null;
  }

  const handlePurchaseSuccess = () => {
    toast({
      title: t('welcome.success.title'),
      description: t('welcome.success.description'),
    });
    
    // Small delay to allow NFT ownership to update
    setTimeout(() => {
      setLocation('/dashboard');
    }, 2000);
  };

  const handlePurchaseError = (error: string) => {
    console.error('Purchase error:', error);
    toast({
      title: t('welcome.error.title'),
      description: error || t('welcome.error.description'),
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Simple Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <i className="fas fa-gift text-6xl text-honey"></i>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('welcome.title')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {t('welcome.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* NFT Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-honey mb-4">{t('welcome.nft.title')}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{t('welcome.nft.description')}</p>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">{t('welcome.nft.tokenId')}</span>
                <span className="font-medium text-gray-900 dark:text-white">Token ID: 0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">{t('welcome.nft.price')}</span>
                <span className="text-2xl font-bold text-honey">{t('welcome.nft.priceAmount')}</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-honey/10 rounded border-l-4 border-honey">
              <p className="text-honey font-medium">{t('welcome.premium.title')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {t('welcome.premium.description')}
              </p>
            </div>
          </div>

          {/* Benefits List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-honey mb-4">{t('welcome.benefits.title')}</h2>
            
            <ul className="space-y-4">
              <li className="flex items-center">
                <i className="fas fa-tachometer-alt text-honey w-6 mr-3"></i>
                <span className="text-gray-700 dark:text-gray-300">{t('welcome.benefits.dashboard')}</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-tasks text-honey w-6 mr-3"></i>
                <span className="text-gray-700 dark:text-gray-300">{t('welcome.benefits.tasks')}</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-graduation-cap text-honey w-6 mr-3"></i>
                <span className="text-gray-700 dark:text-gray-300">{t('welcome.benefits.education')}</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-globe text-honey w-6 mr-3"></i>
                <span className="text-gray-700 dark:text-gray-300">{t('welcome.benefits.discover')}</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-coins text-honey w-6 mr-3"></i>
                <span className="text-gray-700 dark:text-gray-300">{t('welcome.benefits.tokens')}</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-users text-honey w-6 mr-3"></i>
                <span className="text-gray-700 dark:text-gray-300">{t('welcome.benefits.hiveworld')}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Purchase Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Get Started with Level 1 Membership
          </h3>
          
          <div className="max-w-md mx-auto mb-6">
            <ClaimMembershipButton
              walletAddress={account?.address || ""}
              level={1}
              onSuccess={handlePurchaseSuccess}
              onError={handlePurchaseError}
              className="w-full"
            />
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('welcome.supportText')}
          </p>
        </div>
      </div>
    </div>
  );
}
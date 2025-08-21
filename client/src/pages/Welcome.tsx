import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useActiveAccount } from 'thirdweb/react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import HexagonIcon from '../components/UI/HexagonIcon';
import { useNFTVerification } from '../hooks/useNFTVerification';
import { motion } from 'framer-motion';
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        <Card className="bg-secondary border-border glow-hover">
          <CardHeader className="text-center pb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <HexagonIcon className="mx-auto mb-6" size="xl">
                <i className="fas fa-gift text-honey text-4xl"></i>
              </HexagonIcon>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <CardTitle className="text-3xl font-bold text-honey mb-4">
                {t('welcome.title')}
              </CardTitle>
              <p className="text-muted-foreground text-lg">
                {t('welcome.subtitle')}
              </p>
            </motion.div>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* NFT Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="bg-muted rounded-lg p-6 border border-honey/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-honey mb-2">{t('welcome.nft.title')}</h3>
                  <p className="text-muted-foreground">{t('welcome.nft.description')}</p>
                  <div className="flex items-center mt-3 text-sm">
                    <i className="fas fa-layer-group text-honey mr-2"></i>
                    <span className="text-honey font-medium">{t('welcome.nft.tokenId')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{t('welcome.nft.price')}</p>
                  <p className="text-2xl font-bold text-honey">{t('welcome.nft.priceAmount')}</p>
                </div>
              </div>
            </motion.div>

            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-honey">What You'll Unlock:</h3>
              <div className="grid gap-3">
                {[
                  { icon: "fas fa-tachometer-alt", text: "Full Dashboard Access" },
                  { icon: "fas fa-tasks", text: "Tasks & NFT Marketplace" },
                  { icon: "fas fa-graduation-cap", text: "Education Center" },
                  { icon: "fas fa-globe", text: "Discover Web3 DApps" },
                  { icon: "fas fa-users", text: t('welcome.benefits.hiveworld') },
                  { icon: "fas fa-coins", text: "BCC Token Rewards" },
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.1, duration: 0.4 }}
                    className="flex items-center text-muted-foreground"
                  >
                    <div className="w-8 h-8 rounded-full bg-honey/10 flex items-center justify-center mr-3">
                      <i className={`${benefit.icon} text-honey text-xs`}></i>
                    </div>
                    <span>{benefit.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Claim Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="text-center space-y-6"
            >
              <div className="p-4 bg-honey/10 rounded-lg border border-honey/20">
                <p className="text-honey font-medium mb-2">💎 Premium Membership</p>
                <p className="text-sm text-muted-foreground">
                  Purchase your Level 1 Warrior NFT for <strong>130 USDT</strong> with multi-chain payment support!
                </p>
              </div>

              <ClaimMembershipButton
                walletAddress={account?.address || ""}
                level={1}
                onSuccess={handlePurchaseSuccess}
                onError={handlePurchaseError}
                className="w-full"
              />

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {t('welcome.supportText')}
                </p>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
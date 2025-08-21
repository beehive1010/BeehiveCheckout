import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useActiveAccount, useSwitchActiveWalletChain, TransactionWidget, useReadContract } from 'thirdweb/react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';
import { claimTo } from "thirdweb/extensions/erc1155";
import { getNFT } from "thirdweb/extensions/erc1155";
import { bbcMembershipContract, alphaCentauri, client } from '../lib/web3';
import HexagonIcon from '../components/UI/HexagonIcon';
import { useNFTVerification } from '../hooks/useNFTVerification';
import { motion } from 'framer-motion';

export default function Welcome() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const account = useActiveAccount();
  const { hasLevel1NFT, isLoading } = useNFTVerification();
  const [claimingStarted, setClaimingStarted] = useState(false);
  const switchChain = useSwitchActiveWalletChain();
  
  // Get NFT metadata for Level 1 (Token ID 0)
  const { data: nft } = useReadContract(getNFT, {
    contract: bbcMembershipContract,
    tokenId: BigInt(0),
  });

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

  // Check if user is on the correct chain
  const currentChainId = account?.chain?.id;
  const requiredChainId = alphaCentauri.id;
  const needsChainSwitch = currentChainId !== requiredChainId;

  const handleSwitchChain = async () => {
    try {
      await switchChain(alphaCentauri);
      setIsWrongChain(false);
      toast({
        title: "Chain Switched",
        description: "Successfully switched to Alpha Centauri network",
      });
    } catch (error) {
      console.error('Failed to switch chain:', error);
      toast({
        title: "Chain Switch Failed",
        description: "Please manually switch to Alpha Centauri network in your wallet",
        variant: "destructive",
      });
    }
  };

  const handleClaimSuccess = () => {
    toast({
      title: t('welcome.success.title'),
      description: t('welcome.success.description'),
    });
    
    // Small delay to allow NFT ownership to update
    setTimeout(() => {
      setLocation('/dashboard');
    }, 2000);
  };

  const handleClaimError = (error: any) => {
    console.error('Claim error:', error);
    
    // Extract meaningful error message
    let errorMessage = t('welcome.error.description');
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.reason) {
      errorMessage = error.reason;
    } else if (error?.data?.message) {
      errorMessage = error.data.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    toast({
      title: t('welcome.error.title'),
      description: errorMessage,
      variant: "destructive",
    });
    setClaimingStarted(false);
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
                  <h3 className="text-xl font-bold text-honey mb-2">{t('welcome.nftTitle')}</h3>
                  <p className="text-muted-foreground">{t('welcome.nftDescription')}</p>
                  <div className="flex items-center mt-3 text-sm">
                    <i className="fas fa-layer-group text-honey mr-2"></i>
                    <span className="text-honey font-medium">{t('welcome.tokenId')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Collection</p>
                  <p className="text-lg font-bold text-honey">{t('welcome.collection')}</p>
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
              <h3 className="text-lg font-semibold text-honey">{t('welcome.unlockTitle')}</h3>
              <div className="grid gap-3">
                {[
                  { icon: "fas fa-tachometer-alt", text: t('welcome.benefits.dashboard') },
                  { icon: "fas fa-tasks", text: t('welcome.benefits.tasks') },
                  { icon: "fas fa-graduation-cap", text: t('welcome.benefits.education') },
                  { icon: "fas fa-globe", text: t('welcome.benefits.discover') },
                  { icon: "fas fa-users", text: t('welcome.benefits.hiveworld') },
                  { icon: "fas fa-coins", text: t('welcome.benefits.rewards') },
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
                <p className="text-honey font-medium mb-2">{t('welcome.giftTitle')}</p>
                <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('welcome.giftDescription').replace('**FREE**', '<strong>FREE</strong>') }}>
                </p>
              </div>

              {needsChainSwitch ? (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center text-yellow-600 mb-2">
                      <i className="fas fa-exclamation-triangle mr-2"></i>
                      <span className="text-sm font-medium">Wrong Network</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      You need to switch to Alpha Centauri network to claim your NFT.
                    </p>
                    <Button
                      onClick={handleSwitchChain}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-black"
                      data-testid="button-switch-chain"
                    >
                      <i className="fas fa-exchange-alt mr-2"></i>
                      Switch to Alpha Centauri
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <TransactionWidget
                    client={client}
                    theme="dark"
                    transaction={claimTo({
                      contract: bbcMembershipContract,
                      quantity: BigInt(1),
                      tokenId: BigInt(0), // Level 1 = Token ID 0
                      to: account?.address || "",
                    })}
                    title={nft?.metadata?.name || "Level 1 Warrior NFT"}
                    description={nft?.metadata?.description || "Your first membership NFT - completely FREE!"}
                    onTransactionSent={() => {
                      setClaimingStarted(true);
                      toast({
                        title: t('welcome.transactionSent.title'),
                        description: t('welcome.transactionSent.description'),
                      });
                    }}
                    onTransactionConfirmed={handleClaimSuccess}
                    onError={handleClaimError}
                  />
                </div>
              )}

              {claimingStarted && (
                <div className="mt-6 text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-honey mx-auto"></div>
                  <p className="text-honey font-medium">{t('welcome.processingTitle')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('welcome.processingDescription')}
                  </p>
                </div>
              )}

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
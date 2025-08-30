import { useState, useEffect } from 'react';
import { useWallet } from '../../../hooks/useWallet';
import { useI18n } from '../../../contexts/I18nContext';
import { useNFTVerification } from '../../../hooks/useNFTVerification';
import { useUserReferralStats } from '../../../hooks/useBeeHiveStats';
import { NFTRequiredScreen } from '../../nft/components/NFTRequiredScreen';
import { LoadingScreen } from '../../shared/components/LoadingScreen';
import { ActivationScreen } from '../../membership/components/ActivationScreen';
import { MembershipStatusCard } from '../../membership/components/MembershipStatusCard';
import { ReferralLinkCard } from '../../referrals/components/ReferralLinkCard';
import { UserStatsGrid } from '../components/UserStatsGrid';
import { QuickActionsGrid } from '../components/QuickActionsGrid';
import { MatrixNetworkStats } from '../../matrix/components/MatrixNetworkStats';
import { Notifications } from '../../shared/components/Notifications';
import { dashboardService } from '../services/dashboard.client';
import styles from '../styles/dashboard.module.css';

export default function DashboardPage() {
  const { 
    userData, 
    isActivated, 
    currentLevel, 
    bccBalance, 
    walletAddress,
    activateMembership,
    isActivating
  } = useWallet();
  const { t } = useI18n();
  const { hasLevel1NFT, isLoading: isCheckingNFT } = useNFTVerification();
  const { data: userStats, isLoading: isLoadingUserStats } = useUserReferralStats();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  // Check registration expiration status
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (!walletAddress || isActivated) return;
      
      const status = await dashboardService.checkRegistrationStatus(walletAddress);
      if (status?.registrationExpiresAt) {
        const expiresAt = new Date(status.registrationExpiresAt).getTime();
        const now = Date.now();
        setTimeRemaining(Math.max(0, expiresAt - now));
      }
    };
    
    checkRegistrationStatus();
  }, [walletAddress, isActivated]);
  
  // Countdown timer effect
  useEffect(() => {
    if (timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          window.location.reload();
          return 0;
        }
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Show NFT verification requirement if user doesn't have Level 1 NFT
  if (!hasLevel1NFT && !isCheckingNFT) {
    return <NFTRequiredScreen walletAddress={walletAddress || ""} />;
  }
  
  if (isCheckingNFT) {
    return <LoadingScreen />;
  }

  if (!isActivated && hasLevel1NFT && !isCheckingNFT) {
    return <ActivationScreen walletAddress={walletAddress || ""} />;
  }

  return (
    <div className={styles.dashboardContainer}>
      <MembershipStatusCard 
        userData={userData}
        walletAddress={walletAddress || ""}
        currentLevel={currentLevel}
        bccBalance={bccBalance}
        userStats={userStats}
        isLoadingUserStats={isLoadingUserStats}
      />
      
      <ReferralLinkCard walletAddress={walletAddress || ""} />
      
      <UserStatsGrid 
        userStats={userStats}
        isLoadingUserStats={isLoadingUserStats}
        bccBalance={bccBalance}
      />

      <QuickActionsGrid />

      <MatrixNetworkStats 
        userStats={userStats}
        isLoadingUserStats={isLoadingUserStats}
      />

      <div className="mb-8">
        <Notifications />
      </div>
    </div>
  );
}
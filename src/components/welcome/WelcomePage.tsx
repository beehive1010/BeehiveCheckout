import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Crown, Gift, Sparkles, Loader2 } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';
import { useLocation } from 'wouter';
import { ERC5115ClaimComponent } from '../membership/ERC5115ClaimComponent';
import { authService } from '../../lib/supabaseClient';
import RegistrationModal from '../modals/RegistrationModal';

interface WelcomeState {
  showClaimComponent: boolean;
  userLevel: number;
  isActivated: boolean;
  hasOnChainNFT: boolean;
  needsSync: boolean;
  showRegistrationModal: boolean;
}

export default function WelcomePage() {
  const { walletAddress } = useWallet();
  const { toast } = useToast();
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  
  const [isLoading, setIsLoading] = useState(true);
  const [welcomeState, setWelcomeState] = useState<WelcomeState>({
    showClaimComponent: true,
    userLevel: 0,
    isActivated: false,
    hasOnChainNFT: false,
    needsSync: false,
    showRegistrationModal: false,
  });
  
  const [isCheckingChain, setIsCheckingChain] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Get referrer from URL parameters
  const [referrerWallet, setReferrerWallet] = useState<string | undefined>();
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam && refParam.startsWith('0x') && refParam.length === 42) {
      setReferrerWallet(refParam);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      checkUserStatus();
    }
  }, [walletAddress]);

  const checkUserStatus = async () => {
    if (!walletAddress) return;

    const startTime = performance.now();
    console.log('⏱️ Starting checkUserStatus for wallet:', walletAddress);
    
    setIsLoading(true);
    try {
      // Check user status via Edge Function
      const authStartTime = performance.now();
      const response = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({
          action: 'get-user'
        })
      });
      const authEndTime = performance.now();
      console.log(`⏱️ Auth check took: ${(authEndTime - authStartTime).toFixed(2)}ms`);

      if (!response.ok) {
        throw new Error('Failed to check user status');
      }

      const userResult = await response.json();
      console.log('🔍 User check result:', { success: userResult.success, hasUser: !!userResult.user, action: userResult.action });
      
      if (userResult.success && userResult.user) {
        // Quick database check first - avoid slow blockchain queries
        let isActivated = false;
        let currentLevel = 0;
        
        try {
          const memberStartTime = performance.now();
          console.log('🔍 Quick database check for membership activation...');
          
          // Fast database-only check using member-info Edge Function
          // Add timestamp to prevent caching issues
          const memberResponse = await fetch(`https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/activate-membership?t=${Date.now()}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-wallet-address': walletAddress,
            },
            body: JSON.stringify({
              action: 'get-member-info'
            })
          });
          const memberEndTime = performance.now();
          console.log(`⏱️ Member check took: ${(memberEndTime - memberStartTime).toFixed(2)}ms`);

          if (memberResponse.ok) {
            const memberResult = await memberResponse.json();
            console.log('🔍 WelcomePage: Member check result:', {
              success: memberResult.success,
              hasMember: !!memberResult.member,
              isActivated: memberResult.isActivated,
              currentLevel: memberResult.currentLevel
            });
            
            // Use the same logic as Dashboard and MemberGuard - check the isActivated field
            if (memberResult.success && memberResult.isActivated) {
              isActivated = true;
              currentLevel = memberResult.currentLevel || memberResult.member?.current_level || 1;
              console.log('✅ WelcomePage: Found activated member:', { isActivated, currentLevel });
            } else {
              console.log('📋 WelcomePage: User not activated - isActivated:', memberResult.isActivated);
            }
          }
          
          if (!isActivated) {
            console.log('📋 User not found in members table - checking blockchain in background');
            // Don't block UI - let user proceed to claim component
            isActivated = false;
            currentLevel = 0;
          }
        } catch (memberError) {
          console.warn('⚠️ Quick member check failed:', memberError);
          isActivated = false;
          currentLevel = 0;
        }

        // Set state based on database check - avoid slow blockchain queries initially
        if (isActivated) {
          const redirectStartTime = performance.now();
          setWelcomeState({
            showClaimComponent: false,
            userLevel: currentLevel,
            isActivated: true,
            hasOnChainNFT: true,
            needsSync: false,
          });
          
          console.log('✅ WelcomePage: User is activated, redirecting to dashboard');
          console.log(`⏱️ WelcomePage: Total check time before redirect: ${(redirectStartTime - startTime).toFixed(2)}ms`);
          console.log(`🔄 WelcomePage: Redirecting from ${window.location.pathname} to /dashboard`);
          setLocation('/dashboard');
        } else {
          // User not activated in database - show claim component but don't block with blockchain check
          console.log('📋 User not activated - showing claim component');
          setWelcomeState({
            showClaimComponent: true,
            userLevel: 0,
            isActivated: false,
            hasOnChainNFT: false,
            needsSync: false,
          });
          
          // Optional: Check blockchain in background (non-blocking)
          // checkOnChainNFT();
        }
      } else if (!userResult.success && userResult.action === 'not_found') {
        // User doesn't exist - show registration modal
        console.log('👤 User not found in database - showing registration modal');
        setWelcomeState({
          showClaimComponent: false,
          userLevel: 0,
          isActivated: false,
          hasOnChainNFT: false,
          needsSync: false,
          showRegistrationModal: true,
        });
      } else {
        // Handle other failure cases
        console.warn('⚠️ Unexpected user check result:', userResult);
        setWelcomeState({
          showClaimComponent: true,
          userLevel: 0,
          isActivated: false,
          hasOnChainNFT: false,
          needsSync: false,
          showRegistrationModal: false,
        });
      }

    } catch (error) {
      console.error('Error checking user status:', error);
      toast({
        title: t('welcome.errorLoading') || 'Error Loading',
        description: t('welcome.pleaseRefresh') || 'Please refresh the page',
        variant: 'destructive',
      });
    } finally {
      const totalTime = performance.now() - startTime;
      console.log(`⏱️ Total checkUserStatus time: ${totalTime.toFixed(2)}ms`);
      setIsLoading(false);
    }
  };

  // 检查链上NFT状态
  const checkOnChainNFT = async () => {
    if (!walletAddress) return;

    setIsCheckingChain(true);
    try {
      console.log('🔍 检查链上NFT状态...');
      
      // 使用Supabase客户端调用激活函数
      const { callEdgeFunction } = await import('../../lib/supabaseClient');
      
      const result = await callEdgeFunction('activate-membership', {
        level: 1,
        transactionHash: 'check_existing' // 特殊标识，表示只检查不验证交易
      }, walletAddress);
      
      if (result.success) {
        if (result.action === 'already_synced') {
          // 数据库已有记录且已激活
          setWelcomeState({
            showClaimComponent: false,
            userLevel: result.member.current_level,
            isActivated: true,
            hasOnChainNFT: true,
            needsSync: false,
          });
          setLocation('/dashboard');
        } else if (result.action === 'synced_from_chain') {
          // 从链上同步了记录
          toast({
            title: '✅ 检测到已拥有NFT',
            description: '已自动同步会员身份，正在跳转...',
            duration: 3000,
          });
          
          setWelcomeState({
            showClaimComponent: false,
            userLevel: result.level,
            isActivated: true,
            hasOnChainNFT: true,
            needsSync: false,
          });
          
          setTimeout(() => setLocation('/dashboard'), 2000);
        }
      } else {
        // 链上没有NFT，显示claim组件
        setWelcomeState({
          showClaimComponent: true,
          userLevel: 0,
          isActivated: false,
          hasOnChainNFT: false,
          needsSync: false,
        });
      }
    } catch (error) {
      console.error('检查链上NFT错误:', error);
      // 出错时默认显示claim组件
      setWelcomeState({
        showClaimComponent: true,
        userLevel: 0,
        isActivated: false,
        hasOnChainNFT: false,
        needsSync: false,
      });
    } finally {
      setIsCheckingChain(false);
    }
  };

  const handleRegistrationComplete = async () => {
    console.log('✅ Registration completed - refreshing user status');
    setWelcomeState(prev => ({ ...prev, showRegistrationModal: false }));
    // Refresh user status after registration
    await checkUserStatus();
  };

  const handleClaimSuccess = async () => {
    toast({
      title: t('welcome.claimSuccessful') || 'NFT Claimed Successfully!',
      description: t('welcome.activatingMembership') || 'Activating membership...',
      duration: 4000,
    });
    
    // Wait a moment for backend processing to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Refresh user status to check if activation was successful
    await checkUserStatus();
    
    // Additional redirect as fallback (if checkUserStatus doesn't redirect)
    setTimeout(() => {
      setLocation('/dashboard');
    }, 1000);
  };

  if (isLoading || isCheckingChain) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-honey" />
            <p className="text-honey">
              {isCheckingChain 
                ? '🔍 检查链上NFT状态...' 
                : (t('welcome.checkingStatus') || 'Checking status...')
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-honey/10 p-3 rounded-full">
            <Crown className="h-8 w-8 text-honey" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2 text-honey">
          {t('welcome.title') || 'Welcome to Beehive'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t('welcome.subtitle') || 'Claim your Level 1 NFT to unlock membership benefits'}
        </p>
      </div>

      {/* Benefits Section */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="border-honey/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-honey">
              <Gift className="h-5 w-5" />
              Level 1 NFT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Price:</span>
                <span className="font-semibold">100 USDC</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Fee:</span>
                <span className="font-semibold">30 USDC</span>
              </div>
              <hr className="border-honey/20" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-honey">130 USDC</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500">
              <Sparkles className="h-5 w-5" />
              BCC Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>NFT Reward:</span>
                <span className="font-semibold text-honey">130 BCC</span>
              </div>
              <div className="flex justify-between">
                <span>Welcome Bonus:</span>
                <span className="font-semibold text-green-500">500 BCC</span>
              </div>
              <hr className="border-green-500/20" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total BCC:</span>
                <span className="text-green-500">630 BCC</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-500">
              <Crown className="h-5 w-5" />
              Membership Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-honey rounded-full"></div>
                Access to referral system
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-honey rounded-full"></div>
                Earn from team building
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-honey rounded-full"></div>
                NFT marketplace access
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-honey rounded-full"></div>
                Progressive level unlocks
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* NFT Claim Component */}
      {welcomeState.showClaimComponent && (
        <Card className="border-honey/30 bg-honey/5">
          <CardHeader>
            <CardTitle className="text-center text-honey">
              🎯 Claim Your Level 1 NFT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ERC5115ClaimComponent 
              onSuccess={handleClaimSuccess}
              className="w-full"
            />
          </CardContent>
        </Card>
      )}
      
      {/* Already Activated Message */}
      {welcomeState.isActivated && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-500/10 p-3 rounded-full">
                <Crown className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-green-500 mb-2">
              🎉 Membership Already Active!
            </h3>
            <p className="text-muted-foreground mb-4">
              You already have Level {welcomeState.userLevel} membership. 
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Has On-Chain NFT but needs database sync */}
      {welcomeState.hasOnChainNFT && welcomeState.needsSync && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-500/10 p-3 rounded-full">
                <Sparkles className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-blue-500 mb-2">
              🔍 NFT已检测到！
            </h3>
            <p className="text-muted-foreground mb-4">
              您在链上已拥有Level 1 NFT，但数据库缺少会员记录。
            </p>
            <button
              onClick={() => checkOnChainNFT()}
              disabled={isSyncing}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  同步中...
                </>
              ) : (
                '🔄 同步会员身份'
              )}
            </button>
          </CardContent>
        </Card>
      )}

      {/* Registration Modal */}
      <RegistrationModal
        isOpen={welcomeState.showRegistrationModal}
        onClose={() => setWelcomeState(prev => ({ ...prev, showRegistrationModal: false }))}
        walletAddress={walletAddress || ''}
        referrerWallet={referrerWallet}
        onRegistrationComplete={handleRegistrationComplete}
      />
    </div>
  );
}
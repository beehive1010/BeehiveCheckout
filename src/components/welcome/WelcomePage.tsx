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

interface WelcomeState {
  showClaimComponent: boolean;
  userLevel: number;
  isActivated: boolean;
  hasOnChainNFT: boolean;
  needsSync: boolean;
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
  });
  
  const [isCheckingChain, setIsCheckingChain] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      checkUserStatus();
    }
  }, [walletAddress]);

  const checkUserStatus = async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    try {
      // Check user status via Edge Function
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

      if (!response.ok) {
        throw new Error('Failed to check user status');
      }

      const userResult = await response.json();
      
      if (userResult.success && userResult.user) {
        // Additional check: verify membership activation from members table using Supabase client
        let isActivated = false;
        let currentLevel = 0;
        
        try {
          console.log('🔍 Checking membership activation in members table...');
          
          // Use authService to check if user is an activated member
          const { isActivated: memberActivated, memberData } = await authService.isActivatedMember(walletAddress);
          
          if (memberActivated && memberData) {
            isActivated = true;
            currentLevel = memberData.current_level || 1;
            console.log('✅ User is activated member:', { isActivated, currentLevel, memberData });
          } else {
            console.log('📋 User not found in members table or not activated');
            isActivated = false;
            currentLevel = 0;
          }
        } catch (memberError) {
          console.warn('⚠️ Member status check failed, using user data:', memberError);
          // Fallback to user data if member check fails - users table doesn't have activation fields
          isActivated = false; // Users table doesn't have is_activated field
          currentLevel = 0; // Users table doesn't have current_level field
        }

        // 检查链上NFT状态
        if (!isActivated) {
          await checkOnChainNFT();
        } else {
          setWelcomeState({
            showClaimComponent: false,
            userLevel: currentLevel,
            isActivated: true,
            hasOnChainNFT: true,
            needsSync: false,
          });
          
          console.log('✅ User is activated, redirecting to dashboard');
          setLocation('/dashboard');
        }
      }

    } catch (error) {
      console.error('Error checking user status:', error);
      toast({
        title: t('welcome.errorLoading') || 'Error Loading',
        description: t('welcome.pleaseRefresh') || 'Please refresh the page',
        variant: 'destructive',
      });
    } finally {
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
    </div>
  );
}
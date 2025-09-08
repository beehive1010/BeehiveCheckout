import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, 
  Users, 
  Trophy, 
  Coins, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { callEdgeFunction } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useI18n } from '@/contexts/I18nContext';

interface MembershipActivationProps {
  onActivationComplete?: (result: any) => void;
}

interface ActivationStatus {
  currentLevel: number;
  activationRank: number;
  tier: number;
  bccBalance: {
    transferable: number;
    locked: number;
    totalEarned: number;
  };
  matrixPosition?: {
    rootWallet: string;
    layer: number;
    position: number;
  };
  directReferrals: number;
  pendingRewards: any[];
}

const MembershipActivationSystem: React.FC<MembershipActivationProps> = ({ 
  onActivationComplete 
}) => {
  const { walletAddress, isConnected } = useWallet();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [activationStatus, setActivationStatus] = useState<ActivationStatus | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [referrerWallet, setReferrerWallet] = useState('');
  const [activeNetwork, setActiveNetwork] = useState<'mainnet' | 'testnet' | 'simulation'>('simulation');
  const [transactionHash, setTransactionHash] = useState('');
  const [activationStep, setActivationStep] = useState(1);

  // Load user status on mount
  useEffect(() => {
    if (isConnected && walletAddress) {
      loadActivationStatus();
    }
  }, [isConnected, walletAddress]);

  const loadActivationStatus = async () => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      
      // Get member info
      const memberResult = await callEdgeFunction('activate-membership', {
        action: 'get-member-info'
      }, walletAddress);

      if (memberResult.success && memberResult.member) {
        // Get BCC balance details
        const bccResult = await callEdgeFunction('bcc-release-system', {
          action: 'get_balance',
          walletAddress
        });

        // Get pending rewards
        const rewardsResult = await callEdgeFunction('process-rewards', {
          action: 'check_pending',
          walletAddress
        });

        // Get direct referrals count
        // This would need to be implemented in the backend
        
        setActivationStatus({
          currentLevel: memberResult.member.current_level || 0,
          activationRank: memberResult.member.activation_rank || 0,
          tier: memberResult.member.tier_level || 1,
          bccBalance: bccResult.success ? bccResult.balanceDetails : { transferable: 0, locked: 0, totalEarned: 0 },
          directReferrals: 0, // Would be fetched from backend
          pendingRewards: rewardsResult.success ? rewardsResult.pendingRewards || [] : []
        });
      }

    } catch (error) {
      console.error('Failed to load activation status:', error);
      toast.error(t('membershipSystem.activation.errors.loadStatusFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleActivation = async () => {
    if (!walletAddress || !username || !email) {
      toast.error(t('membershipSystem.activation.errors.fillRequiredFields'));
      return;
    }

    try {
      setLoading(true);
      
      let finalTransactionHash = transactionHash;
      
      // For simulation mode, use 'simulation' as transaction hash
      if (activeNetwork === 'simulation') {
        finalTransactionHash = 'simulation';
      } else if (!transactionHash) {
        toast.error(t('membershipSystem.activation.errors.transactionHashRequired'));
        return;
      }

      const result = await callEdgeFunction('activate-membership', {
        walletAddress,
        referrerWallet: referrerWallet || undefined,
        transactionHash: finalTransactionHash,
        network: activeNetwork,
        nftTokenId: 1, // Level 1 activation
        username,
        email
      }, walletAddress);

      if (result.success) {
        toast.success(t('membershipSystem.activation.success.activated'));
        setActivationStep(4); // Success step
        await loadActivationStatus();
        onActivationComplete?.(result);
      } else {
        toast.error(result.error || t('membershipSystem.activation.errors.activationFailed'));
      }

    } catch (error) {
      console.error('Activation error:', error);
      toast.error(t('membershipSystem.activation.errors.tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (rewardId: string) => {
    if (!walletAddress) return;

    try {
      setLoading(true);
      
      const result = await callEdgeFunction('process-rewards', {
        action: 'claim_reward',
        rewardId,
        walletAddress
      }, walletAddress);

      if (result.success) {
        toast.success(t('membershipSystem.rewards.success.claimed', { amount: result.claimedAmount }));
        await loadActivationStatus();
      } else {
        toast.error(result.error || t('membershipSystem.rewards.errors.claimFailed'));
      }

    } catch (error) {
      console.error('Claim reward error:', error);
      toast.error(t('membershipSystem.rewards.errors.claimFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('membershipSystem.wallet.connectTitle')}</h2>
          <p className="text-muted-foreground">
            {t('membershipSystem.wallet.connectDescription')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Already activated member - show dashboard
  if (activationStatus && activationStatus.currentLevel > 0) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Member Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-honey" />
              {t('membershipSystem.dashboard.title', { level: activationStatus.currentLevel })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-honey">{activationStatus.currentLevel}</div>
                <div className="text-sm text-muted-foreground">{t('membershipSystem.dashboard.labels.currentLevel')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">#{activationStatus.activationRank}</div>
                <div className="text-sm text-muted-foreground">{t('membershipSystem.dashboard.labels.activationRank')}</div>
              </div>
              <div className="text-center">
                <Badge variant="secondary">Tier {activationStatus.tier}</Badge>
                <div className="text-sm text-muted-foreground mt-1">{t('membershipSystem.dashboard.labels.memberTier')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{activationStatus.directReferrals}</div>
                <div className="text-sm text-muted-foreground">{t('membershipSystem.dashboard.labels.directReferrals')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-honey" />
              {t('membershipSystem.dashboard.balance.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {activationStatus.bccBalance.transferable.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">{t('membershipSystem.dashboard.balance.transferable')}</div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {activationStatus.bccBalance.locked.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">{t('membershipSystem.dashboard.balance.locked')}</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {activationStatus.bccBalance.totalEarned.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">{t('membershipSystem.dashboard.balance.totalEarned')}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Rewards Card */}
        {activationStatus.pendingRewards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-honey" />
                {t('membershipSystem.rewards.pendingTitle', { count: activationStatus.pendingRewards.length })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activationStatus.pendingRewards.map((reward: any) => (
                  <div key={reward.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <div className="font-semibold">{reward.reward_amount} USDC</div>
                      <div className="text-sm text-muted-foreground">
                        {t('membershipSystem.rewards.rewardDescription', { level: reward.nft_level, hours: reward.hoursLeft })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={reward.canClaim ? "default" : "secondary"}>
                        {reward.canClaim ? t('membershipSystem.rewards.status.claimable') : t('membershipSystem.rewards.status.pending')}
                      </Badge>
                      {reward.canClaim && (
                        <Button
                          size="sm"
                          onClick={() => claimReward(reward.id)}
                          disabled={loading}
                        >
                          {t('membershipSystem.rewards.actions.claim')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Activation flow for new users
  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            {t('membershipSystem.activation.title')}
          </CardTitle>
          <div className="text-center text-muted-foreground">
            {t('membershipSystem.activation.description')}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activationStep.toString()} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="1">{t('membershipSystem.activation.steps.details')}</TabsTrigger>
              <TabsTrigger value="2">{t('membershipSystem.activation.steps.payment')}</TabsTrigger>
              <TabsTrigger value="3">{t('membershipSystem.activation.steps.confirm')}</TabsTrigger>
              <TabsTrigger value="4">{t('membershipSystem.activation.steps.complete')}</TabsTrigger>
            </TabsList>

            {/* Step 1: User Details */}
            <TabsContent value="1" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('membershipSystem.activation.form.username')}</label>
                  <Input
                    placeholder={t('membershipSystem.activation.form.usernamePlaceholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('membershipSystem.activation.form.email')}</label>
                  <Input
                    type="email"
                    placeholder={t('membershipSystem.activation.form.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('membershipSystem.activation.form.referrer')}</label>
                  <Input
                    placeholder={t('membershipSystem.activation.form.referrerPlaceholder')}
                    value={referrerWallet}
                    onChange={(e) => setReferrerWallet(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => setActivationStep(2)}
                  disabled={!username || !email}
                  className="w-full"
                >
                  {t('membershipSystem.activation.form.continueToPayment')}
                </Button>
              </div>
            </TabsContent>

            {/* Step 2: Payment Method */}
            <TabsContent value="2" className="space-y-4">
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t('membershipSystem.activation.payment.cost')}</strong>
                    <br />
                    {t('membershipSystem.activation.payment.nftCost')}
                    <br />
                    {t('membershipSystem.activation.payment.activationFee')}
                  </AlertDescription>
                </Alert>

                <div>
                  <label className="text-sm font-medium">{t('membershipSystem.activation.payment.networkLabel')}</label>
                  <Tabs value={activeNetwork} onValueChange={(v: any) => setActiveNetwork(v)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="simulation">{t('membershipSystem.activation.payment.networks.simulation')}</TabsTrigger>
                      <TabsTrigger value="testnet">{t('membershipSystem.activation.payment.networks.testnet')}</TabsTrigger>
                      <TabsTrigger value="mainnet">{t('membershipSystem.activation.payment.networks.mainnet')}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {activeNetwork !== 'simulation' && (
                  <div>
                    <label className="text-sm font-medium">{t('membershipSystem.activation.payment.transactionHashLabel')}</label>
                    <Input
                      placeholder={t('membershipSystem.activation.payment.transactionHashPlaceholder')}
                      value={transactionHash}
                      onChange={(e) => setTransactionHash(e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('membershipSystem.activation.payment.transactionHashHelper')}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setActivationStep(1)}>
                    {t('membershipSystem.activation.form.back')}
                  </Button>
                  <Button
                    onClick={() => setActivationStep(3)}
                    disabled={activeNetwork !== 'simulation' && !transactionHash}
                    className="flex-1"
                  >
                    {t('membershipSystem.activation.form.continueToConfirmation')}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Step 3: Confirmation */}
            <TabsContent value="3" className="space-y-4">
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t('membershipSystem.activation.confirm.summaryTitle')}</strong>
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>{t('membershipSystem.activation.confirm.username')}:</strong> {username}
                  </div>
                  <div>
                    <strong>{t('membershipSystem.activation.confirm.email')}:</strong> {email}
                  </div>
                  <div>
                    <strong>{t('membershipSystem.activation.confirm.network')}:</strong> {activeNetwork}
                  </div>
                  <div>
                    <strong>{t('membershipSystem.activation.confirm.nftLevel')}:</strong> {t('membershipSystem.activation.confirm.level1')}
                  </div>
                  {referrerWallet && (
                    <div className="md:col-span-2">
                      <strong>{t('membershipSystem.activation.confirm.referrer')}:</strong> {referrerWallet}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setActivationStep(2)}>
                    {t('membershipSystem.activation.form.back')}
                  </Button>
                  <Button
                    onClick={handleActivation}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('membershipSystem.activation.form.activating')}
                      </>
                    ) : (
                      t('membershipSystem.activation.form.activateMembership')
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Step 4: Success */}
            <TabsContent value="4" className="space-y-4">
              <div className="text-center space-y-4">
                <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                <h2 className="text-2xl font-bold">{t('membershipSystem.activation.success.welcomeTitle')}</h2>
                <p className="text-muted-foreground">
                  {t('membershipSystem.activation.success.welcomeDescription')}
                </p>
                <Button onClick={() => window.location.reload()}>
                  {t('membershipSystem.activation.success.continueToDashboard')}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MembershipActivationSystem;
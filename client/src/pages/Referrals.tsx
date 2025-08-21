import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function Referrals() {
  const { walletAddress, userData } = useWallet();
  const { t } = useI18n();
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch user referral statistics
  const { data: userStats, isLoading: isStatsLoading } = useQuery<any>({
    queryKey: ['/api/beehive/user-stats', walletAddress],
    enabled: !!walletAddress
  });

  // Fetch user's referral tree/matrix data
  const { data: referralTree, isLoading: isTreeLoading } = useQuery<any>({
    queryKey: ['/api/beehive/referral-tree'],
    enabled: !!walletAddress
  });

  // Calculate referral statistics from real data
  const referralStats = {
    directReferrals: userStats?.directReferralCount || 0,
    totalTeam: userStats?.totalTeamCount || 0,
    totalEarnings: userStats?.totalEarnings || 0,
    monthlyEarnings: userStats?.monthlyEarnings || 0,
    pendingCommissions: userStats?.pendingCommissions || 0,
    nextPayout: userStats?.nextPayout || 'TBA'
  };

  // Get direct referrals from tree data
  const directReferrals = referralTree?.directReferrals || [];

  const referralLink = `https://beehive.app/register?ref=${walletAddress}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Referral Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-users text-honey text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{isStatsLoading ? '...' : referralStats.directReferrals}</div>
            <div className="text-muted-foreground text-sm">{t('me.referral.directReferrals')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-sitemap text-blue-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{isStatsLoading ? '...' : referralStats.totalTeam}</div>
            <div className="text-muted-foreground text-sm">{t('me.referral.totalTeamSize')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-dollar-sign text-green-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{isStatsLoading ? '...' : referralStats.totalEarnings}</div>
            <div className="text-muted-foreground text-sm">{t('me.referral.totalEarnings')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-calendar text-purple-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{isStatsLoading ? '...' : referralStats.monthlyEarnings}</div>
            <div className="text-muted-foreground text-sm">{t('me.referral.thisMonth')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link - Mobile Optimized */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              <Input 
                value={referralLink} 
                readOnly 
                className="font-mono text-sm flex-1"
                data-testid="input-referral-link"
              />
              <Button 
                onClick={copyToClipboard} 
                className="btn-honey w-full sm:w-auto whitespace-nowrap"
                data-testid="button-copy-referral-link"
              >
                <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'} mr-2`}></i>
                {copySuccess ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
            
            {/* Social Share Buttons - Mobile Friendly */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
              <Button
                onClick={() => {
                  const url = `https://twitter.com/intent/tweet?text=Join me on Beehive! ${encodeURIComponent(referralLink)}`;
                  window.open(url, '_blank');
                }}
                variant="outline"
                className="text-xs sm:text-sm"
                data-testid="button-share-twitter"
              >
                <i className="fab fa-twitter mr-1 sm:mr-2"></i>
                <span className="hidden sm:inline">Twitter</span>
                <span className="sm:hidden">X</span>
              </Button>
              <Button
                onClick={() => {
                  const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join me on Beehive!`;
                  window.open(url, '_blank');
                }}
                variant="outline"
                className="text-xs sm:text-sm"
                data-testid="button-share-telegram"
              >
                <i className="fab fa-telegram mr-1 sm:mr-2"></i>
                <span>Telegram</span>
              </Button>
              <Button
                onClick={() => {
                  const url = `whatsapp://send?text=Join me on Beehive! ${encodeURIComponent(referralLink)}`;
                  window.open(url, '_blank');
                }}
                variant="outline"
                className="text-xs sm:text-sm col-span-2 sm:col-span-1"
                data-testid="button-share-whatsapp"
              >
                <i className="fab fa-whatsapp mr-1 sm:mr-2"></i>
                <span>WhatsApp</span>
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Share this link to earn referral rewards when new members join through your invitation.
          </p>
        </CardContent>
      </Card>

      {/* Commission Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-secondary border-border">
          <CardHeader>
            <CardTitle className="text-honey">Pending Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {isStatsLoading ? '...' : referralStats.pendingCommissions} USDT
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Next payout: {isStatsLoading ? '...' : referralStats.nextPayout}
              </p>
              <Button className="btn-honey w-full" data-testid="button-claim-commissions">
                <i className="fas fa-download mr-2"></i>
                Claim Commissions
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary border-border">
          <CardHeader>
            <CardTitle className="text-honey">Matrix Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Matrix Position</span>
                <span className="text-honey font-semibold">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Spillover Bonus</span>
                <span className="text-green-400 font-semibold">+25 USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Matrix Level</span>
                <span className="text-honey font-semibold">Level 2</span>
              </div>
              <Button variant="outline" className="w-full mt-4" data-testid="button-view-matrix">
                <i className="fas fa-project-diagram mr-2"></i>
                View 3x3 Matrix
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Direct Referrals */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">Direct Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isTreeLoading ? (
              <div className="flex justify-center py-4">
                <div className="text-muted-foreground">Loading referrals...</div>
              </div>
            ) : directReferrals.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No direct referrals yet
              </div>
            ) : (
              directReferrals.map((referral: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-honey/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-user text-honey text-sm"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-honey">{formatAddress(referral.walletAddress)}</h4>
                    <p className="text-xs text-muted-foreground">
                      Level {referral.currentLevel || 1} • Joined {new Date(referral.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-600 text-white">
                    +{referral.earnings || 0} USDT
                  </Badge>
                  <Badge variant="secondary">
                    Position {referral.matrixPosition || 0}
                  </Badge>
                </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
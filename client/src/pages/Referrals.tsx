import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function Referrals() {
  const { walletAddress } = useWallet();
  const { t } = useI18n();
  const [copySuccess, setCopySuccess] = useState(false);

  const mockReferralData = {
    directReferrals: 3,
    totalTeam: 12,
    totalEarnings: 1100,
    monthlyEarnings: 350,
    matrix: [
      { position: 1, wallet: '0x1234...5678', level: 2, joinDate: '2024-10-15', earnings: 150 },
      { position: 2, wallet: '0x2345...6789', level: 1, joinDate: '2024-10-12', earnings: 130 },
      { position: 3, wallet: '0x3456...7890', level: 3, joinDate: '2024-10-08', earnings: 200 },
    ],
    pendingCommissions: 45,
    nextPayout: '2024-10-25'
  };

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
            <div className="text-2xl font-bold text-honey">{mockReferralData.directReferrals}</div>
            <div className="text-muted-foreground text-sm">{t('me.referral.directReferrals')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-sitemap text-blue-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{mockReferralData.totalTeam}</div>
            <div className="text-muted-foreground text-sm">{t('me.referral.totalTeamSize')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-dollar-sign text-green-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{mockReferralData.totalEarnings}</div>
            <div className="text-muted-foreground text-sm">{t('me.referral.totalEarnings')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-calendar text-purple-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{mockReferralData.monthlyEarnings}</div>
            <div className="text-muted-foreground text-sm">{t('me.referral.thisMonth')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input 
              value={referralLink} 
              readOnly 
              className="font-mono text-sm"
              data-testid="input-referral-link"
            />
            <Button 
              onClick={copyToClipboard} 
              className="btn-honey"
              data-testid="button-copy-referral-link"
            >
              <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'} mr-2`}></i>
              {copySuccess ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
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
              <div className="text-3xl font-bold text-green-400 mb-2">{mockReferralData.pendingCommissions} USDT</div>
              <p className="text-muted-foreground text-sm mb-4">Next payout: {mockReferralData.nextPayout}</p>
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
            {mockReferralData.matrix.map((referral, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-honey/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-user text-honey text-sm"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-honey">{formatAddress(referral.wallet)}</h4>
                    <p className="text-xs text-muted-foreground">
                      Level {referral.level} • Joined {referral.joinDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-600 text-white">
                    +{referral.earnings} USDT
                  </Badge>
                  <Badge variant="secondary">
                    Position {referral.position}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
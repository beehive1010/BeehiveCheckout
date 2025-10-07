import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Users, 
  Trophy, 
  UserCheck, 
  Share2,
  Info,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useI18n } from '../../contexts/I18nContext';

interface DirectReferral {
  memberWallet: string;
  memberName: string;
  referredAt: string;
  isActivated: boolean;
  memberLevel: number;
  activationRank: number | null;
  referralSource: string;
}

interface DirectReferralsCardProps {
  walletAddress: string;
  className?: string;
}

const DirectReferralsCard: React.FC<DirectReferralsCardProps> = ({ 
  walletAddress, 
  className 
}) => {
  const { t } = useI18n();
  const [directReferrals, setDirectReferrals] = useState<DirectReferral[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      loadDirectReferrals();
    }
  }, [walletAddress]);

  const loadDirectReferrals = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Loading direct referrals for wallet: ${walletAddress}`);

      // Get direct referrals from referrals table - direct referrals only
      // Using exact matching to avoid RLS issues
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select(`
          member_wallet,
          placed_at,
          referrer_wallet,
          is_spillover_placement
        `)
        .ilike('referrer_wallet', walletAddress)
        .neq('member_wallet', '0x479ABda60F8c62a7C3fba411ab948a8BE0E616Ab')
        .order('placed_at', { ascending: false });

      if (referralsError) {
        console.error('❌ Referrals query error:', referralsError);
        throw new Error(referralsError.message);
      }

      console.log(`📊 Found ${referralsData?.length || 0} direct referrals with referrer_wallet matching ${walletAddress}`);

      // Get user names and member info (using new column name)
      const walletAddresses = referralsData?.map(r => r.member_wallet) || [];
      
      let membersData = [];
      let usersData = [];
      if (walletAddresses.length > 0) {
        // Get member info
        const { data: memberResults, error: membersError } = await supabase
          .from('members')
          .select('wallet_address, current_level, activation_sequence, activation_time')
          .in('wallet_address', walletAddresses);

        if (membersError) {
          console.error('⚠️ Members query error:', membersError);
        } else {
          membersData = memberResults || [];
          console.log(`👥 Found ${membersData.length} corresponding members`);
        }
        
        // Get user names
        const { data: userResults, error: usersError } = await supabase
          .from('users')
          .select('wallet_address, username')
          .in('wallet_address', walletAddresses);

        if (usersError) {
          console.error('⚠️ Users query error:', usersError);
        } else {
          usersData = userResults || [];
          console.log(`👤 Found ${usersData.length} corresponding users`);
        }
      }

      // Combine referral, user and member data (using new column names)
      const referralsList = referralsData?.map((referral: any) => {
        const userData = usersData?.find(u => 
          u.wallet_address.toLowerCase() === referral.member_wallet.toLowerCase()
        );
        const memberData = membersData?.find(m => 
          m.wallet_address.toLowerCase() === referral.member_wallet.toLowerCase()
        );
        return {
          memberWallet: referral.member_wallet,
          memberName: userData?.username || `User${referral.member_wallet.slice(-4)}`,
          referredAt: referral.placed_at,
          isActivated: !!memberData && memberData.current_level > 0,
          memberLevel: memberData?.current_level || 0,
          activationRank: memberData?.activation_sequence || null,
          referralSource: referral.is_spillover_placement ? 'spillover' : 'direct'
        };
      }) || [];

      console.log(`✅ Processed ${referralsList.length} direct referrals`);
      setDirectReferrals(referralsList);

    } catch (error: any) {
      console.error('❌ Error loading direct referrals:', error);
      setError(error.message || 'Failed to load direct referrals');
    } finally {
      setLoading(false);
    }
  };

  const totalReferrals = directReferrals.length;
  const activatedReferrals = directReferrals.filter(r => r.isActivated).length;
  const activationRate = totalReferrals > 0 ? Math.round((activatedReferrals / totalReferrals) * 100) : 0;

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const shareReferralLink = () => {
    const referralLink = `${window.location.origin}/welcome?ref=${walletAddress}`;
    navigator.clipboard.writeText(referralLink);
    // TODO: Add toast notification
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-2"></div>
            <div className="text-sm text-muted-foreground">Loading direct referrals...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-red-400 mb-2">⚠️ Loading Failed</div>
            <div className="text-xs text-muted-foreground">{error}</div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={loadDirectReferrals}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-honey" />
            <span>Direct Referrals</span>
          </div>
          <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
            {totalReferrals} Total
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-lg p-4 border border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400">{totalReferrals}</div>
            <div className="text-xs text-muted-foreground">Total Referrals</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center justify-between mb-2">
              <UserCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400">{activatedReferrals}</div>
            <div className="text-xs text-muted-foreground">Activated</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-400">{activationRate}%</div>
            <div className="text-xs text-muted-foreground">Activation Rate</div>
          </div>
        </div>


        {/* Referrals List */}
        {directReferrals.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium text-honey flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recent Direct Referrals
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {directReferrals.slice(0, 10).map((referral) => (
                <div key={referral.memberWallet} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        referral.isActivated ? 'bg-green-500' : 'bg-orange-500'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">
                          {referral.memberName || formatAddress(referral.memberWallet)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Level {referral.memberLevel} • {new Date(referral.referredAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {referral.activationRank && (
                      <Badge variant="outline" className="text-xs">
                        #{referral.activationRank}
                      </Badge>
                    )}
                    <Badge 
                      variant={referral.isActivated ? 'default' : 'outline'}
                      className={`text-xs ${
                        referral.isActivated 
                          ? 'bg-green-600 text-white' 
                          : 'text-orange-600 border-orange-600'
                      }`}
                    >
                      {referral.isActivated ? 'Active' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No direct referrals yet</p>
            <p className="text-xs mt-1">Share your referral link to start building your team</p>
          </div>
        )}

        {/* Share Referral Link */}
        <div className="pt-4 border-t">
          <Button 
            className="w-full bg-honey hover:bg-honey/90 text-black"
            onClick={shareReferralLink}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Copy Referral Link
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Info className="h-4 w-4" />
            <strong>Direct Referrals vs Matrix Spillover</strong>
          </div>
          <p className="text-xs">
            🎯 <strong>Direct:</strong> Users who register using your referral link
          </p>
          <p className="text-xs mt-1">
            📈 <strong>Spillover:</strong> Users placed in your matrix through automatic spillover algorithm
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DirectReferralsCard;
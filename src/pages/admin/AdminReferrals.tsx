import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Network,
  Search,
  Users,
  TrendingUp,
  ArrowRight,
  UserCheck,
  Calendar,
  Target,
  Award,
  Crown,
  ChevronDown,
  ChevronRight,
  Wallet
} from 'lucide-react';
import { useAdminAuthContext } from '../../contexts/AdminAuthContext';
import { useIsMobile } from '../../hooks/use-mobile';
import { supabase } from '../../lib/supabase';

interface GlobalMatrixPosition {
  walletAddress: string;
  matrixLevel: number;
  positionIndex: number;
  directSponsorWallet: string;
  placementSponsorWallet: string;
  joinedAt: string;
  lastUpgradeAt?: string;
  username?: string;
  memberActivated?: boolean;
  currentLevel?: number;
  directReferralCount?: number;
  totalTeamCount?: number;
}

interface GlobalMatrixVisualization {
  matrixLevel: number;
  maxPositions: number;
  filledPositions: number;
  positions: GlobalMatrixPosition[];
}

export default function AdminReferrals() {
  const { hasPermission } = useAdminAuthContext();
  const isMobile = useIsMobile();
  const [matrixPositions, setMatrixPositions] = useState<GlobalMatrixPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [matrixVisualization, setMatrixVisualization] = useState<GlobalMatrixVisualization[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReferrals();
  }, [searchTerm, selectedLevel]);

  const loadReferrals = async () => {
    try {
      setIsLoading(true);

      // Query v_member_overview view directly from Supabase
      let query = supabase
        .from('v_member_overview')
        .select('*')
        .order('activation_sequence', { ascending: true });

      // Apply search filter if provided
      if (searchTerm) {
        query = query.or(`wallet_address.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      // Map the data to GlobalMatrixPosition format
      const positions: GlobalMatrixPosition[] = (data || []).map((member: any) => ({
        walletAddress: member.wallet_address,
        matrixLevel: member.deepest_layer || 1,
        positionIndex: member.activation_sequence,
        directSponsorWallet: member.referrer_wallet || '',
        placementSponsorWallet: member.referrer_wallet || '',
        joinedAt: member.activation_time,
        username: member.username || '',
        memberActivated: member.is_active,
        currentLevel: member.current_level || 0,
        directReferralCount: member.direct_referrals_count || 0,
        totalTeamCount: member.active_members || 0,
      }));

      setMatrixPositions(positions);

      // Group positions by matrix level for visualization
      const levelGroups: Record<number, GlobalMatrixPosition[]> = {};
      positions.forEach(pos => {
        const level = pos.matrixLevel;
        if (!levelGroups[level]) {
          levelGroups[level] = [];
        }
        levelGroups[level].push(pos);
      });

      const visualization: GlobalMatrixVisualization[] = Object.entries(levelGroups).map(([level, positions]) => ({
        matrixLevel: parseInt(level),
        maxPositions: Math.pow(3, parseInt(level)), // 3^n for each level
        filledPositions: positions.length,
        positions: positions,
      }));

      setMatrixVisualization(visualization.sort((a, b) => a.matrixLevel - b.matrixLevel));
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load referral data:', error);
      setMatrixPositions([]);
      setMatrixVisualization([]);
      setIsLoading(false);
    }
  };

  // No longer needed - Global matrix doesn't have individual matrix visualizations
  // Instead we show the global matrix level structure

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLevelBadge = (level: number) => {
    if (level === 0) return <Badge variant="secondary">Inactive</Badge>;
    
    const levelNames = {
      1: 'Warrior',
      2: 'Guardian', 
      3: 'Champion',
      4: 'Hero',
      5: 'Legend'
    };
    
    const levelName = levelNames[level as keyof typeof levelNames] || `Level ${level}`;
    
    return (
      <Badge variant="default" className="bg-honey text-black">
        <Crown className="w-3 h-3 mr-1" />
        {levelName}
      </Badge>
    );
  };

  const toggleNodeExpansion = (walletAddress: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(walletAddress)) {
      newExpanded.delete(walletAddress);
    } else {
      newExpanded.add(walletAddress);
    }
    setExpandedNodes(newExpanded);
  };

  const renderGlobalMatrixPosition = (position: GlobalMatrixPosition) => {
    return (
      <div className="p-4 border rounded-lg bg-secondary border-honey/20">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium">{position.username || 'Unknown'}</div>
            {getLevelBadge(position.currentLevel || 0)}
          </div>
          <div className="text-sm text-muted-foreground">{formatWalletAddress(position.walletAddress)}</div>
          <div className="text-xs text-muted-foreground">
            Position #{position.positionIndex} • Level {position.matrixLevel}
          </div>
          <div className="text-xs text-muted-foreground">
            Joined: {formatDate(position.joinedAt)}
          </div>
        </div>
      </div>
    );
  };

  const renderGlobalMatrixList = (positions: GlobalMatrixPosition[]) => {
    return (
      <div className="space-y-2">
        {positions.map((position) => (
          <div 
            key={position.walletAddress}
            className="flex items-center space-x-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80"
          >
            <div className="w-8 h-8 bg-honey/10 rounded-full flex items-center justify-center">
              <span className="text-honey font-semibold text-sm">
                {position.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div>
                  <div className="font-medium">{position.username}</div>
                  <div className="text-sm text-muted-foreground">{formatWalletAddress(position.walletAddress)}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {getLevelBadge(position.currentLevel || 0)}
                <Badge variant="outline" className="text-xs">
                  <Target className="w-3 h-3 mr-1" />
                  Pos #{position.positionIndex}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Network className="w-3 h-3 mr-1" />
                  Level {position.matrixLevel}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!hasPermission('referrals.read')) {
    return (
      <div className="text-center py-8">
        <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view referral data.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-honey">Referrals Management</h1>
            <p className="text-muted-foreground mt-2">Loading referral network...</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const topReferrers = matrixPositions
    .filter(r => (r.directReferralCount || 0) > 0)
    .sort((a, b) => (b.directReferralCount || 0) - (a.directReferralCount || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-honey">Referrals Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage the 3×3 matrix referral network and track commissions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Network className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Total Positions</p>
                <p className="text-2xl font-bold">{matrixPositions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Active Referrers</p>
                <p className="text-2xl font-bold">{topReferrers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">
                  {matrixPositions.reduce((sum, r) => sum + (r.directReferralCount || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Network Size</p>
                <p className="text-2xl font-bold">
                  {matrixPositions.reduce((sum, r) => sum + (r.totalTeamCount || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Referral Network</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by username or wallet address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-muted"
            data-testid="input-search-referrals"
          />
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="tree" className="space-y-6">
        <TabsList>
          <TabsTrigger value="global-matrix">Global Matrix</TabsTrigger>
          <TabsTrigger value="level-structure">Matrix Levels</TabsTrigger>
          <TabsTrigger value="top-referrers">Top Referrers</TabsTrigger>
        </TabsList>

        <TabsContent value="global-matrix">
          <Card>
            <CardHeader>
              <CardTitle>Global Matrix Structure</CardTitle>
              <CardDescription>
                View all users in the single global shared matrix system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {matrixPositions.length === 0 ? (
                  <div className="text-center py-8">
                    <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Matrix Positions Found</h3>
                    <p className="text-muted-foreground">No users have joined the global matrix yet.</p>
                  </div>
                ) : (
                  renderGlobalMatrixList(matrixPositions)
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="level-structure">
          <div className="space-y-4">
            {matrixVisualization.map((levelData) => (
              <Card key={levelData.matrixLevel}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Matrix Level {levelData.matrixLevel}</span>
                    <Badge variant="outline">
                      {levelData.filledPositions} / {levelData.maxPositions} filled
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Global matrix level with maximum {levelData.maxPositions} positions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {levelData.positions && levelData.positions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {levelData.positions.map((position) => renderGlobalMatrixPosition(position))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No positions at this level</h3>
                      <p className="text-muted-foreground">This matrix level is currently empty.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="top-referrers">
          <Card>
            <CardHeader>
              <CardTitle>Top Referrers</CardTitle>
              <CardDescription>Users with the most direct referrals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topReferrers.map((referrer, index) => (
                  <div
                    key={referrer.walletAddress}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-honey/10 rounded-full flex items-center justify-center">
                        <span className="text-honey font-bold">#{index + 1}</span>
                      </div>
                      <div className="w-10 h-10 bg-honey/10 rounded-full flex items-center justify-center">
                        <span className="text-honey font-semibold">
                          {referrer.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{referrer.username}</div>
                        <div className="text-sm text-muted-foreground">
                          <Wallet className="w-3 h-3 inline mr-1" />
                          {formatWalletAddress(referrer.walletAddress)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {getLevelBadge(referrer.currentLevel || 0)}
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Direct Referrals</div>
                        <div className="font-bold text-honey">{referrer.directReferralCount || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Team Size</div>
                        <div className="font-bold">{referrer.totalTeamCount || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Joined</div>
                        <div className="font-medium">{formatDate(referrer.joinedAt)}</div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {topReferrers.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Referrers</h3>
                    <p className="text-muted-foreground">No users have made referrals yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
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
import { useAdminAuth } from '../../hooks/useAdminAuth';

interface ReferralNode {
  walletAddress: string;
  sponsorWallet: string | null;
  placerWallet: string | null;
  matrixPosition: number;
  leftLeg: string[];
  middleLeg: string[];
  rightLeg: string[];
  directReferralCount: number;
  totalTeamCount: number;
  createdAt: string;
  username?: string;
  memberActivated?: boolean;
  currentLevel?: number;
}

interface MatrixVisualization {
  center: ReferralNode;
  positions: (ReferralNode | null)[];
}

export default function AdminReferrals() {
  const { hasPermission } = useAdminAuth();
  const [referrals, setReferrals] = useState<ReferralNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatrix, setSelectedMatrix] = useState<MatrixVisualization | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReferrals();
  }, [searchTerm]);

  const loadReferrals = async () => {
    try {
      // Using real referral data structure
      const realReferrals: ReferralNode[] = [
        {
          walletAddress: '0x479abda60f8c62a7c3fba411ab948a8be0e616ab',
          sponsorWallet: null,
          placerWallet: null,
          matrixPosition: 0,
          leftLeg: ['0x2bc46f768384f88b3d3c53de6a69b3718026d23f'],
          middleLeg: ['0x742d35cc6cf2723395f9de6200a2fec67b67974b'],
          rightLeg: [],
          directReferralCount: 2,
          totalTeamCount: 2,
          createdAt: '2025-08-21T02:16:36.348481Z',
          username: 'test001',
          memberActivated: true,
          currentLevel: 1,
        },
        {
          walletAddress: '0x2bc46f768384f88b3d3c53de6a69b3718026d23f',
          sponsorWallet: '0x479abda60f8c62a7c3fba411ab948a8be0e616ab',
          placerWallet: '0x479abda60f8c62a7c3fba411ab948a8be0e616ab',
          matrixPosition: 0,
          leftLeg: [],
          middleLeg: [],
          rightLeg: [],
          directReferralCount: 0,
          totalTeamCount: 0,
          createdAt: '2025-08-21T06:11:08.699346Z',
          username: 'test004',
          memberActivated: false,
          currentLevel: 0,
        },
        {
          walletAddress: '0x742d35cc6cf2723395f9de6200a2fec67b67974b',
          sponsorWallet: '0x479abda60f8c62a7c3fba411ab948a8be0e616ab',
          placerWallet: '0x479abda60f8c62a7c3fba411ab948a8be0e616ab',
          matrixPosition: 3,
          leftLeg: [],
          middleLeg: [],
          rightLeg: [],
          directReferralCount: 0,
          totalTeamCount: 0,
          createdAt: '2025-08-21T11:56:29.147832Z',
          username: 'testuser',
          memberActivated: true,
          currentLevel: 1,
        },
      ];

      // Filter by search term
      const filteredReferrals = realReferrals.filter(referral =>
        (referral.username?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
        referral.walletAddress.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setReferrals(filteredReferrals);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load referrals:', error);
      setIsLoading(false);
    }
  };

  const generateMatrixVisualization = (centerNode: ReferralNode): MatrixVisualization => {
    // Create 3x3 matrix positions (0-8)
    const positions: (ReferralNode | null)[] = new Array(9).fill(null);
    
    // Fill positions with referrals
    centerNode.leftLeg.forEach((wallet, index) => {
      const node = referrals.find(r => r.walletAddress === wallet);
      if (node && index < 3) positions[index] = node;
    });
    
    centerNode.middleLeg.forEach((wallet, index) => {
      const node = referrals.find(r => r.walletAddress === wallet);
      if (node && index < 3) positions[index + 3] = node;
    });
    
    centerNode.rightLeg.forEach((wallet, index) => {
      const node = referrals.find(r => r.walletAddress === wallet);
      if (node && index < 3) positions[index + 6] = node;
    });

    return { center: centerNode, positions };
  };

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

  const renderMatrixPosition = (position: number, node: ReferralNode | null) => {
    const positionLabels = ['L1', 'L2', 'L3', 'M1', 'M2', 'M3', 'R1', 'R2', 'R3'];
    
    return (
      <div 
        key={position}
        className={`
          p-2 border rounded-lg text-center transition-all hover:shadow-md
          ${node ? 'bg-secondary border-honey/20 cursor-pointer' : 'bg-muted border-dashed border-muted-foreground/20'}
        `}
        onClick={() => node && setSelectedMatrix(generateMatrixVisualization(node))}
      >
        <div className="text-xs text-muted-foreground mb-1">{positionLabels[position]}</div>
        {node ? (
          <div className="space-y-1">
            <div className="font-medium text-xs">{node.username || 'Unknown'}</div>
            <div className="text-xs text-muted-foreground">{formatWalletAddress(node.walletAddress)}</div>
            {getLevelBadge(node.currentLevel || 0)}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Empty</div>
        )}
      </div>
    );
  };

  const renderReferralTree = (node: ReferralNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.walletAddress);
    const hasChildren = node.directReferralCount > 0;
    
    return (
      <div key={node.walletAddress} className="space-y-2">
        <div 
          className={`
            flex items-center space-x-3 p-3 rounded-lg bg-secondary hover:bg-secondary/80 cursor-pointer
            ${depth > 0 ? 'ml-6 border-l-2 border-honey/20' : ''}
          `}
          onClick={() => hasChildren && toggleNodeExpansion(node.walletAddress)}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="w-4 h-4" />
          )}
          
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-honey/10 rounded-full flex items-center justify-center">
                <span className="text-honey font-semibold text-sm">
                  {node.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <div className="font-medium">{node.username}</div>
                <div className="text-sm text-muted-foreground">{formatWalletAddress(node.walletAddress)}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {getLevelBadge(node.currentLevel || 0)}
              <Badge variant="outline" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {node.directReferralCount}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Network className="w-3 h-3 mr-1" />
                {node.totalTeamCount}
              </Badge>
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="space-y-2">
            {referrals
              .filter(r => r.sponsorWallet === node.walletAddress)
              .map(child => renderReferralTree(child, depth + 1))
            }
          </div>
        )}
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

  const topReferrers = referrals
    .filter(r => r.directReferralCount > 0)
    .sort((a, b) => b.directReferralCount - a.directReferralCount)
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
                <p className="text-sm text-muted-foreground">Total Nodes</p>
                <p className="text-2xl font-bold">{referrals.length}</p>
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
                  {referrals.reduce((sum, r) => sum + r.directReferralCount, 0)}
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
                  {referrals.reduce((sum, r) => sum + r.totalTeamCount, 0)}
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
          <TabsTrigger value="tree">Referral Tree</TabsTrigger>
          <TabsTrigger value="matrix">3×3 Matrix View</TabsTrigger>
          <TabsTrigger value="top-referrers">Top Referrers</TabsTrigger>
        </TabsList>

        <TabsContent value="tree">
          <Card>
            <CardHeader>
              <CardTitle>Referral Tree Structure</CardTitle>
              <CardDescription>
                Hierarchical view of the referral network showing sponsor relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {referrals
                  .filter(r => !r.sponsorWallet) // Root nodes
                  .map(rootNode => renderReferralTree(rootNode))
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Matrix Center</CardTitle>
                <CardDescription>Click on a user to view their 3×3 matrix</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {referrals.map(referral => (
                    <div
                      key={referral.walletAddress}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary cursor-pointer hover:bg-secondary/80"
                      onClick={() => setSelectedMatrix(generateMatrixVisualization(referral))}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-honey/10 rounded-full flex items-center justify-center">
                          <span className="text-honey font-semibold text-sm">
                            {referral.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{referral.username}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatWalletAddress(referral.walletAddress)}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedMatrix && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>3×3 Matrix: {selectedMatrix.center.username}</span>
                  </CardTitle>
                  <CardDescription>
                    Matrix positions for {formatWalletAddress(selectedMatrix.center.walletAddress)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Center Node */}
                    <div className="text-center">
                      <div className="inline-flex items-center space-x-2 p-3 bg-honey/10 rounded-lg border border-honey">
                        <div className="w-10 h-10 bg-honey rounded-full flex items-center justify-center">
                          <span className="text-black font-bold">
                            {selectedMatrix.center.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-honey">{selectedMatrix.center.username}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatWalletAddress(selectedMatrix.center.walletAddress)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3x3 Matrix Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {selectedMatrix.positions.map((node, index) => renderMatrixPosition(index, node))}
                    </div>

                    {/* Matrix Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Left Leg</div>
                        <div className="font-bold">{selectedMatrix.center.leftLeg.length}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Middle Leg</div>
                        <div className="font-bold">{selectedMatrix.center.middleLeg.length}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Right Leg</div>
                        <div className="font-bold">{selectedMatrix.center.rightLeg.length}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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
                        <div className="font-bold text-honey">{referrer.directReferralCount}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Team Size</div>
                        <div className="font-bold">{referrer.totalTeamCount}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">Joined</div>
                        <div className="font-medium">{formatDate(referrer.createdAt)}</div>
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
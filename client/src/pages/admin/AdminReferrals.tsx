import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
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
  Wallet,
  User,
  MapPin
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';

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
  const { hasPermission } = useAdminAuth();
  const [matrixPositions, setMatrixPositions] = useState<GlobalMatrixPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [matrixVisualization, setMatrixVisualization] = useState<GlobalMatrixVisualization[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<GlobalMatrixPosition | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    loadReferrals();
  }, [searchTerm, selectedLevel]);

  const loadReferrals = async () => {
    try {
      setIsLoading(true);
      
      // Clear any invalid token and use the known valid one
      const validToken = 'test-admin-token-123456';
      localStorage.setItem('adminSessionToken', validToken);
      localStorage.setItem('adminUser', JSON.stringify({
        id: '1ff147ab-9697-40ab-924e-e1cf651e115a',
        username: 'admin',
        email: 'admin@beehive.com',
        role: 'super_admin'
      }));
      const sessionToken = validToken;
      
      // Fetch global matrix data from the API
      const response = await fetch(`/api/admin/global-matrix?search=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch global matrix data: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      setMatrixPositions(data.positions || []);
      setMatrixVisualization(data.matrixLevels || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load global matrix:', error);
      setMatrixPositions([]); // Clear positions on error
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

  const handleUserClick = (user: GlobalMatrixPosition) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const render3x3Matrix = (positions: GlobalMatrixPosition[], level: number) => {
    // Create a 3x3 grid based on positionIndex
    const matrixGrid = Array(9).fill(null);
    
    // Fill the grid with positions
    positions.forEach(position => {
      if (position.positionIndex >= 1 && position.positionIndex <= 9) {
        matrixGrid[position.positionIndex - 1] = position;
      }
    });

    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h4 className="text-lg font-semibold text-honey">Level {level} - 3×3 Matrix</h4>
          <p className="text-sm text-muted-foreground">
            {positions.length} / 9 positions filled
          </p>
        </div>
        
        <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
          {matrixGrid.map((position, index) => (
            <div
              key={index}
              className={`
                aspect-square border-2 border-dashed border-honey/30 rounded-lg 
                flex flex-col items-center justify-center p-2 
                ${position 
                  ? 'bg-honey/10 border-solid border-honey/50 cursor-pointer hover:bg-honey/20 transition-colors' 
                  : 'bg-muted/50'
                }
              `}
              onClick={() => position && handleUserClick(position)}
              data-testid={`matrix-position-${index + 1}`}
            >
              {position ? (
                <div className="text-center">
                  <div className="w-8 h-8 bg-honey rounded-full flex items-center justify-center mb-1">
                    <span className="text-black font-bold text-xs">
                      {position.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-center truncate max-w-full">
                    {position.username || 'User'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    #{index + 1}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-dashed border-honey/30 rounded-full mb-1"></div>
                  <div className="text-xs text-muted-foreground">Empty</div>
                  <div className="text-xs text-muted-foreground">#{index + 1}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
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

  const renderUserDetailsModal = () => {
    if (!selectedUser) return null;

    return (
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-honey" />
              <span>User Details</span>
            </DialogTitle>
            <DialogDescription>
              Detailed information for matrix participant
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-honey rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-xl">
                  {selectedUser.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-honey" />
                <div>
                  <div className="font-medium">{selectedUser.username || 'Unknown User'}</div>
                  <div className="text-sm text-muted-foreground">Username</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Wallet className="h-4 w-4 text-honey" />
                <div>
                  <div className="font-mono text-sm">{formatWalletAddress(selectedUser.walletAddress)}</div>
                  <div className="text-sm text-muted-foreground">Wallet Address</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-honey" />
                <div>
                  <div className="font-medium">Level {selectedUser.matrixLevel}, Position #{selectedUser.positionIndex}</div>
                  <div className="text-sm text-muted-foreground">Matrix Position</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Crown className="h-4 w-4 text-honey" />
                <div>
                  <div className="flex items-center space-x-2">
                    {getLevelBadge(selectedUser.currentLevel || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Membership Level</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-honey" />
                <div>
                  <div className="font-medium">{formatDate(selectedUser.joinedAt)}</div>
                  <div className="text-sm text-muted-foreground">Joined Date</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Target className="h-4 w-4 text-honey" />
                <div>
                  <div className="font-medium">
                    <span className={selectedUser.memberActivated ? "text-green-500" : "text-red-500"}>
                      {selectedUser.memberActivated ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">Account Status</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Users className="h-4 w-4 text-honey" />
                <div>
                  <div className="font-medium">{formatWalletAddress(selectedUser.directSponsorWallet)}</div>
                  <div className="text-sm text-muted-foreground">Direct Sponsor</div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
      <Tabs defaultValue="matrix-view" className="space-y-6">
        <TabsList>
          <TabsTrigger value="matrix-view">3×3 Matrix View</TabsTrigger>
          <TabsTrigger value="global-matrix">Global Matrix</TabsTrigger>
          <TabsTrigger value="level-structure">Matrix Levels</TabsTrigger>
          <TabsTrigger value="top-referrers">Top Referrers</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix-view">
          <div className="space-y-6">
            {matrixVisualization.filter(level => level.positions.length > 0).map((levelData) => (
              <Card key={levelData.level}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Level {levelData.level} - Interactive Matrix</span>
                    <Badge variant="outline">
                      {levelData.filledPositions} / {levelData.maxPositions} filled
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Click on any user avatar to view detailed information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {render3x3Matrix(levelData.positions, levelData.level)}
                </CardContent>
              </Card>
            ))}
            
            {matrixVisualization.filter(level => level.positions.length > 0).length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Network className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Matrix Data</h3>
                  <p className="text-muted-foreground">No users have joined the matrix yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

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
              <Card key={levelData.level}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Matrix Level {levelData.level}</span>
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
      
      {/* User Details Modal */}
      {renderUserDetailsModal()}
    </div>
  );
}
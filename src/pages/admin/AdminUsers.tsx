import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Users, 
  Wallet,
  Search,
  Crown,
  TrendingUp,
  Calendar,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Link as LinkIcon,
  Award,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PlatformUser {
  walletAddress: string;
  username?: string;
  email?: string;
  currentLevel: number;
  memberActivated: boolean;
  registrationStatus: string;
  createdAt: string;
  lastUpdatedAt: string;
  activationAt?: string;
  referrerWallet?: string;
  preferredLanguage: string;
  
  // Membership data
  levelsOwned: number[];
  activeLevel: number;
  joinedAt?: string;
  lastUpgradeAt?: string;
  
  // BCC balances
  transferableBCC: number;
  restrictedBCC: number;
  
  // Earnings data
  totalEarnings: number;
  referralEarnings: number;
  levelEarnings: number;
  pendingRewards: number;
  withdrawnAmount: number;
  
  // Referral data
  directReferralCount: number;
  totalTeamCount: number;
  sponsorWallet?: string;
  matrixPosition: number;
}

const MEMBERSHIP_LEVELS = [
  { level: 1, name: 'Warrior', price: 25 },
  { level: 2, name: 'Guardian', price: 50 },
  { level: 3, name: 'Sentinel', price: 100 },
  { level: 4, name: 'Champion', price: 200 },
  { level: 5, name: 'Vanguard', price: 400 },
  { level: 6, name: 'Elite', price: 800 },
  { level: 7, name: 'Master', price: 1600 },
  { level: 8, name: 'Grandmaster', price: 3200 },
  { level: 9, name: 'Legendary', price: 6400 },
  { level: 10, name: 'Mythic', price: 12800 },
  { level: 11, name: 'Ascendant', price: 25600 },
  { level: 12, name: 'Transcendent', price: 51200 },
  { level: 13, name: 'Eternal', price: 102400 },
  { level: 14, name: 'Cosmic', price: 204800 },
  { level: 15, name: 'Universal', price: 409600 },
  { level: 16, name: 'Infinite', price: 819200 },
  { level: 17, name: 'Omnipotent', price: 1638400 },
  { level: 18, name: 'Divine', price: 3276800 },
  { level: 19, name: 'Mythic Peak', price: 6553600 },
];

export default function AdminUsers() {
  const { hasPermission } = useAdminAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);

  // Fetch platform users
  const { data: platformUsers = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/platform-users', { search: searchTerm, level: levelFilter, status: statusFilter }],
    queryFn: async (): Promise<PlatformUser[]> => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (levelFilter !== 'all') params.append('level', levelFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'x-admin-token': localStorage.getItem('admin_token') || '',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch platform users');
      }
      
      const result = await response.json();
      return result.success ? result.data : [];
    },
    enabled: hasPermission('users.read'),
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ walletAddress, updates }: { walletAddress: string; updates: any }) => {
      const response = await fetch(`/api/admin/platform-users/${walletAddress}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminSessionToken')}`,
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/platform-users'] });
      toast({
        title: 'User Updated',
        description: 'User data has been updated successfully',
      });
    },
  });

  // Get level name and color
  const getLevelInfo = (level: number) => {
    const levelInfo = MEMBERSHIP_LEVELS.find(l => l.level === level);
    return {
      name: levelInfo?.name || 'Unactivated',
      color: level === 0 ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' :
             level <= 3 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
             level <= 6 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
             level <= 9 ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
             level <= 12 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
             level <= 15 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
             'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    };
  };

  // Calculate statistics
  const stats = {
    total: platformUsers.length,
    activated: platformUsers.filter((u: PlatformUser) => u.memberActivated).length,
    unactivated: platformUsers.filter((u: PlatformUser) => !u.memberActivated).length,
    totalBCC: platformUsers.reduce((sum: number, u: PlatformUser) => sum + u.transferableBCC + u.restrictedBCC, 0),
    totalEarnings: platformUsers.reduce((sum: number, u: PlatformUser) => sum + u.totalEarnings, 0),
  };

  // Access check
  if (!hasPermission('users.read')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>You need user management permissions to access this section.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Platform Users...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please wait while we load the user data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Platform Users</h1>
          <p className="text-muted-foreground">Manage Web3 platform members and their data</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.activated}</p>
                <p className="text-xs text-muted-foreground">Activated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.unactivated}</p>
                <p className="text-xs text-muted-foreground">Unactivated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Crown className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalBCC.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total BCC</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by wallet address or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="0">Unactivated</SelectItem>
                {MEMBERSHIP_LEVELS.slice(0, 10).map(level => (
                  <SelectItem key={level.level} value={level.level.toString()}>
                    Level {level.level} - {level.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="activated">Activated</SelectItem>
                <SelectItem value="unactivated">Unactivated</SelectItem>
                <SelectItem value="completed">Registration Complete</SelectItem>
                <SelectItem value="pending">Registration Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Members</CardTitle>
          <CardDescription>
            Web3 wallet users with membership levels and BCC balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {platformUsers.map((user: PlatformUser) => {
              const levelInfo = getLevelInfo(user.currentLevel);
              return (
                <div key={user.walletAddress} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-semibold">
                      <Wallet className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">
                          {user.username || `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}
                        </h3>
                        <Badge className={levelInfo.color}>
                          <Crown className="h-3 w-3 mr-1" />
                          Level {user.currentLevel} - {levelInfo.name}
                        </Badge>
                        {user.memberActivated ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Activated
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            <Clock className="h-3 w-3 mr-1" />
                            Unactivated
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Wallet className="h-3 w-3 mr-1" />
                          {user.walletAddress}
                        </span>
                        {user.email && (
                          <span className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center">
                          <Crown className="h-3 w-3 mr-1" />
                          BCC: {user.transferableBCC.toLocaleString()} + {user.restrictedBCC.toLocaleString()} restricted
                        </span>
                        <span className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          Earnings: ${user.totalEarnings.toFixed(2)}
                        </span>
                        <span className="flex items-center">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Team: {user.totalTeamCount} ({user.directReferralCount} direct)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUser(user)}
                      data-testid={`button-view-user-${user.walletAddress}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}
            {platformUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No platform users found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog could go here */}
      {selectedUser && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              User Details: {selectedUser.username || selectedUser.walletAddress}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="membership">Membership</TabsTrigger>
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
                <TabsTrigger value="referrals">Referrals</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Wallet Address</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.walletAddress}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Username</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.username || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Registration Status</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.registrationStatus}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Created At</p>
                    <p className="text-sm text-muted-foreground">{new Date(selectedUser.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">{new Date(selectedUser.lastUpdatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="membership" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Current Level</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.currentLevel} - {getLevelInfo(selectedUser.currentLevel).name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Active Level</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.activeLevel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Levels Owned</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.levelsOwned.join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Member Activated</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.memberActivated ? 'Yes' : 'No'}</p>
                  </div>
                  {selectedUser.activationAt && (
                    <div>
                      <p className="text-sm font-medium">Activation Date</p>
                      <p className="text-sm text-muted-foreground">{new Date(selectedUser.activationAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="earnings" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Total Earnings</p>
                    <p className="text-sm text-muted-foreground">${selectedUser.totalEarnings.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Referral Earnings</p>
                    <p className="text-sm text-muted-foreground">${selectedUser.referralEarnings.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Level Earnings</p>
                    <p className="text-sm text-muted-foreground">${selectedUser.levelEarnings.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Pending Rewards</p>
                    <p className="text-sm text-muted-foreground">${selectedUser.pendingRewards.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Withdrawn Amount</p>
                    <p className="text-sm text-muted-foreground">${selectedUser.withdrawnAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">BCC Balances</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.transferableBCC.toLocaleString()} transferable + {selectedUser.restrictedBCC.toLocaleString()} restricted
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="referrals" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Direct Referrals</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.directReferralCount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total Team</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.totalTeamCount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Sponsor</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.sponsorWallet || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Referrer</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.referrerWallet || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Matrix Position</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.matrixPosition}</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
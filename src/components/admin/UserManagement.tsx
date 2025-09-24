import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { useToast } from '../../hooks/use-toast';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Shield, 
  ShieldCheck,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  TrendingUp,
  RefreshCw,
  Download,
  UserPlus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { supabase } from '../../lib/supabase';

interface User {
  id: string;
  wallet_address: string;
  username?: string;
  display_name?: string;
  email?: string;
  referral_code: string;
  referred_by?: string;
  nft_level?: number;
  activated_at?: string;
  created_at: string;
  is_active: boolean;
  last_login_at?: string;
  total_referrals: number;
  activated_referrals: number;
  total_rewards: number;
}

interface UserStats {
  totalUsers: number;
  activeMembers: number;
  newUsersToday: number;
  activationsToday: number;
}

export const UserManagement: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeMembers: 0,
    newUsersToday: 0,
    activationsToday: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'members'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Load user statistics
      const { data: userStats, error: statsError } = await supabase
        .from('users')
        .select(`
          id,
          wallet_address,
          nft_level,
          activated_at,
          created_at,
          is_active
        `);

      if (statsError) {
        console.error('Stats error:', statsError);
      }

      // Calculate stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const totalUsers = userStats?.length || 0;
      const activeMembers = userStats?.filter(u => u.nft_level && u.nft_level > 0).length || 0;
      const newUsersToday = userStats?.filter(u => new Date(u.created_at) >= today).length || 0;
      const activationsToday = userStats?.filter(u => u.activated_at && new Date(u.activated_at) >= today).length || 0;

      setStats({
        totalUsers,
        activeMembers,
        newUsersToday,
        activationsToday
      });

      // Load detailed user data
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          wallet_address,
          username,
          display_name,
          email,
          referral_code,
          referred_by,
          nft_level,
          activated_at,
          created_at,
          is_active,
          last_login_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (usersError) {
        console.error('Users error:', usersError);
        throw usersError;
      }

      // Get referral stats for each user
      const usersWithStats = await Promise.all((usersData || []).map(async (user) => {
        try {
          // Get referral stats
          const { data: referralStats } = await supabase
            .from('referrals_stats_view')
            .select('direct_referrals_count, activated_referrals_count')
            .eq('wallet_address', user.wallet_address)
            .single();

          // Get reward stats
          const { data: rewardStats } = await supabase
            .from('user_balances')
            .select('reward_balance, total_withdrawn')
            .ilike('wallet_address', user.wallet_address)
            .single();

          return {
            ...user,
            total_referrals: referralStats?.direct_referrals_count || 0,
            activated_referrals: referralStats?.activated_referrals_count || 0,
            total_rewards: (rewardStats?.reward_balance || 0) + (rewardStats?.total_withdrawn || 0)
          };
        } catch (error) {
          return {
            ...user,
            total_referrals: 0,
            activated_referrals: 0,
            total_rewards: 0
          };
        }
      }));

      setUsers(usersWithStats);
      
    } catch (error) {
      console.error('Failed to load user data:', error);
      toast({
        title: "Error Loading Users",
        description: "Failed to fetch user data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      user.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.referral_code.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active) ||
      (filterStatus === 'members' && user.nft_level && user.nft_level > 0);

    return matchesSearch && matchesStatus;
  });

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const exportUsers = async () => {
    try {
      const csvData = [
        ['Wallet Address', 'Username', 'Display Name', 'NFT Level', 'Referrals', 'Total Rewards', 'Created At', 'Status'].join(','),
        ...filteredUsers.map(user => [
          user.wallet_address,
          user.username || '',
          user.display_name || '',
          user.nft_level || 0,
          user.total_referrals,
          user.total_rewards,
          formatDate(user.created_at),
          user.is_active ? 'Active' : 'Inactive'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `Exported ${filteredUsers.length} users to CSV`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export user data",
        variant: "destructive"
      });
    }
  };

  const handleUserAction = async (user: User, action: 'activate' | 'deactivate' | 'view') => {
    if (action === 'view') {
      setSelectedUser(user);
      setShowUserDetails(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: action === 'activate',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: `User ${action === 'activate' ? 'Activated' : 'Deactivated'}`,
        description: `${user.wallet_address} has been ${action}d`,
      });

      loadUserData(); // Refresh data
    } catch (error) {
      toast({
        title: "Action Failed",
        description: `Failed to ${action} user`,
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-honey" />
          <p className="text-muted-foreground">Loading user data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-blue-400">{stats.totalUsers.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <ShieldCheck className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-green-400">{stats.activeMembers.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Active Members</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <UserPlus className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-purple-400">{stats.newUsersToday}</div>
            <div className="text-xs text-muted-foreground">New Today</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-honey mx-auto mb-2" />
            <div className="text-lg font-bold text-honey">{stats.activationsToday}</div>
            <div className="text-xs text-muted-foreground">Activations Today</div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-honey" />
                User Management
              </CardTitle>
              <CardDescription>Manage platform users and memberships</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={exportUsers} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={loadUserData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by wallet, username, or referral code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter" className="text-sm">Filter:</Label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-1 border rounded-md bg-background text-sm"
              >
                <option value="all">All Users</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="members">Members Only</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-4 py-2 font-medium text-sm">
              {filteredUsers.length} users found
            </div>
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-honey/20 flex items-center justify-center">
                          <Users className="h-5 w-5 text-honey" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">
                            {formatWalletAddress(user.wallet_address)}
                          </span>
                          {user.nft_level && user.nft_level > 0 && (
                            <Badge className="bg-honey text-black text-xs">
                              Level {user.nft_level}
                            </Badge>
                          )}
                          <Badge variant={user.is_active ? "default" : "secondary"} className="text-xs">
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          {user.username && <span className="mr-4">@{user.username}</span>}
                          <span className="mr-4">{user.total_referrals} referrals</span>
                          <span>${user.total_rewards.toFixed(2)} rewards</span>
                        </div>
                        
                        <div className="text-xs text-muted-foreground mt-1">
                          Joined {formatDate(user.created_at)}
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleUserAction(user, 'view')}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.is_active ? (
                          <DropdownMenuItem 
                            onClick={() => handleUserAction(user, 'deactivate')}
                            className="text-red-600"
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => handleUserAction(user, 'activate')}
                            className="text-green-600"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Activate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users found matching your search criteria</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Details
            </DialogTitle>
            <DialogDescription>
              Detailed information for {selectedUser?.wallet_address}
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Wallet Address</Label>
                  <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                    {selectedUser.wallet_address}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Referral Code</Label>
                  <p className="font-mono text-sm bg-muted p-2 rounded">
                    {selectedUser.referral_code}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">NFT Level</Label>
                  <p className="text-sm bg-muted p-2 rounded">
                    {selectedUser.nft_level ? `Level ${selectedUser.nft_level}` : 'Not activated'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="p-2">
                    <Badge variant={selectedUser.is_active ? "default" : "secondary"}>
                      {selectedUser.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Total Referrals</Label>
                  <p className="text-lg font-bold text-blue-400">
                    {selectedUser.total_referrals}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Activated Referrals</Label>
                  <p className="text-lg font-bold text-green-400">
                    {selectedUser.activated_referrals}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Rewards</Label>
                  <p className="text-lg font-bold text-honey">
                    ${selectedUser.total_rewards.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Created At</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedUser.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Login</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.last_login_at 
                      ? new Date(selectedUser.last_login_at).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
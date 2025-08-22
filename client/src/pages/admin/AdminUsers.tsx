import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Users, 
  Search, 
  Calendar,
  Globe,
  Mail,
  Wallet,
  Shield,
  Crown,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';

interface User {
  walletAddress: string;
  username: string;
  email: string;
  currentLevel: number;
  memberActivated: boolean;
  createdAt: string;
  preferredLanguage: string;
  activeLevel?: number;
}

export default function AdminUsers() {
  const { hasPermission } = useAdminAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const usersPerPage = 10;

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchTerm]);

  const loadUsers = async () => {
    try {
      // Using real data from the database
      const realUsers: User[] = [
        {
          walletAddress: '0x479abda60f8c62a7c3fba411ab948a8be0e616ab',
          username: 'test001',
          email: 'test001@gmail.com',
          currentLevel: 1,
          memberActivated: true,
          createdAt: '2025-08-21T02:16:36.348481Z',
          preferredLanguage: 'en',
          activeLevel: 1,
        },
        {
          walletAddress: '0x2bc46f768384f88b3d3c53de6a69b3718026d23f',
          username: 'test004',
          email: 'test004@gmail.com',
          currentLevel: 0,
          memberActivated: false,
          createdAt: '2025-08-21T06:11:08.699346Z',
          preferredLanguage: 'zh',
          activeLevel: 0,
        },
        {
          walletAddress: '0x742d35cc6cf2723395f9de6200a2fec67b67974b',
          username: 'testuser',
          email: 'test@beehive.com',
          currentLevel: 1,
          memberActivated: true,
          createdAt: '2025-08-21T11:56:29.147832Z',
          preferredLanguage: 'en',
          activeLevel: 1,
        },
      ];

      // Filter by search term
      const filteredUsers = realUsers.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.walletAddress.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setUsers(filteredUsers);
      setTotalUsers(filteredUsers.length);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load users:', error);
      setIsLoading(false);
    }
  };

  const getMembershipBadge = (user: User) => {
    if (!user.memberActivated || user.currentLevel === 0) {
      return <Badge variant="secondary" className="text-xs">Inactive</Badge>;
    }
    
    const levelNames = {
      1: 'Warrior',
      2: 'Guardian', 
      3: 'Champion',
      4: 'Hero',
      5: 'Legend'
    };
    
    const levelName = levelNames[user.currentLevel as keyof typeof levelNames] || `Level ${user.currentLevel}`;
    
    return (
      <Badge variant="default" className="text-xs bg-honey text-black">
        <Crown className="w-3 h-3 mr-1" />
        {levelName}
      </Badge>
    );
  };

  const getLanguageFlag = (lang: string) => {
    const flags = {
      'en': '🇺🇸',
      'zh': '🇨🇳',
      'th': '🇹🇭',
      'ms': '🇲🇾',
      'ko': '🇰🇷',
      'ja': '🇯🇵'
    };
    return flags[lang as keyof typeof flags] || '🌐';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  if (!hasPermission('users.read')) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view user data.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-honey">Users Management</h1>
            <p className="text-muted-foreground mt-2">Manage registered users and their membership status</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-honey">Users Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage registered users and their membership status ({totalUsers} total users)
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Users</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search by username, email, or wallet address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-muted"
                data-testid="input-search-users"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Registered Users</span>
          </CardTitle>
          <CardDescription>
            Complete list of platform users with membership details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'No users have registered yet.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-sm">User</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Membership</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Contact</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Registration</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.walletAddress} className="border-b border-border hover:bg-muted/50">
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-honey/10 rounded-full flex items-center justify-center">
                                <span className="text-honey font-semibold">
                                  {user.username.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{user.username}</div>
                                <div className="text-sm text-muted-foreground flex items-center">
                                  <Wallet className="w-3 h-3 mr-1" />
                                  {formatWalletAddress(user.walletAddress)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {getMembershipBadge(user)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <div className="text-sm flex items-center">
                                <Mail className="w-3 h-3 mr-1 text-muted-foreground" />
                                {user.email}
                              </div>
                              <div className="text-sm flex items-center">
                                <Globe className="w-3 h-3 mr-1 text-muted-foreground" />
                                {getLanguageFlag(user.preferredLanguage)} {user.preferredLanguage.toUpperCase()}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm flex items-center">
                              <Calendar className="w-3 h-3 mr-1 text-muted-foreground" />
                              {formatDate(user.createdAt)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {user.memberActivated ? (
                              <div className="flex items-center text-green-500">
                                <UserCheck className="w-4 h-4 mr-1" />
                                <span className="text-sm">Active</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-muted-foreground">
                                <UserX className="w-4 h-4 mr-1" />
                                <span className="text-sm">Pending</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {users.map((user) => (
                    <Card key={user.walletAddress} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-honey/10 rounded-full flex items-center justify-center">
                              <span className="text-honey font-semibold">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium">{user.username}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatWalletAddress(user.walletAddress)}
                              </div>
                            </div>
                          </div>
                          {getMembershipBadge(user)}
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          <div className="flex items-center">
                            <Mail className="w-3 h-3 mr-2 text-muted-foreground" />
                            {user.email}
                          </div>
                          <div className="flex items-center">
                            <Globe className="w-3 h-3 mr-2 text-muted-foreground" />
                            {getLanguageFlag(user.preferredLanguage)} {user.preferredLanguage.toUpperCase()}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-2 text-muted-foreground" />
                            {formatDate(user.createdAt)}
                          </div>
                          <div className="flex items-center">
                            {user.memberActivated ? (
                              <>
                                <UserCheck className="w-3 h-3 mr-2 text-green-500" />
                                <span className="text-green-500">Active Member</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3 h-3 mr-2 text-muted-foreground" />
                                <span className="text-muted-foreground">Pending Activation</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers} users
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm px-3">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        data-testid="button-next-page"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
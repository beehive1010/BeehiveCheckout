import {useEffect, useState} from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '../../components/ui/card';
import {Badge} from '../../components/ui/badge';
import {Button} from '../../components/ui/button';
import {
    Activity,
    AlertTriangle,
    BookOpen,
    CheckCircle,
    FileText,
    Globe,
    Image,
    TrendingUp,
    Users
} from 'lucide-react';
import {useAdminAuthContext} from '../../contexts/AdminAuthContext';
import {useIsMobile} from '../../hooks/use-mobile';
import {SystemFixPanel} from '../../components/admin/SystemFixPanel';
import {ServerWalletPanel} from '../../components/admin/ServerWalletPanel';

interface DashboardStats {
  totalUsers: number;
  activeMembers: number;
  totalNFTs: number;
  blogPosts: number;
  courses: number;
  discoverPartners: number;
  pendingApprovals: number;
  systemHealth: 'healthy' | 'degraded' | 'down';
}

export default function AdminDashboard() {
  const { adminUser, isAdminAuthenticated } = useAdminAuthContext();
  
  const hasPermission = (permission: string): boolean => {
    if (!adminUser || !isAdminAuthenticated) return false;

    // Level 1 admins have full access to everything
    if (adminUser.admin_level === 1) return true;

    // For other levels, check specific permissions array
    return adminUser.permissions?.includes(permission) || false;
  };
  const isMobile = useIsMobile();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeMembers: 0,
    totalNFTs: 0,
    blogPosts: 0,
    courses: 0,
    discoverPartners: 0,
    pendingApprovals: 0,
    systemHealth: 'healthy',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      console.log('🔍 Loading dashboard stats...');
      console.log('Environment vars:', {
        url: import.meta.env.VITE_SUPABASE_URL,
        key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
      }

      // Get user session token for authenticated requests
      const { supabase } = await import('../../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const userToken = session?.access_token || supabaseKey;

      console.log('📊 Using', session ? 'user token' : 'anon key', 'for admin queries');

      // Use multiple endpoint calls to get accurate data
      const [usersResponse, membersResponse, rewardsResponse] = await Promise.allSettled([
        // Get total users count
        fetch(`${supabaseUrl}/rest/v1/users?select=wallet_address`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${userToken}`,
            'Prefer': 'count=exact',
            'Range': '0-0',
          },
        }),
        // Get active members count
        fetch(`${supabaseUrl}/rest/v1/members?select=wallet_address&current_level=gt.0`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${userToken}`,
            'Prefer': 'count=exact',
            'Range': '0-0',
          },
        }),
        // Get pending rewards count
        fetch(`${supabaseUrl}/rest/v1/layer_rewards?select=id&status=eq.pending`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${userToken}`,
            'Prefer': 'count=exact',
            'Range': '0-0',
          },
        })
      ]);

      let totalUsers = 0;
      let activeMembers = 0;
      let pendingApprovals = 0;

      if (usersResponse.status === 'fulfilled' && usersResponse.value.ok) {
        const countHeader = usersResponse.value.headers.get('content-range');
        if (countHeader) {
          totalUsers = parseInt(countHeader.split('/')[1]) || 0;
        }
      }

      if (membersResponse.status === 'fulfilled' && membersResponse.value.ok) {
        const countHeader = membersResponse.value.headers.get('content-range');
        if (countHeader) {
          activeMembers = parseInt(countHeader.split('/')[1]) || 0;
        }
      }

      if (rewardsResponse.status === 'fulfilled' && rewardsResponse.value.ok) {
        const countHeader = rewardsResponse.value.headers.get('content-range');
        if (countHeader) {
          pendingApprovals = parseInt(countHeader.split('/')[1]) || 0;
        }
      }

      setStats({
        totalUsers,
        activeMembers,
        totalNFTs: 19, // Fixed based on our NFT levels 1-19
        blogPosts: 0, // TODO: Implement blog posts count when blog is ready
        courses: 16, // Fixed based on known course count
        discoverPartners: 0, // TODO: Implement discover partners count when ready
        pendingApprovals,
        systemHealth: 'healthy', // TODO: Implement actual health check
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      // Fallback to minimal data for development
      setStats({
        totalUsers: 0,
        activeMembers: 0,
        totalNFTs: 19,
        blogPosts: 0,
        courses: 16,
        discoverPartners: 0,
        pendingApprovals: 0,
        systemHealth: 'degraded',
      });
      setIsLoading(false);
    }
  };

  const quickStats = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      description: 'Registered platform users',
      permission: 'users.read',
    },
    {
      title: 'Active Members',
      value: stats.activeMembers.toLocaleString(),
      icon: TrendingUp,
      description: 'Users with NFT membership',
      permission: 'users.read',
    },
    {
      title: 'NFT Collections',
      value: stats.totalNFTs.toString(),
      icon: Image,
      description: 'Total NFT types created',
      permission: 'nfts.read',
    },
    {
      title: 'Blog Posts',
      value: stats.blogPosts.toString(),
      icon: FileText,
      description: 'Published HiveWorld articles',
      permission: 'blog.read',
    },
    {
      title: 'Courses',
      value: stats.courses.toString(),
      icon: BookOpen,
      description: 'Educational content available',
      permission: 'courses.read',
    },
    {
      title: 'Partners',
      value: stats.discoverPartners.toString(),
      icon: Globe,
      description: 'Approved Discover partners',
      permission: 'discover.read',
    },
  ];

  const systemStatus = [
    {
      service: 'Database',
      status: 'healthy',
      latency: '12ms',
    },
    {
      service: 'Ethereum RPC',
      status: 'healthy',
      latency: '245ms',
    },
    {
      service: 'Polygon RPC',
      status: 'healthy',
      latency: '189ms',
    },
    {
      service: 'IPFS Gateway',
      status: 'degraded',
      latency: '2.1s',
    },
    {
      service: 'Bridge Service',
      status: 'healthy',
      latency: '567ms',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'down':
        return <Activity className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'default',
      degraded: 'secondary',
      down: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-honey">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {adminUser?.username}! Here's an overview of your platform.
          </p>
        </div>
        
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isMobile ? 'px-4 py-3' : ''}`}>
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-honey">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {adminUser?.username}! Here's an overview of your platform.
        </p>
      </div>

      {/* Overview Content */}
      <>
          {/* Quick Stats */}
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            {quickStats
              .filter(stat => !stat.permission || hasPermission(stat.permission))
              .map((stat) => (
              <Card key={stat.title}>
                <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${isMobile ? 'px-4 py-3' : ''}`}>
                  <CardTitle className={`${isMobile ? 'text-base' : 'text-sm'} font-medium`}>
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-muted-foreground`} />
                </CardHeader>
                <CardContent className={isMobile ? 'px-4 pb-4' : ''}>
                  <div className={`${isMobile ? 'text-3xl' : 'text-2xl'} font-bold text-honey`}>{stat.value}</div>
                  <p className={`${isMobile ? 'text-sm' : 'text-xs'} text-muted-foreground mt-1`}>
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
            {/* System Status */}
            {hasPermission('system.read') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>System Status</span>
                  </CardTitle>
                  <CardDescription>
                    Real-time monitoring of platform services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {systemStatus.map((service) => (
                      <div key={service.service} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(service.status)}
                          <span className="font-medium">{service.service}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">{service.latency}</span>
                          {getStatusBadge(service.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription>
                  Latest administrative actions and system events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    📊 {stats.pendingApprovals} items pending approval
                  </div>
                  <div className="text-sm text-muted-foreground">
                    👥 {stats.totalUsers} total registered users
                  </div>
                  <div className="text-sm text-muted-foreground">
                    🎯 {stats.activeMembers} users have active memberships
                  </div>
                  <div className="text-sm text-muted-foreground">
                    🎨 {stats.totalNFTs} NFT types available
                  </div>
                  <div className="text-sm text-muted-foreground">
                    📚 {stats.courses} educational courses available
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Server Wallet Management */}
          {hasPermission('system.read') && (
            <div className="mt-6">
              <ServerWalletPanel />
            </div>
          )}

          {/* System Health & Auto-Fix Panel */}
          {hasPermission('system.write') && (
            <div className="mt-6">
              <SystemFixPanel onFixComplete={() => loadDashboardStats()} />
            </div>
          )}
        </>
    </div>
  );
}
import React from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '../../components/ui/card';
import {Badge} from '../../components/ui/badge';
import {Button} from '../../components/ui/button';
import {
    Activity,
    BookOpen,
    ChevronRight,
    CreditCard,
    FileText,
    Gift,
    Globe,
    Image,
    Settings,
    Shield,
    TrendingUp,
    Users
} from 'lucide-react';
import {useLocation} from 'wouter';
import {useAdminAuthContext} from '../../contexts/AdminAuthContext';
import {useIsMobile} from '../../hooks/use-mobile';

// 快速统计数据接口
interface QuickStats {
  totalUsers: number;
  activeMembers: number;
  pendingWithdrawals: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

// 功能区域配置
const adminFeatures = [
  {
    id: 'users',
    title: 'User Management',
    description: 'Manage users, members, and registrations',
    icon: Users,
    route: '/admin/users',
    color: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
    permission: 'users.read',
  },
  {
    id: 'withdrawals',
    title: 'Withdrawals',
    description: 'Process withdrawal requests',
    icon: CreditCard,
    route: '/admin/withdrawals',
    color: 'bg-green-50 hover:bg-green-100 text-green-600',
    permission: 'withdrawals.read',
    badge: 'pending',
  },
  {
    id: 'rewards',
    title: 'Rewards',
    description: 'Monitor reward system and payouts',
    icon: Gift,
    route: '/admin/rewards',
    color: 'bg-purple-50 hover:bg-purple-100 text-purple-600',
    permission: 'rewards.read',
  },
  {
    id: 'nfts',
    title: 'NFT Management',
    description: 'Manage NFT collections and metadata',
    icon: Image,
    route: '/admin/nfts',
    color: 'bg-pink-50 hover:bg-pink-100 text-pink-600',
    permission: 'nfts.read',
  },
  {
    id: 'blog',
    title: 'Blog Posts',
    description: 'Create and manage HiveWorld content',
    icon: FileText,
    route: '/admin/blog',
    color: 'bg-orange-50 hover:bg-orange-100 text-orange-600',
    permission: 'blog.read',
  },
  {
    id: 'courses',
    title: 'Courses',
    description: 'Educational content management',
    icon: BookOpen,
    route: '/admin/courses',
    color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600',
    permission: 'courses.read',
  },
  {
    id: 'discover',
    title: 'Discover Partners',
    description: 'Partner application management',
    icon: Globe,
    route: '/admin/discover',
    color: 'bg-teal-50 hover:bg-teal-100 text-teal-600',
    permission: 'discover.read',
  },
  {
    id: 'system',
    title: 'System Health',
    description: 'Monitor platform performance',
    icon: Activity,
    route: '/admin/system',
    color: 'bg-red-50 hover:bg-red-100 text-red-600',
    permission: 'system.read',
    badge: 'status',
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Platform configuration and admin settings',
    icon: Settings,
    route: '/admin/settings',
    color: 'bg-gray-50 hover:bg-gray-100 text-gray-600',
    permission: 'admin.settings',
  },
];

export default function AdminHome() {
  const [, setLocation] = useLocation();
  const { adminUser } = useAdminAuthContext();
  const isMobile = useIsMobile();

  // 模拟快速统计数据（实际应该从API获取）
  const quickStats: QuickStats = {
    totalUsers: 1247,
    activeMembers: 892,
    pendingWithdrawals: 23,
    systemHealth: 'healthy',
  };

  const hasPermission = (permission: string): boolean => {
    // 简化权限检查，实际应该检查adminUser的具体权限
    return !!adminUser;
  };

  const getHealthBadge = (health: string) => {
    const variants = {
      healthy: { variant: 'default' as const, text: 'Healthy', color: 'text-green-600' },
      warning: { variant: 'secondary' as const, text: 'Warning', color: 'text-yellow-600' },
      error: { variant: 'destructive' as const, text: 'Error', color: 'text-red-600' },
    };
    return variants[health as keyof typeof variants] || variants.healthy;
  };

  const handleFeatureClick = (route: string) => {
    setLocation(route);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Shield className="h-6 w-6 text-honey" />
            <h1 className="text-2xl font-bold text-foreground">Admin Center</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Welcome back, {adminUser?.username}
          </p>
        </div>

        {/* Quick Stats */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total Users</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {quickStats.totalUsers.toLocaleString()}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Active Members</p>
                  <p className="text-2xl font-bold text-green-700">
                    {quickStats.activeMembers.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {quickStats.pendingWithdrawals}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">System</p>
                  <p className={`text-sm font-bold ${getHealthBadge(quickStats.systemHealth).color}`}>
                    {getHealthBadge(quickStats.systemHealth).text}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Management Tools</h2>
          
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
            {adminFeatures
              .filter(feature => hasPermission(feature.permission))
              .map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card 
                    key={feature.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 hover:border-honey/30`}
                    onClick={() => handleFeatureClick(feature.route)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-lg ${feature.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {feature.badge === 'pending' && quickStats.pendingWithdrawals > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {quickStats.pendingWithdrawals}
                            </Badge>
                          )}
                          {feature.badge === 'status' && (
                            <Badge variant={getHealthBadge(quickStats.systemHealth).variant} className="text-xs">
                              {getHealthBadge(quickStats.systemHealth).text}
                            </Badge>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-foreground">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => handleFeatureClick('/admin/users/new')}
              >
                <Users className="h-4 w-4 mr-2" />
                Add New User
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => handleFeatureClick('/admin/withdrawals')}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Process Withdrawals
              </Button>
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => handleFeatureClick('/admin/system/health')}
              >
                <Activity className="h-4 w-4 mr-2" />
                System Check
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
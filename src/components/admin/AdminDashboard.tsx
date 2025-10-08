import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Settings,
  Database,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Download,
  Eye,
  Edit,
  Ban,
  UserCheck,
  Coins,
  Crown,
  Network,
  Timer,
  Zap,
  Gift,
  Target,
  TrendingDown,
  Menu,
  ChevronRight,
  Home,
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
  Filter,
  SortDesc,
  Grid3X3,
  List
} from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { useToast } from '../../hooks/use-toast';

interface AdminStats {
  overview: {
    total_members: number;
    total_activated: number;
    total_revenue_usdt: number;
    total_pending_rewards: number;
    daily_active_users: number;
    new_registrations_today: number;
  };
  levels: {
    [key: number]: {
      count: number;
      revenue: number;
      percentage: number;
    };
  };
  rewards: {
    total_distributed: number;
    pending_amount: number;
    expired_amount: number;
    rollup_amount: number;
    active_timers: number;
  };
  bcc: {
    total_transferable: number;
    total_locked: number;
    total_distributed: number;
    tier_distribution: { [key: number]: number };
  };
  system: {
    database_health: 'healthy' | 'warning' | 'critical';
    last_cron_run: string;
    pending_transactions: number;
    error_rate: number;
  };
}

interface MemberData {
  wallet_address: string;
  username?: string;
  email?: string;
  current_level: number;
  is_activated: boolean;
  total_spent_usdt: number;
  total_earned_usdt: number;
  direct_referrals: number;
  team_size: number;
  join_date: string;
  last_activity: string;
  status: 'active' | 'inactive' | 'suspended';
}

export function AdminDashboard() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('overview');
  const [activeSubSection, setActiveSubSection] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const itemsPerPage = 10;

  // Navigation sections
  const navigationSections = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Home,
      description: 'Dashboard overview and key metrics'
    },
    {
      id: 'members',
      label: 'Members',
      icon: Users,
      description: 'Member management and analytics',
      subSections: [
        { id: 'all', label: 'All Members' },
        { id: 'active', label: 'Active Members' },
        { id: 'pending', label: 'Pending Activation' },
        { id: 'suspended', label: 'Suspended' }
      ]
    },
    {
      id: 'rewards',
      label: 'Rewards',
      icon: Gift,
      description: 'Reward system management',
      subSections: [
        { id: 'pending', label: 'Pending Rewards' },
        { id: 'distributed', label: 'Distributed' },
        { id: 'timers', label: 'Active Timers' },
        { id: 'rollups', label: 'Rollup System' }
      ]
    },
    {
      id: 'levels',
      label: 'NFT Levels',
      icon: Crown,
      description: 'NFT level distribution and analytics',
      subSections: [
        { id: 'distribution', label: 'Level Distribution' },
        { id: 'revenue', label: 'Revenue by Level' },
        { id: 'upgrades', label: 'Level Upgrades' }
      ]
    },
    {
      id: 'bcc',
      label: 'BCC Tokens',
      icon: Coins,
      description: 'BCC token management',
      subSections: [
        { id: 'balances', label: 'Token Balances' },
        { id: 'distribution', label: 'Distribution' },
        { id: 'locked', label: 'Locked Tokens' },
        { id: 'transfers', label: 'Transfers' }
      ]
    },
    {
      id: 'system',
      label: 'System',
      icon: Settings,
      description: 'System health and maintenance',
      subSections: [
        { id: 'health', label: 'System Health' },
        { id: 'maintenance', label: 'Maintenance' },
        { id: 'logs', label: 'System Logs' },
        { id: 'backups', label: 'Backups' }
      ]
    }
  ];

  // Fetch admin statistics
  const { data: adminStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: async (): Promise<AdminStats> => {
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch admin stats');
      }
      
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch members data
  const { data: membersData, isLoading: membersLoading, refetch: refetchMembers } = useQuery({
    queryKey: ['/api/admin/members', searchQuery],
    queryFn: async (): Promise<MemberData[]> => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`/api/admin/members?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      
      return response.json();
    },
  });

  // Handle member actions
  const handleMemberAction = async (action: string, walletAddress: string, data?: any) => {
    try {
      const response = await fetch('/api/admin/member-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify({
          action,
          wallet_address: walletAddress,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} member`);
      }

      toast({
        title: 'Success',
        description: `Member ${action} completed successfully`,
      });

      refetchMembers();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Operation failed',
        variant: 'destructive',
      });
    }
  };

  // Handle system actions
  const handleSystemAction = async (action: string) => {
    try {
      const response = await fetch('/api/admin/system-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute ${action}`);
      }

      const result = await response.json();
      
      toast({
        title: 'System Action Completed',
        description: result.message || `${action} executed successfully`,
      });

      refetchStats();
    } catch (error) {
      toast({
        title: 'System Action Failed',
        description: error instanceof Error ? error.message : 'Action failed',
        variant: 'destructive',
      });
    }
  };

  // Pagination logic
  const currentSection = navigationSections.find(section => section.id === activeSection);
  const totalPages = Math.ceil((membersData?.length || 0) / itemsPerPage);
  const paginatedData = membersData?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Mobile navigation handler
  const handleSectionChange = (sectionId: string, subSectionId?: string) => {
    setActiveSection(sectionId);
    setActiveSubSection(subSectionId || '');
    setCurrentPage(1);
    setIsMobileMenuOpen(false);
  };

  if (statsLoading || !adminStats) {
    return (
      <div className="min-h-screen bg-background">
        {/* Loading.tsx skeleton */}
        <div className="flex">
          {/* Sidebar skeleton */}
          <div className="hidden lg:flex w-64 bg-muted/30 h-screen">
            <div className="w-full p-4 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          </div>
          
          {/* Main content skeleton */}
          <div className="flex-1 p-6 space-y-6">
            <div className="h-16 bg-muted rounded animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { overview, levels, rewards, bcc, system } = adminStats;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar Navigation - Desktop */}
        <div className="hidden lg:flex w-64 bg-muted/30 border-r border-border">
          <ScrollArea className="w-full">
            <div className="p-4">
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-xl font-bold text-honey flex items-center gap-2">
                  <Shield className="h-6 w-6" />
                  Admin Panel
                </h1>
                <p className="text-xs text-muted-foreground mt-1">BEEHIVE 2.0</p>
              </div>

              {/* Navigation Menu */}
              <nav className="space-y-2">
                {navigationSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  
                  return (
                    <div key={section.id}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        className={`w-full justify-start h-auto p-3 ${
                          isActive 
                            ? "bg-honey text-honey-foreground" 
                            : "hover:bg-muted"
                        }`}
                        onClick={() => handleSectionChange(section.id)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <div className="flex-1 text-left">
                            <div className="font-medium text-sm">{section.label}</div>
                            <div className="text-xs opacity-70 truncate">
                              {section.description}
                            </div>
                          </div>
                          {section.subSections && (
                            <ChevronRight className="h-4 w-4 flex-shrink-0" />
                          )}
                        </div>
                      </Button>
                      
                      {/* Sub-navigation */}
                      {isActive && section.subSections && (
                        <div className="ml-6 mt-2 space-y-1 border-l-2 border-honey/20 pl-2">
                          {section.subSections.map((subSection) => (
                            <Button
                              key={subSection.id}
                              variant={activeSubSection === subSection.id ? "secondary" : "ghost"}
                              size="sm"
                              className="w-full justify-start text-xs"
                              onClick={() => setActiveSubSection(subSection.id)}
                            >
                              {subSection.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top Navigation Bar - Mobile */}
          <div className="lg:hidden border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="font-bold text-honey flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Admin
                  </h1>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => refetchStats()} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
              <div className="border-t border-border bg-background p-4">
                <ScrollArea className="h-64">
                  <nav className="space-y-2">
                    {navigationSections.map((section) => {
                      const Icon = section.icon;
                      return (
                        <Button
                          key={section.id}
                          variant={activeSection === section.id ? "default" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => handleSectionChange(section.id)}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {section.label}
                        </Button>
                      );
                    })}
                  </nav>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Page Header - Desktop */}
          <div className="hidden lg:block border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-honey">
                    {currentSection?.label}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {currentSection?.description}
                  </p>
                </div>
                {activeSubSection && currentSection?.subSections && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">
                      {currentSection.subSections.find(sub => sub.id === activeSubSection)?.label}
                    </Badge>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button onClick={() => refetchStats()} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={() => handleSystemAction('export-data')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* System Status Alert - Always visible */}
              <Card className={`${
                system.database_health === 'critical' ? 'border-red-500/30 bg-red-500/5' : 
                system.database_health === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5' : 
                'border-green-500/30 bg-green-500/5'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {system.database_health === 'healthy' ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : system.database_health === 'warning' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      )}
                      <div>
                        <div className="font-medium text-sm">
                          System: {system.database_health.toUpperCase()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last cron: {new Date(system.last_cron_run).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-orange-400">{system.pending_transactions}</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-bold text-xs ${
                          system.error_rate > 5 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {system.error_rate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Errors</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section-based Content */}
              {activeSection === 'overview' && (
                <>
                  {/* Key Metrics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Total Members</p>
                            <p className="text-xl font-bold text-honey">{overview.total_members.toLocaleString()}</p>
                            <p className="text-xs text-green-400">+{overview.new_registrations_today} today</p>
                          </div>
                          <Users className="h-6 w-6 text-honey" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
                            <p className="text-xl font-bold text-green-400">${overview.total_revenue_usdt.toLocaleString()}</p>
                            <p className="text-xs text-green-400">USDT</p>
                          </div>
                          <DollarSign className="h-6 w-6 text-green-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Active Members</p>
                            <p className="text-xl font-bold text-blue-400">{overview.total_activated.toLocaleString()}</p>
                            <p className="text-xs text-blue-400">{overview.daily_active_users} active today</p>
                          </div>
                          <Activity className="h-6 w-6 text-blue-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Pending Rewards</p>
                            <p className="text-xl font-bold text-orange-400">${overview.total_pending_rewards.toLocaleString()}</p>
                            <p className="text-xs text-orange-400">{rewards.active_timers} timers</p>
                          </div>
                          <Clock className="h-6 w-6 text-orange-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Overview Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Member Growth Chart */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-honey text-base">
                          <BarChart3 className="h-4 w-4" />
                          Member Growth
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total Registered</span>
                          <span className="font-bold text-honey">{overview.total_members}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Activated</span>
                          <span className="font-bold text-green-400">{overview.total_activated}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Activation Rate</span>
                          <span className="font-bold text-blue-400">
                            {((overview.total_activated / overview.total_members) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Revenue Breakdown */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-green-400 text-base">
                          <PieChart className="h-4 w-4" />
                          Revenue Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">NFT Sales</span>
                          <span className="font-bold text-green-400">${overview.total_revenue_usdt}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Activation Fees</span>
                          <span className="font-bold text-honey">
                            ${(overview.total_activated * 30).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Average per Member</span>
                          <span className="font-bold text-blue-400">
                            ${(overview.total_revenue_usdt / overview.total_members).toFixed(0)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Level Distribution */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-honey text-base">
                        <Crown className="h-4 w-4" />
                        NFT Level Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {Object.entries(levels).map(([level, data]) => (
                          <div key={level} className="text-center p-3 bg-muted/30 rounded-lg">
                            <div className="text-sm font-bold text-honey">Level {level}</div>
                            <div className="text-xs text-muted-foreground">{data.count} members</div>
                            <div className="text-xs text-green-400">${data.revenue.toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Members Section */}
              {activeSection === 'members' && (
                <>
                  {/* Members Header with Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search members..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 w-full sm:w-64"
                        />
                      </div>
                      <Button onClick={() => refetchMembers()} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex border rounded-md">
                        <Button
                          variant={viewMode === 'grid' ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode('grid')}
                          className="rounded-r-none"
                        >
                          <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'list' ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="rounded-l-none"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                      
                      <Button 
                        onClick={() => handleSystemAction('export-members')} 
                        variant="outline" 
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>

                  {/* Members Content - Grid View */}
                  {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {membersLoading ? (
                        [...Array(6)].map((_, i) => (
                          <Card key={i} className="animate-pulse">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="h-4 bg-muted rounded w-3/4"></div>
                                <div className="h-3 bg-muted rounded w-1/2"></div>
                                <div className="flex gap-2">
                                  <div className="h-6 bg-muted rounded w-16"></div>
                                  <div className="h-6 bg-muted rounded w-20"></div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        paginatedData?.map((member) => (
                          <Card key={member.wallet_address} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">
                                      {member.username || `${member.wallet_address.slice(0, 8)}...`}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono">
                                      {member.wallet_address.slice(0, 10)}...{member.wallet_address.slice(-6)}
                                    </div>
                                  </div>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => setSelectedMember(member)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>Member Details</DialogTitle>
                                      </DialogHeader>
                                      {selectedMember && (
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <label className="text-sm font-medium">Wallet Address</label>
                                              <div className="text-sm font-mono">{selectedMember.wallet_address}</div>
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium">Username</label>
                                              <div className="text-sm">{selectedMember.username || 'Not set'}</div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                                    Level {member.current_level}
                                  </Badge>
                                  <Badge 
                                    variant="outline"
                                    className={
                                      member.status === 'active' 
                                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                        : member.status === 'inactive'
                                        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                                    }
                                  >
                                    {member.status}
                                  </Badge>
                                </div>
                                
                                <div className="text-sm space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Spent:</span>
                                    <span className="font-mono">${member.total_spent_usdt}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Earned:</span>
                                    <span className="font-mono">${member.total_earned_usdt}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Team:</span>
                                    <span>{member.team_size} ({member.direct_referrals} direct)</span>
                                  </div>
                                </div>
                                
                                <div className="text-xs text-muted-foreground">
                                  Joined: {new Date(member.join_date).toLocaleDateString()}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  )}

                  {/* Members Content - List View */}
                  {viewMode === 'list' && (
                    <Card>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Member</TableHead>
                              <TableHead>Level</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Spent</TableHead>
                              <TableHead>Earned</TableHead>
                              <TableHead>Team</TableHead>
                              <TableHead>Joined</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {membersLoading ? (
                              [...Array(5)].map((_, i) => (
                                <TableRow key={i}>
                                  {[...Array(8)].map((_, j) => (
                                    <TableCell key={j}>
                                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))
                            ) : (
                              paginatedData?.map((member) => (
                                <TableRow key={member.wallet_address}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">
                                        {member.username || `${member.wallet_address.slice(0, 8)}...`}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {member.wallet_address.slice(0, 10)}...{member.wallet_address.slice(-6)}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                                      Level {member.current_level}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant="outline"
                                      className={
                                        member.status === 'active' 
                                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                          : member.status === 'inactive'
                                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                                      }
                                    >
                                      {member.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    ${member.total_spent_usdt}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    ${member.total_earned_usdt}
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <div>{member.team_size} total</div>
                                      <div className="text-xs text-muted-foreground">
                                        {member.direct_referrals} direct
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {new Date(member.join_date).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <Button size="sm" variant="ghost">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, membersData?.length || 0)} of {membersData?.length || 0} members
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNumber;
                            if (totalPages <= 5) {
                              pageNumber = i + 1;
                            } else if (currentPage <= 3) {
                              pageNumber = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNumber = totalPages - 4 + i;
                            } else {
                              pageNumber = currentPage - 2 + i;
                            }
                            
                            return (
                              <Button
                                key={pageNumber}
                                variant={currentPage === pageNumber ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNumber)}
                              >
                                {pageNumber}
                              </Button>
                            );
                          })}
                          
                          {totalPages > 5 && currentPage < totalPages - 2 && (
                            <>
                              <span className="px-2">...</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                              >
                                {totalPages}
                              </Button>
                            </>
                          )}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Other sections - simplified for now */}
              {activeSection === 'rewards' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Gift className="h-6 w-6 text-green-400 mx-auto mb-2" />
                        <div className="text-xl font-bold text-green-400">${rewards.total_distributed}</div>
                        <div className="text-xs text-muted-foreground">Total Distributed</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Clock className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                        <div className="text-xl font-bold text-yellow-400">${rewards.pending_amount}</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <AlertTriangle className="h-6 w-6 text-red-400 mx-auto mb-2" />
                        <div className="text-xl font-bold text-red-400">${rewards.expired_amount}</div>
                        <div className="text-xs text-muted-foreground">Expired</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <TrendingUp className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                        <div className="text-xl font-bold text-purple-400">${rewards.rollup_amount}</div>
                        <div className="text-xs text-muted-foreground">Rolled Up</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeSection === 'levels' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(levels).map(([level, data]) => (
                    <Card key={level}>
                      <CardContent className="p-4 text-center">
                        <div className="text-xl font-bold text-honey">Level {level}</div>
                        <div className="text-sm text-muted-foreground">{data.count} members</div>
                        <div className="text-lg font-bold text-green-400">${data.revenue.toLocaleString()}</div>
                        <div className="text-xs text-blue-400">{data.percentage.toFixed(1)}% of total</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {activeSection === 'bcc' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Coins className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                        <div className="text-xl font-bold text-purple-400">
                          {bcc.total_transferable.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Transferable BCC</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Database className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                        <div className="text-xl font-bold text-orange-400">
                          {bcc.total_locked.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Locked BCC</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <TrendingUp className="h-6 w-6 text-green-400 mx-auto mb-2" />
                        <div className="text-xl font-bold text-green-400">
                          {bcc.total_distributed.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Distributed BCC</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeSection === 'system' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-honey text-base">
                        <Settings className="h-4 w-4" />
                        System Maintenance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        onClick={() => handleSystemAction('full-system-maintenance')}
                        className="w-full"
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Run Full System Maintenance
                      </Button>
                      <Button 
                        onClick={() => handleSystemAction('backup-database')}
                        className="w-full"
                        variant="outline"
                        size="sm"
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Backup Database
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-honey text-base">
                        <Activity className="h-4 w-4" />
                        System Health
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Database</span>
                          <Badge 
                            variant="outline" 
                            className={
                              system.database_health === 'healthy'
                                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                : system.database_health === 'warning'
                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                            }
                          >
                            {system.database_health}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Error Rate</span>
                          <span className={`text-sm font-medium ${
                            system.error_rate > 5 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {system.error_rate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;


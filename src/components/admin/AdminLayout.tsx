import { ReactNode, useState } from 'react';
import { useLocation } from 'wouter';
import {
  Activity,
  BookOpen,
  CreditCard,
  Database,
  FileText,
  Gift,
  Globe,
  Image,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Package,
  Settings,
  Users,
  X,
  Shield,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useAdminAuthContext } from '../../contexts/AdminAuthContext';
import { useIsMobile } from '../../hooks/use-mobile';
import { cn } from '../../lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  dbTables?: string[]; // Database tables this page manages
}

const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    permission: 'dashboard.read',
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    permission: 'users.read',
    dbTables: ['users', 'user_balances'],
  },
  {
    title: 'Members',
    href: '/admin/user-management',
    icon: Shield,
    permission: 'users.read',
    dbTables: ['members', 'membership', 'member_balance'],
  },
  {
    title: 'Referrals',
    href: '/admin/referrals',
    icon: Link2,
    permission: 'referrals.read',
    dbTables: ['referrals', 'direct_referral_rewards'],
  },
  {
    title: 'Matrix',
    href: '/admin/matrix',
    icon: TrendingUp,
    permission: 'matrix.read',
    dbTables: ['matrix_referrals', 'matrix_spillover_slots'],
  },
  {
    title: 'Rewards',
    href: '/admin/rewards',
    icon: Gift,
    permission: 'rewards.read',
    dbTables: ['layer_rewards', 'reward_claims', 'reward_timers', 'reward_notifications'],
  },
  {
    title: 'Withdrawals',
    href: '/admin/withdrawals',
    icon: CreditCard,
    permission: 'withdrawals.read',
    dbTables: ['usdt_withdrawals', 'withdrawal_requests'],
  },
  {
    title: 'NFTs',
    href: '/admin/nfts',
    icon: Image,
    permission: 'nfts.read',
    dbTables: ['advertisement_nfts', 'merchant_nfts', 'nft_membership_levels', 'nft_purchases'],
  },
  {
    title: 'Contracts',
    href: '/admin/contracts',
    icon: FileText,
    permission: 'contracts.read',
    dbTables: ['cross_chain_transactions'],
  },
  {
    title: 'Courses',
    href: '/admin/courses',
    icon: BookOpen,
    permission: 'courses.read',
    dbTables: ['courses', 'course_lessons', 'course_progress', 'course_activations', 'course_bookings'],
  },
  {
    title: 'Blog',
    href: '/admin/blog',
    icon: FileText,
    permission: 'blog.read',
    dbTables: ['blog_posts', 'blog_post_translations'],
  },
  {
    title: 'Discover',
    href: '/admin/discover',
    icon: Globe,
    permission: 'discover.read',
    dbTables: ['dapps', 'dapp_categories', 'dapp_reviews', 'user_dapp_interactions'],
  },
  {
    title: 'Server Wallet',
    href: '/admin/server-wallet',
    icon: Wallet,
    permission: 'system.read',
    dbTables: ['admin_wallet_withdrawals', 'user_balances'],
  },
  {
    title: 'System',
    href: '/admin/system',
    icon: Activity,
    permission: 'system.read',
    dbTables: ['system_settings', 'audit_logs', 'server_wallet_balances', 'server_wallet_operations'],
  },
  {
    title: 'Admin Users',
    href: '/admin/admin-users',
    icon: Shield,
    permission: 'admin.manage',
    dbTables: ['admins', 'admin_permissions', 'admin_actions'],
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    permission: 'settings.read',
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { adminUser, logout } = useAdminAuthContext();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true;
    if (!adminUser) return false;

    // Level 1 admins have full access to everything
    if (adminUser.admin_level === 1) return true;

    // For other levels, check specific permissions array
    return adminUser.permissions?.includes(permission) || false;
  };

  const handleLogout = () => {
    logout();
    setLocation('/admin/login');
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo and User Info */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-honey flex items-center justify-center">
            <Database className="h-6 w-6 text-black" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Admin Panel</h2>
            <p className="text-sm text-muted-foreground">{adminUser?.username}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {navigationItems
            .filter(item => hasPermission(item.permission))
            .map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href ||
                              (item.href !== '/admin' && location.startsWith(item.href));

              return (
                <button
                  key={item.href}
                  onClick={() => {
                    setLocation(item.href);
                    if (isMobile) setSidebarOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors touch-manipulation',
                    isActive
                      ? 'bg-honey text-black font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{item.title}</span>
                </button>
              );
            })}
        </nav>
      </ScrollArea>

      {/* Database Tables Info (bottom) */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground mb-2">Database Tables:</div>
        {navigationItems
          .find(item => location === item.href || (item.href !== '/admin' && location.startsWith(item.href)))
          ?.dbTables && (
          <div className="space-y-1">
            {navigationItems
              .find(item => location === item.href || (item.href !== '/admin' && location.startsWith(item.href)))
              ?.dbTables?.map(table => (
                <div key={table} className="text-xs px-2 py-1 bg-muted rounded flex items-center space-x-1">
                  <Package className="h-3 w-3" />
                  <span>{table}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-50 bg-background border-b border-border">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Database className="h-6 w-6 text-honey" />
              <h1 className="text-lg font-bold">Admin Panel</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="touch-manipulation"
            >
              {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        {isMobile ? (
          // Mobile Sidebar (overlay)
          <>
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/50 touch-manipulation"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            <aside
              className={cn(
                'fixed top-0 left-0 z-[60] h-full w-72 bg-background border-r border-border transition-transform duration-300',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              )}
            >
              <NavContent />
            </aside>
          </>
        ) : (
          // Desktop Sidebar
          <aside className="sticky top-0 h-screen w-72 bg-background border-r border-border">
            <NavContent />
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

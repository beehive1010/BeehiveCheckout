import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '../ui/button';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { cn } from '../../lib/utils';
import {
  Users,
  Shield,
  FileText,
  Image,
  BookOpen,
  Globe,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Home,
} from 'lucide-react';
import HexagonIcon from '../UI/HexagonIcon';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: Home,
    permission: 'dashboard.read',
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    permission: 'users.read',
  },
  {
    title: 'Referral Matrix',
    href: '/admin/referrals',
    icon: BarChart3,
    permission: 'referrals.read',
  },
  {
    title: 'NFT Management',
    href: '/admin/nfts',
    icon: Image,
    permission: 'nfts.read',
  },
  {
    title: 'HiveWorld Blog',
    href: '/admin/blog',
    icon: FileText,
    permission: 'blog.read',
  },
  {
    title: 'Courses',
    href: '/admin/courses',
    icon: BookOpen,
    permission: 'courses.read',
  },
  {
    title: 'Discover Partners',
    href: '/admin/discover',
    icon: Globe,
    permission: 'discover.read',
  },
  {
    title: 'System Status',
    href: '/admin/system',
    icon: Settings,
    permission: 'system.read',
  },
  {
    title: 'Admin Users',
    href: '/admin/admin-users',
    icon: Shield,
    roles: ['super_admin'],
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { adminUser, logout, hasPermission, hasRole } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNavItems = navigationItems.filter(item => {
    // Check role requirements
    if (item.roles && !hasRole(item.roles)) {
      return false;
    }
    
    // Check permission requirements
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 lg:hidden bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-secondary border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <HexagonIcon size="sm">
                <Shield className="text-honey text-lg" />
              </HexagonIcon>
              <div>
                <h1 className="font-bold text-honey">Admin Panel</h1>
                <p className="text-xs text-muted-foreground">Beehive v2.0</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-honey rounded-full flex items-center justify-center">
                <span className="text-black text-sm font-semibold">
                  {adminUser?.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {adminUser?.username}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {adminUser?.role.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = location === item.href || location.startsWith(item.href + '/');
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-honey text-black font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.title}</span>
                    {isActive && <ChevronRight className="h-4 w-4" />}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="bg-secondary border-b border-border px-4 py-3 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {navigationItems.find(item => location === item.href || location.startsWith(item.href + '/'))?.title || 'Admin Panel'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manage your Beehive platform
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{adminUser?.username}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {adminUser?.role.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
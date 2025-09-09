import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Drawer, DrawerContent, DrawerTrigger } from '../ui/drawer';
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  TrendingUp, 
  Gift, 
  Settings, 
  Bell,
  User,
  Coins,
  Crown,
  Shield,
  ChevronRight,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWallet } from '../../hooks/useWallet';
import { useI18n } from '../../contexts/I18nContext';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
  adminOnly?: boolean;
  requiresAuth?: boolean;
  mobileHidden?: boolean;
}

const navigationItems: NavItem[] = [
  {
    id: 'home',
    label: 'Dashboard',
    icon: Home,
    href: '/dashboard',
    requiresAuth: true,
  },
  {
    id: 'referrals',
    label: 'Referrals',
    icon: Users,
    href: '/referrals',
    requiresAuth: true,
  },
  {
    id: 'upgrades',
    label: 'NFT Levels',
    icon: Crown,
    href: '/nft-center',
    requiresAuth: true,
  },
  {
    id: 'rewards',
    label: 'Rewards',
    icon: Gift,
    href: '/rewards',
    badge: 'new',
    requiresAuth: true,
  },
  {
    id: 'bcc',
    label: 'BCC Tokens',
    icon: Coins,
    href: '/bcc',
    requiresAuth: true,
    mobileHidden: true, // Hidden on mobile for space
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    href: '/profile',
    requiresAuth: true,
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Shield,
    href: '/admin',
    adminOnly: true,
    requiresAuth: true,
    mobileHidden: true,
  },
];

export function ResponsiveLayout({ children, className }: ResponsiveLayoutProps) {
  const { t } = useI18n();
  const { walletAddress, userData } = useWallet();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  // Detect screen size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter navigation items based on permissions and screen size
  const getVisibleNavItems = () => {
    return navigationItems.filter(item => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.requiresAuth && !walletAddress) return false;
      if (screenSize === 'mobile' && item.mobileHidden) return false;
      return true;
    });
  };

  const visibleNavItems = getVisibleNavItems();

  // Mobile Navigation Component
  const MobileNavigation = () => (
    <div className="lg:hidden">
      <Drawer open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <DrawerTrigger asChild>
          <Button variant="ghost" size="sm" className="p-2">
            <Menu className="h-5 w-5" />
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-honey">Navigation</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* User Info on Mobile */}
            {walletAddress && (
              <Card className="bg-honey/5 border-honey/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-honey/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-honey" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {userData?.username || `${walletAddress.slice(0, 8)}...`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Level {userData?.current_level || 0}
                      </div>
                    </div>
                    {isAdmin && (
                      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-xs">
                        Admin
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Items */}
            <div className="space-y-2">
              {visibleNavItems.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                
                return (
                  <Button
                    key={item.id}
                    onClick={() => {
                      setLocation(item.href);
                      setIsMobileMenuOpen(false);
                    }}
                    variant={isActive ? 'default' : 'ghost'}
                    className={cn(
                      'w-full justify-start h-12',
                      isActive && 'bg-honey text-black'
                    )}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    <span className="flex-1 text-left">{t(`nav.${item.label.toLowerCase()}`) || item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                );
              })}
            </div>

            {/* Screen Size Indicator (Dev Tool) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  {screenSize === 'mobile' && <Smartphone className="h-4 w-4" />}
                  {screenSize === 'tablet' && <Tablet className="h-4 w-4" />}
                  {screenSize === 'desktop' && <Monitor className="h-4 w-4" />}
                  <span>{screenSize} ({window.innerWidth}px)</span>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );

  // Desktop Sidebar Component
  const DesktopSidebar = () => (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-border lg:bg-secondary/30">
      <div className="flex flex-col flex-grow pt-20 overflow-y-auto">
        {/* User Profile Section */}
        {walletAddress && (
          <div className="px-4 pb-4">
            <Card className="bg-honey/5 border-honey/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-honey/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-honey" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {userData?.username || `${walletAddress.slice(0, 10)}...`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Level {userData?.current_level || 0} • {userData?.is_activated ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 mt-2 text-xs">
                    Administrator
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-2">
          {visibleNavItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Button
                key={item.id}
                onClick={() => setLocation(item.href)}
                variant={isActive ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start h-10',
                  isActive && 'bg-honey text-black'
                )}
              >
                <Icon className="h-5 w-5 mr-3" />
                <span className="flex-1 text-left">{t(`nav.${item.label.toLowerCase()}`) || item.label}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="px-4 pb-4 space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start h-10"
            onClick={() => setLocation('/settings')}
          >
            <Settings className="h-5 w-5 mr-3" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );

  // Mobile Bottom Navigation
  const MobileBottomNav = () => (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="grid grid-cols-5 h-16">
        {visibleNavItems.slice(0, 4).map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Button
              key={item.id}
              onClick={() => setLocation(item.href)}
              variant="ghost"
              className={cn(
                'flex flex-col items-center justify-center h-full rounded-none relative',
                isActive && 'text-honey'
              )}
            >
              <Icon className={cn('h-5 w-5 mb-1', isActive && 'text-honey')} />
              <span className="text-xs truncate max-w-full">
                {t(`nav.${item.label.toLowerCase()}`) || item.label}
              </span>
              {item.badge && (
                <div className="absolute top-1 right-2 w-2 h-2 bg-honey rounded-full"></div>
              )}
              {isActive && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-honey rounded-full"></div>
              )}
            </Button>
          );
        })}
        
        {/* More/Menu button for additional items */}
        <Button
          variant="ghost"
          className="flex flex-col items-center justify-center h-full rounded-none"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5 mb-1" />
          <span className="text-xs">More</span>
        </Button>
      </div>
    </div>
  );

  // Top Header Bar
  const HeaderBar = () => (
    <div className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border z-50">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side - Mobile menu + Logo */}
        <div className="flex items-center gap-4">
          <MobileNavigation />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-honey flex items-center justify-center">
              <Crown className="h-5 w-5 text-black" />
            </div>
            <span className="text-lg font-bold text-honey hidden sm:block">
              Beehive Platform
            </span>
            <span className="text-lg font-bold text-honey sm:hidden">
              Beehive
            </span>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>
          </Button>
          
          {/* Quick Stats for Desktop */}
          {screenSize === 'desktop' && userData && (
            <div className="hidden xl:flex items-center gap-4 ml-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Level: </span>
                <span className="font-medium text-honey">{userData.current_level}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Team: </span>
                <span className="font-medium text-blue-400">{userData.team_size || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <HeaderBar />
      
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main Content */}
      <div className={cn(
        'transition-all duration-200',
        // Desktop: account for sidebar
        'lg:ml-64',
        // All: account for header
        'pt-16',
        // Mobile: account for bottom nav
        'lg:pb-0 pb-16',
        className
      )}>
        <main className="p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}

// Responsive Container Component for consistent spacing
export function ResponsiveContainer({ 
  children, 
  className,
  maxWidth = '7xl' 
}: { 
  children: React.ReactNode; 
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
}) {
  return (
    <div className={cn(`max-w-${maxWidth} mx-auto px-4 sm:px-6 lg:px-8`, className)}>
      {children}
    </div>
  );
}

// Grid Component with responsive columns
export function ResponsiveGrid({ 
  children, 
  className,
  cols = { sm: 1, md: 2, lg: 3, xl: 4 }
}: { 
  children: React.ReactNode; 
  className?: string;
  cols?: { sm?: number; md?: number; lg?: number; xl?: number };
}) {
  const gridClasses = cn(
    'grid gap-4',
    `grid-cols-${cols.sm || 1}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    className
  );
  
  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}

export default ResponsiveLayout;
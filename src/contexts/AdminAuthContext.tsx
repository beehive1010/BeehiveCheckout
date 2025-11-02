import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useLocation } from 'wouter';
import { useToast } from '../hooks/use-toast';

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  adminUser: any;
  isLoading: boolean;
  isOnline: boolean;
  signInAdmin: (email: string, password: string) => Promise<void>;
  signOutAdmin: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (requiredRoles: string[]) => boolean;
}

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [location, setLocation] = useLocation();
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const { toast } = useToast();
  const sessionExpiryWarningShown = useRef(false);
  const broadcastChannel = useRef<BroadcastChannel | null>(null);

  // Check for existing admin session on mount
  useEffect(() => {
    console.log('🔧 AdminAuthContext: Initializing...');

    const checkAdminSession = async () => {
      console.log('🔄 AdminAuthContext: Checking admin session...');

      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timeout')), 10000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        if (sessionError) {
          console.error('❌ AdminAuthContext: Session error:', sessionError);
          setIsAdminAuthenticated(false);
          setAdminUser(null);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          console.log('🔍 AdminAuthContext: Checking admin status for user:', session.user.email, 'ID:', session.user.id);
          console.log('📅 AdminAuthContext: Session expires at:', new Date(session.expires_at! * 1000).toLocaleString());

          // Verify this is an admin user (admins table uses id as primary key matching auth.users.id)
          const { data: adminData, error } = await supabase
            .from('admins')
            .select('*')
            .eq('id', session.user.id)
            .eq('is_active', true)
            .single();

          if (error) {
            console.error('❌ Error querying admins table:', error);
            console.error('   Error code:', error.code);
            console.error('   Error message:', error.message);
            console.error('   Error details:', error.details);
          }

          if (!error && adminData) {
            setIsAdminAuthenticated(true);
            setAdminUser({
              ...session.user,
              role: `Level ${adminData.admin_level} Admin`, // Map admin_level to role
              admin_level: adminData.admin_level,
              wallet_address: adminData.wallet_address,
              permissions: adminData.permissions,
              adminData
            });
            console.log('✅ Admin session restored:', session.user.email, 'Level:', adminData.admin_level);
          } else {
            // Not an admin user or inactive - just reset admin state, don't sign out regular users
            setIsAdminAuthenticated(false);
            setAdminUser(null);
            console.log('🔍 AdminAuthContext: User is not an admin, but keeping regular user session');
          }
        } else {
          console.log('⚠️ AdminAuthContext: No session found on page load');
        }
      } catch (error) {
        console.error('❌ AdminAuthContext: Error checking admin session:', error);
        setIsAdminAuthenticated(false);
        setAdminUser(null);
      } finally {
        console.log('✅ AdminAuthContext: Initialization complete, isLoading set to false');
        setIsLoading(false);
      }
    };

    checkAdminSession().catch(err => {
      console.error('❌ AdminAuthContext: Unhandled error in checkAdminSession:', err);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Admin auth state change:', event, 'Session:', !!session);

        if (event === 'SIGNED_IN' && session?.user) {
          // Verify admin user (admins table uses id as primary key matching auth.users.id)
          const { data: adminData, error } = await supabase
            .from('admins')
            .select('*')
            .eq('id', session.user.id)
            .eq('is_active', true)
            .single();

          if (!error && adminData) {
            setIsAdminAuthenticated(true);
            setAdminUser({
              ...session.user,
              role: `Level ${adminData.admin_level} Admin`, // Map admin_level to role
              admin_level: adminData.admin_level,
              wallet_address: adminData.wallet_address,
              permissions: adminData.permissions,
              adminData
            });
            console.log('✅ Admin signed in:', session.user.email, 'Level:', adminData.admin_level);
            // Redirect to admin dashboard on successful sign in
            setLocation('/admin/dashboard');
          } else {
            // User is not an admin - sign them out completely
            setIsAdminAuthenticated(false);
            setAdminUser(null);
            await supabase.auth.signOut({ scope: 'local' });
            console.log('🔍 User signed in but not admin, signing out');
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear all state on sign out
          setIsAdminAuthenticated(false);
          setAdminUser(null);
          console.log('🔓 SIGNED_OUT event - state cleared');

          // Redirect to admin login if on admin pages
          if (location.startsWith('/admin/') && location !== '/admin/login') {
            setLocation('/admin/login');
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Re-verify admin status on token refresh
          if (session?.user) {
            const { data: adminData } = await supabase
              .from('admins')
              .select('*')
              .eq('id', session.user.id)
              .eq('is_active', true)
              .single();

            if (adminData) {
              setAdminUser({
                ...session.user,
                role: `Level ${adminData.admin_level} Admin`,
                admin_level: adminData.admin_level,
                wallet_address: adminData.wallet_address,
                permissions: adminData.permissions,
                adminData
              });
              console.log('🔄 Token refreshed - admin status verified');
            } else {
              // Admin was deactivated, sign out
              await supabase.auth.signOut({ scope: 'local' });
              console.log('❌ Admin deactivated, signing out');
            }
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [location, setLocation]);

  // Multi-tab session synchronization
  useEffect(() => {
    // Initialize BroadcastChannel for cross-tab communication
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel.current = new BroadcastChannel('admin_auth_channel');

      broadcastChannel.current.onmessage = (event) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'ADMIN_SIGNED_OUT':
            console.log('📢 Received sign out from another tab');
            setIsAdminAuthenticated(false);
            setAdminUser(null);
            if (location.startsWith('/admin/') && location !== '/admin/login') {
              setLocation('/admin/login');
            }
            break;

          case 'ADMIN_SIGNED_IN':
            console.log('📢 Received sign in from another tab');
            setIsAdminAuthenticated(true);
            setAdminUser(payload.adminUser);
            break;

          case 'SESSION_REFRESHED':
            console.log('📢 Session refreshed in another tab');
            // Reset expiry warning flag when session is refreshed
            sessionExpiryWarningShown.current = false;
            break;
        }
      };
    }

    return () => {
      broadcastChannel.current?.close();
    };
  }, [location, setLocation]);

  // Offline/Online state detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 Back online');
      toast({
        title: '已恢复连接',
        description: '网络连接已恢复',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('📴 Offline');
      toast({
        title: '网络断开',
        description: '请检查您的网络连接',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Session expiry warning (5 minutes before expiry)
  useEffect(() => {
    if (!isAdminAuthenticated) {
      sessionExpiryWarningShown.current = false;
      return;
    }

    const checkSessionExpiry = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.expires_at) {
          const expiresAt = session.expires_at * 1000; // Convert to milliseconds
          const now = Date.now();
          const timeUntilExpiry = expiresAt - now;
          const fiveMinutes = 5 * 60 * 1000;

          // Show warning 5 minutes before expiry (only once)
          if (timeUntilExpiry <= fiveMinutes && timeUntilExpiry > 0 && !sessionExpiryWarningShown.current) {
            sessionExpiryWarningShown.current = true;
            console.log('⚠️ Session expiring soon, showing warning');

            toast({
              title: '会话即将过期',
              description: '您的登录会话将在 5 分钟后过期，请保存您的工作。',
              variant: 'destructive',
              duration: 10000,
            });
          }
        }
      } catch (error) {
        console.error('Error checking session expiry:', error);
      }
    };

    // Check every minute
    const interval = setInterval(checkSessionExpiry, 60 * 1000);
    checkSessionExpiry(); // Check immediately

    return () => clearInterval(interval);
  }, [isAdminAuthenticated, toast]);

  // Monitor user activity to keep session alive
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    // Track user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [isAdminAuthenticated]);

  // Smart token refresh - refresh proactively before expiry
  useEffect(() => {
    if (!isAdminAuthenticated || !isOnline) return;

    const scheduleTokenRefresh = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.expires_at) {
          const expiresAt = session.expires_at * 1000; // Convert to milliseconds
          const now = Date.now();
          const timeUntilExpiry = expiresAt - now;
          const tenMinutes = 10 * 60 * 1000;
          const thirtyMinutes = 30 * 60 * 1000;

          // Schedule refresh 10 minutes before expiry, but only if user active in last 30 min
          const refreshTime = Math.max(0, timeUntilExpiry - tenMinutes);

          console.log(`🔄 Scheduling token refresh in ${Math.round(refreshTime / 60000)} minutes`);

          const timeoutId = setTimeout(async () => {
            const inactiveTime = Date.now() - lastActivity;

            // Only refresh if user was active in last 30 minutes
            if (inactiveTime < thirtyMinutes) {
              try {
                console.log('🔄 Proactively refreshing session before expiry...');
                const { data: { session: newSession }, error } = await supabase.auth.refreshSession();

                if (error) {
                  console.error('❌ Session refresh failed:', error);
                  return;
                }

                if (newSession) {
                  console.log('✅ Session refreshed successfully. New expiry:', new Date(newSession.expires_at! * 1000).toLocaleString());

                  // Reset expiry warning flag
                  sessionExpiryWarningShown.current = false;

                  // Broadcast to other tabs
                  broadcastChannel.current?.postMessage({
                    type: 'SESSION_REFRESHED',
                    payload: { expiresAt: newSession.expires_at }
                  });

                  // Schedule next refresh
                  scheduleTokenRefresh();
                }
              } catch (error) {
                console.error('❌ Error refreshing session:', error);
              }
            } else {
              console.log('ℹ️ User inactive for 30+ minutes, skipping session refresh');
            }
          }, refreshTime);

          return () => clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('❌ Error scheduling token refresh:', error);
      }
    };

    scheduleTokenRefresh();
  }, [isAdminAuthenticated, isOnline, lastActivity]);

  const signInAdmin = async (email: string, password: string) => {
    console.log('🔐 AdminAuthContext: Starting admin sign in for:', email);

    try {
      // Clear any existing state before signing in
      setIsAdminAuthenticated(false);
      setAdminUser(null);
      console.log('🔄 AdminAuthContext: Cleared existing auth state');

      // Check if there's an existing valid session first (with error handling)
      let existingSession = null;
      try {
        console.log('🔍 AdminAuthContext: Checking for existing session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!sessionError && session) {
          existingSession = session;
          console.log('✅ AdminAuthContext: Found existing session for:', session.user?.email);
        } else {
          console.log('ℹ️ AdminAuthContext: No existing session found');
        }
      } catch (sessionCheckError) {
        console.log('⚠️ AdminAuthContext: Could not check existing session, proceeding with sign in');
      }

      // Only clear session if it's for a different user
      if (existingSession?.user && existingSession.user.email !== email) {
        console.log('🔄 AdminAuthContext: Different user detected, clearing old session');
        try {
          await supabase.auth.signOut({ scope: 'local' });
          console.log('✅ AdminAuthContext: Old session cleared');
        } catch (signOutError) {
          console.log('⚠️ AdminAuthContext: Could not clear old session, proceeding with sign in');
        }
      }

      // Sign in with fresh credentials
      console.log('🔑 AdminAuthContext: Signing in with password...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ AdminAuthContext: Sign in failed:', error);
        throw error;
      }

      if (!data.user) {
        console.error('❌ AdminAuthContext: No user returned from authentication');
        throw new Error('No user returned from authentication');
      }

      console.log('✅ AdminAuthContext: Authentication successful, user ID:', data.user.id);

      // Verify this is an admin user (admins table uses id as primary key matching auth.users.id)
      console.log('🔍 AdminAuthContext: Verifying admin status...');
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', data.user.id)
        .eq('is_active', true)
        .single();

      if (adminError || !adminData) {
        console.error('❌ AdminAuthContext: Admin verification failed:', adminError);
        await supabase.auth.signOut({ scope: 'local' });
        throw new Error('Invalid admin credentials or inactive account');
      }

      console.log('✅ AdminAuthContext: Admin verification successful, level:', adminData.admin_level);

      setIsAdminAuthenticated(true);
      const newAdminUser = {
        ...data.user,
        role: `Level ${adminData.admin_level} Admin`, // Map admin_level to role
        admin_level: adminData.admin_level,
        wallet_address: adminData.wallet_address,
        permissions: adminData.permissions,
        adminData
      };

      setAdminUser(newAdminUser);

      console.log('✅ AdminAuthContext: Admin signed in successfully:', data.user.email, 'Level:', adminData.admin_level);

      // Broadcast sign in to other tabs
      broadcastChannel.current?.postMessage({
        type: 'ADMIN_SIGNED_IN',
        payload: { adminUser: newAdminUser }
      });

      console.log('🔀 AdminAuthContext: Redirecting to /admin/dashboard');

      // Redirect to admin dashboard
      setLocation('/admin/dashboard');

    } catch (error: any) {
      console.error('❌ AdminAuthContext: Admin sign in error:', error);
      // Ensure clean state on error
      setIsAdminAuthenticated(false);
      setAdminUser(null);
      throw error;
    }
  };

  const signOutAdmin = async () => {
    try {
      // Clear all admin state BEFORE sign out
      setIsAdminAuthenticated(false);
      setAdminUser(null);

      // Broadcast sign out to other tabs BEFORE actually signing out
      broadcastChannel.current?.postMessage({
        type: 'ADMIN_SIGNED_OUT',
        payload: {}
      });

      // Sign out with 'local' scope to clear localStorage completely
      await supabase.auth.signOut({ scope: 'local' });

      console.log('🔓 Admin signed out - session cleared');

      // Redirect to admin login
      setLocation('/admin/login');
    } catch (error) {
      console.error('Admin sign out error:', error);

      // Force clear state even if signOut fails
      setIsAdminAuthenticated(false);
      setAdminUser(null);
      setLocation('/admin/login');
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!adminUser || !isAdminAuthenticated) return false;

    // Check if user has explicit permissions array
    if (adminUser.permissions) {
      // Wildcard permission grants all access
      if (adminUser.permissions.includes('*')) return true;

      // Check for specific permission
      if (adminUser.permissions.includes(permission)) return true;
    }

    // Fallback: level-based permissions
    const levelPermissions: Record<number, string[]> = {
      3: ['*'], // Super admin (level 3+) - all permissions
      2: [ // Operations admin (level 2)
        'users.read', 'users.write', 'users.update', 'users.delete', 'users.export',
        'referrals.read', 'referrals.export', 'referrals.manage',
        'members.read', 'members.update', 'members.activate',
        'rewards.read', 'rewards.write', 'rewards.process', 'rewards.distribute',
        'withdrawals.read', 'withdrawals.process',
        'nfts.read', 'nfts.write', 'nfts.create', 'nfts.verify',
        'contracts.read', 'contracts.deploy',
        'courses.read', 'courses.create', 'courses.edit',
        'blog.read', 'blog.write',
        'finances.read', 'stats.read', 'system.read', 'settings.read',
        'dashboard.read', 'matrix.read', 'discover.read'
      ],
      1: [ // Basic admin (level 1)
        'dashboard.read', 'users.read', 'referrals.read', 'members.read',
        'rewards.read', 'matrix.read', 'courses.read', 'stats.read',
        'nfts.read'
      ]
    };

    const adminLevel = adminUser.admin_level || adminUser.adminLevel || 0;
    const userPermissions = levelPermissions[adminLevel] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  };

  const hasRole = (requiredRoles: string[]): boolean => {
    if (!adminUser || !isAdminAuthenticated) return false;

    // Check if admin has required role
    if (adminUser.role && requiredRoles.some(role =>
      adminUser.role.toLowerCase().includes(role.toLowerCase())
    )) {
      return true;
    }

    // Check by admin level
    const adminLevel = adminUser.admin_level || adminUser.adminLevel || 0;

    // Map levels to roles
    if (adminLevel >= 3 && requiredRoles.includes('super_admin')) return true;
    if (adminLevel >= 2 && requiredRoles.includes('admin')) return true;
    if (adminLevel >= 1 && requiredRoles.includes('basic_admin')) return true;

    return false;
  };

  const value = {
    isAdminAuthenticated,
    adminUser,
    isLoading,
    isOnline,
    signInAdmin,
    signOutAdmin,
    hasPermission,
    hasRole,
    logout: signOutAdmin, // Alias for compatibility with AdminLayout
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

AdminAuthProvider.displayName = 'AdminAuthProvider';

export { AdminAuthProvider };

const useAdminAuthContext = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuthContext must be used within an AdminAuthProvider');
  }
  return context;
};

export { useAdminAuthContext };
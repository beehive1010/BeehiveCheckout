import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLocation } from 'wouter';

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  adminUser: any;
  isLoading: boolean;
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
  const [location, setLocation] = useLocation();
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Check for existing admin session on mount
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        // Force refresh session to ensure it's valid
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setIsAdminAuthenticated(false);
          setAdminUser(null);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          console.log('🔍 Checking admin status for user:', session.user.email, 'ID:', session.user.id);
          console.log('📅 Session expires at:', new Date(session.expires_at! * 1000).toLocaleString());

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
            console.log('🔍 User is not an admin, but keeping regular user session');
          }
        } else {
          console.log('⚠️ No session found on page load');
        }
      } catch (error) {
        console.error('Error checking admin session:', error);
        setIsAdminAuthenticated(false);
        setAdminUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminSession();

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

  // Auto-refresh session every 30 minutes if user is active
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    const refreshInterval = setInterval(async () => {
      const inactiveTime = Date.now() - lastActivity;
      const thirtyMinutes = 30 * 60 * 1000;

      // Only refresh if user was active in last 30 minutes
      if (inactiveTime < thirtyMinutes) {
        try {
          console.log('🔄 Auto-refreshing admin session...');
          const { data: { session }, error } = await supabase.auth.refreshSession();

          if (error) {
            console.error('❌ Session refresh failed:', error);
            return;
          }

          if (session) {
            console.log('✅ Session refreshed successfully. Expires:', new Date(session.expires_at! * 1000).toLocaleString());
          }
        } catch (error) {
          console.error('❌ Error refreshing session:', error);
        }
      } else {
        console.log('ℹ️ User inactive, skipping session refresh');
      }
    }, 15 * 60 * 1000); // Check every 15 minutes

    return () => clearInterval(refreshInterval);
  }, [isAdminAuthenticated, lastActivity]);

  const signInAdmin = async (email: string, password: string) => {
    try {
      // Clear any existing state before signing in
      setIsAdminAuthenticated(false);
      setAdminUser(null);

      // Check if there's an existing valid session first
      const { data: { session: existingSession } } = await supabase.auth.getSession();

      // Only clear session if it's for a different user
      if (existingSession?.user && existingSession.user.email !== email) {
        console.log('🔄 Different user detected, clearing old session');
        await supabase.auth.signOut({ scope: 'local' });
      }

      // Sign in with fresh credentials
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('No user returned from authentication');
      }

      // Verify this is an admin user (admins table uses id as primary key matching auth.users.id)
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', data.user.id)
        .eq('is_active', true)
        .single();

      if (adminError || !adminData) {
        console.error('❌ Admin verification failed:', adminError);
        await supabase.auth.signOut({ scope: 'local' });
        throw new Error('Invalid admin credentials or inactive account');
      }

      setIsAdminAuthenticated(true);
      setAdminUser({
        ...data.user,
        role: `Level ${adminData.admin_level} Admin`, // Map admin_level to role
        admin_level: adminData.admin_level,
        wallet_address: adminData.wallet_address,
        permissions: adminData.permissions,
        adminData
      });

      console.log('✅ Admin signed in:', data.user.email, 'Level:', adminData.admin_level);

      // Redirect to admin dashboard
      setLocation('/admin/dashboard');

    } catch (error: any) {
      console.error('Admin sign in error:', error);
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
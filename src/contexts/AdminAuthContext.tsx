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

  // Check for existing admin session on mount
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('🔍 Checking admin status for user:', session.user.email, 'ID:', session.user.id);

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
        console.log('Admin auth state change:', event);
        
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
            // User is not an admin - just reset admin state without signing out
            setIsAdminAuthenticated(false);
            setAdminUser(null);
            console.log('🔍 User signed in but not admin, keeping regular user session');
          }
        } else if (event === 'SIGNED_OUT') {
          setIsAdminAuthenticated(false);
          setAdminUser(null);
          
          // Redirect to admin login if on admin pages
          if (location.startsWith('/admin/') && location !== '/admin/login') {
            setLocation('/admin/login');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [location, setLocation]);

  const signInAdmin = async (email: string, password: string) => {
    try {
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
        await supabase.auth.signOut();
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
      throw error;
    }
  };

  const signOutAdmin = async () => {
    try {
      await supabase.auth.signOut();
      setIsAdminAuthenticated(false);
      setAdminUser(null);
      console.log('🔓 Admin signed out');

      // Redirect to admin login
      setLocation('/admin/login');
    } catch (error) {
      console.error('Admin sign out error:', error);
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
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLocation } from 'wouter';

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  adminUser: any;
  isLoading: boolean;
  signInAdmin: (email: string, password: string) => Promise<void>;
  signOutAdmin: () => Promise<void>;
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
          // Verify this is an admin user
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
              role: adminData.role,
              adminData
            });
            console.log('✅ Admin session restored:', adminData.email);
          } else {
            // Not an admin user or inactive - just reset admin state, don't sign out regular users
            setIsAdminAuthenticated(false);
            setAdminUser(null);
            console.log('🔍 User is not an admin, but keeping regular user session active');
          }
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
          // Verify admin user
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
              role: adminData.role,
              adminData
            });
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

      // Verify this is an admin user
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('id', data.user.id)
        .eq('is_active', true)
        .single();

      if (adminError || !adminData) {
        await supabase.auth.signOut();
        throw new Error('Invalid admin credentials or inactive account');
      }

      setIsAdminAuthenticated(true);
      setAdminUser({
        ...data.user,
        role: adminData.role,
        adminData
      });

      console.log('✅ Admin signed in:', adminData.email);
      
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

  const value = {
    isAdminAuthenticated,
    adminUser,
    isLoading,
    signInAdmin,
    signOutAdmin,
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
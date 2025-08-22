import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export function useAdminAuth() {
  const [, setLocation] = useLocation();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuthStatus = async () => {
    try {
      const sessionToken = localStorage.getItem('adminSessionToken');
      const storedUser = localStorage.getItem('adminUser');

      if (!sessionToken || !storedUser) {
        setIsLoading(false);
        return;
      }

      // Temporary solution: use stored admin data instead of API call
      const userData = JSON.parse(storedUser);
      
      // Check if token is still valid (simple time-based check)
      if (sessionToken.startsWith('temp-admin-session-')) {
        const timestamp = parseInt(sessionToken.replace('temp-admin-session-', ''));
        const expiryTime = timestamp + (12 * 60 * 60 * 1000); // 12 hours
        
        if (Date.now() > expiryTime) {
          throw new Error('Session expired');
        }
      }
      
      setAdminUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear state without navigation on error
      localStorage.removeItem('adminSessionToken');
      localStorage.removeItem('adminUser');
      setAdminUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Temporary solution: skip API call and just clear local storage
      console.log('Admin logout requested');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('adminSessionToken');
      localStorage.removeItem('adminUser');
      setAdminUser(null);
      setIsAuthenticated(false);
      // Only navigate if not already on login page
      setTimeout(() => setLocation('/admin/login'), 0);
    }
  };

  const hasRole = (requiredRoles: string[]): boolean => {
    if (!adminUser) return false;
    return requiredRoles.includes(adminUser.role);
  };

  const hasPermission = (permission: string): boolean => {
    if (!adminUser) return false;
    
    // Super admin has all permissions
    if (adminUser.role === 'super_admin') return true;
    
    // Define role-based permissions
    const rolePermissions: Record<string, string[]> = {
      super_admin: ['*'], // All permissions
      ops_admin: [
        'users.read', 'users.update', 'users.export',
        'referrals.read', 'referrals.export',
        'nfts.read', 'nfts.create', 'nfts.update', 'nfts.mint',
        'contracts.read', 'contracts.deploy', 'contracts.manage',
        'courses.read', 'courses.create', 'courses.edit',
        'discover.read', 'discover.approve', 'discover.reject',
        'system.read', 'logs.read', 'logs.export'
      ],
      creator_admin: [
        'blog.read', 'blog.create', 'blog.update',
        'nfts.read', 'nfts.create',
        'contracts.read',
        'courses.read', 'courses.create',
        'discover.read'
      ],
      viewer: [
        'users.read', 'referrals.read', 'nfts.read',
        'contracts.read',
        'blog.read', 'courses.read', 'discover.read',
        'system.read', 'logs.read'
      ]
    };

    const userPermissions = rolePermissions[adminUser.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  };

  return {
    adminUser,
    isLoading,
    isAuthenticated,
    logout,
    hasRole,
    hasPermission,
    checkAuthStatus,
  };
}
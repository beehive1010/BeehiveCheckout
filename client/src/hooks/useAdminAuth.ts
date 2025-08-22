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
  }, []);

  const checkAuthStatus = async () => {
    try {
      const sessionToken = localStorage.getItem('adminSessionToken');
      const storedUser = localStorage.getItem('adminUser');

      if (!sessionToken || !storedUser) {
        setIsLoading(false);
        return;
      }

      // Verify session with server
      const response = await fetch('/api/admin/auth/me', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setAdminUser(userData);
        setIsAuthenticated(true);
      } else {
        // Session expired or invalid
        logout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const sessionToken = localStorage.getItem('adminSessionToken');
      
      if (sessionToken) {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('adminSessionToken');
      localStorage.removeItem('adminUser');
      setAdminUser(null);
      setIsAuthenticated(false);
      setLocation('/admin/login');
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
        'courses.read', 'courses.create', 'courses.update',
        'discover.read', 'discover.approve', 'discover.reject',
        'system.read', 'logs.read', 'logs.export'
      ],
      creator_admin: [
        'blog.read', 'blog.create', 'blog.update',
        'nfts.read', 'nfts.create',
        'courses.read', 'courses.create',
        'discover.read'
      ],
      viewer: [
        'users.read', 'referrals.read', 'nfts.read',
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
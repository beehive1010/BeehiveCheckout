import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  adminLevel: number;
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: Date;
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
      
      if (!sessionToken) {
        setIsLoading(false);
        return;
      }

      // Verify session with new admin service
      const response = await fetch('/api/admin/verify-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ sessionToken })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired or invalid');
        }
        throw new Error('Failed to verify admin session');
      }

      const adminData = await response.json();
      setAdminUser(adminData.admin);
      setIsAuthenticated(true);
      
      // Update stored user data with latest from server
      localStorage.setItem('adminUser', JSON.stringify(adminData.admin));
      
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear state on any auth error
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
      const sessionToken = localStorage.getItem('adminSessionToken');
      
      if (sessionToken) {
        // Call new admin service to properly destroy session
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({ sessionToken })
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('adminSessionToken');
      localStorage.removeItem('adminUser');
      setAdminUser(null);
      setIsAuthenticated(false);
      setTimeout(() => setLocation('/admin/login'), 0);
    }
  };

  const hasRole = (requiredRoles: string[]): boolean => {
    if (!adminUser) return false;
    return requiredRoles.includes(adminUser.role);
  };

  const hasPermission = (permission: string): boolean => {
    if (!adminUser) return false;
    
    // Use permissions from new admin service (stored in adminUser.permissions)
    if (adminUser.permissions && adminUser.permissions.includes('*')) return true;
    if (adminUser.permissions && adminUser.permissions.includes(permission)) return true;
    
    // Fallback: level-based permissions for new admin system
    const levelPermissions: Record<number, string[]> = {
      3: ['*'], // Super admin (level 3+) - all permissions
      2: [ // Operations admin (level 2)
        'users.read', 'users.update', 'users.export',
        'referrals.read', 'referrals.export', 'referrals.manage',
        'members.read', 'members.update', 'members.activate',
        'rewards.read', 'rewards.process', 'rewards.distribute',
        'nfts.read', 'nfts.create', 'nfts.verify',
        'courses.read', 'courses.create', 'courses.edit',
        'finances.read', 'stats.read', 'system.read'
      ],
      1: [ // Basic admin (level 1)
        'users.read', 'referrals.read', 'members.read',
        'courses.read', 'stats.read'
      ]
    };
    
    const adminLevel = adminUser.adminLevel || 0;
    const userPermissions = levelPermissions[adminLevel] || [];
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
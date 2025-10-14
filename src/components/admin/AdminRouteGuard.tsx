import { useAdminAuthContext } from '../../contexts/AdminAuthContext';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRoles?: string[];
}

export default function AdminRouteGuard({
  children,
  requiredPermission,
  requiredRoles
}: AdminRouteGuardProps) {
  const { isAdminAuthenticated, adminUser, isLoading } = useAdminAuthContext();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to login if not authenticated (after loading completes)
    if (!isLoading && !isAdminAuthenticated) {
      setLocation('/admin/login');
      return;
    }

    // Check role-based access
    if (isAdminAuthenticated && adminUser && requiredRoles) {
      const userRole = adminUser.role || `Level ${adminUser.admin_level} Admin`;
      console.log('🔐 Role check - User role:', userRole, 'Required roles:', requiredRoles);
      if (!requiredRoles.includes(userRole)) {
        setLocation('/admin/unauthorized');
        return;
      }
    }

    // Permission-based access control
    if (isAdminAuthenticated && adminUser && requiredPermission) {
      const userRole = adminUser.role || `Level ${adminUser.admin_level} Admin`;
      const adminLevel = adminUser.admin_level;

      console.log('🔐 Permission check:', requiredPermission, 'for role:', userRole, 'level:', adminLevel);

      // Level 1 admins have full access to all permissions
      if (adminLevel === 1) {
        console.log('✅ Level 1 admin - full access granted');
        return;
      }

      // For other levels, check specific permissions
      // You can customize this logic based on your permission requirements
      const hasPermission = adminUser.permissions?.includes(requiredPermission) || adminLevel === 1;

      if (!hasPermission) {
        console.log('❌ Permission denied');
        setLocation('/admin/unauthorized');
        return;
      }
    }
  }, [isAdminAuthenticated, adminUser, isLoading, setLocation, requiredPermission, requiredRoles]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin h-6 w-6 border-2 border-honey border-t-transparent rounded-full"></div>
          <span className="text-muted-foreground">Verifying admin access...</span>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated (will redirect)
  if (!isAdminAuthenticated) {
    return null;
  }

  // Check role requirements
  if (requiredRoles && adminUser) {
    const userRole = adminUser.role || `Level ${adminUser.admin_level} Admin`;
    if (!requiredRoles.includes(userRole)) {
      return null; // Will redirect to unauthorized
    }
  }

  return <>{children}</>;
}
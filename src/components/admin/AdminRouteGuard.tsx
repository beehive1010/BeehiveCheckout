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
      const userRole = adminUser.adminData?.role;
      if (!requiredRoles.includes(userRole)) {
        setLocation('/admin/unauthorized');
        return;
      }
    }

    // TODO: Implement permission-based access if needed
    // This would require extending the admin_users table with permissions
    if (isAdminAuthenticated && adminUser && requiredPermission) {
      // For now, allow all authenticated admins
      // In the future, check adminUser.permissions.includes(requiredPermission)
      console.log('Permission check:', requiredPermission, 'for role:', adminUser.adminData?.role);
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
  if (requiredRoles && adminUser?.adminData?.role) {
    const userRole = adminUser.adminData.role;
    if (!requiredRoles.includes(userRole)) {
      return null; // Will redirect to unauthorized
    }
  }

  return <>{children}</>;
}
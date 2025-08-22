import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAdminAuth } from '../../hooks/useAdminAuth';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermission?: string;
}

export function AdminRouteGuard({ 
  children, 
  requiredRoles = [], 
  requiredPermission 
}: AdminRouteGuardProps) {
  const { isAuthenticated, isLoading, adminUser, hasRole, hasPermission } = useAdminAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setLocation('/admin/login');
      return;
    }

    // Check role requirements
    if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
      setLocation('/admin/unauthorized');
      return;
    }

    // Check permission requirements
    if (requiredPermission && !hasPermission(requiredPermission)) {
      setLocation('/admin/unauthorized');
      return;
    }
  }, [isAuthenticated, isLoading, requiredRoles, requiredPermission, hasRole, hasPermission, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey"></div>
          <p className="text-muted-foreground">Verifying admin session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  // Check authorization after authentication
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-honey">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have the required role to access this page.
          </p>
          <p className="text-sm text-muted-foreground">
            Required: {requiredRoles.join(', ')} | Your role: {adminUser?.role}
          </p>
        </div>
      </div>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-honey">Permission Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this feature.
          </p>
          <p className="text-sm text-muted-foreground">
            Required permission: {requiredPermission}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
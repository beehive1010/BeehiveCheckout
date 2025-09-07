import React, { useEffect } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Shield, Crown, Users, AlertTriangle } from 'lucide-react';
import { useLocation } from 'wouter';
import { apiRequest } from '../../lib/queryClient';

interface MemberGuardProps {
  children: React.ReactNode;
  requireLevel?: number; // Minimum membership level required
  fallbackComponent?: React.ComponentType;
  redirectTo?: string;
}

export function MemberGuard({ 
  children, 
  requireLevel = 1,
  fallbackComponent: FallbackComponent,
  redirectTo
}: MemberGuardProps) {
  const account = useActiveAccount();
  const [, setLocation] = useLocation();

  // Check membership status
  const { data: memberStatus, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user', account?.address],
    enabled: !!account?.address,
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/auth/user', { 
          t: Date.now(),
          'Cache-Control': 'no-cache'
        }, account!.address);
        
        return await response.json();
      } catch (error: any) {
        if (error.status === 404) {
          return { 
            isRegistered: false, 
            hasNFT: false, 
            isActivated: false,
            membershipLevel: 0,
            userFlow: 'registration' 
          };
        }
        throw new Error('Failed to fetch membership status');
      }
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });

  // Handle redirects - this must be at top level to maintain hook order
  useEffect(() => {
    if (memberStatus && !memberStatus.isRegistered && redirectTo) {
      setLocation(redirectTo);
    } else if (memberStatus && memberStatus.isRegistered && !memberStatus.isMember) {
      setLocation('/welcome');
    }
  }, [memberStatus, redirectTo, setLocation]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-honey" />
              <div className="text-center">
                <h3 className="font-medium text-honey">Checking Membership</h3>
                <p className="text-sm text-muted-foreground">
                  Verifying your membership status...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle wallet not connected
  if (!account?.address) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="w-full max-w-md border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              <Shield className="h-5 w-5" />
              Wallet Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please connect your wallet to access this content.
            </p>
            <Button 
              onClick={() => setLocation('/')}
              className="w-full"
            >
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle API errors
  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="w-full max-w-md border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Membership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Failed to load membership status'}
            </p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle user not registered
  if (!memberStatus?.isRegistered) {
    if (redirectTo) {
      setLocation(redirectTo);
      return null;
    }

    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="w-full max-w-md border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-500">
              <Users className="h-5 w-5" />
              Registration Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You need to register an account to access this content.
            </p>
            <Button 
              onClick={() => setLocation('/register')}
              className="w-full bg-blue-500 hover:bg-blue-500/90"
            >
              Register Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle insufficient membership level
  // Check multiple possible field names for membership level
  const userLevel = memberStatus?.membershipLevel || 
                   memberStatus?.currentLevel || 
                   memberStatus?.memberData?.current_level || 
                   memberStatus?.user?.currentLevel || 
                   (memberStatus?.isMember ? 1 : 0); // If isMember is true, assume at least level 1
  
  if (!memberStatus?.isMember || userLevel < requireLevel) {
    const currentLevel = userLevel;
    
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    // Show loading while redirect is happening for non-activated users  
    if (memberStatus && !memberStatus.isMember) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-honey" />
                <div className="text-center">
                  <h3 className="font-medium text-honey">Redirecting...</h3>
                  <p className="text-sm text-muted-foreground">
                    Taking you to membership activation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Show level upgrade required
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="w-full max-w-md border-honey/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-honey">
              <Crown className="h-5 w-5" />
              Upgrade Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Current Level:</span>
                <Badge variant="outline">{currentLevel}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Required Level:</span>
                <Badge className="bg-honey text-black">{requireLevel}</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This content requires Level {requireLevel} membership or higher.
            </p>
            <Button 
              onClick={() => setLocation('/me')}
              className="w-full bg-honey hover:bg-honey/90 text-black"
            >
              Upgrade Membership
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has sufficient membership level - render protected content
  return <>{children}</>;
}

export default MemberGuard;
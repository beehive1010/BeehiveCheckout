import { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';
import { useLocation } from 'wouter';
import { useWallet } from '../hooks/useWallet';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../lib/queryClient';
import { Check, AlertCircle, User, Mail, Key, Users } from 'lucide-react';

export default function Registration() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { walletAddress } = useWallet();
  
  // Create our own register mutation since useWallet might not have it
  const registerMutation = useMutation({
    mutationFn: async (registrationData: {
      walletAddress: string;
      username: string;
      email?: string;
      secondaryPasswordHash?: string;
      referrerWallet?: string;
    }) => {
      return await apiRequest('POST', '/api/auth/register', registrationData);
    },
    onSuccess: () => {
      // Invalidate user queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    secondaryPassword: '',
    confirmPassword: ''
  });
  
  // Get referrer from URL parameters
  const [referrerWallet, setReferrerWallet] = useState<string | null>(null);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam && refParam.startsWith('0x') && refParam.length === 42) {
      setReferrerWallet(refParam.toLowerCase());
    }
  }, []);

  // Validate referrer exists and is not self-referral
  const { data: referrerValidation, isLoading: isValidatingReferrer } = useQuery({
    queryKey: ['/api/auth/validate-referrer', referrerWallet],
    queryFn: async () => {
      if (!referrerWallet || !walletAddress) return null;
      
      // Check for self-referral
      if (referrerWallet.toLowerCase() === walletAddress.toLowerCase()) {
        throw new Error('You cannot refer yourself');
      }
      
      const response = await fetch(`/api/auth/validate-referrer?address=${referrerWallet}`, {
        headers: { 'X-Wallet-Address': walletAddress }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Referrer not found - they must be registered first');
        }
        throw new Error('Invalid referrer');
      }
      
      return response.json();
    },
    enabled: !!referrerWallet && !!walletAddress,
    retry: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet first',
        variant: 'destructive'
      });
      return;
    }

    // Validate passwords match
    if (formData.secondaryPassword !== formData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match',
        variant: 'destructive'
      });
      return;
    }

    // Validate referrer if provided
    if (referrerWallet && !referrerValidation) {
      toast({
        title: 'Invalid Referrer',
        description: 'Please check your referral link',
        variant: 'destructive'
      });
      return;
    }

    try {
      await registerMutation.mutateAsync({
        walletAddress,
        username: formData.username,
        email: formData.email || undefined,
        secondaryPasswordHash: formData.secondaryPassword, // Will be hashed on backend
        referrerWallet: referrerWallet || undefined
      });
      
      toast({
        title: 'Registration Successful! 🎉',
        description: 'Welcome to Beehive! Now claim your Level 1 NFT.',
      });
      
      setLocation('/welcome');
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Please try again later',
        variant: 'destructive'
      });
    }
  };

  const getReferrerStatus = () => {
    if (!referrerWallet) return null;
    
    if (isValidatingReferrer) {
      return (
        <div className="flex items-center text-sm text-muted-foreground">
          <div className="animate-spin h-4 w-4 border-2 border-honey border-t-transparent rounded-full mr-2"></div>
          Validating referrer...
        </div>
      );
    }
    
    if (referrerValidation) {
      return (
        <div className="flex items-center text-sm text-green-400">
          <Check className="h-4 w-4 mr-2" />
          Valid referrer: {referrerValidation.username || referrerWallet.slice(0, 8) + '...'}
        </div>
      );
    }
    
    return (
      <div className="flex items-center text-sm text-red-400">
        <AlertCircle className="h-4 w-4 mr-2" />
        Invalid referrer
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey text-center text-2xl">
            {t('registration.title') || 'Join Beehive'}
          </CardTitle>
          <p className="text-center text-muted-foreground text-sm">
            Connected: {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Referrer Status */}
            {referrerWallet && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center mb-2">
                  <Users className="h-4 w-4 mr-2 text-honey" />
                  <span className="text-sm font-medium">Referral Status</span>
                </div>
                {getReferrerStatus()}
              </div>
            )}

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                Username *
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter your username"
                className="bg-muted border-border"
                required
                data-testid="input-username"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Email (optional)
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
                className="bg-muted border-border"
                data-testid="input-email"
              />
            </div>

            {/* Secondary Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center">
                <Key className="h-4 w-4 mr-2" />
                Security Password *
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.secondaryPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, secondaryPassword: e.target.value }))}
                placeholder="Create a security password"
                className="bg-muted border-border"
                required
                data-testid="input-password"
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirm Password *
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm your password"
                className="bg-muted border-border"
                required
                data-testid="input-confirm-password"
              />
            </div>

            <Button
              type="submit"
              disabled={registerMutation.isPending || (!!referrerWallet && !referrerValidation)}
              className="w-full bg-honey text-secondary hover:bg-honey/90"
              data-testid="button-register"
            >
              {registerMutation.isPending ? 'Registering...' : 'Register & Join Beehive'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
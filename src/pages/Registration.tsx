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
import { Check, AlertCircle, User, Mail, Users } from 'lucide-react';
import { authService } from '../lib/supabaseClient';

export default function Registration() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { walletAddress } = useWallet();
  
  // Create register mutation using the correct Edge Function
  const registerMutation = useMutation({
    mutationFn: async (registrationData: {
      walletAddress: string;
      username: string;
      email?: string;
      referrerWallet?: string;
    }) => {
      const response = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': registrationData.walletAddress,
        },
        body: JSON.stringify({
          action: 'register',
          username: registrationData.username,
          email: registrationData.email,
          referrerWallet: registrationData.referrerWallet,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Registration failed');
      }

      return await response.json();
    },
    onSuccess: () => {
      // Invalidate user queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['user-status'] });
    },
  });
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  });
  
  // Loading state for user existence check
  const [isCheckingExistingUser, setIsCheckingExistingUser] = useState(true);
  
  // Get referrer from URL parameters
  const [referrerWallet, setReferrerWallet] = useState<string | null>(null);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam && refParam.startsWith('0x') && refParam.length === 42) {
      // Keep original case as specified - wallet addresses must be case-preserved
      setReferrerWallet(refParam);
    }
  }, []);

  // Check if user already exists and redirect to welcome page
  useEffect(() => {
    const checkExistingUser = async () => {
      if (!walletAddress) {
        setIsCheckingExistingUser(false);
        return;
      }
      
      try {
        const { exists } = await authService.userExists(walletAddress);
        if (exists) {
          console.log('👤 User already registered, redirecting to welcome page');
          toast({
            title: 'Already Registered',
            description: 'You are already registered! Redirecting to welcome page...',
          });
          setTimeout(() => {
            setLocation('/welcome');
          }, 1000);
        } else {
          // User doesn't exist, show the registration form
          setIsCheckingExistingUser(false);
        }
      } catch (error) {
        console.error('Error checking existing user:', error);
        // On error, show the registration form
        setIsCheckingExistingUser(false);
      }
    };

    checkExistingUser();
  }, [walletAddress, setLocation, toast]);

  // Validate referrer exists and is not self-referral
  const { data: referrerValidation, isLoading: isValidatingReferrer, error: referrerError } = useQuery({
    queryKey: ['validate-referrer', referrerWallet],
    queryFn: async () => {
      if (!referrerWallet || !walletAddress) return null;
      
      // Check for self-referral (case-insensitive comparison)
      if (referrerWallet.toLowerCase() === walletAddress.toLowerCase()) {
        throw new Error('You cannot refer yourself');
      }
      
      try {
        const response = await fetch(`https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/auth?action=validate-referrer&address=${referrerWallet}`, {
          headers: { 'x-wallet-address': walletAddress }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Referrer not found - they must be registered first');
          }
          throw new Error('Invalid referrer');
        }
        
        return response.json();
      } catch (error: any) {
        console.warn('Referrer validation failed:', error.message);
        throw error;
      }
    },
    enabled: !!referrerWallet && !!walletAddress,
    retry: false,
    throwOnError: false
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


    // Validate referrer if provided
    if (referrerWallet && referrerError) {
      toast({
        title: 'Invalid Referrer',
        description: referrerError.message || 'Please check your referral link',
        variant: 'destructive'
      });
      return;
    }

    try {
      await registerMutation.mutateAsync({
        walletAddress,
        username: formData.username,
        email: formData.email || undefined,
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
    
    if (referrerError) {
      return (
        <div className="flex items-center text-sm text-red-400">
          <AlertCircle className="h-4 w-4 mr-2" />
          {referrerError.message || 'Invalid referrer'}
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

  // Show loading screen while checking if user already exists
  if (isCheckingExistingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-secondary border-border">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-honey border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-honey">Checking registration status...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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


            <Button
              type="submit"
              disabled={registerMutation.isPending || (!!referrerWallet && (isValidatingReferrer || !!referrerError))}
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
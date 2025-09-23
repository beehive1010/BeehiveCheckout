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
import { referralService } from '../api/landing/referral.client';

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
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
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
  
  // Get referrer from URL parameters and localStorage
  const [referrerWallet, setReferrerWallet] = useState<string | null>(null);
  const [noReferrerError, setNoReferrerError] = useState(false);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    if (refParam && refParam.startsWith('0x') && refParam.length === 42) {
      // Keep original case as specified - wallet addresses must be case-preserved
      setReferrerWallet(refParam);
      referralService.handleReferralParameter(); // Store to localStorage
      setNoReferrerError(false);
      console.log('🔗 Referrer detected from URL:', refParam);
    } else {
      // Check localStorage for stored referrer
      const storedReferrer = referralService.getReferrerWallet();
      if (storedReferrer && storedReferrer.startsWith('0x') && storedReferrer.length === 42) {
        setReferrerWallet(storedReferrer);
        setNoReferrerError(false);
        console.log('🔗 Referrer loaded from storage:', storedReferrer);
      } else {
        // No valid referrer found - set error state
        setNoReferrerError(true);
        console.log('❌ No valid referrer found');
      }
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
            title: t('registration.errors.alreadyRegistered'),
            description: t('registration.errors.alreadyRegisteredDescription'),
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
      
      // Check for self-referral (compare in lowercase but preserve original case)
      if (referrerWallet.toLowerCase() === walletAddress.toLowerCase()) {
        throw new Error(t('registration.errors.cannotReferSelf'));
      }
      
      try {
        const response = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/auth', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'x-wallet-address': walletAddress
          },
          body: JSON.stringify({
            action: 'validate-referrer',
            referrerWallet: referrerWallet
          })
        });
        
        if (!response.ok) {
          throw new Error(t('registration.errors.failedToValidateReferrer'));
        }
        
        const result = await response.json();
        
        if (!result.success || !result.isValid) {
          throw new Error(result.error || t('registration.errors.referrerNotValid'));
        }
        
        return result;
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
        title: t('registration.errors.walletRequired'),
        description: t('registration.errors.walletRequiredDescription'),
        variant: 'destructive'
      });
      return;
    }

    // Check if referrer is required and valid
    if (!referrerWallet) {
      toast({
        title: t('registration.errors.referrerRequired'),
        description: t('registration.errors.referrerRequiredDescription'),
        variant: 'destructive'
      });
      return;
    }

    // Validate referrer if provided
    if (referrerWallet && referrerError) {
      toast({
        title: t('registration.errors.invalidReferrer'),
        description: referrerError.message || t('registration.errors.invalidReferrerDescription'),
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
        title: t('registration.success'),
        description: t('registration.successDescription'),
        duration: 3000,
      });
      
      // Add a small delay to show the success message
      setTimeout(() => {
        // Redirect with referrer parameter to preserve referrer info on Welcome page
        setLocation(`/welcome?ref=${encodeURIComponent(referrerWallet)}`);
      }, 1500);
    } catch (error: any) {
      toast({
        title: t('registration.errors.registrationFailed'),
        description: error.message || t('registration.errors.registrationFailedDescription'),
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
          {t('registration.validatingReferrer')}
        </div>
      );
    }
    
    if (referrerError) {
      return (
        <div className="flex items-center text-sm text-red-400">
          <AlertCircle className="h-4 w-4 mr-2" />
          {referrerError.message || t('registration.invalidReferrer')}
        </div>
      );
    }
    
    if (referrerValidation) {
      return (
        <div className="flex items-center text-sm text-green-400">
          <Check className="h-4 w-4 mr-2" />
          {t('registration.validReferrer')}: {referrerValidation.referrer?.username || referrerWallet.slice(0, 8) + '...'} ({t('registration.level')} {referrerValidation.referrer?.current_level})
        </div>
      );
    }
    
    return (
      <div className="flex items-center text-sm text-red-400">
        <AlertCircle className="h-4 w-4 mr-2" />
        {t('registration.invalidReferrer')}
      </div>
    );
  };

  // Show error if no referrer is provided
  if (noReferrerError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-secondary border-border border-red-500/50">
          <CardContent className="pt-6 text-center">
            <div className="text-red-400 text-6xl mb-4">🚫</div>
            <h2 className="text-xl font-bold text-red-400 mb-2">{t('registration.referralRequired.title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('registration.referralRequired.description')}
            </p>
            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30 text-sm text-red-400">
              {t('registration.referralLinkExample')} <br/>
              <code className="bg-background/50 px-2 py-1 rounded text-xs">
                /registration?ref=0x123...abc
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading screen while checking if user already exists
  if (isCheckingExistingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-secondary border-border">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-honey border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-honey">{t('registration.checkingStatus')}</p>
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
            {t('registration.title')}
          </CardTitle>
          <p className="text-center text-muted-foreground text-sm">
            {t('registration.connected')}: {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Referrer Status - Always show since referrer is required */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center mb-2">
                <Users className="h-4 w-4 mr-2 text-honey" />
                <span className="text-sm font-medium">{t('registration.referralStatus')}</span>
              </div>
              {getReferrerStatus()}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                {t('registration.usernameLabel')}
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder={t('registration.usernamePlaceholder')}
                className="bg-muted border-border"
                required
                data-testid="input-username"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                {t('registration.emailLabel')}
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder={t('registration.emailPlaceholder')}
                className="bg-muted border-border"
                data-testid="input-email"
              />
            </div>


            {/* Information Box */}
            <div className="p-4 bg-honey/10 rounded-lg border border-honey/30">
              <h4 className="font-semibold text-honey mb-2">{t('registration.nextSteps')}</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t('registration.nextStepsDescription.step1')}</li>
                <li>• {t('registration.nextStepsDescription.step2')}</li>
                <li>• {t('registration.nextStepsDescription.step3')}</li>
                <li>• {t('registration.nextStepsDescription.step4')}</li>
              </ul>
            </div>

            <Button
              type="submit"
              disabled={registerMutation.isPending || !referrerWallet || (!!referrerWallet && (isValidatingReferrer || !!referrerError))}
              className="w-full bg-honey text-secondary hover:bg-honey/90"
              data-testid="button-register"
            >
              {registerMutation.isPending ? t('registration.registeringButton') : 
               !referrerWallet ? t('registration.referralLinkRequired') :
               t('registration.registerButton')}
            </Button>
          </form>
          
          {/* Footer Information */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              {t('registration.footerText')}
              {referrerWallet && <span className="block mt-1">
                {t('registration.referredBy')}: <span className="font-mono text-honey">
                  {referrerWallet.slice(0, 8)}...{referrerWallet.slice(-6)}
                </span>
              </span>}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
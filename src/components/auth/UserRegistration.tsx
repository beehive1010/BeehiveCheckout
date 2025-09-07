import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '../../hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { authService } from '../../lib/supabaseClient';
import { useI18n } from '../../contexts/I18nContext';

interface UserRegistrationProps {
  onRegistrationComplete: (userData: any) => void;
  referrerWallet?: string; // Captured from referral link
}

export default function UserRegistration({ 
  onRegistrationComplete, 
  referrerWallet 
}: UserRegistrationProps) {
  const { walletAddress, isConnected } = useWallet();
  const { toast } = useToast();
  const { t } = useI18n();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if user already exists when wallet connects
  useEffect(() => {
    if (walletAddress && isConnected) {
      checkUserExists();
    }
  }, [walletAddress, isConnected]);

  const checkUserExists = async () => {
    if (!walletAddress) return;
    
    setIsChecking(true);
    try {
      const { exists } = await authService.userExists(walletAddress);
      setUserExists(exists);
      
      if (exists) {
        // Get existing user data
        const { data: userData } = await authService.getUser(walletAddress);
        if (userData) {
          setFormData({
            username: userData.username || '',
            email: userData.email || '',
          });
          onRegistrationComplete(userData);
        }
      }
    } catch (error) {
      console.error('Error checking user existence:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = t('auth.usernameRequired');
    } else if (formData.username.length < 3) {
      newErrors.username = t('auth.usernameTooShort');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('auth.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!walletAddress) {
      toast({
        title: t('auth.walletNotConnected'),
        description: t('auth.pleaseConnectWallet'),
        variant: 'destructive',
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: t('auth.validationError'),
        description: t('auth.pleaseFixErrors'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Register user in users table
      const { data: userData, error } = await authService.registerUser(
        walletAddress,
        formData.username.trim(),
        formData.email.trim(),
        referrerWallet
      );

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: t('auth.registrationSuccess'),
        description: t('auth.accountCreated'),
      });

      // Call parent callback with user data
      onRegistrationComplete(userData);

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: t('auth.registrationFailed'),
        description: error.message || t('auth.unknownError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected || !walletAddress) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('auth.walletRequired')}</h3>
            <p className="text-muted-foreground">{t('auth.pleaseConnectWallet')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isChecking) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>{t('auth.checkingAccount')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (userExists) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('auth.welcomeBack')}</h3>
            <p className="text-muted-foreground mb-4">{t('auth.accountAlreadyExists')}</p>
            <div className="text-sm text-muted-foreground">
              <p>{t('auth.username')}: {formData.username}</p>
              <p>{t('auth.email')}: {formData.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.createAccount')}</CardTitle>
        <div className="text-sm text-muted-foreground">
          <p>{t('auth.wallet')}: {walletAddress}</p>
          {referrerWallet && (
            <p>{t('auth.referredBy')}: {referrerWallet}</p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegistration} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t('auth.username')}</Label>
            <Input
              id="username"
              type="text"
              placeholder={t('auth.enterUsername')}
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled={isLoading}
            />
            {errors.username && (
              <p className="text-sm text-red-500">{errors.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('auth.enterEmail')}
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('auth.creating')}
              </>
            ) : (
              t('auth.createAccount')
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
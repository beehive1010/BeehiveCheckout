
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, User, Users, Crown, Gift, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { supabase } from '@/lib/supabase.ts';
import { useI18n } from '../../contexts/I18nContext';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  referrerWallet?: string;
  onRegistrationComplete: () => void;
}

export default function RegistrationModal({
  isOpen,
  onClose,
  walletAddress,
  referrerWallet,
  onRegistrationComplete
}: RegistrationModalProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [referrerInfo, setReferrerInfo] = useState<any>(null);
  const [validatingReferrer, setValidatingReferrer] = useState(false);

  // 验证推荐人
  useEffect(() => {
    if (isOpen && referrerWallet) {
      validateReferrer();
    }
  }, [isOpen, referrerWallet]);

  // Check if user already exists when modal opens
  useEffect(() => {
    if (isOpen && walletAddress) {
      checkUserExists();
    }
  }, [isOpen, walletAddress]);

  const validateReferrer = async () => {
    if (!referrerWallet) return;
    
    // Handle default referrer for development/testing
    if (referrerWallet === '0x0000000000000000000000000000000000000001') {
      setReferrerInfo({
        username: 'DefaultReferrer',
        wallet_address: referrerWallet,
        current_level: 1,
        direct_referrals_count: 0,
        matrix_members_count: 0
      });
      console.log('🔧 Using default referrer for development');
      return;
    }
    
    setValidatingReferrer(true);
    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({
          action: 'validate-referrer',
          referrerWallet: referrerWallet
        })
      });

      const result = await response.json();
      
      if (result.success && result.isValid) {
        setReferrerInfo(result.referrer);
      } else {
        throw new Error(result.error || t('registration.invalidReferrer'));
      }
    } catch (error: any) {
      console.error(t('registration.referrerValidationFailed'), error);
      toast({
        title: t('registration.referrerValidationFailed'),
        description: error.message || t('registration.referrerNotActiveMember'),
        variant: 'destructive',
      });
    } finally {
      setValidatingReferrer(false);
    }
  };

  const checkUserExists = async () => {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({
          action: 'get-user'
        })
      });

      const result = await response.json();
      
      if (result.success && result.isRegistered) {
        onClose();
        onRegistrationComplete();
        return;
      }
    } catch (error) {
      console.error(t('registration.checkUserError'), error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = t('registration.usernameRequired');
    } else if (formData.username.length < 3) {
      newErrors.username = t('registration.usernameMinLength');
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = t('registration.usernameFormat');
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('registration.emailInvalid');
    }

    if (!referrerWallet) {
      newErrors.referrer = t('registration.referrerRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Use direct database RPC function instead of Edge Function
      const { data: result, error: rpcError } = await supabase.rpc('register_user_simple', {
        p_wallet_address: walletAddress,
        p_username: formData.username.trim(),
        p_email: formData.email.trim() || null,
        p_referrer_wallet: referrerWallet
      });

      if (rpcError || !result?.success) {
        throw new Error(result?.error || rpcError?.message || t('registration.failed'));
      }

      toast({
        title: result.user_existed ? t('registration.welcomeBack') : t('registration.success'),
        description: result.message || 'Registration completed successfully',
        duration: 4000,
      });

      if (result.member_created) {
        toast({
          title: t('registration.memberCreated') || 'Member Record Created',
          description: t('registration.memberCreatedMessage') || 'Your member profile has been set up',
          duration: 4000,
        });
      }

      setFormData({ username: '', email: '' });
      onClose();
      onRegistrationComplete();

    } catch (error: any) {
      console.error(t('registration.registrationError'), error);
      
      toast({
        title: t('registration.failed'),
        description: error.message || t('registration.registrationErrorOccurred'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" aria-describedby="registration-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-honey">
            <User className="h-5 w-5" />
            {t('registration.title')}
          </DialogTitle>
        </DialogHeader>
        
        {/* Hidden description for accessibility */}
        <p id="registration-description" className="sr-only">
          {t('registration.description') || 'Complete your registration to join the BEEHIVE community'}
        </p>

        <div className="space-y-6">
          {/* Wallet Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('registration.walletAddress')}</span>
                  <Badge variant="outline" className="bg-honey/10 text-honey border-honey/30">
                    {formatAddress(walletAddress)}
                  </Badge>
                </div>
                
                {referrerWallet && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t('registration.referredBy')}</span>
                      {validatingReferrer ? (
                        <Badge variant="outline" className="bg-gray-100">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          {t('registration.validating')}
                        </Badge>
                      ) : referrerInfo ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          <Users className="w-3 h-3 mr-1" />
                          {referrerInfo.username} (Level {referrerInfo.current_level})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {t('registration.validationFailed')}
                        </Badge>
                      )}
                    </div>
                    
                    {referrerInfo && (
                      <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded">
                        ✅ {t('registration.referrerValidated')}: {referrerInfo.direct_referrals_count}{t('registration.directReferrals')}, {referrerInfo.matrix_members_count}{t('registration.teamMembers')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('registration.username')} *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder={t('registration.usernamePlaceholder')}
                disabled={isLoading}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('registration.email')} ({t('registration.optional')})</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder={t('registration.emailPlaceholder')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {errors.referrer && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors.referrer}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-honey hover:bg-honey/90"
              disabled={isLoading || validatingReferrer || !referrerInfo}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('registration.registering')}
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  {t('registration.register')}
                </>
              )}
            </Button>
          </form>

          {/* Info Box */}
          <div className="p-4 bg-honey/10 rounded-lg border border-honey/20">
            <div className="flex items-start gap-3">
              <Gift className="h-5 w-5 text-honey mt-0.5" />
              <div>
                <p className="text-sm font-medium text-honey">
                  {t('registration.nextSteps')}
                </p>
                <ul className="text-xs text-honey/80 mt-1 space-y-1">
                  <li>• {t('registration.nextStep1')}</li>
                  <li>• {t('registration.nextStep2')}</li>
                  <li>• {t('registration.nextStep3')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Matrix System Info */}
          {referrerInfo && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    {t('registration.matrixAdvantages')}
                  </p>
                  <ul className="text-xs text-blue-600/80 mt-1 space-y-1">
                    <li>• {t('registration.matrixFeature1')}</li>
                    <li>• {t('registration.matrixFeature2')}</li>
                    <li>• {t('registration.matrixFeature3')}</li>
                    <li>• {t('registration.matrixFeature4')}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, User, Mail, Users, Crown, Gift } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { authService } from '../../lib/supabaseClient';
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

  // Check if user already exists when modal opens
  useEffect(() => {
    if (isOpen && walletAddress) {
      checkUserExists();
    }
  }, [isOpen, walletAddress]);

  const checkUserExists = async () => {
    try {
      const { exists } = await authService.userExists(walletAddress);
      if (exists) {
        // User already exists, close modal and notify parent
        onClose();
        onRegistrationComplete();
        return;
      }
    } catch (error) {
      console.error('Error checking user existence:', error);
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
      // Register user with Supabase
      const { data, error } = await authService.registerUser(
        walletAddress,
        formData.username.trim(),
        formData.email.trim() || undefined,
        referrerWallet
      );

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: t('registration.success'),
        description: t('registration.welcomeMessage'),
      });

      // Clear form and close modal
      setFormData({ username: '', email: '' });
      onClose();
      onRegistrationComplete();

    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = t('registration.unknownError');
      
      if (error.message.includes('username')) {
        errorMessage = t('registration.usernameExists');
      } else if (error.message.includes('email')) {
        errorMessage = t('registration.emailExists');
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: t('registration.failed'),
        description: errorMessage,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-honey">
            <User className="h-5 w-5" />
            {t('registration.title')}
          </DialogTitle>
        </DialogHeader>

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
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('registration.referredBy')}</span>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                      <Users className="w-3 h-3 mr-1" />
                      {formatAddress(referrerWallet)}
                    </Badge>
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

            <Button
              type="submit"
              className="w-full bg-honey hover:bg-honey/90"
              disabled={isLoading}
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
                <p className="text-xs text-honey/80 mt-1">
                  {t('registration.activationInfo')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
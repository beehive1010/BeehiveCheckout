import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';
import HexagonIcon from '../components/UI/HexagonIcon';
import bcrypt from 'bcryptjs';

export default function Registration() {
  const { walletAddress, register, isRegistering } = useWallet();
  const { t, language } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    secondaryPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Referral link is now optional
    const referrerWallet = localStorage.getItem('beehive-referrer');

    if (!formData.email) {
      newErrors.email = t('registration.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('registration.errors.emailInvalid');
    }

    if (!formData.username) {
      newErrors.username = t('registration.errors.usernameRequired');
    } else if (formData.username.length < 3) {
      newErrors.username = t('registration.errors.usernameTooShort');
    }

    if (!formData.secondaryPassword) {
      newErrors.secondaryPassword = t('registration.errors.passwordRequired');
    } else if (formData.secondaryPassword.length < 6) {
      newErrors.secondaryPassword = t('registration.errors.passwordTooShort');
    }

    if (formData.secondaryPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = t('registration.errors.passwordMismatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      // Get referrer from localStorage if exists
      const referrerWallet = localStorage.getItem('beehive-referrer');
      
      // Hash the secondary password
      const hashedPassword = await bcrypt.hash(formData.secondaryPassword, 10);

      register({
        email: formData.email,
        username: formData.username,
        secondaryPasswordHash: hashedPassword,
        referrerWallet: referrerWallet || undefined,
        preferredLanguage: language,
      }, {
        onSuccess: () => {
          toast({
            title: t('registration.success.title'),
            description: t('registration.success.description'),
          });
          setLocation('/dashboard');
        },
        onError: (error: any) => {
          toast({
            title: t('registration.error.title'),
            description: error.message || t('registration.error.description'),
            variant: 'destructive',
          });
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: t('registration.error.title'),
        description: t('registration.error.description'),
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (!walletAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <HexagonIcon className="mx-auto mb-4">
                <i className="fas fa-wallet text-honey"></i>
              </HexagonIcon>
              <h2 className="text-xl font-bold text-honey mb-4">
                {t('registration.walletRequired.title')}
              </h2>
              <p className="text-muted-foreground">
                {t('registration.walletRequired.description')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <HexagonIcon className="mx-auto mb-4">
            <i className="fas fa-user-plus text-honey"></i>
          </HexagonIcon>
          <CardTitle className="text-2xl font-bold text-honey">
            {t('registration.title')}
          </CardTitle>
          <p className="text-muted-foreground">
            {t('registration.subtitle')}
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Wallet Address Display */}
            <div>
              <Label className="text-honey">{String(t('registration.walletAddress'))}</Label>
              <div className="mt-1 p-3 bg-muted rounded-lg text-muted-foreground relative group">
                {/* Mobile: Truncated display */}
                <div className="block md:hidden">
                  <div className="text-xs font-mono break-all">
                    <span className="text-honey">{walletAddress?.slice(0, 6)}</span>
                    <span className="text-muted-foreground/60">...</span>
                    <span className="text-honey">{walletAddress?.slice(-4)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground/60 mt-1">
                    Tap to copy full address
                  </div>
                </div>
                
                {/* Desktop: Full display */}
                <div className="hidden md:block text-sm font-mono break-all">
                  {walletAddress}
                </div>
                
                {/* Copy button (invisible but covers the area) */}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(walletAddress || '');
                    toast({
                      title: 'Copied!',
                      description: 'Wallet address copied to clipboard',
                    });
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  data-testid="button-copy-wallet"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-honey">
                {t('registration.email')} *
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="input-honey"
                placeholder={t('registration.emailPlaceholder')}
                data-testid="input-email"
              />
              {errors.email && (
                <p className="text-destructive text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Username */}
            <div>
              <Label htmlFor="username" className="text-honey">
                {t('registration.username')} *
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                className="input-honey"
                placeholder={t('registration.usernamePlaceholder')}
                data-testid="input-username"
              />
              {errors.username && (
                <p className="text-destructive text-sm mt-1">{errors.username}</p>
              )}
            </div>

            {/* Secondary Password */}
            <div>
              <Label htmlFor="secondaryPassword" className="text-honey">
                {t('registration.secondaryPassword')} *
              </Label>
              <Input
                id="secondaryPassword"
                name="secondaryPassword"
                type="password"
                value={formData.secondaryPassword}
                onChange={handleInputChange}
                className="input-honey"
                placeholder={t('registration.passwordPlaceholder')}
                data-testid="input-password"
              />
              {errors.secondaryPassword && (
                <p className="text-destructive text-sm mt-1">{errors.secondaryPassword}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPassword" className="text-honey">
                {t('registration.confirmPassword')} *
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="input-honey"
                placeholder={t('registration.confirmPasswordPlaceholder')}
                data-testid="input-confirm-password"
              />
              {errors.confirmPassword && (
                <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Referrer Info - Now Mandatory */}
            <div className="p-3 border rounded-lg">
              <Label className="text-honey font-medium">
                {t('registration.referrer')} <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              {localStorage.getItem('beehive-referrer') ? (
                <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center text-green-600 mb-2">
                    <i className="fas fa-check-circle mr-2"></i>
                    <span className="text-sm font-medium">Upline Detected</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Upline Wallet Address:</p>
                    <p className="text-sm font-mono break-all text-honey">
                      {localStorage.getItem('beehive-referrer')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-3 bg-muted/50 border border-muted rounded-lg">
                  <div className="flex items-center text-muted-foreground mb-2">
                    <i className="fas fa-info-circle mr-2"></i>
                    <span className="text-sm font-medium">No Referral Link</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You can register without a referral link. Use a referral link to connect to the matrix system.
                  </p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full btn-honey"
              disabled={isRegistering}
              data-testid="button-register"
            >
              {isRegistering ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  {t('registration.registering')}
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus mr-2"></i>
                  {t('registration.register')}
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>{t('registration.agreement')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

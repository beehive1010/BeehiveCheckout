import { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useToast } from '../hooks/use-toast';
import HexagonIcon from '../components/UI/HexagonIcon';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import bcrypt from 'bcryptjs';

interface RegistrationStatus {
  registered: boolean;
  activated: boolean;
  registrationRequired: boolean;
  uplineWallet?: string;
  isCompanyDirectReferral?: boolean;
  referralCode?: string;
  registrationExpiresAt?: string;
  registrationTimeoutHours?: number;
  needsReferralForm?: boolean;
  message?: string;
}

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
    referralCode: '', // For manual entry when no ref link
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [showReferralForm, setShowReferralForm] = useState(false);

  // Check wallet registration status on component mount
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (!walletAddress) return;
      
      try {
        // Get URL params for referral detection
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get('ref'); // 推荐人钱包地址
        const code = urlParams.get('code'); // 推荐代码
        const referrer = urlParams.get('referrer'); // 备用推荐人字段
        
        // 优先从localStorage获取推荐人信息（由RouteGuard保存）
        const savedReferrer = localStorage.getItem('beehive-referrer');
        
        // 如果localStorage有推荐人信息，使用它
        if (savedReferrer && savedReferrer.startsWith('0x')) {
          setFormData(prev => ({ ...prev, referralCode: savedReferrer }));
        }
        // 否则检查URL参数
        else if (ref && ref.startsWith('0x')) {
          setFormData(prev => ({ ...prev, referralCode: ref }));
        } else if (referrer && referrer.startsWith('0x')) {
          setFormData(prev => ({ ...prev, referralCode: referrer }));
        }
        
        // 构建查询参数，优先使用localStorage中的推荐人
        const queryParams: Record<string, string> = {};
        if (savedReferrer) {
          queryParams.ref = savedReferrer;
        } else if (ref) {
          queryParams.ref = ref;
        }
        if (code) queryParams.code = code;
        if (referrer && !savedReferrer && !ref) queryParams.referrer = referrer;

        const response = await fetch(`/api/wallet/registration-status?${new URLSearchParams(queryParams)}`, {
          headers: {
            'X-Wallet-Address': walletAddress
          }
        });
        
        if (response.ok) {
          const status = await response.json();
          setRegistrationStatus(status);
          
          if (status.needsReferralForm) {
            setShowReferralForm(true);
          }
          
          // If already registered, redirect
          if (status.registered && status.activated) {
            setLocation('/');
            return;
          }
          
          // Registration expiration will be shown on dashboard
        }
      } catch (error) {
        console.error('Failed to check registration status:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };
    
    checkRegistrationStatus();
  }, [walletAddress, setLocation]);
  

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

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
    
    // Validate referral code format if provided
    if (formData.referralCode && formData.referralCode !== '001122' && !formData.referralCode.startsWith('0x')) {
      newErrors.referralCode = 'Please enter a valid wallet address starting with 0x';
    }
    
    // Prevent self-referral
    if (formData.referralCode && formData.referralCode.toLowerCase() === walletAddress?.toLowerCase()) {
      newErrors.referralCode = 'You cannot refer yourself';
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
      // Determine referrer wallet - 优先使用localStorage中保存的推荐人
      const savedReferrer = localStorage.getItem('beehive-referrer');
      let referrerWallet = savedReferrer || registrationStatus?.uplineWallet;
      
      // Handle manual referral code entry
      if (formData.referralCode) {
        if (formData.referralCode === '001122') {
          // Company direct referral - 滑落到最高级账户
          referrerWallet = '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0';
        } else if (formData.referralCode.startsWith('0x')) {
          // 直接使用推荐人钱包地址
          referrerWallet = formData.referralCode.toLowerCase();
        } else {
          // 其他情况转为钱包地址格式
          referrerWallet = formData.referralCode;
        }
      }
      
      // 如果没有推荐人，默认使用公司账户
      if (!referrerWallet) {
        referrerWallet = '0x380Fd6A57Fc2DF6F10B8920002e4acc7d57d61c0';
      }
      
      // Hash the secondary password
      const hashedPassword = await bcrypt.hash(formData.secondaryPassword, 10);

      register({
        email: formData.email,
        username: formData.username,
        secondaryPasswordHash: hashedPassword,
        referrerWallet,
        preferredLanguage: language,
        isCompanyDirectReferral: registrationStatus?.isCompanyDirectReferral || formData.referralCode === '001122',
        referralCode: registrationStatus?.referralCode || formData.referralCode
      }, {
        onSuccess: () => {
          toast({
            title: 'Registration Successful!',
            description: `Welcome to BeeHive! You have ${registrationStatus?.registrationTimeoutHours || 48} hours to upgrade to Level 1 membership.`,
          });
          setLocation('/welcome');
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

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Validate referral code in real-time
    if (name === 'referralCode' && value && value !== '001122' && value.startsWith('0x')) {
      try {
        const response = await fetch(`/api/auth/check-user-exists/${value}`, {
          headers: { 'X-Wallet-Address': walletAddress || '' }
        });
        
        if (!response.ok) {
          setErrors(prev => ({ ...prev, referralCode: 'This wallet address is not registered yet' }));
        }
      } catch (error) {
        console.error('Failed to validate referrer:', error);
      }
    }
  };

  // Show loading state while checking registration status
  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="bg-secondary border-border p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking wallet status...</p>
        </Card>
      </div>
    );
  }
  
  // Show registration status if already registered
  if (registrationStatus?.registered) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Card className="bg-secondary border-border">
            <CardHeader>
              <CardTitle className="text-honey flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Wallet Already Registered
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {registrationStatus.activated ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your account is fully activated! You can proceed to the dashboard.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your account is registered but not yet activated. You need to upgrade to Level 1 membership.
                    </AlertDescription>
                  </Alert>
                </>  
              )}
              
              <Button 
                onClick={() => setLocation(registrationStatus.activated ? '/' : '/membership')}
                className="w-full bg-honey text-black hover:bg-honey/90"
              >
                {registrationStatus.activated ? 'Go to Dashboard' : 'Upgrade to Level 1'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
      <div className="w-full max-w-md space-y-4">
        {/* Registration Status Card */}
        {registrationStatus && (
          <Card className="bg-secondary border-border">
            <CardContent className="p-4">
              {registrationStatus.uplineWallet ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Valid Referral Detected</span>
                  </div>
                  {registrationStatus.isCompanyDirectReferral ? (
                    <Badge className="bg-honey text-black">Company Direct Referral</Badge>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Upline: {registrationStatus.uplineWallet.slice(0, 6)}...{registrationStatus.uplineWallet.slice(-4)}
                    </p>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {registrationStatus.message || 'No valid referral link detected'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
        
        <Card className="w-full">
          <CardHeader className="text-center">
            <img 
              src="/image/BCC.png" 
              alt="BCC Logo" 
              className="w-16 h-16 object-contain mx-auto mb-4"
            />
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
                    {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                  </div>
                  {/* Desktop: Full address */}
                  <div className="hidden md:block">
                    {walletAddress}
                  </div>
                </div>
              </div>

              {/* Email Field */}
              <div>
                <Label htmlFor="email" className="text-honey">
                  {String(t('registration.email'))}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`mt-1 bg-muted border-muted-foreground/20 ${errors.email ? 'border-destructive' : ''}`}
                  placeholder="Enter your email address"
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email}</p>
                )}
              </div>

              {/* Username Field */}
              <div>
                <Label htmlFor="username" className="text-honey">
                  {String(t('registration.username'))}
                </Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`mt-1 bg-muted border-muted-foreground/20 ${errors.username ? 'border-destructive' : ''}`}
                  placeholder="Choose a username"
                />
                {errors.username && (
                  <p className="text-sm text-destructive mt-1">{errors.username}</p>
                )}
              </div>

              {/* Referral Code Field (always show for manual entry) */}
              {!registrationStatus?.uplineWallet && (
                <div>
                  <Label htmlFor="referralCode" className="text-honey">
                    Referrer Wallet Address (Optional)
                  </Label>
                  <Input
                    id="referralCode"
                    name="referralCode"
                    value={formData.referralCode}
                    onChange={handleInputChange}
                    className={`mt-1 bg-muted border-muted-foreground/20 ${errors.referralCode ? 'border-destructive' : ''}`}
                    placeholder="Enter referrer's wallet address (0x...)"
                  />
                  {errors.referralCode && (
                    <p className="text-sm text-destructive mt-1">{errors.referralCode}</p>
                  )}
                </div>
              )}

              {/* Password Field */}
              <div>
                <Label htmlFor="secondaryPassword" className="text-honey">
                  {String(t('registration.password'))}
                </Label>
                <Input
                  id="secondaryPassword"
                  name="secondaryPassword"
                  type="password"
                  value={formData.secondaryPassword}
                  onChange={handleInputChange}
                  className={`mt-1 bg-muted border-muted-foreground/20 ${errors.secondaryPassword ? 'border-destructive' : ''}`}
                  placeholder="Create a password"
                />
                {errors.secondaryPassword && (
                  <p className="text-sm text-destructive mt-1">{errors.secondaryPassword}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <Label htmlFor="confirmPassword" className="text-honey">
                  {String(t('registration.confirmPassword'))}
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`mt-1 bg-muted border-muted-foreground/20 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isRegistering}
                className="w-full bg-honey text-black hover:bg-honey/90 disabled:opacity-50"
                data-testid="button-register"
              >
                {isRegistering ? 'Registering...' : String(t('registration.register'))}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import HexagonIcon from '../components/UI/HexagonIcon';

export default function Me() {
  const { userData, walletAddress, currentLevel, bccBalance } = useWallet();
  const { t, language, setLanguage, languages } = useI18n();
  const [notifications, setNotifications] = useState(true);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString(language === 'en' ? 'en-US' : language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const mockProgressData = {
    completedCourses: 5,
    totalCourses: 12,
    studyHours: 28,
    certificates: 3,
    directReferrals: 3,
    totalTeam: 12,
    totalEarnings: 1100,
    monthlyEarnings: 350
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-honey mb-6">
        {t('me.title')}
      </h2>
      
      {/* Profile Card */}
      <Card className="bg-secondary border-border mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
            <HexagonIcon size="xl">
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=96&h=96" 
                alt="Profile Avatar" 
                className="w-20 h-20 rounded-full" 
              />
            </HexagonIcon>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold text-honey mb-2">
                {userData?.user?.username || 'Member'}
              </h3>
              <p className="text-muted-foreground text-sm mb-2">
                {userData?.user?.email || 'member@beehive.app'}
              </p>
              <p className="text-muted-foreground text-sm font-mono mb-4">
                {walletAddress ? formatAddress(walletAddress) : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-honey text-black font-semibold">
                  Level {currentLevel} Member
                </Badge>
                <Badge variant="secondary" className="bg-green-600 text-white">
                  {t('me.status.active')}
                </Badge>
                <Badge variant="secondary" className="bg-blue-600 text-white">
                  {t('me.status.memberSince')} {userData?.user?.createdAt ? formatDate(userData.user.createdAt) : 'Oct 2024'}
                </Badge>
              </div>
            </div>
            
            <Button 
              className="btn-honey"
              data-testid="button-edit-profile"
            >
              <i className="fas fa-edit mr-2"></i>
              {t('me.editProfile')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-dollar-sign text-green-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">245.50</div>
            <div className="text-muted-foreground text-sm">{t('me.balances.usdt')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-coins text-honey text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{bccBalance?.transferable || 0}</div>
            <div className="text-muted-foreground text-sm">{t('me.balances.bccTransferable')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-lock text-yellow-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{bccBalance?.restricted || 0}</div>
            <div className="text-muted-foreground text-sm">{t('me.balances.bccRestricted')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-gem text-purple-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">42</div>
            <div className="text-muted-foreground text-sm">{t('me.balances.cth')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Stats & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Learning Progress */}
        <Card className="bg-secondary border-border">
          <CardHeader>
            <CardTitle className="text-honey">{t('me.learning.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{t('me.learning.coursesCompleted')}</span>
                <span className="text-honey">{mockProgressData.completedCourses} / {mockProgressData.totalCourses}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(mockProgressData.completedCourses / mockProgressData.totalCourses) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{t('me.learning.studyHours')}</span>
                <span className="text-honey">{mockProgressData.studyHours} hours</span>
              </div>
              <div className="progress-bar">
                <div className="bg-blue-400 h-2 rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{t('me.learning.certificates')}</span>
                <span className="text-honey">{mockProgressData.certificates}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Performance */}
        <Card className="bg-secondary border-border">
          <CardHeader>
            <CardTitle className="text-honey">{t('me.referral.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('me.referral.directReferrals')}</span>
              <span className="text-honey font-semibold">{mockProgressData.directReferrals}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('me.referral.totalTeamSize')}</span>
              <span className="text-honey font-semibold">{mockProgressData.totalTeam}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('me.referral.totalEarnings')}</span>
              <span className="text-green-400 font-semibold">{mockProgressData.totalEarnings} USDT</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('me.referral.thisMonth')}</span>
              <span className="text-honey font-semibold">{mockProgressData.monthlyEarnings} USDT</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">{t('me.settings.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language Setting */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="text-honey font-medium">{t('me.settings.language')}</p>
              <p className="text-muted-foreground text-sm">{t('me.settings.languageDescription')}</p>
            </div>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-40 select-honey" data-testid="select-profile-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-secondary border-border">
                {languages.map((lang) => (
                  <SelectItem 
                    key={lang.code} 
                    value={lang.code}
                    className="text-honey hover:bg-muted"
                  >
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Email Notifications */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="text-honey font-medium">{t('me.settings.notifications')}</p>
              <p className="text-muted-foreground text-sm">{t('me.settings.notificationsDescription')}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                checked={notifications} 
                onCheckedChange={setNotifications}
                data-testid="switch-notifications"
              />
              <Label htmlFor="notifications" className="text-honey">
                {notifications ? t('me.settings.enabled') : t('me.settings.disabled')}
              </Label>
            </div>
          </div>
          
          {/* Two-Factor Authentication */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="text-honey font-medium">{t('me.settings.twoFactor')}</p>
              <p className="text-muted-foreground text-sm">{t('me.settings.twoFactorDescription')}</p>
            </div>
            <Button 
              className="btn-honey"
              data-testid="button-enable-2fa"
            >
              {t('me.settings.enable2FA')}
            </Button>
          </div>
          
          {/* Action Buttons */}
          <div className="border-t border-border pt-6">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <Button 
                className="btn-honey"
                data-testid="button-change-password"
              >
                {t('me.settings.changePassword')}
              </Button>
              <Button 
                variant="destructive"
                data-testid="button-deactivate-account"
              >
                {t('me.settings.deactivateAccount')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

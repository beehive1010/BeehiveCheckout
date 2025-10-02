import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function Settings() {
  const { userData, walletAddress } = useWallet();
  const { t, language, setLanguage, languages } = useI18n();
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Account Settings */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Wallet Address */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="text-honey font-medium">Wallet Address</p>
              <p className="text-muted-foreground text-sm">Your primary wallet address</p>
            </div>
            <div className="flex items-center space-x-2">
              <Input 
                value={walletAddress ? formatAddress(walletAddress) : ''} 
                readOnly 
                className="w-32 font-mono text-sm"
                data-testid="input-wallet-address"
              />
              <Button size="sm" variant="outline" data-testid="button-copy-address">
                <i className="fas fa-copy"></i>
              </Button>
            </div>
          </div>

          {/* Username */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="text-honey font-medium">Username</p>
              <p className="text-muted-foreground text-sm">Your display name in the platform</p>
            </div>
            <div className="flex items-center space-x-2">
              <Input 
                defaultValue={userData?.user?.username || 'Member'} 
                className="w-40"
                data-testid="input-username"
              />
              <Button size="sm" className="btn-honey" data-testid="button-save-username">
                Save
              </Button>
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="text-honey font-medium">Email Address</p>
              <p className="text-muted-foreground text-sm">For notifications and updates</p>
            </div>
            <div className="flex items-center space-x-2">
              <Input 
                defaultValue={userData?.user?.email || 'member@beehive.app'} 
                className="w-48"
                data-testid="input-email"
              />
              <Button size="sm" className="btn-honey" data-testid="button-save-email">
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">Preferences</CardTitle>
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

          {/* Theme Setting */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="text-honey font-medium">Theme</p>
              <p className="text-muted-foreground text-sm">Choose your preferred theme</p>
            </div>
            <Select defaultValue="dark">
              <SelectTrigger className="w-32 select-honey" data-testid="select-theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-secondary border-border">
                <SelectItem value="dark" className="text-honey hover:bg-muted">Dark</SelectItem>
                <SelectItem value="light" className="text-honey hover:bg-muted">Light</SelectItem>
                <SelectItem value="auto" className="text-honey hover:bg-muted">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Push Notifications */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="text-honey font-medium">Push Notifications</p>
              <p className="text-muted-foreground text-sm">Receive notifications in browser</p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                checked={notifications} 
                onCheckedChange={setNotifications}
                data-testid="switch-push-notifications"
              />
              <Label htmlFor="notifications" className="text-honey">
                {notifications ? t('me.settings.enabled') : t('me.settings.disabled')}
              </Label>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="text-honey font-medium">{t('me.settings.notifications')}</p>
              <p className="text-muted-foreground text-sm">{t('me.settings.notificationsDescription')}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                checked={emailNotifications} 
                onCheckedChange={setEmailNotifications}
                data-testid="switch-email-notifications"
              />
              <Label htmlFor="email-notifications" className="text-honey">
                {emailNotifications ? t('me.settings.enabled') : t('me.settings.disabled')}
              </Label>
            </div>
          </div>

          {/* Referral Notifications */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="text-honey font-medium">Referral Notifications</p>
              <p className="text-muted-foreground text-sm">Get notified about new referrals and earnings</p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                defaultChecked={true}
                data-testid="switch-referral-notifications"
              />
              <Label htmlFor="referral-notifications" className="text-honey">
                Enabled
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Two-Factor Authentication */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="text-honey font-medium">{t('me.settings.twoFactor')}</p>
              <p className="text-muted-foreground text-sm">{t('me.settings.twoFactorDescription')}</p>
            </div>
            <Button 
              className={twoFactorEnabled ? "bg-green-600 hover:bg-green-700" : "btn-honey"}
              data-testid="button-enable-2fa"
              onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
            >
              <i className={`fas ${twoFactorEnabled ? 'fa-check' : 'fa-shield-alt'} mr-2`}></i>
              {twoFactorEnabled ? '2FA Enabled' : t('me.settings.enable2FA')}
            </Button>
          </div>

          {/* Change Password */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="text-honey font-medium">Secondary Password</p>
              <p className="text-muted-foreground text-sm">Additional security for sensitive operations</p>
            </div>
            <Button 
              className="btn-honey"
              data-testid="button-change-password"
            >
              <i className="fas fa-key mr-2"></i>
              {t('me.settings.changePassword')}
            </Button>
          </div>

          {/* Session Management */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="text-honey font-medium">Active Sessions</p>
              <p className="text-muted-foreground text-sm">Manage your active login sessions</p>
            </div>
            <Button 
              variant="outline"
              data-testid="button-manage-sessions"
            >
              <i className="fas fa-desktop mr-2"></i>
              Manage Sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-secondary border-border border-red-500/50">
        <CardHeader>
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <p className="text-red-400 font-medium">Deactivate Account</p>
              <p className="text-muted-foreground text-sm">Temporarily disable your account</p>
            </div>
            <Button 
              variant="destructive"
              data-testid="button-deactivate-account"
            >
              <i className="fas fa-pause mr-2"></i>
              {t('me.settings.deactivateAccount')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
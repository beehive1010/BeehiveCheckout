import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { ArrowLeft, Save, User, Bell, Eye, Shield } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '../hooks/use-toast';
import { FileUpload } from '../components/shared/FileUpload';

export default function ProfileSettings() {
  const { userData, walletAddress, currentLevel } = useWallet();
  const { t, language, setLanguage, languages } = useI18n();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Profile settings state
  const [username, setUsername] = useState(userData?.username || '');
  const [email, setEmail] = useState(userData?.email || '');
  const [bio, setBio] = useState(userData?.bio || '');
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [rewardNotifications, setRewardNotifications] = useState(true);
  const [referralNotifications, setReferralNotifications] = useState(true);
  
  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [showEarnings, setShowEarnings] = useState(false);
  const [showReferrals, setShowReferrals] = useState(true);

  const handleSaveProfile = async () => {
    try {
      const response = await fetch('https://cvqibjcbfrwsgkvthccp.supabase.co/functions/v1/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress!
        },
        body: JSON.stringify({
          action: 'update-profile',
          username,
          email,
          bio,
          settings: {
            notifications: {
              email: emailNotifications,
              push: pushNotifications,
              rewards: rewardNotifications,
              referrals: referralNotifications
            },
            privacy: {
              profileVisibility,
              showEarnings,
              showReferrals
            }
          }
        })
      });

      if (response.ok) {
        toast({
          title: t('profileSettings.profileUpdated'),
          description: t('profileSettings.profileUpdatedDesc')
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      toast({
        title: t('profileSettings.updateFailed'),
        description: t('profileSettings.updateFailedDesc'),
        variant: "destructive"
      });
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          onClick={() => setLocation('/me')}
          variant="outline"
          size="sm"
          className="border-honey text-honey hover:bg-honey hover:text-secondary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.backToProfile')}
        </Button>
        <h1 className="text-2xl font-bold text-honey">{t('profileSettings.title')}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Profile */}
          <Card className="bg-secondary border-border">
            <CardHeader>
              <CardTitle className="text-honey flex items-center gap-2">
                <User className="w-5 h-5" />
                {t('profileSettings.profileInformation')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Image Upload */}
              <div className="space-y-2">
                <Label>{t('profileSettings.profileImage')}</Label>
                <FileUpload
                  uploadType="profile-image"
                  maxSizeMB={5}
                  showPreview={true}
                  onUploadComplete={(data) => {
                    toast({
                      title: t('profileSettings.profileImageUpdated'),
                      description: t('profileSettings.profileImageUpdatedDesc')
                    });
                  }}
                  onUploadError={(error) => {
                    toast({
                      title: t('profileSettings.uploadFailed'),
                      description: error,
                      variant: "destructive"
                    });
                  }}
                  className="max-w-md"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">{t('profileSettings.username')}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('profileSettings.enterUsername')}
                  className="bg-background border-border"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">{t('profileSettings.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('profileSettings.enterEmail')}
                  className="bg-background border-border"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">{t('profileSettings.bio')}</Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('profileSettings.bioPlaceholder')}
                  className="w-full min-h-[100px] px-3 py-2 bg-background border border-border rounded-md resize-none text-sm"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {bio.length}/500
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">{t('profileSettings.language')}</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="bg-secondary border-border">
            <CardHeader>
              <CardTitle className="text-honey flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {t('profileSettings.notificationSettings')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('profileSettings.emailNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('profileSettings.emailNotificationsDesc')}
                  </p>
                </div>
                <Switch 
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('profileSettings.pushNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('profileSettings.pushNotificationsDesc')}
                  </p>
                </div>
                <Switch 
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('profileSettings.rewardNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('profileSettings.rewardNotificationsDesc')}
                  </p>
                </div>
                <Switch 
                  checked={rewardNotifications}
                  onCheckedChange={setRewardNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('profileSettings.referralNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('profileSettings.referralNotificationsDesc')}
                  </p>
                </div>
                <Switch 
                  checked={referralNotifications}
                  onCheckedChange={setReferralNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card className="bg-secondary border-border">
            <CardHeader>
              <CardTitle className="text-honey flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {t('profileSettings.privacySettings')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>{t('profileSettings.profileVisibility')}</Label>
                <Select value={profileVisibility} onValueChange={setProfileVisibility}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">{t('profileSettings.public')}</SelectItem>
                    <SelectItem value="team">{t('profileSettings.teamMembersOnly')}</SelectItem>
                    <SelectItem value="private">{t('profileSettings.private')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {t('profileSettings.profileVisibilityDesc')}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('profileSettings.showEarnings')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('profileSettings.showEarningsDesc')}
                  </p>
                </div>
                <Switch 
                  checked={showEarnings}
                  onCheckedChange={setShowEarnings}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('profileSettings.showReferralCount')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('profileSettings.showReferralCountDesc')}
                  </p>
                </div>
                <Switch 
                  checked={showReferrals}
                  onCheckedChange={setShowReferrals}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Account Summary */}
        <div className="space-y-6">
          <Card className="bg-secondary border-border">
            <CardHeader>
              <CardTitle className="text-honey">{t('profileSettings.accountSummary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-honey/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-8 h-8 text-honey" />
                </div>
                <h3 className="font-semibold text-honey">
                  {username || formatAddress(walletAddress || '')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('profileSettings.levelMember', { level: currentLevel })}
                </p>
              </div>
              
              <div className="pt-4 border-t border-border/50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('profileSettings.wallet')}:</span>
                    <span className="font-mono">{formatAddress(walletAddress || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('profileSettings.memberSince')}:</span>
                    <span>{t('profileSettings.recentlyJoined')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleSaveProfile}
              className="bg-honey text-secondary hover:bg-honey/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {t('profileSettings.saveChanges')}
            </Button>
            
            <Button
              onClick={() => setLocation('/me')}
              variant="outline"
              className="border-border text-muted-foreground hover:bg-secondary"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
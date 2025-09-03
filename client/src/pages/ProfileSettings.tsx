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
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress!
        },
        body: JSON.stringify({
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
          title: "Profile Updated",
          description: "Your profile settings have been saved successfully."
        });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "There was an error updating your profile. Please try again.",
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
          Back to Profile
        </Button>
        <h1 className="text-2xl font-bold text-honey">Profile Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Profile */}
          <Card className="bg-secondary border-border">
            <CardHeader>
              <CardTitle className="text-honey flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="bg-background border-border"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="bg-background border-border"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="w-full min-h-[100px] px-3 py-2 bg-background border border-border rounded-md resize-none text-sm"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {bio.length}/500
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
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
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive important updates via email
                  </p>
                </div>
                <Switch 
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive real-time notifications in the app
                  </p>
                </div>
                <Switch 
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Reward Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when you receive rewards
                  </p>
                </div>
                <Switch 
                  checked={rewardNotifications}
                  onCheckedChange={setRewardNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Referral Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about new referrals and team activities
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
                Privacy Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Profile Visibility</Label>
                <Select value={profileVisibility} onValueChange={setProfileVisibility}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="team">Team Members Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Control who can view your profile information
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Show Earnings</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your earnings publicly
                  </p>
                </div>
                <Switch 
                  checked={showEarnings}
                  onCheckedChange={setShowEarnings}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Show Referral Count</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your referral statistics
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
              <CardTitle className="text-honey">Account Summary</CardTitle>
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
                  Level {currentLevel} Member
                </p>
              </div>
              
              <div className="pt-4 border-t border-border/50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wallet:</span>
                    <span className="font-mono">{formatAddress(walletAddress || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member Since:</span>
                    <span>Recently Joined</span>
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
              Save Changes
            </Button>
            
            <Button
              onClick={() => setLocation('/me')}
              variant="outline"
              className="border-border text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
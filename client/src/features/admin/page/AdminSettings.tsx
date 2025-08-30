import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useToast } from '../../hooks/use-toast';
import { Settings, Clock, Users, Trash2, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface RegistrationStats {
  totalRegistered: number;
  totalActivated: number;
  pendingActivation: number;
  expiredRegistrations: number;
  registrationsLast24h: number;
}

interface AdminSetting {
  id: string;
  settingKey: string;
  settingValue: string;
  description: string;
  updatedAt: string;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [registrationTimeout, setRegistrationTimeout] = useState('48');

  // Fetch registration stats
  const { data: stats, isLoading: statsLoading } = useQuery<RegistrationStats>({
    queryKey: ['/api/admin/registration-stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch admin settings
  const { data: adminSettings, isLoading: settingsLoading } = useQuery<AdminSetting[]>({
    queryKey: ['/api/admin/settings'],
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async (data: { settingKey: string; settingValue: string; description: string }) => {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update setting');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: 'Setting Updated',
        description: 'Admin setting has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update setting',
        variant: 'destructive',
      });
    },
  });

  // Cleanup expired registrations mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/cleanup-expired', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to cleanup expired registrations');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/registration-stats'] });
      toast({
        title: 'Cleanup Complete',
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Cleanup Failed',
        description: error.message || 'Failed to cleanup expired registrations',
        variant: 'destructive',
      });
    },
  });

  // Set initial value from settings
  useEffect(() => {
    if (adminSettings) {
      const timeoutSetting = adminSettings.find(s => s.settingKey === 'registration_timeout_hours');
      if (timeoutSetting) {
        setRegistrationTimeout(timeoutSetting.settingValue);
      }
    }
  }, [adminSettings]);

  const handleUpdateTimeout = () => {
    const hours = parseInt(registrationTimeout);
    if (isNaN(hours) || hours < 1 || hours > 168) { // Max 1 week
      toast({
        title: 'Invalid Value',
        description: 'Please enter a value between 1 and 168 hours (1 week)',
        variant: 'destructive',
      });
      return;
    }

    updateSettingMutation.mutate({
      settingKey: 'registration_timeout_hours',
      settingValue: registrationTimeout,
      description: 'Hours before unactivated registrations expire and are deleted'
    });
  };

  const handleCleanup = () => {
    if (confirm('Are you sure you want to cleanup expired registrations? This action cannot be undone.')) {
      cleanupMutation.mutate();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6 text-honey" />
        <h1 className="text-2xl font-bold text-honey">Admin Settings</h1>
      </div>

      {/* Registration Statistics */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-honey">
            <Users className="h-5 w-5" />
            Registration Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading statistics...</span>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-honey">{stats.totalRegistered}</div>
                <div className="text-sm text-muted-foreground">Total Registered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{stats.totalActivated}</div>
                <div className="text-sm text-muted-foreground">Activated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.pendingActivation}</div>
                <div className="text-sm text-muted-foreground">Pending Activation</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{stats.expiredRegistrations}</div>
                <div className="text-sm text-muted-foreground">Expired (Ready for Cleanup)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.registrationsLast24h}</div>
                <div className="text-sm text-muted-foreground">Last 24 Hours</div>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Failed to load registration statistics.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Registration Timeout Settings */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-honey">
            <Clock className="h-5 w-5" />
            Registration Timeout Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timeout">Registration Timeout (Hours)</Label>
            <div className="flex gap-2">
              <Input
                id="timeout"
                type="number"
                min="1"
                max="168"
                value={registrationTimeout}
                onChange={(e) => setRegistrationTimeout(e.target.value)}
                className="w-32"
                placeholder="48"
              />
              <Button
                onClick={handleUpdateTimeout}
                disabled={updateSettingMutation.isPending}
                className="bg-honey text-black hover:bg-honey/90"
              >
                {updateSettingMutation.isPending ? 'Updating...' : 'Update'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Number of hours users have to upgrade to Level 1 before their registration expires.
              Current setting: <Badge variant="outline">{registrationTimeout} hours</Badge>
            </p>
          </div>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Users who don't upgrade within this timeframe will have their registration automatically deleted.
              Recommended: 48-72 hours to allow sufficient time for payment processing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Cleanup Actions */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-honey">
            <Trash2 className="h-5 w-5" />
            Cleanup Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button
              onClick={handleCleanup}
              disabled={cleanupMutation.isPending}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {cleanupMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {cleanupMutation.isPending ? 'Cleaning up...' : 'Cleanup Expired Registrations'}
            </Button>
            
            <p className="text-sm text-muted-foreground mt-2">
              Manually trigger cleanup of expired registrations. This will permanently delete user accounts 
              that haven't upgraded within the timeout period.
            </p>
            
            {stats && stats.expiredRegistrations > 0 && (
              <Alert className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{stats.expiredRegistrations}</strong> expired registrations are ready for cleanup.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Admin Settings */}
      {adminSettings && adminSettings.length > 0 && (
        <Card className="bg-secondary border-border">
          <CardHeader>
            <CardTitle className="text-honey">Current Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {adminSettings.map((setting) => (
                <div key={setting.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">{setting.settingKey}</div>
                    <div className="text-sm text-muted-foreground">{setting.description}</div>
                  </div>
                  <Badge variant="outline">{setting.settingValue}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
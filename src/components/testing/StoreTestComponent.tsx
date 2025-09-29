// Test component to verify Zustand store implementation
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  useWalletV2, 
  useUserData, 
  useMembershipData, 
  useWalletConnection 
} from '../../hooks/useWalletV2';
import { 
  useUserStore, 
  useMembershipStore, 
  useUIStore,
  useStoreActions,
  useNotifications,
  useLoadingStates 
} from '../../stores';

export function StoreTestComponent() {
  // Test different hooks
  const walletConnection = useWalletConnection();
  const userData = useUserData();
  const membershipData = useMembershipData();
  const walletV2 = useWalletV2();
  
  // Test store access
  const userStore = useUserStore();
  const membershipStore = useMembershipStore();
  const uiStore = useUIStore();
  
  // Test actions
  const actions = useStoreActions();
  const notifications = useNotifications();
  const loadingStates = useLoadingStates();
  
  const handleTestUserData = async () => {
    if (walletConnection.walletAddress) {
      await userStore.loadUserData(walletConnection.walletAddress);
      actions.showSuccess('User data loaded successfully!');
    } else {
      actions.showError('No wallet connected');
    }
  };
  
  const handleTestMembershipData = async () => {
    if (walletConnection.walletAddress) {
      await membershipStore.loadMembershipData(walletConnection.walletAddress);
      actions.showSuccess('Membership data loaded successfully!');
    } else {
      actions.showError('No wallet connected');
    }
  };
  
  const handleTestNotification = () => {
    notifications.addNotification({
      type: 'info',
      title: 'Test Notification',
      message: 'This is a test notification from the store system!'
    });
  };
  
  const handleTestModal = () => {
    uiStore.openModal('settings');
    setTimeout(() => {
      uiStore.closeModal('settings');
      actions.showSuccess('Modal test completed!');
    }, 2000);
  };
  
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <h1 className="text-3xl font-bold text-center mb-6">🧪 Zustand Store Test Dashboard</h1>
      
      {/* Wallet Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>🔗 Wallet Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Connected:</strong> 
            <Badge variant={walletConnection.isConnected ? "default" : "secondary"}>
              {walletConnection.isConnected ? "Yes" : "No"}
            </Badge>
          </p>
          <p><strong>Address:</strong> {walletConnection.walletAddress || "Not connected"}</p>
          <p><strong>Loading:</strong> 
            <Badge variant={walletConnection.isLoading ? "destructive" : "outline"}>
              {walletConnection.isLoading ? "Loading..." : "Ready"}
            </Badge>
          </p>
        </CardContent>
      </Card>
      
      {/* User Data */}
      <Card>
        <CardHeader>
          <CardTitle>👤 User Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Registered:</strong> 
            <Badge variant={userData.isRegistered ? "default" : "secondary"}>
              {userData.isRegistered ? "Yes" : "No"}
            </Badge>
          </p>
          <p><strong>Username:</strong> {userData.userData?.username || "Not set"}</p>
          <p><strong>Email:</strong> {userData.userData?.email || "Not set"}</p>
          <p><strong>Error:</strong> {userData.error || "None"}</p>
          <Button onClick={handleTestUserData} disabled={loadingStates.userLoading}>
            {loadingStates.userLoading ? "Loading..." : "Test Load User Data"}
          </Button>
        </CardContent>
      </Card>
      
      {/* Membership Data */}
      <Card>
        <CardHeader>
          <CardTitle>🎫 Membership Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Activated:</strong> 
            <Badge variant={membershipData.isActivated ? "default" : "secondary"}>
              {membershipData.isActivated ? "Yes" : "No"}
            </Badge>
          </p>
          <p><strong>Current Level:</strong> {membershipData.memberData?.current_level || 0}</p>
          <p><strong>Can Upgrade:</strong> 
            <Badge variant={membershipData.canUpgrade ? "default" : "outline"}>
              {membershipData.canUpgrade ? "Yes" : "No"}
            </Badge>
          </p>
          <p><strong>Next Level:</strong> {membershipData.nextLevel || "Max level reached"}</p>
          <p><strong>Processing:</strong> 
            <Badge variant={membershipData.isProcessing ? "destructive" : "outline"}>
              {membershipData.isProcessing ? membershipData.currentStep : "Ready"}
            </Badge>
          </p>
          <Button onClick={handleTestMembershipData} disabled={loadingStates.membershipLoading}>
            {loadingStates.membershipLoading ? "Loading..." : "Test Load Membership Data"}
          </Button>
        </CardContent>
      </Card>
      
      {/* Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>⏳ Loading States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Global Loading:</strong> 
            <Badge variant={loadingStates.isLoading ? "destructive" : "outline"}>
              {loadingStates.isLoading ? "Loading" : "Ready"}
            </Badge>
          </p>
          <p><strong>Processing:</strong> 
            <Badge variant={loadingStates.isProcessing ? "destructive" : "outline"}>
              {loadingStates.isProcessing ? "Processing" : "Ready"}
            </Badge>
          </p>
          <p><strong>User Loading:</strong> 
            <Badge variant={loadingStates.userLoading ? "destructive" : "outline"}>
              {loadingStates.userLoading ? "Loading" : "Ready"}
            </Badge>
          </p>
          <p><strong>Membership Loading:</strong> 
            <Badge variant={loadingStates.membershipLoading ? "destructive" : "outline"}>
              {loadingStates.membershipLoading ? "Loading" : "Ready"}
            </Badge>
          </p>
        </CardContent>
      </Card>
      
      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>📢 Notifications ({notifications.notifications.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Button onClick={handleTestNotification}>Add Test Notification</Button>
            <Button onClick={notifications.clearAll} variant="outline">Clear All</Button>
          </div>
          {notifications.notifications.slice(0, 3).map((notification) => (
            <div key={notification.id} className="p-2 border rounded text-sm">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant={
                    notification.type === 'success' ? 'default' :
                    notification.type === 'error' ? 'destructive' :
                    notification.type === 'warning' ? 'secondary' : 'outline'
                  }>
                    {notification.type}
                  </Badge>
                  <strong className="ml-2">{notification.title}</strong>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => notifications.removeNotification(notification.id)}
                >
                  ×
                </Button>
              </div>
              <p className="mt-1">{notification.message}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
      
      {/* UI State */}
      <Card>
        <CardHeader>
          <CardTitle>🎨 UI State</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Theme:</strong> {uiStore.theme}</p>
          <p><strong>Sidebar Collapsed:</strong> 
            <Badge variant={uiStore.sidebarCollapsed ? "default" : "outline"}>
              {uiStore.sidebarCollapsed ? "Yes" : "No"}
            </Badge>
          </p>
          <p><strong>Online:</strong> 
            <Badge variant={uiStore.isOnline ? "default" : "destructive"}>
              {uiStore.isOnline ? "Online" : "Offline"}
            </Badge>
          </p>
          <p><strong>Modals Open:</strong> {Object.entries(uiStore.modals).filter(([_, open]) => open).map(([name]) => name).join(", ") || "None"}</p>
          <div className="flex gap-2">
            <Button onClick={handleTestModal}>Test Modal</Button>
            <Button onClick={() => uiStore.setTheme(uiStore.theme === 'light' ? 'dark' : 'light')} variant="outline">
              Toggle Theme
            </Button>
            <Button onClick={() => uiStore.setSidebarCollapsed(!uiStore.sidebarCollapsed)} variant="outline">
              Toggle Sidebar
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Store Actions Test */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Store Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => actions.showSuccess("Success test!")} variant="default">
              Test Success
            </Button>
            <Button onClick={() => actions.showError("Error test!")} variant="destructive">
              Test Error
            </Button>
            <Button onClick={() => userStore.reset()} variant="outline">
              Reset User Store
            </Button>
            <Button onClick={() => membershipStore.reset()} variant="outline">
              Reset Membership Store
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
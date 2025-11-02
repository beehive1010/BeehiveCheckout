import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Checkbox } from '../../components/ui/checkbox';
import { 
  Shield, 
  Users, 
  Plus,
  Edit,
  Search,
  UserCheck,
  UserX,
  Crown,
  Key,
  Calendar,
  Mail,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Timer
} from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../hooks/use-toast';
import { useIsMobile } from '../../hooks/use-mobile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: 'super_admin' | 'creator_admin' | 'support_admin' | 'viewer_admin';
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
  createdAt: string;
  createdBy?: string;
  notes?: string;
}

interface UserRegistrationTimer {
  walletAddress: string;
  username?: string;
  registrationExpiresAt: string;
  timeRemaining: number;
}

interface AdminUserFormData {
  username: string;
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
  role: 'super_admin' | 'creator_admin' | 'support_admin' | 'viewer_admin';
  customPermissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  notes: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'users.read', name: 'View Users', category: 'Users' },
  { id: 'users.update', name: 'Edit Users', category: 'Users' },
  { id: 'users.export', name: 'Export User Data', category: 'Users' },
  { id: 'referrals.read', name: 'View Referrals', category: 'Referrals' },
  { id: 'referrals.export', name: 'Export Referral Data', category: 'Referrals' },
  { id: 'nfts.read', name: 'View NFTs', category: 'NFTs' },
  { id: 'nfts.create', name: 'Create NFTs', category: 'NFTs' },
  { id: 'nfts.update', name: 'Edit NFTs', category: 'NFTs' },
  { id: 'nfts.mint', name: 'Mint NFTs', category: 'NFTs' },
  { id: 'contracts.read', name: 'View Contracts', category: 'Contracts' },
  { id: 'contracts.deploy', name: 'Deploy Contracts', category: 'Contracts' },
  { id: 'contracts.manage', name: 'Manage Contracts', category: 'Contracts' },
  { id: 'courses.read', name: 'View Courses', category: 'Courses' },
  { id: 'courses.create', name: 'Create Courses', category: 'Courses' },
  { id: 'courses.edit', name: 'Edit Courses', category: 'Courses' },
  { id: 'blog.read', name: 'View Blog', category: 'Blog' },
  { id: 'blog.create', name: 'Create Posts', category: 'Blog' },
  { id: 'blog.update', name: 'Edit Posts', category: 'Blog' },
  { id: 'discover.read', name: 'View Partners', category: 'Discover' },
  { id: 'discover.approve', name: 'Approve Partners', category: 'Discover' },
  { id: 'discover.reject', name: 'Reject Partners', category: 'Discover' },
  { id: 'system.read', name: 'View System Status', category: 'System' },
  { id: 'logs.read', name: 'View Logs', category: 'System' },
  { id: 'logs.export', name: 'Export Logs', category: 'System' },
];

const ROLE_PERMISSIONS = {
  super_admin: AVAILABLE_PERMISSIONS.map(p => p.id),
  creator_admin: [
    'blog.read', 'blog.create', 'blog.update',
    'nfts.read', 'nfts.create',
    'contracts.read',
    'courses.read', 'courses.create',
    'discover.read'
  ],
  support_admin: [
    'users.read', 'users.update',
    'referrals.read',
    'nfts.read',
    'courses.read',
    'blog.read',
    'system.read'
  ],
  viewer_admin: [
    'users.read',
    'referrals.read',
    'nfts.read',
    'courses.read',
    'blog.read',
    'discover.read',
    'system.read'
  ]
};

export default function AdminUsers() {
  const { hasRole, adminUser } = useAdminAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<AdminUserFormData>({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    role: 'viewer_admin',
    customPermissions: [],
    status: 'active',
    notes: '',
  });
  const [activeRegistrationTimers, setActiveRegistrationTimers] = useState<UserRegistrationTimer[]>([]);

  // Fetch registration timers for users
  const { data: registrationTimers = [] } = useQuery<UserRegistrationTimer[]>({
    queryKey: ['/api/admin/registration-timers'],
    queryFn: async () => {
      const response = await fetch('/api/admin/registration-timers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminSessionToken')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch registration timers');
      }
      return response.json();
    },
    refetchInterval: 1000, // Update every second
  });

  // Fetch admin users with real API
  const { data: adminUsers = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/admin-users', { search: searchTerm, role: roleFilter, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/admin/admin-users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminSessionToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch admin users');
      }
      
      return response.json();
    },
  });

  // Create admin user mutation
  const createAdminUserMutation = useMutation({
    mutationFn: async (userData: AdminUserFormData) => {
      const response = await fetch('/api/admin/admin-users', {
        method: 'POST',
        body: JSON.stringify({
          username: userData.username,
          email: userData.email,
          password: userData.password,
          role: userData.role,
          permissions: userData.customPermissions,
          status: userData.status,
          fullName: userData.fullName,
          notes: userData.notes,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminSessionToken')}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create admin user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/admin-users'] });
      setIsCreateDialogOpen(false);
      resetFormData();
      toast({
        title: 'Success',
        description: 'Admin user created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create admin user',
        variant: 'destructive',
      });
    },
  });

  // Update admin user mutation
  const updateAdminUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: string; userData: Partial<AdminUserFormData> }) => {
      const response = await fetch(`/api/admin/admin-users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminSessionToken')}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update admin user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/admin-users'] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      resetFormData();
      toast({
        title: 'Success',
        description: 'Admin user updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update admin user',
        variant: 'destructive',
      });
    },
  });

  // Delete admin user mutation
  const deleteAdminUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/admin-users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminSessionToken')}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete admin user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/admin-users'] });
      toast({
        title: 'Success',
        description: 'Admin user deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete admin user',
        variant: 'destructive',
      });
    },
  });

  // Initialize form data
  const resetFormData = () => {
    setFormData({
      username: '',
      email: '',
      fullName: '',
      password: '',
      confirmPassword: '',
      role: 'viewer_admin',
      customPermissions: [],
      status: 'active',
      notes: '',
    });
  };

  // Handle form input changes
  const handleFormChange = (field: keyof AdminUserFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle role change (auto-populate permissions)
  const handleRoleChange = (role: AdminUserFormData['role']) => {
    setFormData(prev => ({
      ...prev,
      role,
      customPermissions: ROLE_PERMISSIONS[role]
    }));
  };

  // Handle permission toggle
  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      customPermissions: checked
        ? [...prev.customPermissions, permissionId]
        : prev.customPermissions.filter(p => p !== permissionId)
    }));
  };

  // Handle create admin user
  const handleCreateUser = () => {
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.username || !formData.email || !formData.password) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    createAdminUserMutation.mutate(formData);
  };

  // Handle edit admin user
  const handleEditUser = () => {
    if (!editingUser) return;

    const updateData: Partial<AdminUserFormData> = {
      username: formData.username,
      email: formData.email,
      fullName: formData.fullName,
      role: formData.role,
      customPermissions: formData.customPermissions,
      status: formData.status,
      notes: formData.notes,
    };

    if (formData.password) {
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: 'Error',
          description: 'Passwords do not match',
          variant: 'destructive',
        });
        return;
      }
      updateData.password = formData.password;
    }

    updateAdminUserMutation.mutate({ id: editingUser.id, userData: updateData });
  };

  // Handle delete admin user
  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this admin user? This action cannot be undone.')) {
      deleteAdminUserMutation.mutate(userId);
    }
  };

  // Open edit dialog
  const openEditDialog = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      fullName: user.fullName || '',
      password: '',
      confirmPassword: '',
      role: user.role,
      customPermissions: user.permissions || [],
      status: user.status,
      notes: user.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'creator_admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'support_admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'viewer_admin': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Crown className="h-4 w-4" />;
      case 'creator_admin': return <Edit className="h-4 w-4" />;
      case 'support_admin': return <Users className="h-4 w-4" />;
      case 'viewer_admin': return <Shield className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="outline" className="text-orange-600 border-orange-300">
            <Clock className="h-3 w-3 mr-1" />
            Inactive
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Suspended
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate statistics
  const stats = {
    total: adminUsers.length,
    active: adminUsers.filter((u: AdminUser) => u.status === 'active').length,
    inactive: adminUsers.filter((u: AdminUser) => u.status === 'inactive').length,
    superAdmins: adminUsers.filter((u: AdminUser) => u.role === 'super_admin').length,
  };

  // Verify super admin access
  if (!hasRole(['super_admin'])) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>You need Super Administrator privileges to access this section.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Admin Users...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please wait while we load the admin users data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Users</h1>
          <p className="text-muted-foreground">Manage administrator accounts and permissions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetFormData} className="bg-yellow-600 hover:bg-yellow-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Admin User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Admin User</DialogTitle>
              <DialogDescription>
                Set up a new administrator account with appropriate permissions.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="role">Role & Permissions</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleFormChange('username', e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleFormChange('fullName', e.target.value)}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      placeholder="Optional notes about this admin user"
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="role" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="role">Role *</Label>
                    <Select value={formData.role} onValueChange={handleRoleChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="creator_admin">Creator Admin</SelectItem>
                        <SelectItem value="support_admin">Support Admin</SelectItem>
                        <SelectItem value="viewer_admin">Viewer Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Custom Permissions</Label>
                    <div className="mt-2 space-y-3">
                      {Object.entries(
                        AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
                          if (!acc[permission.category]) {
                            acc[permission.category] = [];
                          }
                          acc[permission.category].push(permission);
                          return acc;
                        }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>)
                      ).map(([category, permissions]) => (
                        <div key={category} className="space-y-2">
                          <Label className="text-sm font-medium">{category}</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {permissions.map((permission) => (
                              <div key={permission.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={permission.id}
                                  checked={formData.customPermissions.includes(permission.id)}
                                  onCheckedChange={(checked) =>
                                    handlePermissionToggle(permission.id, checked as boolean)
                                  }
                                />
                                <Label
                                  htmlFor={permission.id}
                                  className="text-sm font-normal"
                                >
                                  {permission.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="security" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleFormChange('password', e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleFormChange('confirmPassword', e.target.value)}
                      placeholder="Confirm password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Account Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value: 'active' | 'inactive') => handleFormChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateUser}
                disabled={createAdminUserMutation.isPending}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {createAdminUserMutation.isPending ? 'Creating...' : 'Create Admin User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Registration Countdown Timers */}
      {registrationTimers.length > 0 && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Timer className="h-5 w-5" />
              Active Registration Timers
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              Users with pending registration that will expire if not upgraded to Level 1
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {registrationTimers.map((timer) => {
                const formatTimeRemaining = (ms: number): string => {
                  if (ms <= 0) return '00:00:00';
                  const hours = Math.floor(ms / (1000 * 60 * 60));
                  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
                  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
                  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                };
                
                return (
                  <Alert key={timer.walletAddress} className="bg-white dark:bg-gray-800 border-yellow-300 dark:border-yellow-700">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <AlertDescription>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {timer.username || `${timer.walletAddress.slice(0, 6)}...${timer.walletAddress.slice(-4)}`}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Registration expires in: <span className="font-mono font-bold text-red-600 dark:text-red-400">
                              {formatTimeRemaining(timer.timeRemaining)}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Expires: {new Date(timer.registrationExpiresAt).toLocaleString()}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <UserX className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
            <Crown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.superAdmins}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="creator_admin">Creator Admin</SelectItem>
                <SelectItem value="support_admin">Support Admin</SelectItem>
                <SelectItem value="viewer_admin">Viewer Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Admin Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Accounts</CardTitle>
          <CardDescription>
            Manage administrator accounts and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {adminUsers.map((user: AdminUser) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-semibold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{user.fullName || user.username}</h3>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1">{user.role.replace('_', ' ')}</span>
                      </Badge>
                      {getStatusBadge(user.status)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {user.email}
                      </span>
                      {user.lastLogin && (
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Last login: {new Date(user.lastLogin).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {user.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{user.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(user)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {user.role !== 'super_admin' || stats.superAdmins > 1 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            
            {adminUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No admin users found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
            <DialogDescription>
              Update administrator account information and permissions.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="role">Role & Permissions</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-username">Username *</Label>
                  <Input
                    id="edit-username"
                    value={formData.username}
                    onChange={(e) => handleFormChange('username', e.target.value)}
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-fullName">Full Name</Label>
                  <Input
                    id="edit-fullName"
                    value={formData.fullName}
                    onChange={(e) => handleFormChange('fullName', e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    placeholder="Optional notes about this admin user"
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="role" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-role">Role *</Label>
                  <Select value={formData.role} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="creator_admin">Creator Admin</SelectItem>
                      <SelectItem value="support_admin">Support Admin</SelectItem>
                      <SelectItem value="viewer_admin">Viewer Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Custom Permissions</Label>
                  <div className="mt-2 space-y-3">
                    {Object.entries(
                      AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
                        if (!acc[permission.category]) {
                          acc[permission.category] = [];
                        }
                        acc[permission.category].push(permission);
                        return acc;
                      }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>)
                    ).map(([category, permissions]) => (
                      <div key={category} className="space-y-2">
                        <Label className="text-sm font-medium">{category}</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {permissions.map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-${permission.id}`}
                                checked={formData.customPermissions.includes(permission.id)}
                                onCheckedChange={(checked) =>
                                  handlePermissionToggle(permission.id, checked as boolean)
                                }
                              />
                              <Label
                                htmlFor={`edit-${permission.id}`}
                                className="text-sm font-normal"
                              >
                                {permission.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleFormChange('password', e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-confirmPassword">Confirm New Password</Label>
                  <Input
                    id="edit-confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleFormChange('confirmPassword', e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-status">Account Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: 'active' | 'inactive') => handleFormChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditUser}
              disabled={updateAdminUserMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {updateAdminUserMutation.isPending ? 'Updating...' : 'Update Admin User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
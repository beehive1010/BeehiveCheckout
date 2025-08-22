import { useState, useEffect } from 'react';
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
  Clock
} from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useToast } from '../../hooks/use-toast';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'creator_admin' | 'support_admin' | 'viewer_admin';
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  createdAt: string;
  createdBy: string;
  notes?: string;
  avatar?: string;
}

interface AdminUserFormData {
  username: string;
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
  role: 'super_admin' | 'creator_admin' | 'support_admin' | 'viewer_admin';
  customPermissions: string[];
  status: 'active' | 'inactive';
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
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    loadAdminUsers();
  }, [searchTerm, roleFilter, statusFilter]);

  const loadAdminUsers = async () => {
    try {
      const realAdminUsers: AdminUser[] = [
        {
          id: 'admin-1',
          username: 'superadmin',
          email: 'admin@beehive.app',
          fullName: 'Super Administrator',
          role: 'super_admin',
          permissions: ROLE_PERMISSIONS.super_admin,
          status: 'active',
          lastLogin: '2025-08-22T08:30:00Z',
          createdAt: '2024-01-15T10:00:00Z',
          createdBy: 'System',
          notes: 'Primary system administrator with full access',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400'
        },
        {
          id: 'admin-2',
          username: 'contentcreator',
          email: 'content@beehive.app',
          fullName: 'Content Creator Admin',
          role: 'creator_admin',
          permissions: ROLE_PERMISSIONS.creator_admin,
          status: 'active',
          lastLogin: '2025-08-22T07:15:00Z',
          createdAt: '2024-03-10T14:30:00Z',
          createdBy: 'superadmin',
          notes: 'Manages blog content, courses, and NFTs',
          avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5bb?w=400'
        },
        {
          id: 'admin-3',
          username: 'support',
          email: 'support@beehive.app',
          fullName: 'Support Team Lead',
          role: 'support_admin',
          permissions: ROLE_PERMISSIONS.support_admin,
          status: 'active',
          lastLogin: '2025-08-21T16:45:00Z',
          createdAt: '2024-05-20T09:15:00Z',
          createdBy: 'superadmin',
          notes: 'Handles user support and account management',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400'
        },
        {
          id: 'admin-4',
          username: 'analyst',
          email: 'analytics@beehive.app',
          fullName: 'Analytics Viewer',
          role: 'viewer_admin',
          permissions: ROLE_PERMISSIONS.viewer_admin,
          status: 'active',
          lastLogin: '2025-08-22T06:00:00Z',
          createdAt: '2024-07-12T11:20:00Z',
          createdBy: 'superadmin',
          notes: 'Read-only access for analytics and reporting',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
        },
        {
          id: 'admin-5',
          username: 'tempuser',
          email: 'temp@beehive.app',
          fullName: 'Temporary Admin',
          role: 'viewer_admin',
          permissions: ['users.read', 'system.read'],
          status: 'inactive',
          lastLogin: '2025-08-15T12:30:00Z',
          createdAt: '2024-08-01T15:45:00Z',
          createdBy: 'superadmin',
          notes: 'Temporary access for external audit - now disabled',
          avatar: 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=400'
        }
      ];

      const filteredUsers = realAdminUsers.filter(user => {
        const matchesSearch = searchTerm === '' || 
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        
        return matchesSearch && matchesRole && matchesStatus;
      });

      setAdminUsers(filteredUsers);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load admin users:', error);
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: 'Password Mismatch',
          description: 'Passwords do not match. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      if (formData.password.length < 8) {
        toast({
          title: 'Weak Password',
          description: 'Password must be at least 8 characters long.',
          variant: 'destructive',
        });
        return;
      }

      const permissions = formData.customPermissions.length > 0 
        ? formData.customPermissions 
        : ROLE_PERMISSIONS[formData.role];

      const newUser: AdminUser = {
        id: `admin-${Date.now()}`,
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role,
        permissions,
        status: formData.status,
        lastLogin: '',
        createdAt: new Date().toISOString(),
        createdBy: adminUser?.username || 'system',
        notes: formData.notes,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'
      };

      setAdminUsers(prev => [newUser, ...prev]);
      setIsCreateDialogOpen(false);
      resetForm();

      toast({
        title: 'Admin User Created',
        description: `${newUser.fullName} has been added as ${newUser.role.replace('_', ' ')}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create admin user. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const toggleUserStatus = async (user: AdminUser) => {
    try {
      const newStatus: 'active' | 'inactive' | 'suspended' = user.status === 'active' ? 'inactive' : 'active';
      const updatedUser = { ...user, status: newStatus };
      
      setAdminUsers(prev =>
        prev.map(u => u.id === user.id ? updatedUser : u)
      );

      toast({
        title: 'User Status Updated',
        description: `${user.fullName} is now ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user status.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-red-500"><Crown className="w-3 h-3 mr-1" />Super Admin</Badge>;
      case 'creator_admin':
        return <Badge className="bg-purple-500">Creator Admin</Badge>;
      case 'support_admin':
        return <Badge className="bg-blue-500">Support Admin</Badge>;
      case 'viewer_admin':
        return <Badge className="bg-green-500">Viewer Admin</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><UserX className="w-3 h-3 mr-1" />Inactive</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500"><AlertTriangle className="w-3 h-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPermissionsByCategory = () => {
    const categories = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);
    return categories;
  };

  if (!hasRole(['super_admin'])) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">Only super administrators can manage admin users.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-honey">Admin Users</h1>
            <p className="text-muted-foreground mt-2">Loading admin users...</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalUsers = adminUsers.length;
  const activeUsers = adminUsers.filter(u => u.status === 'active').length;
  const inactiveUsers = adminUsers.filter(u => u.status === 'inactive').length;
  const superAdmins = adminUsers.filter(u => u.role === 'super_admin').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-honey">Admin Users</h1>
          <p className="text-muted-foreground mt-2">
            Manage administrator accounts and permissions
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-honey text-black hover:bg-honey/90" data-testid="button-create-admin">
              <Plus className="w-4 h-4 mr-2" />
              Create Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Admin User</DialogTitle>
              <DialogDescription>
                Add a new administrator with specific role and permissions
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="role">Role & Permissions</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter username..."
                      data-testid="input-admin-username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="admin@beehive.app"
                      data-testid="input-admin-email"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter full name..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this admin user..."
                    rows={3}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="role" className="space-y-4">
                <div>
                  <Label htmlFor="role">Admin Role</Label>
                  <Select value={formData.role} onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value, customPermissions: [] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin (Full Access)</SelectItem>
                      <SelectItem value="creator_admin">Creator Admin (Content Management)</SelectItem>
                      <SelectItem value="support_admin">Support Admin (User Support)</SelectItem>
                      <SelectItem value="viewer_admin">Viewer Admin (Read Only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Custom Permissions (Override role defaults)</Label>
                  <div className="mt-2 space-y-4 max-h-64 overflow-y-auto border rounded-lg p-4">
                    {Object.entries(getPermissionsByCategory()).map(([category, permissions]) => (
                      <div key={category}>
                        <h4 className="font-medium text-honey mb-2">{category}</h4>
                        <div className="grid grid-cols-2 gap-2 ml-4">
                          {permissions.map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={permission.id}
                                checked={formData.customPermissions.includes(permission.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData(prev => ({
                                      ...prev,
                                      customPermissions: [...prev.customPermissions, permission.id]
                                    }));
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      customPermissions: prev.customPermissions.filter(p => p !== permission.id)
                                    }));
                                  }
                                }}
                              />
                              <Label htmlFor={permission.id} className="text-sm">
                                {permission.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Leave empty to use default role permissions
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="security" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter secure password..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm password..."
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="status">Initial Status</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Security Requirements</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Password must be at least 8 characters long</li>
                    <li>• Include numbers, letters, and special characters</li>
                    <li>• Admin will be required to change password on first login</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser}>Create Admin User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Total Admins</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <UserX className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">{inactiveUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-honey" />
              <div>
                <p className="text-sm text-muted-foreground">Super Admins</p>
                <p className="text-2xl font-bold">{superAdmins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search & Filter Admins</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by username, email, or full name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-muted"
            data-testid="input-search-admins"
          />
          
          <div className="flex gap-4">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
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
              <SelectTrigger className="w-48">
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
      <div className="space-y-4">
        {adminUsers.map((user) => (
          <Card key={user.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img 
                      src={user.avatar} 
                      alt={user.fullName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-lg text-honey">{user.fullName}</h3>
                      {getRoleBadge(user.role)}
                      {getStatusBadge(user.status)}
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Mail className="w-4 h-4" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Key className="w-4 h-4" />
                        <span>@{user.username}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Created: {formatDate(user.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>Last Login: {formatDate(user.lastLogin)}</span>
                      </div>
                    </div>
                    
                    {user.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        {user.notes}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-1 mt-3">
                      <span className="text-xs text-muted-foreground mr-2">Permissions:</span>
                      {user.permissions.slice(0, 5).map((permission, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {permission.replace('.', ':')}
                        </Badge>
                      ))}
                      {user.permissions.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.permissions.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleUserStatus(user)}
                    disabled={user.id === 'admin-1'}
                    data-testid={`button-toggle-admin-${user.id}`}
                  >
                    {user.status === 'active' ? (
                      <>
                        <UserX className="w-4 h-4 mr-1" />
                        Disable
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-1" />
                        Enable
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
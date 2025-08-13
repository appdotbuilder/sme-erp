import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Shield, UserCheck, Crown, Settings, Wrench } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, CreateUserInput, UserRole } from '../../../server/src/schema';

export function UserModule() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  
  const [formData, setFormData] = useState<CreateUserInput>({
    clerk_id: '',
    email: '',
    name: '',
    role: 'TECHNICIAN'
  });

  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.users.list.query();
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await trpc.users.create.mutate(formData);
      setUsers((prev: User[]) => [response, ...prev]);
      setFormData({
        clerk_id: '',
        email: '',
        name: '',
        role: 'TECHNICIAN'
      });
      setCreateUserOpen(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <Crown className="w-4 h-4 text-red-500" />;
      case 'WAREHOUSE_MANAGER':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'PURCHASING_STAFF':
        return <UserCheck className="w-4 h-4 text-green-500" />;
      case 'TECHNICIAN':
        return <Wrench className="w-4 h-4 text-purple-500" />;
      default:
        return <Settings className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500 text-white';
      case 'WAREHOUSE_MANAGER':
        return 'bg-blue-500 text-white';
      case 'PURCHASING_STAFF':
        return 'bg-green-500 text-white';
      case 'TECHNICIAN':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'Full system access and user management';
      case 'WAREHOUSE_MANAGER':
        return 'Inventory and work order management';
      case 'PURCHASING_STAFF':
        return 'Purchase orders and supplier management';
      case 'TECHNICIAN':
        return 'Work order completion and material usage';
      default:
        return 'Basic system access';
    }
  };

  const roleStats = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<UserRole, number>);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-8 h-8 text-blue-600" />
            <span>User Management</span>
          </h1>
          <p className="text-slate-600 mt-1">Manage system users and role assignments</p>
        </div>
        
        <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Clerk ID</label>
                <Input
                  placeholder="user_xxxxxxxxxxxxxxxxxx"
                  value={formData.clerk_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ 
                      ...prev, 
                      clerk_id: e.target.value 
                    }))
                  }
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This should match the Clerk.com user ID
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <Input
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ 
                      ...prev, 
                      name: e.target.value 
                    }))
                  }
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  placeholder="john.doe@company.com"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ 
                      ...prev, 
                      email: e.target.value 
                    }))
                  }
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: UserRole) =>
                    setFormData((prev: CreateUserInput) => ({ 
                      ...prev, 
                      role: value 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TECHNICIAN">
                      <div className="flex items-center space-x-2">
                        <Wrench className="w-4 h-4 text-purple-500" />
                        <span>Technician</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="PURCHASING_STAFF">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-4 h-4 text-green-500" />
                        <span>Purchasing Staff</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="WAREHOUSE_MANAGER">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-blue-500" />
                        <span>Warehouse Manager</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="ADMIN">
                      <div className="flex items-center space-x-2">
                        <Crown className="w-4 h-4 text-red-500" />
                        <span>Administrator</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {getRoleDescription(formData.role)}
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Role Permissions:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  {formData.role === 'ADMIN' && (
                    <>
                      <li>• Full system access</li>
                      <li>• User management</li>
                      <li>• All modules access</li>
                    </>
                  )}
                  {formData.role === 'WAREHOUSE_MANAGER' && (
                    <>
                      <li>• Inventory management</li>
                      <li>• Stock adjustments</li>
                      <li>• Work order creation</li>
                    </>
                  )}
                  {formData.role === 'PURCHASING_STAFF' && (
                    <>
                      <li>• Purchase order management</li>
                      <li>• Supplier management</li>
                      <li>• View inventory</li>
                    </>
                  )}
                  {formData.role === 'TECHNICIAN' && (
                    <>
                      <li>• View work orders</li>
                      <li>• Complete work orders</li>
                      <li>• View inventory</li>
                    </>
                  )}
                </ul>
              </div>
              
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create User'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <Crown className="w-8 h-8 text-red-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{roleStats.ADMIN || 0}</p>
              <p className="text-sm text-gray-600">Administrators</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Shield className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{roleStats.WAREHOUSE_MANAGER || 0}</p>
              <p className="text-sm text-gray-600">Warehouse Managers</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <UserCheck className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{roleStats.PURCHASING_STAFF || 0}</p>
              <p className="text-sm text-gray-600">Purchasing Staff</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Wrench className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{roleStats.TECHNICIAN || 0}</p>
              <p className="text-sm text-gray-600">Technicians</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Users</h3>
              <p className="text-gray-500 mb-4">Add your first user to get started.</p>
              <Button onClick={() => setCreateUserOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Clerk ID</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(user.role)}
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-gray-500">ID: {user.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>{user.email}</TableCell>
                    
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-xs text-gray-600 max-w-xs">
                        {getRoleDescription(user.role)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {user.clerk_id}
                      </code>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        <p>{user.created_at.toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">
                          {user.created_at.toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions Reference */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Role Permissions Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-center space-x-2 mb-3">
                <Crown className="w-5 h-5 text-red-500" />
                <h4 className="font-medium text-red-900">Administrator</h4>
              </div>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• User Management</li>
                <li>• All Module Access</li>
                <li>• System Configuration</li>
                <li>• Full CRUD Operations</li>
              </ul>
            </div>
            
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="w-5 h-5 text-blue-500" />
                <h4 className="font-medium text-blue-900">Warehouse Manager</h4>
              </div>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Inventory Management</li>
                <li>• Stock Adjustments</li>
                <li>• Work Order Creation</li>
                <li>• Item Management</li>
              </ul>
            </div>
            
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <div className="flex items-center space-x-2 mb-3">
                <UserCheck className="w-5 h-5 text-green-500" />
                <h4 className="font-medium text-green-900">Purchasing Staff</h4>
              </div>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Purchase Orders</li>
                <li>• Supplier Management</li>
                <li>• View Inventory</li>
                <li>• Purchase Analytics</li>
              </ul>
            </div>
            
            <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
              <div className="flex items-center space-x-2 mb-3">
                <Wrench className="w-5 h-5 text-purple-500" />
                <h4 className="font-medium text-purple-900">Technician</h4>
              </div>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• View Work Orders</li>
                <li>• Complete Work Orders</li>
                <li>• View Inventory</li>
                <li>• Material Usage</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
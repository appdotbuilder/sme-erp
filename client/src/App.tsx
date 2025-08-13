import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  ClipboardList, 
  BarChart3, 
  AlertTriangle,
  Settings,
  Warehouse,
  FileText
} from 'lucide-react';

// Import module components
import { InventoryModule } from '@/components/InventoryModule';
import { PurchasingModule } from '@/components/PurchasingModule';
import { WorkOrderModule } from '@/components/WorkOrderModule';
import { SupplierModule } from '@/components/SupplierModule';
import { AnalyticsModule } from '@/components/AnalyticsModule';
import { UserModule } from '@/components/UserModule';

// Mock user context - in real implementation, this would come from Clerk
const mockUser = {
  id: 'user_123',
  name: 'John Doe',
  role: 'ADMIN' as const,
  email: 'john.doe@company.com'
};

function App() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const user = mockUser; // This would come from useUser() in real Clerk implementation

  const modules = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: BarChart3,
      description: 'Overview and analytics',
      roles: ['ADMIN', 'WAREHOUSE_MANAGER', 'PURCHASING_STAFF', 'TECHNICIAN']
    },
    {
      id: 'inventory',
      name: 'Inventory',
      icon: Package,
      description: 'Manage items and stock levels',
      roles: ['ADMIN', 'WAREHOUSE_MANAGER', 'PURCHASING_STAFF', 'TECHNICIAN']
    },
    {
      id: 'purchasing',
      name: 'Purchasing',
      icon: ShoppingCart,
      description: 'Purchase orders and procurement',
      roles: ['ADMIN', 'PURCHASING_STAFF']
    },
    {
      id: 'suppliers',
      name: 'Suppliers',
      icon: Warehouse,
      description: 'Supplier management',
      roles: ['ADMIN', 'PURCHASING_STAFF']
    },
    {
      id: 'workorders',
      name: 'Work Orders',
      icon: ClipboardList,
      description: 'Work order management',
      roles: ['ADMIN', 'WAREHOUSE_MANAGER', 'TECHNICIAN']
    },
    {
      id: 'analytics',
      name: 'Analytics',
      icon: BarChart3,
      description: 'Reports and insights',
      roles: ['ADMIN', 'WAREHOUSE_MANAGER', 'PURCHASING_STAFF']
    },
    {
      id: 'users',
      name: 'Users',
      icon: Users,
      description: 'User management',
      roles: ['ADMIN']
    }
  ];

  const availableModules = modules.filter(module => 
    module.roles.includes(user.role)
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500';
      case 'WAREHOUSE_MANAGER': return 'bg-blue-500';
      case 'PURCHASING_STAFF': return 'bg-green-500';
      case 'TECHNICIAN': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <AnalyticsModule />;
      case 'inventory':
        return <InventoryModule userRole={user.role} />;
      case 'purchasing':
        return <PurchasingModule userRole={user.role} />;
      case 'suppliers':
        return <SupplierModule userRole={user.role} />;
      case 'workorders':
        return <WorkOrderModule userRole={user.role} />;
      case 'analytics':
        return <AnalyticsModule />;
      case 'users':
        return <UserModule />;
      default:
        return <AnalyticsModule />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Settings className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-slate-900">SME ERP</h1>
              </div>
              <Badge className={`${getRoleBadgeColor(user.role)} text-white`}>
                {user.role.replace('_', ' ')}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">Welcome, {user.name}</span>
              <Button variant="outline" size="sm">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Modules</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {availableModules.map((module) => {
                  const IconComponent = module.icon;
                  return (
                    <Button
                      key={module.id}
                      variant={activeModule === module.id ? "default" : "ghost"}
                      className="w-full justify-start space-x-2"
                      onClick={() => setActiveModule(module.id)}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{module.name}</span>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <span>Quick Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Low Stock Items</span>
                  <Badge variant="destructive">5</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Pending POs</span>
                  <Badge variant="secondary">3</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Open Work Orders</span>
                  <Badge variant="outline">7</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[600px]">
              {renderModule()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
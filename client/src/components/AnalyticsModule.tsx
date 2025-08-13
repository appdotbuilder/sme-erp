import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Package, 
  ShoppingCart, 
  ClipboardList, 
  DollarSign,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  InventoryHealthReport, 
  InventoryHealthItem, 
  PurchaseTrendsReport,
  PurchaseTrendInput,
  Item
} from '../../../server/src/schema';

export function AnalyticsModule() {
  const [inventoryHealth, setInventoryHealth] = useState<InventoryHealthReport | null>(null);
  const [purchaseTrends, setPurchaseTrends] = useState<PurchaseTrendsReport | null>(null);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Date range for purchase trends
  const [dateRange, setDateRange] = useState<PurchaseTrendInput>({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end_date: new Date().toISOString().split('T')[0] // Today
  });

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const [healthData, trendsData, lowStockData] = await Promise.all([
        trpc.analytics.inventoryHealth.query(),
        trpc.analytics.purchaseTrends.query(dateRange),
        trpc.inventory.lowStockAlerts.query()
      ]);
      
      setInventoryHealth(healthData);
      setPurchaseTrends(trendsData);
      setLowStockItems(lowStockData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleDateRangeChange = (field: 'start_date' | 'end_date', value: string) => {
    setDateRange((prev: PurchaseTrendInput) => ({
      ...prev,
      [field]: value
    }));
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'WARNING': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'HEALTHY': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'CRITICAL': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'WARNING': return <TrendingDown className="w-4 h-4 text-orange-500" />;
      case 'HEALTHY': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-2">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            <span>Analytics Dashboard</span>
          </h1>
          <p className="text-slate-600 mt-1">Monitor performance and track key metrics</p>
        </div>
        
        <Button
          onClick={loadAnalytics}
          disabled={isLoading}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Health</TabsTrigger>
          <TabsTrigger value="purchasing">Purchase Trends</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="flex items-center p-6">
                <Package className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">
                    {inventoryHealth?.summary.total_items || 0}
                  </p>
                  <p className="text-sm text-gray-600">Total Items</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-6">
                <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {inventoryHealth?.summary.critical_count || 0}
                  </p>
                  <p className="text-sm text-gray-600">Critical Items</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-6">
                <ShoppingCart className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">
                    {purchaseTrends?.summary.total_orders || 0}
                  </p>
                  <p className="text-sm text-gray-600">Purchase Orders</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-6">
                <DollarSign className="w-8 h-8 text-purple-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold">
                    ${purchaseTrends?.summary.total_expenditure.toFixed(0) || '0'}
                  </p>
                  <p className="text-sm text-gray-600">Total Spent</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Overview Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory Health Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>Inventory Health Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inventoryHealth ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-700 font-medium">Healthy Items</span>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        {inventoryHealth.summary.healthy_count}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center space-x-2">
                        <TrendingDown className="w-4 h-4 text-orange-500" />
                        <span className="text-orange-700 font-medium">Low Stock</span>
                      </div>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                        {inventoryHealth.summary.warning_count}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-red-700 font-medium">Critical Stock</span>
                      </div>
                      <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                        {inventoryHealth.summary.critical_count}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">Loading inventory data...</div>
                )}
              </CardContent>
            </Card>

            {/* Recent Purchase Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Purchase Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {purchaseTrends ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-2xl font-bold text-blue-600">
                          ${purchaseTrends.summary.average_order_value.toFixed(0)}
                        </p>
                        <p className="text-sm text-blue-700">Avg Order Value</p>
                      </div>
                      
                      <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-2xl font-bold text-purple-600">
                          {purchaseTrends.summary.total_orders}
                        </p>
                        <p className="text-sm text-purple-700">Total Orders</p>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-center">
                        <span className="text-2xl font-bold text-green-600">
                          ${purchaseTrends.summary.total_expenditure.toFixed(2)}
                        </span>
                      </p>
                      <p className="text-sm text-green-700 text-center">Total Expenditure</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">Loading purchase data...</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <div className="space-y-6">
            {/* Inventory Health Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold text-green-700">
                        {inventoryHealth?.summary.healthy_count || 0}
                      </p>
                      <p className="text-sm text-green-600">Healthy Items</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <TrendingDown className="w-8 h-8 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold text-orange-700">
                        {inventoryHealth?.summary.warning_count || 0}
                      </p>
                      <p className="text-sm text-orange-600">Low Stock</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold text-red-700">
                        {inventoryHealth?.summary.critical_count || 0}
                      </p>
                      <p className="text-sm text-red-600">Critical Stock</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Inventory Health Details */}
            {inventoryHealth && (
              <div className="space-y-6">
                {['critical', 'warning', 'healthy'].map((status) => {
                  const items = inventoryHealth[status as keyof typeof inventoryHealth] as InventoryHealthItem[];
                  if (items.length === 0) return null;
                  
                  return (
                    <Card key={status}>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 capitalize">
                          {getHealthIcon(status.toUpperCase())}
                          <span>{status} Items ({items.length})</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>SKU</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Current Stock</TableHead>
                              <TableHead>Minimum Stock</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item: InventoryHealthItem) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.sku}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>
                                  <span className={status === 'critical' ? 'text-red-600 font-medium' : 
                                                status === 'warning' ? 'text-orange-600 font-medium' : 
                                                'text-green-600'}>
                                    {item.current_stock}
                                  </span>
                                </TableCell>
                                <TableCell>{item.minimum_stock}</TableCell>
                                <TableCell>
                                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getHealthStatusColor(item.status)}`}>
                                    {getHealthIcon(item.status)}
                                    <span className="ml-1 capitalize">{item.status.toLowerCase()}</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="purchasing" className="mt-6">
          <div className="space-y-6">
            {/* Date Range Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Date Range</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={dateRange.start_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleDateRangeChange('start_date', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <Input
                      type="date"
                      value={dateRange.end_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleDateRangeChange('end_date', e.target.value)
                      }
                    />
                  </div>
                  <Button onClick={loadAnalytics} disabled={isLoading} className="mt-8">
                    Update Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Purchase Trends Summary */}
            {purchaseTrends && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-8 h-8 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">${purchaseTrends.summary.total_expenditure.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">Total Expenditure</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <ShoppingCart className="w-8 h-8 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{purchaseTrends.summary.total_orders}</p>
                        <p className="text-sm text-gray-600">Total Orders</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="w-8 h-8 text-purple-500" />
                      <div>
                        <p className="text-2xl font-bold">${purchaseTrends.summary.average_order_value.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">Avg Order Value</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Trends Data Table */}
            {purchaseTrends && purchaseTrends.trends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Purchase Trends by Period</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Order Count</TableHead>
                        <TableHead>Average per Order</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseTrends.trends.map((trend, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{trend.period}</TableCell>
                          <TableCell>${trend.total_amount.toFixed(2)}</TableCell>
                          <TableCell>{trend.order_count}</TableCell>
                          <TableCell>
                            ${trend.order_count > 0 ? (trend.total_amount / trend.order_count).toFixed(2) : '0.00'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <div className="space-y-6">
            {/* Low Stock Alerts */}
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-orange-700">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Low Stock Alerts ({lowStockItems.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lowStockItems.length > 0 ? (
                  <div className="grid gap-4">
                    {lowStockItems.map((item: Item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Package className="w-5 h-5 text-orange-500" />
                          <div>
                            <p className="font-medium text-orange-900">{item.name}</p>
                            <p className="text-sm text-orange-700">SKU: {item.sku}</p>
                            {item.description && (
                              <p className="text-xs text-orange-600 mt-1">{item.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <TrendingDown className="w-4 h-4 text-red-500" />
                            <span className="font-bold text-red-600">{item.current_stock}</span>
                            <span className="text-orange-600">/ {item.minimum_stock}</span>
                          </div>
                          <p className="text-xs text-orange-600">Current / Minimum</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-green-700 mb-2">All Good!</h3>
                    <p className="text-green-600">No low stock alerts at this time.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Critical Stock Items */}
            {inventoryHealth && inventoryHealth.critical.length > 0 && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Critical Stock Items (Out of Stock)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {inventoryHealth.critical.map((item: InventoryHealthItem) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <div>
                            <p className="font-medium text-red-900">{item.name}</p>
                            <p className="text-sm text-red-700">SKU: {item.sku}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">OUT OF STOCK</Badge>
                          <p className="text-xs text-red-600 mt-1">Min Required: {item.minimum_stock}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
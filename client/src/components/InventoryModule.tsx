import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Package, Plus, Edit, TrendingDown, TrendingUp, History } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Item, CreateItemInput, UpdateItemInput, AdjustStockInput, StockAdjustment, UserRole } from '../../../server/src/schema';

interface InventoryModuleProps {
  userRole: UserRole;
}

export function InventoryModule({ userRole }: InventoryModuleProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('items');
  
  // Form states
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [adjustStockOpen, setAdjustStockOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  const [createForm, setCreateForm] = useState<CreateItemInput>({
    sku: '',
    name: '',
    description: null,
    current_stock: 0,
    minimum_stock: 0,
    unit_price: 0
  });
  
  const [editForm, setEditForm] = useState<UpdateItemInput>({
    id: 0,
    sku: '',
    name: '',
    description: null,
    minimum_stock: 0,
    unit_price: 0
  });
  
  const [adjustForm, setAdjustForm] = useState<AdjustStockInput>({
    item_id: 0,
    adjustment_type: 'ADDITION',
    quantity_change: 0,
    reason: ''
  });

  const canModify = userRole === 'ADMIN' || userRole === 'WAREHOUSE_MANAGER';

  const loadItems = useCallback(async () => {
    try {
      const result = await trpc.inventory.items.list.query();
      setItems(result);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  }, []);

  const loadStockAdjustments = useCallback(async () => {
    try {
      const result = await trpc.inventory.adjustments.query();
      setStockAdjustments(result);
    } catch (error) {
      console.error('Failed to load stock adjustments:', error);
    }
  }, []);

  useEffect(() => {
    loadItems();
    loadStockAdjustments();
  }, [loadItems, loadStockAdjustments]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;
    
    setIsLoading(true);
    try {
      const response = await trpc.inventory.items.create.mutate(createForm);
      setItems((prev: Item[]) => [...prev, response]);
      setCreateForm({
        sku: '',
        name: '',
        description: null,
        current_stock: 0,
        minimum_stock: 0,
        unit_price: 0
      });
      setCreateItemOpen(false);
    } catch (error) {
      console.error('Failed to create item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify || !selectedItem) return;
    
    setIsLoading(true);
    try {
      const response = await trpc.inventory.items.update.mutate(editForm);
      setItems((prev: Item[]) => 
        prev.map(item => item.id === response.id ? response : item)
      );
      setEditItemOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;
    
    setIsLoading(true);
    try {
      const response = await trpc.inventory.adjustStock.mutate(adjustForm);
      // Reload items to get updated stock levels
      await loadItems();
      setStockAdjustments((prev: StockAdjustment[]) => [response, ...prev]);
      setAdjustForm({
        item_id: 0,
        adjustment_type: 'ADDITION',
        quantity_change: 0,
        reason: ''
      });
      setAdjustStockOpen(false);
    } catch (error) {
      console.error('Failed to adjust stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (item: Item) => {
    setSelectedItem(item);
    setEditForm({
      id: item.id,
      sku: item.sku,
      name: item.name,
      description: item.description,
      minimum_stock: item.minimum_stock,
      unit_price: item.unit_price
    });
    setEditItemOpen(true);
  };

  const getStockStatus = (item: Item) => {
    if (item.current_stock === 0) {
      return { status: 'Out of Stock', color: 'bg-red-500', textColor: 'text-red-700' };
    } else if (item.current_stock <= item.minimum_stock) {
      return { status: 'Low Stock', color: 'bg-orange-500', textColor: 'text-orange-700' };
    }
    return { status: 'In Stock', color: 'bg-green-500', textColor: 'text-green-700' };
  };

  const lowStockItems = items.filter(item => item.current_stock <= item.minimum_stock);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-2">
            <Package className="w-8 h-8 text-blue-600" />
            <span>Inventory Management</span>
          </h1>
          <p className="text-slate-600 mt-1">Manage items, track stock levels, and monitor inventory health</p>
        </div>
        
        {canModify && (
          <div className="flex space-x-2">
            <Dialog open={createItemOpen} onOpenChange={setCreateItemOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateItem} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="SKU"
                      value={createForm.sku}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateForm((prev: CreateItemInput) => ({ ...prev, sku: e.target.value }))
                      }
                      required
                    />
                    <Input
                      placeholder="Item Name"
                      value={createForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateForm((prev: CreateItemInput) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <Textarea
                    placeholder="Description (optional)"
                    value={createForm.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCreateForm((prev: CreateItemInput) => ({ 
                        ...prev, 
                        description: e.target.value || null 
                      }))
                    }
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      type="number"
                      placeholder="Current Stock"
                      value={createForm.current_stock}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateForm((prev: CreateItemInput) => ({ 
                          ...prev, 
                          current_stock: parseInt(e.target.value) || 0 
                        }))
                      }
                      min="0"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Minimum Stock"
                      value={createForm.minimum_stock}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateForm((prev: CreateItemInput) => ({ 
                          ...prev, 
                          minimum_stock: parseInt(e.target.value) || 0 
                        }))
                      }
                      min="0"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Unit Price"
                      value={createForm.unit_price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateForm((prev: CreateItemInput) => ({ 
                          ...prev, 
                          unit_price: parseFloat(e.target.value) || 0 
                        }))
                      }
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Item'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={adjustStockOpen} onOpenChange={setAdjustStockOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Adjust Stock</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Stock Adjustment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAdjustStock} className="space-y-4">
                  <Select 
                    value={adjustForm.item_id.toString()} 
                    onValueChange={(value: string) =>
                      setAdjustForm((prev: AdjustStockInput) => ({ 
                        ...prev, 
                        item_id: parseInt(value) 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item: Item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.sku} - {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={adjustForm.adjustment_type} 
                    onValueChange={(value: 'ADDITION' | 'REMOVAL' | 'CORRECTION') =>
                      setAdjustForm((prev: AdjustStockInput) => ({ 
                        ...prev, 
                        adjustment_type: value 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADDITION">Addition</SelectItem>
                      <SelectItem value="REMOVAL">Removal</SelectItem>
                      <SelectItem value="CORRECTION">Correction</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    type="number"
                    placeholder="Quantity Change"
                    value={adjustForm.quantity_change}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAdjustForm((prev: AdjustStockInput) => ({ 
                        ...prev, 
                        quantity_change: parseInt(e.target.value) || 0 
                      }))
                    }
                    required
                  />
                  
                  <Textarea
                    placeholder="Reason for adjustment"
                    value={adjustForm.reason}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setAdjustForm((prev: AdjustStockInput) => ({ 
                        ...prev, 
                        reason: e.target.value 
                      }))
                    }
                    required
                  />
                  
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Processing...' : 'Adjust Stock'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              <span>Low Stock Alert</span>
              <Badge variant="destructive">{lowStockItems.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {lowStockItems.map((item: Item) => (
                <div key={item.id} className="bg-white p-3 rounded border">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-gray-600">Stock: {item.current_stock}/{item.minimum_stock}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
          <TabsTrigger value="adjustments">
            <History className="w-4 h-4 mr-2" />
            Adjustments ({stockAdjustments.length})
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alerts ({lowStockItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Status</TableHead>
                  {canModify && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: Item) => {
                  const stockStatus = getStockStatus(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-gray-500">{item.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${stockStatus.textColor}`}>
                          {item.current_stock}
                        </span>
                      </TableCell>
                      <TableCell>{item.minimum_stock}</TableCell>
                      <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={`${stockStatus.color} text-white`}>
                          {stockStatus.status}
                        </Badge>
                      </TableCell>
                      {canModify && (
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity Change</TableHead>
                  <TableHead>Previous Stock</TableHead>
                  <TableHead>New Stock</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockAdjustments.map((adjustment: StockAdjustment) => {
                  const item = items.find((i: Item) => i.id === adjustment.item_id);
                  return (
                    <TableRow key={adjustment.id}>
                      <TableCell>{adjustment.created_at.toLocaleDateString()}</TableCell>
                      <TableCell>{item?.name || 'Unknown Item'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          adjustment.adjustment_type === 'ADDITION' ? 'default' :
                          adjustment.adjustment_type === 'REMOVAL' ? 'destructive' : 'secondary'
                        }>
                          {adjustment.adjustment_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={
                          adjustment.adjustment_type === 'ADDITION' ? 'text-green-600' : 'text-red-600'
                        }>
                          {adjustment.adjustment_type === 'ADDITION' ? '+' : '-'}
                          {Math.abs(adjustment.quantity_change)}
                        </span>
                      </TableCell>
                      <TableCell>{adjustment.previous_stock}</TableCell>
                      <TableCell>{adjustment.new_stock}</TableCell>
                      <TableCell className="max-w-xs truncate">{adjustment.reason}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <div className="grid gap-4">
            {lowStockItems.map((item: Item) => (
              <Card key={item.id} className="border-orange-200">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className="font-medium text-red-600">
                          {item.current_stock} / {item.minimum_stock}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Current / Minimum</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {lowStockItems.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600">No Low Stock Alerts</h3>
                  <p className="text-gray-500">All items are above their minimum stock levels.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Item Dialog */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditItem} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="SKU"
                value={editForm.sku || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev: UpdateItemInput) => ({ ...prev, sku: e.target.value }))
                }
              />
              <Input
                placeholder="Item Name"
                value={editForm.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev: UpdateItemInput) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <Textarea
              placeholder="Description (optional)"
              value={editForm.description || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setEditForm((prev: UpdateItemInput) => ({ 
                  ...prev, 
                  description: e.target.value || null 
                }))
              }
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Minimum Stock"
                value={editForm.minimum_stock || 0}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev: UpdateItemInput) => ({ 
                    ...prev, 
                    minimum_stock: parseInt(e.target.value) || 0 
                  }))
                }
                min="0"
              />
              <Input
                type="number"
                placeholder="Unit Price"
                value={editForm.unit_price || 0}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm((prev: UpdateItemInput) => ({ 
                    ...prev, 
                    unit_price: parseFloat(e.target.value) || 0 
                  }))
                }
                step="0.01"
                min="0"
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Item'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
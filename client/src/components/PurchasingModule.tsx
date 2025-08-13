import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Plus, FileText, DollarSign, Clock } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { PurchaseOrder, CreatePurchaseOrderInput, Item, Supplier, UserRole } from '../../../server/src/schema';

interface PurchasingModuleProps {
  userRole: UserRole;
}

export function PurchasingModule({ userRole }: PurchasingModuleProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [createPOOpen, setCreatePOOpen] = useState(false);
  const [formData, setFormData] = useState<CreatePurchaseOrderInput>({
    supplier_id: 0,
    items: [],
    notes: null
  });
  
  // Temporary state for adding items to PO
  const [newItem, setNewItem] = useState({
    item_id: 0,
    quantity: 0,
    unit_price: 0
  });

  const canCreatePO = userRole === 'ADMIN' || userRole === 'PURCHASING_STAFF';

  const loadData = useCallback(async () => {
    try {
      const [poData, itemData, supplierData] = await Promise.all([
        trpc.purchaseOrders.list.query(),
        trpc.inventory.items.list.query(),
        trpc.suppliers.list.query()
      ]);
      setPurchaseOrders(poData);
      setItems(itemData);
      setSuppliers(supplierData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreatePO || formData.items.length === 0) return;
    
    setIsLoading(true);
    try {
      const response = await trpc.purchaseOrders.create.mutate(formData);
      setPurchaseOrders((prev: PurchaseOrder[]) => [response, ...prev]);
      setFormData({
        supplier_id: 0,
        items: [],
        notes: null
      });
      setCreatePOOpen(false);
    } catch (error) {
      console.error('Failed to create purchase order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItemToPO = () => {
    if (newItem.item_id === 0 || newItem.quantity <= 0 || newItem.unit_price <= 0) return;
    
    setFormData((prev: CreatePurchaseOrderInput) => ({
      ...prev,
      items: [...prev.items, { ...newItem }]
    }));
    setNewItem({ item_id: 0, quantity: 0, unit_price: 0 });
  };

  const removeItemFromPO = (index: number) => {
    setFormData((prev: CreatePurchaseOrderInput) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-500';
      case 'PENDING': return 'bg-yellow-500';
      case 'APPROVED': return 'bg-green-500';
      case 'REJECTED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const calculatePOTotal = () => {
    return formData.items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
  };

  const getItemName = (itemId: number) => {
    const item = items.find((i: Item) => i.id === itemId);
    return item ? `${item.sku} - ${item.name}` : 'Unknown Item';
  };

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find((s: Supplier) => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-2">
            <ShoppingCart className="w-8 h-8 text-green-600" />
            <span>Purchase Management</span>
          </h1>
          <p className="text-slate-600 mt-1">Create and manage purchase orders</p>
        </div>
        
        {canCreatePO && (
          <Dialog open={createPOOpen} onOpenChange={setCreatePOOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Create Purchase Order</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create New Purchase Order</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePO} className="space-y-6">
                {/* Supplier Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Supplier</label>
                  <Select 
                    value={formData.supplier_id.toString()} 
                    onValueChange={(value: string) =>
                      setFormData((prev: CreatePurchaseOrderInput) => ({ 
                        ...prev, 
                        supplier_id: parseInt(value) 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier: Supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Items Section */}
                <div>
                  <label className="block text-sm font-medium mb-2">Items</label>
                  
                  {/* Add Item Form */}
                  <Card className="p-4 mb-4">
                    <div className="grid grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-medium mb-1">Item</label>
                        <Select 
                          value={newItem.item_id.toString()} 
                          onValueChange={(value: string) =>
                            setNewItem(prev => ({ 
                              ...prev, 
                              item_id: parseInt(value),
                              unit_price: items.find((item: Item) => item.id === parseInt(value))?.unit_price || 0
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
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium mb-1">Quantity</label>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={newItem.quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewItem(prev => ({ 
                              ...prev, 
                              quantity: parseInt(e.target.value) || 0 
                            }))
                          }
                          min="1"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium mb-1">Unit Price</label>
                        <Input
                          type="number"
                          placeholder="Price"
                          value={newItem.unit_price}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewItem(prev => ({ 
                              ...prev, 
                              unit_price: parseFloat(e.target.value) || 0 
                            }))
                          }
                          step="0.01"
                          min="0"
                        />
                      </div>
                      
                      <Button type="button" onClick={addItemToPO}>
                        Add Item
                      </Button>
                    </div>
                  </Card>

                  {/* Items List */}
                  {formData.items.length > 0 && (
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Unit Price</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{getItemName(item.item_id)}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                              <TableCell>${(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeItemFromPO(index)}
                                >
                                  Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell colSpan={3} className="font-bold">Total:</TableCell>
                            <TableCell className="font-bold">${calculatePOTotal().toFixed(2)}</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Card>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                  <Textarea
                    placeholder="Additional notes or instructions..."
                    value={formData.notes || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData((prev: CreatePurchaseOrderInput) => ({ 
                        ...prev, 
                        notes: e.target.value || null 
                      }))
                    }
                  />
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-lg font-semibold">
                    Total Amount: ${calculatePOTotal().toFixed(2)}
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading || formData.items.length === 0 || formData.supplier_id === 0}
                  >
                    {isLoading ? 'Creating...' : 'Create Purchase Order'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <FileText className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{purchaseOrders.length}</p>
              <p className="text-sm text-gray-600">Total Orders</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="w-8 h-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">
                {purchaseOrders.filter((po: PurchaseOrder) => po.status === 'PENDING').length}
              </p>
              <p className="text-sm text-gray-600">Pending Orders</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <ShoppingCart className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">
                {purchaseOrders.filter((po: PurchaseOrder) => po.status === 'APPROVED').length}
              </p>
              <p className="text-sm text-gray-600">Approved Orders</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">
                ${purchaseOrders.reduce((total: number, po: PurchaseOrder) => total + po.total_amount, 0).toFixed(0)}
              </p>
              <p className="text-sm text-gray-600">Total Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Purchase Orders</h3>
              <p className="text-gray-500 mb-4">Create your first purchase order to get started.</p>
              {canCreatePO && (
                <Button onClick={() => setCreatePOOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Purchase Order
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po: PurchaseOrder) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>{getSupplierName(po.supplier_id)}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(po.status)} text-white`}>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell>${po.total_amount.toFixed(2)}</TableCell>
                    <TableCell>{po.created_at.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {po.notes && (
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-600 truncate" title={po.notes}>
                            {po.notes}
                          </p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
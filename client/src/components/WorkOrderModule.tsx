import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, Plus, CheckCircle, Clock, Play, User } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { WorkOrder, CreateWorkOrderInput, CompleteWorkOrderInput, Item, User as UserType, UserRole } from '../../../server/src/schema';

interface WorkOrderModuleProps {
  userRole: UserRole;
}

export function WorkOrderModule({ userRole }: WorkOrderModuleProps) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [createWOOpen, setCreateWOOpen] = useState(false);
  const [completeWOOpen, setCompleteWOOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  
  const [createForm, setCreateForm] = useState<CreateWorkOrderInput>({
    description: '',
    assigned_technician: '',
    items: []
  });
  
  // Temporary state for adding items to work order
  const [newItem, setNewItem] = useState({
    item_id: 0,
    quantity_used: 0
  });

  const canCreateWO = userRole === 'ADMIN' || userRole === 'WAREHOUSE_MANAGER';
  const canCompleteWO = userRole === 'ADMIN' || userRole === 'TECHNICIAN';

  const loadData = useCallback(async () => {
    try {
      const [woData, itemData, userData] = await Promise.all([
        trpc.workOrders.list.query(),
        trpc.inventory.items.list.query(),
        trpc.users.list.query()
      ]);
      setWorkOrders(woData);
      setItems(itemData);
      setUsers(userData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateWO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateWO || createForm.items.length === 0) return;
    
    setIsLoading(true);
    try {
      const response = await trpc.workOrders.create.mutate(createForm);
      setWorkOrders((prev: WorkOrder[]) => [response, ...prev]);
      setCreateForm({
        description: '',
        assigned_technician: '',
        items: []
      });
      setCreateWOOpen(false);
    } catch (error) {
      console.error('Failed to create work order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteWO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCompleteWO || !selectedWO) return;
    
    setIsLoading(true);
    try {
      const input: CompleteWorkOrderInput = { work_order_id: selectedWO.id };
      const response = await trpc.workOrders.complete.mutate(input);
      setWorkOrders((prev: WorkOrder[]) => 
        prev.map(wo => wo.id === response.id ? response : wo)
      );
      setCompleteWOOpen(false);
      setSelectedWO(null);
    } catch (error) {
      console.error('Failed to complete work order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItemToWO = () => {
    if (newItem.item_id === 0 || newItem.quantity_used <= 0) return;
    
    setCreateForm((prev: CreateWorkOrderInput) => ({
      ...prev,
      items: [...prev.items, { ...newItem }]
    }));
    setNewItem({ item_id: 0, quantity_used: 0 });
  };

  const removeItemFromWO = (index: number) => {
    setCreateForm((prev: CreateWorkOrderInput) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-500';
      case 'IN_PROGRESS': return 'bg-yellow-500';
      case 'COMPLETED': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getItemName = (itemId: number) => {
    const item = items.find((i: Item) => i.id === itemId);
    return item ? `${item.sku} - ${item.name}` : 'Unknown Item';
  };

  const getUserName = (clerkId: string) => {
    const user = users.find((u: UserType) => u.clerk_id === clerkId);
    return user ? user.name : clerkId;
  };

  const technicians = users.filter((user: UserType) => 
    user.role === 'TECHNICIAN' || user.role === 'ADMIN'
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-2">
            <ClipboardList className="w-8 h-8 text-purple-600" />
            <span>Work Order Management</span>
          </h1>
          <p className="text-slate-600 mt-1">Create and track work orders with material consumption</p>
        </div>
        
        {canCreateWO && (
          <Dialog open={createWOOpen} onOpenChange={setCreateWOOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Create Work Order</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create New Work Order</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateWO} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <Textarea
                      placeholder="Describe the work to be performed..."
                      value={createForm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCreateForm((prev: CreateWorkOrderInput) => ({ 
                          ...prev, 
                          description: e.target.value 
                        }))
                      }
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Assigned Technician</label>
                    <Select 
                      value={createForm.assigned_technician} 
                      onValueChange={(value: string) =>
                        setCreateForm((prev: CreateWorkOrderInput) => ({ 
                          ...prev, 
                          assigned_technician: value 
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Technician" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.map((tech: UserType) => (
                          <SelectItem key={tech.clerk_id} value={tech.clerk_id}>
                            {tech.name} ({tech.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Materials Section */}
                <div>
                  <label className="block text-sm font-medium mb-2">Materials to be Used</label>
                  
                  {/* Add Material Form */}
                  <Card className="p-4 mb-4">
                    <div className="grid grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-medium mb-1">Item</label>
                        <Select 
                          value={newItem.item_id.toString()} 
                          onValueChange={(value: string) =>
                            setNewItem(prev => ({ 
                              ...prev, 
                              item_id: parseInt(value)
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Item" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.filter((item: Item) => item.current_stock > 0).map((item: Item) => (
                              <SelectItem key={item.id} value={item.id.toString()}>
                                {item.sku} - {item.name} (Stock: {item.current_stock})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium mb-1">Quantity to Use</label>
                        <Input
                          type="number"
                          placeholder="Quantity"
                          value={newItem.quantity_used}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewItem(prev => ({ 
                              ...prev, 
                              quantity_used: parseInt(e.target.value) || 0 
                            }))
                          }
                          min="1"
                          max={items.find((item: Item) => item.id === newItem.item_id)?.current_stock || 999}
                        />
                      </div>
                      
                      <Button type="button" onClick={addItemToWO}>
                        Add Material
                      </Button>
                    </div>
                  </Card>

                  {/* Materials List */}
                  {createForm.items.length > 0 && (
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Quantity to Use</TableHead>
                            <TableHead>Available Stock</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {createForm.items.map((item, index) => {
                            const stockItem = items.find((i: Item) => i.id === item.item_id);
                            return (
                              <TableRow key={index}>
                                <TableCell>{getItemName(item.item_id)}</TableCell>
                                <TableCell>{item.quantity_used}</TableCell>
                                <TableCell>
                                  <Badge variant={stockItem && stockItem.current_stock >= item.quantity_used ? 'default' : 'destructive'}>
                                    {stockItem?.current_stock || 0}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeItemFromWO(index)}
                                  >
                                    Remove
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Card>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    type="submit" 
                    disabled={isLoading || createForm.items.length === 0 || !createForm.assigned_technician || !createForm.description}
                  >
                    {isLoading ? 'Creating...' : 'Create Work Order'}
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
            <ClipboardList className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{workOrders.length}</p>
              <p className="text-sm text-gray-600">Total Orders</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">
                {workOrders.filter((wo: WorkOrder) => wo.status === 'OPEN').length}
              </p>
              <p className="text-sm text-gray-600">Open</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Play className="w-8 h-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">
                {workOrders.filter((wo: WorkOrder) => wo.status === 'IN_PROGRESS').length}
              </p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">
                {workOrders.filter((wo: WorkOrder) => wo.status === 'COMPLETED').length}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Work Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {workOrders.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Work Orders</h3>
              <p className="text-gray-500 mb-4">Create your first work order to get started.</p>
              {canCreateWO && (
                <Button onClick={() => setCreateWOOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Work Order
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Order #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Completed</TableHead>
                  {canCompleteWO && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrders.map((wo: WorkOrder) => (
                  <TableRow key={wo.id}>
                    <TableCell className="font-medium">{wo.work_order_number}</TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm truncate" title={wo.description}>
                          {wo.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{getUserName(wo.assigned_technician)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(wo.status)} text-white`}>
                        {wo.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{wo.created_at.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {wo.completed_at ? wo.completed_at.toLocaleDateString() : '-'}
                    </TableCell>
                    {canCompleteWO && (
                      <TableCell>
                        {wo.status !== 'COMPLETED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedWO(wo);
                              setCompleteWOOpen(true);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Complete Work Order Dialog */}
      <Dialog open={completeWOOpen} onOpenChange={setCompleteWOOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Work Order</DialogTitle>
          </DialogHeader>
          {selectedWO && (
            <form onSubmit={handleCompleteWO} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Work Order Details</h3>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>WO #:</strong> {selectedWO.work_order_number}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Description:</strong> {selectedWO.description}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Assigned to:</strong> {getUserName(selectedWO.assigned_technician)}
                </p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  ⚠️ Completing this work order will automatically deduct the associated materials from inventory.
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setCompleteWOOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Completing...' : 'Complete Work Order'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
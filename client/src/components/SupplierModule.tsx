import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Warehouse, Plus, Mail, Phone, MapPin, CreditCard, FileText, Eye, EyeOff } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Supplier, CreateSupplierInput, UserRole } from '../../../server/src/schema';

interface SupplierModuleProps {
  userRole: UserRole;
}

export function SupplierModule({ userRole }: SupplierModuleProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState<Record<number, boolean>>({});
  
  const [formData, setFormData] = useState<CreateSupplierInput>({
    name: '',
    contact_email: null,
    contact_phone: null,
    address: null,
    bank_account: null,
    tax_id: null
  });

  const canManageSuppliers = userRole === 'ADMIN' || userRole === 'PURCHASING_STAFF';
  const canViewSensitiveData = userRole === 'ADMIN' || userRole === 'PURCHASING_STAFF';

  const loadSuppliers = useCallback(async () => {
    try {
      const result = await trpc.suppliers.list.query();
      setSuppliers(result);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSuppliers) return;
    
    setIsLoading(true);
    try {
      const response = await trpc.suppliers.create.mutate(formData);
      setSuppliers((prev: Supplier[]) => [response, ...prev]);
      setFormData({
        name: '',
        contact_email: null,
        contact_phone: null,
        address: null,
        bank_account: null,
        tax_id: null
      });
      setCreateSupplierOpen(false);
    } catch (error) {
      console.error('Failed to create supplier:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSensitiveInfo = (supplierId: number) => {
    setShowSensitiveInfo(prev => ({
      ...prev,
      [supplierId]: !prev[supplierId]
    }));
  };

  const maskSensitiveData = (data: string | null, revealed: boolean) => {
    if (!data) return 'Not provided';
    if (revealed) return data;
    return data.slice(0, 4) + '****' + data.slice(-4);
  };

  const getSupplierCompleteness = (supplier: Supplier) => {
    const fields = [
      supplier.contact_email,
      supplier.contact_phone,
      supplier.address,
      supplier.bank_account,
      supplier.tax_id
    ];
    const filledFields = fields.filter(field => field !== null && field !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const getCompletenessColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-2">
            <Warehouse className="w-8 h-8 text-orange-600" />
            <span>Supplier Management</span>
          </h1>
          <p className="text-slate-600 mt-1">Manage supplier information and relationships</p>
        </div>
        
        {canManageSuppliers && (
          <Dialog open={createSupplierOpen} onOpenChange={setCreateSupplierOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Supplier</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSupplier} className="space-y-4">
                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium mb-2">Supplier Name *</label>
                  <Input
                    placeholder="Company Name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSupplierInput) => ({ 
                        ...prev, 
                        name: e.target.value 
                      }))
                    }
                    required
                  />
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Email</label>
                    <Input
                      type="email"
                      placeholder="contact@supplier.com"
                      value={formData.contact_email || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateSupplierInput) => ({ 
                          ...prev, 
                          contact_email: e.target.value || null 
                        }))
                      }
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Phone</label>
                    <Input
                      placeholder="+1 (555) 123-4567"
                      value={formData.contact_phone || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateSupplierInput) => ({ 
                          ...prev, 
                          contact_phone: e.target.value || null 
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <Input
                    placeholder="Street Address, City, State, ZIP"
                    value={formData.address || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateSupplierInput) => ({ 
                        ...prev, 
                        address: e.target.value || null 
                      }))
                    }
                  />
                </div>

                {/* Financial Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Bank Account Number
                      <span className="text-xs text-gray-500 ml-1">(Encrypted)</span>
                    </label>
                    <Input
                      placeholder="Bank account details"
                      value={formData.bank_account || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateSupplierInput) => ({ 
                          ...prev, 
                          bank_account: e.target.value || null 
                        }))
                      }
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tax ID
                      <span className="text-xs text-gray-500 ml-1">(Encrypted)</span>
                    </label>
                    <Input
                      placeholder="Tax identification number"
                      value={formData.tax_id || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateSupplierInput) => ({ 
                          ...prev, 
                          tax_id: e.target.value || null 
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    🔒 Financial information (Bank Account and Tax ID) will be encrypted and stored securely.
                  </p>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Supplier'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <Warehouse className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">{suppliers.length}</p>
              <p className="text-sm text-gray-600">Total Suppliers</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <Mail className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">
                {suppliers.filter((s: Supplier) => s.contact_email).length}
              </p>
              <p className="text-sm text-gray-600">With Email</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <CreditCard className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <p className="text-2xl font-bold">
                {suppliers.filter((s: Supplier) => s.bank_account).length}
              </p>
              <p className="text-sm text-gray-600">With Banking Info</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Suppliers Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-12">
              <Warehouse className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Suppliers</h3>
              <p className="text-gray-500 mb-4">Add your first supplier to get started.</p>
              {canManageSuppliers && (
                <Button onClick={() => setCreateSupplierOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Supplier
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Address</TableHead>
                  {canViewSensitiveData && <TableHead>Financial Info</TableHead>}
                  <TableHead>Profile</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier: Supplier) => {
                  const completeness = getSupplierCompleteness(supplier);
                  const isRevealed = showSensitiveInfo[supplier.id] || false;
                  
                  return (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          <p className="text-xs text-gray-500">ID: {supplier.id}</p>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          {supplier.contact_email && (
                            <div className="flex items-center space-x-1 text-sm">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span>{supplier.contact_email}</span>
                            </div>
                          )}
                          {supplier.contact_phone && (
                            <div className="flex items-center space-x-1 text-sm">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{supplier.contact_phone}</span>
                            </div>
                          )}
                          {!supplier.contact_email && !supplier.contact_phone && (
                            <span className="text-sm text-gray-400">No contact info</span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {supplier.address ? (
                          <div className="flex items-start space-x-1 text-sm max-w-xs">
                            <MapPin className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="truncate" title={supplier.address}>
                              {supplier.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No address</span>
                        )}
                      </TableCell>
                      
                      {canViewSensitiveData && (
                        <TableCell>
                          <div className="space-y-2">
                            {(supplier.bank_account || supplier.tax_id) ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleSensitiveInfo(supplier.id)}
                                  className="p-1 h-auto"
                                >
                                  {isRevealed ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </Button>
                                
                                <div className="space-y-1 text-xs">
                                  {supplier.bank_account && (
                                    <div className="flex items-center space-x-1">
                                      <CreditCard className="w-3 h-3 text-gray-400" />
                                      <span>{maskSensitiveData(supplier.bank_account, isRevealed)}</span>
                                    </div>
                                  )}
                                  {supplier.tax_id && (
                                    <div className="flex items-center space-x-1">
                                      <FileText className="w-3 h-3 text-gray-400" />
                                      <span>{maskSensitiveData(supplier.tax_id, isRevealed)}</span>
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span className="text-sm text-gray-400">No financial info</span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge className={`${getCompletenessColor(completeness)} text-white text-xs`}>
                            {completeness}%
                          </Badge>
                          <span className="text-xs text-gray-500">Complete</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {supplier.created_at.toLocaleDateString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
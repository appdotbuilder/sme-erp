import { z } from 'zod';

// Enum definitions
export const userRoleSchema = z.enum(['ADMIN', 'WAREHOUSE_MANAGER', 'PURCHASING_STAFF', 'TECHNICIAN']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const purchaseOrderStatusSchema = z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']);
export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusSchema>;

export const workOrderStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED']);
export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>;

export const stockAdjustmentTypeSchema = z.enum(['ADDITION', 'REMOVAL', 'CORRECTION']);
export type StockAdjustmentType = z.infer<typeof stockAdjustmentTypeSchema>;

export const inventoryHealthStatusSchema = z.enum(['CRITICAL', 'WARNING', 'HEALTHY']);
export type InventoryHealthStatus = z.infer<typeof inventoryHealthStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.string(),
  clerk_id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;

// Items schema
export const itemSchema = z.object({
  id: z.number(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  current_stock: z.number().int(),
  minimum_stock: z.number().int(),
  unit_price: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Item = z.infer<typeof itemSchema>;

// Suppliers schema
export const supplierSchema = z.object({
  id: z.number(),
  name: z.string(),
  contact_email: z.string().email().nullable(),
  contact_phone: z.string().nullable(),
  address: z.string().nullable(),
  bank_account: z.string().nullable(), // Encrypted field
  tax_id: z.string().nullable(), // Encrypted field
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Supplier = z.infer<typeof supplierSchema>;

// Purchase Orders schema
export const purchaseOrderSchema = z.object({
  id: z.number(),
  po_number: z.string(),
  supplier_id: z.number(),
  status: purchaseOrderStatusSchema,
  total_amount: z.number(),
  notes: z.string().nullable(),
  created_by: z.string(), // User clerk_id
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

// Purchase Order Items schema
export const purchaseOrderItemSchema = z.object({
  id: z.number(),
  po_id: z.number(),
  item_id: z.number(),
  quantity: z.number().int(),
  unit_price: z.number(),
  total_price: z.number(),
});

export type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>;

// Work Orders schema
export const workOrderSchema = z.object({
  id: z.number(),
  work_order_number: z.string(),
  description: z.string(),
  assigned_technician: z.string(), // User clerk_id
  status: workOrderStatusSchema,
  created_by: z.string(), // User clerk_id
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
});

export type WorkOrder = z.infer<typeof workOrderSchema>;

// Work Order Items schema
export const workOrderItemSchema = z.object({
  id: z.number(),
  work_order_id: z.number(),
  item_id: z.number(),
  quantity_used: z.number().int(),
});

export type WorkOrderItem = z.infer<typeof workOrderItemSchema>;

// Stock Adjustments schema
export const stockAdjustmentSchema = z.object({
  id: z.number(),
  item_id: z.number(),
  adjustment_type: stockAdjustmentTypeSchema,
  quantity_change: z.number().int(),
  reason: z.string(),
  previous_stock: z.number().int(),
  new_stock: z.number().int(),
  adjusted_by: z.string(), // User clerk_id
  created_at: z.coerce.date(),
});

export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;

// Input schemas for creating/updating entities

export const createUserInputSchema = z.object({
  clerk_id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createItemInputSchema = z.object({
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  current_stock: z.number().int().nonnegative(),
  minimum_stock: z.number().int().nonnegative(),
  unit_price: z.number().positive(),
});

export type CreateItemInput = z.infer<typeof createItemInputSchema>;

export const updateItemInputSchema = z.object({
  id: z.number(),
  sku: z.string().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  minimum_stock: z.number().int().nonnegative().optional(),
  unit_price: z.number().positive().optional(),
});

export type UpdateItemInput = z.infer<typeof updateItemInputSchema>;

export const createSupplierInputSchema = z.object({
  name: z.string(),
  contact_email: z.string().email().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  bank_account: z.string().nullable().optional(),
  tax_id: z.string().nullable().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierInputSchema>;

export const adjustStockInputSchema = z.object({
  item_id: z.number(),
  adjustment_type: stockAdjustmentTypeSchema,
  quantity_change: z.number().int(),
  reason: z.string(),
});

export type AdjustStockInput = z.infer<typeof adjustStockInputSchema>;

export const createPurchaseOrderInputSchema = z.object({
  supplier_id: z.number(),
  items: z.array(z.object({
    item_id: z.number(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
  })),
  notes: z.string().nullable().optional(),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderInputSchema>;

export const createWorkOrderInputSchema = z.object({
  description: z.string(),
  assigned_technician: z.string(),
  items: z.array(z.object({
    item_id: z.number(),
    quantity_used: z.number().int().positive(),
  })),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderInputSchema>;

export const completeWorkOrderInputSchema = z.object({
  work_order_id: z.number(),
});

export type CompleteWorkOrderInput = z.infer<typeof completeWorkOrderInputSchema>;

// Analytics schemas
export const inventoryHealthItemSchema = z.object({
  id: z.number(),
  sku: z.string(),
  name: z.string(),
  current_stock: z.number().int(),
  minimum_stock: z.number().int(),
  status: inventoryHealthStatusSchema,
});

export type InventoryHealthItem = z.infer<typeof inventoryHealthItemSchema>;

export const inventoryHealthReportSchema = z.object({
  critical: z.array(inventoryHealthItemSchema),
  warning: z.array(inventoryHealthItemSchema),
  healthy: z.array(inventoryHealthItemSchema),
  summary: z.object({
    total_items: z.number(),
    critical_count: z.number(),
    warning_count: z.number(),
    healthy_count: z.number(),
  }),
});

export type InventoryHealthReport = z.infer<typeof inventoryHealthReportSchema>;

export const purchaseTrendInputSchema = z.object({
  start_date: z.string(), // ISO date string
  end_date: z.string(), // ISO date string
});

export type PurchaseTrendInput = z.infer<typeof purchaseTrendInputSchema>;

export const purchaseTrendDataSchema = z.object({
  period: z.string(),
  total_amount: z.number(),
  order_count: z.number(),
});

export type PurchaseTrendData = z.infer<typeof purchaseTrendDataSchema>;

export const purchaseTrendsReportSchema = z.object({
  trends: z.array(purchaseTrendDataSchema),
  summary: z.object({
    total_expenditure: z.number(),
    total_orders: z.number(),
    average_order_value: z.number(),
  }),
});

export type PurchaseTrendsReport = z.infer<typeof purchaseTrendsReportSchema>;
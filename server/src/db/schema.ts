import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'WAREHOUSE_MANAGER', 'PURCHASING_STAFF', 'TECHNICIAN']);
export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']);
export const workOrderStatusEnum = pgEnum('work_order_status', ['OPEN', 'IN_PROGRESS', 'COMPLETED']);
export const stockAdjustmentTypeEnum = pgEnum('stock_adjustment_type', ['ADDITION', 'REMOVAL', 'CORRECTION']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  clerk_id: text('clerk_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Items table
export const itemsTable = pgTable('items', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  current_stock: integer('current_stock').notNull().default(0),
  minimum_stock: integer('minimum_stock').notNull().default(0),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Suppliers table
export const suppliersTable = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  contact_email: text('contact_email'),
  contact_phone: text('contact_phone'),
  address: text('address'),
  bank_account: text('bank_account'), // Encrypted field
  tax_id: text('tax_id'), // Encrypted field
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Purchase Orders table
export const purchaseOrdersTable = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  po_number: text('po_number').notNull().unique(),
  supplier_id: integer('supplier_id').notNull(),
  status: purchaseOrderStatusEnum('status').notNull().default('DRAFT'),
  total_amount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  created_by: text('created_by').notNull(), // User clerk_id
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Purchase Order Items table
export const purchaseOrderItemsTable = pgTable('purchase_order_items', {
  id: serial('id').primaryKey(),
  po_id: integer('po_id').notNull(),
  item_id: integer('item_id').notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 12, scale: 2 }).notNull(),
});

// Work Orders table
export const workOrdersTable = pgTable('work_orders', {
  id: serial('id').primaryKey(),
  work_order_number: text('work_order_number').notNull().unique(),
  description: text('description').notNull(),
  assigned_technician: text('assigned_technician').notNull(), // User clerk_id
  status: workOrderStatusEnum('status').notNull().default('OPEN'),
  created_by: text('created_by').notNull(), // User clerk_id
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'),
});

// Work Order Items table
export const workOrderItemsTable = pgTable('work_order_items', {
  id: serial('id').primaryKey(),
  work_order_id: integer('work_order_id').notNull(),
  item_id: integer('item_id').notNull(),
  quantity_used: integer('quantity_used').notNull(),
});

// Stock Adjustments table
export const stockAdjustmentsTable = pgTable('stock_adjustments', {
  id: serial('id').primaryKey(),
  item_id: integer('item_id').notNull(),
  adjustment_type: stockAdjustmentTypeEnum('adjustment_type').notNull(),
  quantity_change: integer('quantity_change').notNull(),
  reason: text('reason').notNull(),
  previous_stock: integer('previous_stock').notNull(),
  new_stock: integer('new_stock').notNull(),
  adjusted_by: text('adjusted_by').notNull(), // User clerk_id
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  purchaseOrders: many(purchaseOrdersTable),
  workOrdersCreated: many(workOrdersTable, { relationName: 'workOrderCreator' }),
  workOrdersAssigned: many(workOrdersTable, { relationName: 'workOrderTechnician' }),
  stockAdjustments: many(stockAdjustmentsTable),
}));

export const itemsRelations = relations(itemsTable, ({ many }) => ({
  purchaseOrderItems: many(purchaseOrderItemsTable),
  workOrderItems: many(workOrderItemsTable),
  stockAdjustments: many(stockAdjustmentsTable),
}));

export const suppliersRelations = relations(suppliersTable, ({ many }) => ({
  purchaseOrders: many(purchaseOrdersTable),
}));

export const purchaseOrdersRelations = relations(purchaseOrdersTable, ({ one, many }) => ({
  supplier: one(suppliersTable, {
    fields: [purchaseOrdersTable.supplier_id],
    references: [suppliersTable.id],
  }),
  creator: one(usersTable, {
    fields: [purchaseOrdersTable.created_by],
    references: [usersTable.clerk_id],
  }),
  items: many(purchaseOrderItemsTable),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItemsTable, ({ one }) => ({
  purchaseOrder: one(purchaseOrdersTable, {
    fields: [purchaseOrderItemsTable.po_id],
    references: [purchaseOrdersTable.id],
  }),
  item: one(itemsTable, {
    fields: [purchaseOrderItemsTable.item_id],
    references: [itemsTable.id],
  }),
}));

export const workOrdersRelations = relations(workOrdersTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [workOrdersTable.created_by],
    references: [usersTable.clerk_id],
    relationName: 'workOrderCreator',
  }),
  technician: one(usersTable, {
    fields: [workOrdersTable.assigned_technician],
    references: [usersTable.clerk_id],
    relationName: 'workOrderTechnician',
  }),
  items: many(workOrderItemsTable),
}));

export const workOrderItemsRelations = relations(workOrderItemsTable, ({ one }) => ({
  workOrder: one(workOrdersTable, {
    fields: [workOrderItemsTable.work_order_id],
    references: [workOrdersTable.id],
  }),
  item: one(itemsTable, {
    fields: [workOrderItemsTable.item_id],
    references: [itemsTable.id],
  }),
}));

export const stockAdjustmentsRelations = relations(stockAdjustmentsTable, ({ one }) => ({
  item: one(itemsTable, {
    fields: [stockAdjustmentsTable.item_id],
    references: [itemsTable.id],
  }),
  adjustedBy: one(usersTable, {
    fields: [stockAdjustmentsTable.adjusted_by],
    references: [usersTable.clerk_id],
  }),
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  items: itemsTable,
  suppliers: suppliersTable,
  purchaseOrders: purchaseOrdersTable,
  purchaseOrderItems: purchaseOrderItemsTable,
  workOrders: workOrdersTable,
  workOrderItems: workOrderItemsTable,
  stockAdjustments: stockAdjustmentsTable,
};

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Item = typeof itemsTable.$inferSelect;
export type NewItem = typeof itemsTable.$inferInsert;

export type Supplier = typeof suppliersTable.$inferSelect;
export type NewSupplier = typeof suppliersTable.$inferInsert;

export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrdersTable.$inferInsert;

export type PurchaseOrderItem = typeof purchaseOrderItemsTable.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItemsTable.$inferInsert;

export type WorkOrder = typeof workOrdersTable.$inferSelect;
export type NewWorkOrder = typeof workOrdersTable.$inferInsert;

export type WorkOrderItem = typeof workOrderItemsTable.$inferSelect;
export type NewWorkOrderItem = typeof workOrderItemsTable.$inferInsert;

export type StockAdjustment = typeof stockAdjustmentsTable.$inferSelect;
export type NewStockAdjustment = typeof stockAdjustmentsTable.$inferInsert;
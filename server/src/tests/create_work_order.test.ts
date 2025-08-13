import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, itemsTable, workOrdersTable, workOrderItemsTable } from '../db/schema';
import { type CreateWorkOrderInput } from '../schema';
import { createWorkOrder } from '../handlers/create_work_order';
import { eq } from 'drizzle-orm';

// Test data setup
const testTechnician = {
  clerk_id: 'tech_001',
  email: 'tech@example.com',
  name: 'Test Technician',
  role: 'TECHNICIAN' as const,
};

const testCreator = {
  clerk_id: 'creator_001',
  email: 'creator@example.com',
  name: 'Test Creator',
  role: 'ADMIN' as const,
};

const testNonTechnician = {
  clerk_id: 'admin_001',
  email: 'admin@example.com',
  name: 'Test Admin',
  role: 'ADMIN' as const,
};

const testItem1 = {
  sku: 'ITEM001',
  name: 'Test Item 1',
  description: 'Test item description',
  current_stock: 100,
  minimum_stock: 10,
  unit_price: '25.50',
};

const testItem2 = {
  sku: 'ITEM002',
  name: 'Test Item 2',
  description: 'Another test item',
  current_stock: 50,
  minimum_stock: 5,
  unit_price: '15.75',
};

const lowStockItem = {
  sku: 'LOWSTOCK',
  name: 'Low Stock Item',
  description: 'Item with insufficient stock',
  current_stock: 2,
  minimum_stock: 1,
  unit_price: '10.00',
};

describe('createWorkOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a work order successfully', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values([testTechnician, testCreator]).execute();
    const items = await db.insert(itemsTable).values([testItem1, testItem2]).returning().execute();

    const testInput: CreateWorkOrderInput = {
      description: 'Test work order for maintenance',
      assigned_technician: testTechnician.clerk_id,
      items: [
        { item_id: items[0].id, quantity_used: 5 },
        { item_id: items[1].id, quantity_used: 3 },
      ],
    };

    const result = await createWorkOrder(testInput, testCreator.clerk_id);

    // Validate basic fields
    expect(result.id).toBeDefined();
    expect(result.work_order_number).toMatch(/^WO-\d{4}-\d{2}-\d{2}-\d{4}$/);
    expect(result.description).toEqual('Test work order for maintenance');
    expect(result.assigned_technician).toEqual(testTechnician.clerk_id);
    expect(result.status).toEqual('OPEN');
    expect(result.created_by).toEqual(testCreator.clerk_id);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
  });

  it('should save work order and items to database', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values([testTechnician, testCreator]).execute();
    const items = await db.insert(itemsTable).values([testItem1, testItem2]).returning().execute();

    const testInput: CreateWorkOrderInput = {
      description: 'Database persistence test',
      assigned_technician: testTechnician.clerk_id,
      items: [
        { item_id: items[0].id, quantity_used: 10 },
        { item_id: items[1].id, quantity_used: 8 },
      ],
    };

    const result = await createWorkOrder(testInput, testCreator.clerk_id);

    // Verify work order was saved
    const workOrders = await db.select()
      .from(workOrdersTable)
      .where(eq(workOrdersTable.id, result.id))
      .execute();

    expect(workOrders).toHaveLength(1);
    expect(workOrders[0].description).toEqual('Database persistence test');
    expect(workOrders[0].assigned_technician).toEqual(testTechnician.clerk_id);
    expect(workOrders[0].status).toEqual('OPEN');
    expect(workOrders[0].created_by).toEqual(testCreator.clerk_id);

    // Verify work order items were saved
    const workOrderItems = await db.select()
      .from(workOrderItemsTable)
      .where(eq(workOrderItemsTable.work_order_id, result.id))
      .execute();

    expect(workOrderItems).toHaveLength(2);
    expect(workOrderItems.find(item => item.item_id === items[0].id)?.quantity_used).toEqual(10);
    expect(workOrderItems.find(item => item.item_id === items[1].id)?.quantity_used).toEqual(8);
  });

  it('should generate unique work order numbers', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values([testTechnician, testCreator]).execute();
    const items = await db.insert(itemsTable).values([testItem1]).returning().execute();

    const testInput: CreateWorkOrderInput = {
      description: 'Unique number test',
      assigned_technician: testTechnician.clerk_id,
      items: [{ item_id: items[0].id, quantity_used: 1 }],
    };

    // Create multiple work orders
    const result1 = await createWorkOrder(testInput, testCreator.clerk_id);
    const result2 = await createWorkOrder(testInput, testCreator.clerk_id);

    expect(result1.work_order_number).not.toEqual(result2.work_order_number);
    expect(result1.work_order_number).toMatch(/^WO-\d{4}-\d{2}-\d{2}-\d{4}$/);
    expect(result2.work_order_number).toMatch(/^WO-\d{4}-\d{2}-\d{2}-\d{4}$/);
  });

  it('should throw error when assigned technician does not exist', async () => {
    // Create prerequisite data (no technician)
    await db.insert(usersTable).values([testCreator]).execute();
    const items = await db.insert(itemsTable).values([testItem1]).returning().execute();

    const testInput: CreateWorkOrderInput = {
      description: 'Test work order',
      assigned_technician: 'nonexistent_tech',
      items: [{ item_id: items[0].id, quantity_used: 1 }],
    };

    await expect(createWorkOrder(testInput, testCreator.clerk_id))
      .rejects.toThrow(/assigned technician not found/i);
  });

  it('should throw error when assigned user is not a technician', async () => {
    // Create prerequisite data with non-technician user
    await db.insert(usersTable).values([testNonTechnician, testCreator]).execute();
    const items = await db.insert(itemsTable).values([testItem1]).returning().execute();

    const testInput: CreateWorkOrderInput = {
      description: 'Test work order',
      assigned_technician: testNonTechnician.clerk_id,
      items: [{ item_id: items[0].id, quantity_used: 1 }],
    };

    await expect(createWorkOrder(testInput, testCreator.clerk_id))
      .rejects.toThrow(/must have technician role/i);
  });

  it('should throw error when item does not exist', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values([testTechnician, testCreator]).execute();

    const testInput: CreateWorkOrderInput = {
      description: 'Test work order',
      assigned_technician: testTechnician.clerk_id,
      items: [{ item_id: 999, quantity_used: 1 }],
    };

    await expect(createWorkOrder(testInput, testCreator.clerk_id))
      .rejects.toThrow(/item with id 999 not found/i);
  });

  it('should throw error when item has insufficient stock', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values([testTechnician, testCreator]).execute();
    const items = await db.insert(itemsTable).values([lowStockItem]).returning().execute();

    const testInput: CreateWorkOrderInput = {
      description: 'Test work order',
      assigned_technician: testTechnician.clerk_id,
      items: [{ item_id: items[0].id, quantity_used: 5 }], // More than available stock (2)
    };

    await expect(createWorkOrder(testInput, testCreator.clerk_id))
      .rejects.toThrow(/insufficient stock for item low stock item/i);
  });

  it('should handle multiple items with mixed validation scenarios', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values([testTechnician, testCreator]).execute();
    const items = await db.insert(itemsTable).values([testItem1, lowStockItem]).returning().execute();

    const testInput: CreateWorkOrderInput = {
      description: 'Mixed validation test',
      assigned_technician: testTechnician.clerk_id,
      items: [
        { item_id: items[0].id, quantity_used: 10 }, // Valid
        { item_id: items[1].id, quantity_used: 5 }, // Insufficient stock
      ],
    };

    await expect(createWorkOrder(testInput, testCreator.clerk_id))
      .rejects.toThrow(/insufficient stock/i);
  });

  it('should create work order with exact stock amount', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values([testTechnician, testCreator]).execute();
    const items = await db.insert(itemsTable).values([lowStockItem]).returning().execute();

    const testInput: CreateWorkOrderInput = {
      description: 'Exact stock test',
      assigned_technician: testTechnician.clerk_id,
      items: [{ item_id: items[0].id, quantity_used: 2 }], // Exact stock amount
    };

    const result = await createWorkOrder(testInput, testCreator.clerk_id);

    expect(result.id).toBeDefined();
    expect(result.description).toEqual('Exact stock test');
    expect(result.status).toEqual('OPEN');
  });
});
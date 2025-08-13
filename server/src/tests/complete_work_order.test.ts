import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, itemsTable, workOrdersTable, workOrderItemsTable, stockAdjustmentsTable } from '../db/schema';
import { type CompleteWorkOrderInput } from '../schema';
import { completeWorkOrder } from '../handlers/complete_work_order';
import { eq } from 'drizzle-orm';

describe('completeWorkOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should complete a work order successfully', async () => {
    // Create test user
    const userResults = await db.insert(usersTable)
      .values({
        clerk_id: 'tech_clerk_123',
        email: 'tech@example.com',
        name: 'Test Technician',
        role: 'TECHNICIAN'
      })
      .returning()
      .execute();

    const user = userResults[0];

    // Create test items
    const itemResults = await db.insert(itemsTable)
      .values([
        {
          sku: 'ITEM001',
          name: 'Test Item 1',
          description: 'First test item',
          current_stock: 50,
          minimum_stock: 10,
          unit_price: '15.99'
        },
        {
          sku: 'ITEM002',
          name: 'Test Item 2',
          description: 'Second test item',
          current_stock: 30,
          minimum_stock: 5,
          unit_price: '25.50'
        }
      ])
      .returning()
      .execute();

    const [item1, item2] = itemResults;

    // Create test work order in IN_PROGRESS status
    const workOrderResults = await db.insert(workOrdersTable)
      .values({
        work_order_number: 'WO-TEST-001',
        description: 'Test work order for completion',
        assigned_technician: user.clerk_id,
        status: 'IN_PROGRESS',
        created_by: user.clerk_id
      })
      .returning()
      .execute();

    const workOrder = workOrderResults[0];

    // Create work order items
    await db.insert(workOrderItemsTable)
      .values([
        {
          work_order_id: workOrder.id,
          item_id: item1.id,
          quantity_used: 5
        },
        {
          work_order_id: workOrder.id,
          item_id: item2.id,
          quantity_used: 3
        }
      ])
      .execute();

    const input: CompleteWorkOrderInput = {
      work_order_id: workOrder.id
    };

    // Execute the handler
    const result = await completeWorkOrder(input);

    // Verify work order is completed
    expect(result.id).toBe(workOrder.id);
    expect(result.status).toBe('COMPLETED');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify work order is updated in database
    const updatedWorkOrder = await db.select()
      .from(workOrdersTable)
      .where(eq(workOrdersTable.id, workOrder.id))
      .execute();

    expect(updatedWorkOrder[0].status).toBe('COMPLETED');
    expect(updatedWorkOrder[0].completed_at).toBeInstanceOf(Date);

    // Verify item stocks are reduced
    const updatedItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, item1.id))
      .execute();

    expect(updatedItems[0].current_stock).toBe(45); // 50 - 5

    const updatedItem2 = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, item2.id))
      .execute();

    expect(updatedItem2[0].current_stock).toBe(27); // 30 - 3

    // Verify stock adjustments were created
    const stockAdjustments = await db.select()
      .from(stockAdjustmentsTable)
      .execute();

    expect(stockAdjustments).toHaveLength(2);

    const adjustment1 = stockAdjustments.find(adj => adj.item_id === item1.id);
    expect(adjustment1).toBeDefined();
    expect(adjustment1?.adjustment_type).toBe('REMOVAL');
    expect(adjustment1?.quantity_change).toBe(-5);
    expect(adjustment1?.previous_stock).toBe(50);
    expect(adjustment1?.new_stock).toBe(45);
    expect(adjustment1?.adjusted_by).toBe(user.clerk_id);
    expect(adjustment1?.reason).toContain('WO-TEST-001');

    const adjustment2 = stockAdjustments.find(adj => adj.item_id === item2.id);
    expect(adjustment2).toBeDefined();
    expect(adjustment2?.adjustment_type).toBe('REMOVAL');
    expect(adjustment2?.quantity_change).toBe(-3);
    expect(adjustment2?.previous_stock).toBe(30);
    expect(adjustment2?.new_stock).toBe(27);
  });

  it('should throw error if work order does not exist', async () => {
    const input: CompleteWorkOrderInput = {
      work_order_id: 999
    };

    await expect(completeWorkOrder(input)).rejects.toThrow(/Work order with ID 999 not found/i);
  });

  it('should throw error if work order is not IN_PROGRESS', async () => {
    // Create test user
    const userResults = await db.insert(usersTable)
      .values({
        clerk_id: 'tech_clerk_123',
        email: 'tech@example.com',
        name: 'Test Technician',
        role: 'TECHNICIAN'
      })
      .returning()
      .execute();

    const user = userResults[0];

    // Create work order with OPEN status
    const workOrderResults = await db.insert(workOrdersTable)
      .values({
        work_order_number: 'WO-TEST-002',
        description: 'Test work order in wrong status',
        assigned_technician: user.clerk_id,
        status: 'OPEN',
        created_by: user.clerk_id
      })
      .returning()
      .execute();

    const workOrder = workOrderResults[0];

    const input: CompleteWorkOrderInput = {
      work_order_id: workOrder.id
    };

    await expect(completeWorkOrder(input)).rejects.toThrow(/Work order must be IN_PROGRESS to complete/i);
  });

  it('should throw error if insufficient stock', async () => {
    // Create test user
    const userResults = await db.insert(usersTable)
      .values({
        clerk_id: 'tech_clerk_123',
        email: 'tech@example.com',
        name: 'Test Technician',
        role: 'TECHNICIAN'
      })
      .returning()
      .execute();

    const user = userResults[0];

    // Create item with low stock
    const itemResults = await db.insert(itemsTable)
      .values({
        sku: 'ITEM003',
        name: 'Low Stock Item',
        description: 'Item with insufficient stock',
        current_stock: 2,
        minimum_stock: 1,
        unit_price: '10.00'
      })
      .returning()
      .execute();

    const item = itemResults[0];

    // Create work order
    const workOrderResults = await db.insert(workOrdersTable)
      .values({
        work_order_number: 'WO-TEST-003',
        description: 'Test work order with insufficient stock',
        assigned_technician: user.clerk_id,
        status: 'IN_PROGRESS',
        created_by: user.clerk_id
      })
      .returning()
      .execute();

    const workOrder = workOrderResults[0];

    // Create work order item with quantity greater than available stock
    await db.insert(workOrderItemsTable)
      .values({
        work_order_id: workOrder.id,
        item_id: item.id,
        quantity_used: 5 // More than available stock (2)
      })
      .execute();

    const input: CompleteWorkOrderInput = {
      work_order_id: workOrder.id
    };

    await expect(completeWorkOrder(input)).rejects.toThrow(/Insufficient stock for item ITEM003/i);

    // Verify work order status remains unchanged
    const unchangedWorkOrder = await db.select()
      .from(workOrdersTable)
      .where(eq(workOrdersTable.id, workOrder.id))
      .execute();

    expect(unchangedWorkOrder[0].status).toBe('IN_PROGRESS');
    expect(unchangedWorkOrder[0].completed_at).toBeNull();
  });

  it('should handle work order with no items', async () => {
    // Create test user
    const userResults = await db.insert(usersTable)
      .values({
        clerk_id: 'tech_clerk_123',
        email: 'tech@example.com',
        name: 'Test Technician',
        role: 'TECHNICIAN'
      })
      .returning()
      .execute();

    const user = userResults[0];

    // Create work order without items
    const workOrderResults = await db.insert(workOrdersTable)
      .values({
        work_order_number: 'WO-TEST-004',
        description: 'Test work order without items',
        assigned_technician: user.clerk_id,
        status: 'IN_PROGRESS',
        created_by: user.clerk_id
      })
      .returning()
      .execute();

    const workOrder = workOrderResults[0];

    const input: CompleteWorkOrderInput = {
      work_order_id: workOrder.id
    };

    // Should complete successfully even with no items
    const result = await completeWorkOrder(input);

    expect(result.id).toBe(workOrder.id);
    expect(result.status).toBe('COMPLETED');
    expect(result.completed_at).toBeInstanceOf(Date);

    // Verify no stock adjustments were created
    const stockAdjustments = await db.select()
      .from(stockAdjustmentsTable)
      .execute();

    expect(stockAdjustments).toHaveLength(0);
  });

  it('should throw error if work order item references non-existent item', async () => {
    // Create test user
    const userResults = await db.insert(usersTable)
      .values({
        clerk_id: 'tech_clerk_123',
        email: 'tech@example.com',
        name: 'Test Technician',
        role: 'TECHNICIAN'
      })
      .returning()
      .execute();

    const user = userResults[0];

    // Create work order
    const workOrderResults = await db.insert(workOrdersTable)
      .values({
        work_order_number: 'WO-TEST-005',
        description: 'Test work order with invalid item reference',
        assigned_technician: user.clerk_id,
        status: 'IN_PROGRESS',
        created_by: user.clerk_id
      })
      .returning()
      .execute();

    const workOrder = workOrderResults[0];

    // Create work order item with non-existent item_id
    await db.insert(workOrderItemsTable)
      .values({
        work_order_id: workOrder.id,
        item_id: 999, // Non-existent item
        quantity_used: 1
      })
      .execute();

    const input: CompleteWorkOrderInput = {
      work_order_id: workOrder.id
    };

    await expect(completeWorkOrder(input)).rejects.toThrow(/Item with ID 999 not found/i);
  });
});
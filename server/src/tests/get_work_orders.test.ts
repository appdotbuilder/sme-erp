import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workOrdersTable, itemsTable, workOrderItemsTable } from '../db/schema';
import { getWorkOrders } from '../handlers/get_work_orders';

// Test data setup
const testUser = {
  clerk_id: 'user_test123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'ADMIN' as const,
};

const testTechnician = {
  clerk_id: 'tech_test456',
  email: 'tech@example.com',
  name: 'Test Technician',
  role: 'TECHNICIAN' as const,
};

const testItem = {
  sku: 'TEST-001',
  name: 'Test Item',
  description: 'Test item description',
  current_stock: 100,
  minimum_stock: 10,
  unit_price: '15.99',
};

describe('getWorkOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no work orders exist', async () => {
    const result = await getWorkOrders();
    expect(result).toEqual([]);
  });

  it('should return all work orders', async () => {
    // Create prerequisite data
    const [creator, technician] = await db.insert(usersTable)
      .values([testUser, testTechnician])
      .returning()
      .execute();

    // Create work orders
    const workOrdersData = [
      {
        work_order_number: 'WO-001',
        description: 'First work order',
        assigned_technician: technician.clerk_id,
        status: 'OPEN' as const,
        created_by: creator.clerk_id,
      },
      {
        work_order_number: 'WO-002',
        description: 'Second work order',
        assigned_technician: technician.clerk_id,
        status: 'IN_PROGRESS' as const,
        created_by: creator.clerk_id,
      },
      {
        work_order_number: 'WO-003',
        description: 'Third work order',
        assigned_technician: technician.clerk_id,
        status: 'COMPLETED' as const,
        created_by: creator.clerk_id,
        completed_at: new Date(),
      },
    ];

    await db.insert(workOrdersTable)
      .values(workOrdersData)
      .execute();

    const result = await getWorkOrders();

    expect(result).toHaveLength(3);
    
    // Verify all work orders are returned
    const workOrderNumbers = result.map(wo => wo.work_order_number);
    expect(workOrderNumbers).toContain('WO-001');
    expect(workOrderNumbers).toContain('WO-002');
    expect(workOrderNumbers).toContain('WO-003');

    // Verify structure of first work order
    const firstWorkOrder = result.find(wo => wo.work_order_number === 'WO-001');
    expect(firstWorkOrder).toBeDefined();
    expect(firstWorkOrder!.description).toBe('First work order');
    expect(firstWorkOrder!.assigned_technician).toBe(technician.clerk_id);
    expect(firstWorkOrder!.status).toBe('OPEN');
    expect(firstWorkOrder!.created_by).toBe(creator.clerk_id);
    expect(firstWorkOrder!.created_at).toBeInstanceOf(Date);
    expect(firstWorkOrder!.updated_at).toBeInstanceOf(Date);
    expect(firstWorkOrder!.completed_at).toBeNull();
  });

  it('should return work orders ordered by created_at descending', async () => {
    // Create prerequisite data
    const [creator, technician] = await db.insert(usersTable)
      .values([testUser, testTechnician])
      .returning()
      .execute();

    // Create work orders with different timestamps
    const oldDate = new Date('2023-01-01');
    const newDate = new Date('2023-12-01');

    const workOrdersData = [
      {
        work_order_number: 'WO-OLD',
        description: 'Old work order',
        assigned_technician: technician.clerk_id,
        status: 'OPEN' as const,
        created_by: creator.clerk_id,
        created_at: oldDate,
        updated_at: oldDate,
      },
      {
        work_order_number: 'WO-NEW',
        description: 'New work order',
        assigned_technician: technician.clerk_id,
        status: 'OPEN' as const,
        created_by: creator.clerk_id,
        created_at: newDate,
        updated_at: newDate,
      },
    ];

    await db.insert(workOrdersTable)
      .values(workOrdersData)
      .execute();

    const result = await getWorkOrders();

    expect(result).toHaveLength(2);
    // Should be ordered by created_at descending (newest first)
    expect(result[0].work_order_number).toBe('WO-NEW');
    expect(result[1].work_order_number).toBe('WO-OLD');
  });

  it('should handle work orders with completed_at timestamps', async () => {
    // Create prerequisite data
    const [creator, technician] = await db.insert(usersTable)
      .values([testUser, testTechnician])
      .returning()
      .execute();

    const completedAt = new Date('2023-06-15T10:30:00Z');

    const workOrderData = {
      work_order_number: 'WO-COMPLETED',
      description: 'Completed work order',
      assigned_technician: technician.clerk_id,
      status: 'COMPLETED' as const,
      created_by: creator.clerk_id,
      completed_at: completedAt,
    };

    await db.insert(workOrdersTable)
      .values(workOrderData)
      .execute();

    const result = await getWorkOrders();

    expect(result).toHaveLength(1);
    expect(result[0].completed_at).toBeInstanceOf(Date);
    expect(result[0].completed_at!.getTime()).toBe(completedAt.getTime());
    expect(result[0].status).toBe('COMPLETED');
  });

  it('should return work orders with various statuses', async () => {
    // Create prerequisite data
    const [creator, technician] = await db.insert(usersTable)
      .values([testUser, testTechnician])
      .returning()
      .execute();

    const workOrdersData = [
      {
        work_order_number: 'WO-OPEN',
        description: 'Open work order',
        assigned_technician: technician.clerk_id,
        status: 'OPEN' as const,
        created_by: creator.clerk_id,
      },
      {
        work_order_number: 'WO-PROGRESS',
        description: 'In progress work order',
        assigned_technician: technician.clerk_id,
        status: 'IN_PROGRESS' as const,
        created_by: creator.clerk_id,
      },
      {
        work_order_number: 'WO-DONE',
        description: 'Completed work order',
        assigned_technician: technician.clerk_id,
        status: 'COMPLETED' as const,
        created_by: creator.clerk_id,
        completed_at: new Date(),
      },
    ];

    await db.insert(workOrdersTable)
      .values(workOrdersData)
      .execute();

    const result = await getWorkOrders();

    expect(result).toHaveLength(3);
    
    const statuses = result.map(wo => wo.status);
    expect(statuses).toContain('OPEN');
    expect(statuses).toContain('IN_PROGRESS');
    expect(statuses).toContain('COMPLETED');
  });

  it('should handle work orders from different creators and technicians', async () => {
    // Create multiple users
    const userData = [
      { ...testUser, clerk_id: 'creator1' },
      { ...testTechnician, clerk_id: 'tech1' },
      { ...testUser, clerk_id: 'creator2', email: 'creator2@example.com' },
      { ...testTechnician, clerk_id: 'tech2', email: 'tech2@example.com' },
    ];

    await db.insert(usersTable)
      .values(userData)
      .execute();

    const workOrdersData = [
      {
        work_order_number: 'WO-C1T1',
        description: 'Creator 1, Tech 1',
        assigned_technician: 'tech1',
        status: 'OPEN' as const,
        created_by: 'creator1',
      },
      {
        work_order_number: 'WO-C2T2',
        description: 'Creator 2, Tech 2',
        assigned_technician: 'tech2',
        status: 'IN_PROGRESS' as const,
        created_by: 'creator2',
      },
    ];

    await db.insert(workOrdersTable)
      .values(workOrdersData)
      .execute();

    const result = await getWorkOrders();

    expect(result).toHaveLength(2);
    
    const workOrder1 = result.find(wo => wo.work_order_number === 'WO-C1T1');
    const workOrder2 = result.find(wo => wo.work_order_number === 'WO-C2T2');
    
    expect(workOrder1!.created_by).toBe('creator1');
    expect(workOrder1!.assigned_technician).toBe('tech1');
    expect(workOrder2!.created_by).toBe('creator2');
    expect(workOrder2!.assigned_technician).toBe('tech2');
  });
});
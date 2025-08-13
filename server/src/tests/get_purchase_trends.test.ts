import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { purchaseOrdersTable, suppliersTable, usersTable } from '../db/schema';
import { type PurchaseTrendInput } from '../schema';
import { getPurchaseTrends } from '../handlers/get_purchase_trends';

describe('getPurchaseTrends', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  async function createTestData() {
    // Create a test user
    const users = await db.insert(usersTable)
      .values({
        clerk_id: 'test_user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'PURCHASING_STAFF'
      })
      .returning()
      .execute();

    // Create a test supplier
    const suppliers = await db.insert(suppliersTable)
      .values({
        name: 'Test Supplier',
        contact_email: 'supplier@example.com'
      })
      .returning()
      .execute();

    return { user: users[0], supplier: suppliers[0] };
  }

  it('should return empty trends for date range with no orders', async () => {
    const input: PurchaseTrendInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getPurchaseTrends(input);

    expect(result.trends).toHaveLength(0);
    expect(result.summary.total_expenditure).toBe(0);
    expect(result.summary.total_orders).toBe(0);
    expect(result.summary.average_order_value).toBe(0);
  });

  it('should calculate daily trends for short date ranges', async () => {
    const { user, supplier } = await createTestData();

    // Create purchase orders on different days
    await db.insert(purchaseOrdersTable)
      .values([
        {
          po_number: 'PO-001',
          supplier_id: supplier.id,
          status: 'APPROVED',
          total_amount: '1000.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-01-15T10:00:00Z')
        },
        {
          po_number: 'PO-002',
          supplier_id: supplier.id,
          status: 'APPROVED',
          total_amount: '1500.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-01-16T10:00:00Z')
        },
        {
          po_number: 'PO-003',
          supplier_id: supplier.id,
          status: 'APPROVED',
          total_amount: '2000.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-01-15T15:00:00Z')
        }
      ])
      .execute();

    const input: PurchaseTrendInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getPurchaseTrends(input);

    expect(result.trends).toHaveLength(2); // Two different days
    expect(result.summary.total_expenditure).toBe(4500);
    expect(result.summary.total_orders).toBe(3);
    expect(result.summary.average_order_value).toBe(1500);

    // Check individual trends
    const jan15Trend = result.trends.find(t => t.period === '2024-01-15');
    const jan16Trend = result.trends.find(t => t.period === '2024-01-16');

    expect(jan15Trend).toBeDefined();
    expect(jan15Trend!.total_amount).toBe(3000);
    expect(jan15Trend!.order_count).toBe(2);

    expect(jan16Trend).toBeDefined();
    expect(jan16Trend!.total_amount).toBe(1500);
    expect(jan16Trend!.order_count).toBe(1);
  });

  it('should only include APPROVED purchase orders', async () => {
    const { user, supplier } = await createTestData();

    // Create purchase orders with different statuses
    await db.insert(purchaseOrdersTable)
      .values([
        {
          po_number: 'PO-001',
          supplier_id: supplier.id,
          status: 'APPROVED',
          total_amount: '1000.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-01-15T10:00:00Z')
        },
        {
          po_number: 'PO-002',
          supplier_id: supplier.id,
          status: 'DRAFT',
          total_amount: '2000.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-01-15T10:00:00Z')
        },
        {
          po_number: 'PO-003',
          supplier_id: supplier.id,
          status: 'REJECTED',
          total_amount: '3000.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-01-15T10:00:00Z')
        }
      ])
      .execute();

    const input: PurchaseTrendInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getPurchaseTrends(input);

    expect(result.trends).toHaveLength(1);
    expect(result.summary.total_expenditure).toBe(1000);
    expect(result.summary.total_orders).toBe(1);
    expect(result.summary.average_order_value).toBe(1000);
  });

  it('should filter orders by date range correctly', async () => {
    const { user, supplier } = await createTestData();

    // Create purchase orders before, within, and after the date range
    await db.insert(purchaseOrdersTable)
      .values([
        {
          po_number: 'PO-001',
          supplier_id: supplier.id,
          status: 'APPROVED',
          total_amount: '1000.00',
          created_by: user.clerk_id,
          created_at: new Date('2023-12-31T10:00:00Z') // Before range
        },
        {
          po_number: 'PO-002',
          supplier_id: supplier.id,
          status: 'APPROVED',
          total_amount: '2000.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-01-15T10:00:00Z') // Within range
        },
        {
          po_number: 'PO-003',
          supplier_id: supplier.id,
          status: 'APPROVED',
          total_amount: '3000.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-02-01T10:00:00Z') // After range
        }
      ])
      .execute();

    const input: PurchaseTrendInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getPurchaseTrends(input);

    expect(result.trends).toHaveLength(1);
    expect(result.summary.total_expenditure).toBe(2000);
    expect(result.summary.total_orders).toBe(1);
  });

  it('should handle weekly grouping for medium date ranges', async () => {
    const { user, supplier } = await createTestData();

    // Create purchase orders across different weeks
    await db.insert(purchaseOrdersTable)
      .values([
        {
          po_number: 'PO-001',
          supplier_id: supplier.id,
          status: 'APPROVED',
          total_amount: '1000.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-01-15T10:00:00Z') // Week 1
        },
        {
          po_number: 'PO-002',
          supplier_id: supplier.id,
          status: 'APPROVED',
          total_amount: '2000.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-01-22T10:00:00Z') // Week 2
        }
      ])
      .execute();

    const input: PurchaseTrendInput = {
      start_date: '2024-01-01',
      end_date: '2024-03-31' // 90 days - should trigger weekly grouping
    };

    const result = await getPurchaseTrends(input);

    expect(result.trends.length).toBeGreaterThan(0);
    expect(result.summary.total_expenditure).toBe(3000);
    expect(result.summary.total_orders).toBe(2);
    expect(result.summary.average_order_value).toBe(1500);
  });

  it('should handle monthly grouping for long date ranges', async () => {
    const { user, supplier } = await createTestData();

    // Create purchase orders across different months
    await db.insert(purchaseOrdersTable)
      .values([
        {
          po_number: 'PO-001',
          supplier_id: supplier.id,
          status: 'APPROVED',
          total_amount: '1000.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-01-15T10:00:00Z')
        },
        {
          po_number: 'PO-002',
          supplier_id: supplier.id,
          status: 'APPROVED',
          total_amount: '2000.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-06-15T10:00:00Z')
        }
      ])
      .execute();

    const input: PurchaseTrendInput = {
      start_date: '2024-01-01',
      end_date: '2024-12-31' // Full year - should trigger monthly grouping
    };

    const result = await getPurchaseTrends(input);

    expect(result.trends.length).toBeGreaterThan(0);
    expect(result.summary.total_expenditure).toBe(3000);
    expect(result.summary.total_orders).toBe(2);
    expect(result.summary.average_order_value).toBe(1500);
  });

  it('should handle zero orders gracefully for average calculation', async () => {
    const input: PurchaseTrendInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getPurchaseTrends(input);

    expect(result.summary.average_order_value).toBe(0);
    expect(result.summary.total_expenditure).toBe(0);
    expect(result.summary.total_orders).toBe(0);
  });

  it('should sort trends in chronological order', async () => {
    const { user, supplier } = await createTestData();

    // Create purchase orders in reverse chronological order
    await db.insert(purchaseOrdersTable)
      .values([
        {
          po_number: 'PO-003',
          supplier_id: supplier.id,
          status: 'APPROVED',
          total_amount: '3000.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-01-20T10:00:00Z')
        },
        {
          po_number: 'PO-001',
          supplier_id: supplier.id,
          status: 'APPROVED',
          total_amount: '1000.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-01-10T10:00:00Z')
        },
        {
          po_number: 'PO-002',
          supplier_id: supplier.id,
          status: 'APPROVED',
          total_amount: '2000.00',
          created_by: user.clerk_id,
          created_at: new Date('2024-01-15T10:00:00Z')
        }
      ])
      .execute();

    const input: PurchaseTrendInput = {
      start_date: '2024-01-01',
      end_date: '2024-01-31'
    };

    const result = await getPurchaseTrends(input);

    expect(result.trends).toHaveLength(3);
    
    // Check that trends are sorted chronologically
    expect(result.trends[0].period).toBe('2024-01-10');
    expect(result.trends[1].period).toBe('2024-01-15');
    expect(result.trends[2].period).toBe('2024-01-20');
  });
});
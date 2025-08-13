import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { purchaseOrdersTable, suppliersTable, usersTable } from '../db/schema';
import { getPurchaseOrders } from '../handlers/get_purchase_orders';

describe('getPurchaseOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no purchase orders exist', async () => {
    const result = await getPurchaseOrders();
    expect(result).toEqual([]);
  });

  it('should fetch purchase orders with correct data types', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        clerk_id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'PURCHASING_STAFF'
      })
      .returning()
      .execute();

    // Create prerequisite supplier
    const supplierResult = await db.insert(suppliersTable)
      .values({
        name: 'Test Supplier',
        contact_email: 'supplier@example.com',
        contact_phone: '123-456-7890',
        address: '123 Supplier St'
      })
      .returning()
      .execute();

    // Create purchase order
    const poResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-001',
        supplier_id: supplierResult[0].id,
        status: 'PENDING',
        total_amount: '1500.75', // Insert as string (numeric column)
        notes: 'Test purchase order',
        created_by: userResult[0].clerk_id
      })
      .returning()
      .execute();

    const result = await getPurchaseOrders();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: poResult[0].id,
      po_number: 'PO-001',
      supplier_id: supplierResult[0].id,
      status: 'PENDING',
      total_amount: 1500.75, // Should be converted to number
      notes: 'Test purchase order',
      created_by: userResult[0].clerk_id
    });

    // Verify numeric field types
    expect(typeof result[0].total_amount).toBe('number');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle multiple purchase orders', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        clerk_id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'PURCHASING_STAFF'
      })
      .returning()
      .execute();

    // Create multiple suppliers
    const supplier1Result = await db.insert(suppliersTable)
      .values({
        name: 'Supplier One',
        contact_email: 'supplier1@example.com'
      })
      .returning()
      .execute();

    const supplier2Result = await db.insert(suppliersTable)
      .values({
        name: 'Supplier Two',
        contact_email: 'supplier2@example.com'
      })
      .returning()
      .execute();

    // Create multiple purchase orders
    await db.insert(purchaseOrdersTable)
      .values([
        {
          po_number: 'PO-001',
          supplier_id: supplier1Result[0].id,
          status: 'DRAFT',
          total_amount: '1000.00',
          created_by: userResult[0].clerk_id
        },
        {
          po_number: 'PO-002',
          supplier_id: supplier2Result[0].id,
          status: 'APPROVED',
          total_amount: '2500.50',
          created_by: userResult[0].clerk_id
        }
      ])
      .execute();

    const result = await getPurchaseOrders();

    expect(result).toHaveLength(2);
    
    // Check first purchase order
    const po1 = result.find(po => po.po_number === 'PO-001');
    expect(po1).toBeDefined();
    expect(po1?.status).toBe('DRAFT');
    expect(po1?.total_amount).toBe(1000.00);
    expect(typeof po1?.total_amount).toBe('number');

    // Check second purchase order
    const po2 = result.find(po => po.po_number === 'PO-002');
    expect(po2).toBeDefined();
    expect(po2?.status).toBe('APPROVED');
    expect(po2?.total_amount).toBe(2500.50);
    expect(typeof po2?.total_amount).toBe('number');
  });

  it('should handle purchase orders with different statuses', async () => {
    // Create prerequisite user and supplier
    const userResult = await db.insert(usersTable)
      .values({
        clerk_id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'PURCHASING_STAFF'
      })
      .returning()
      .execute();

    const supplierResult = await db.insert(suppliersTable)
      .values({
        name: 'Test Supplier',
        contact_email: 'supplier@example.com'
      })
      .returning()
      .execute();

    // Create purchase orders with different statuses
    await db.insert(purchaseOrdersTable)
      .values([
        {
          po_number: 'PO-DRAFT',
          supplier_id: supplierResult[0].id,
          status: 'DRAFT',
          total_amount: '100.00',
          created_by: userResult[0].clerk_id
        },
        {
          po_number: 'PO-PENDING',
          supplier_id: supplierResult[0].id,
          status: 'PENDING',
          total_amount: '200.00',
          created_by: userResult[0].clerk_id
        },
        {
          po_number: 'PO-APPROVED',
          supplier_id: supplierResult[0].id,
          status: 'APPROVED',
          total_amount: '300.00',
          created_by: userResult[0].clerk_id
        },
        {
          po_number: 'PO-REJECTED',
          supplier_id: supplierResult[0].id,
          status: 'REJECTED',
          total_amount: '400.00',
          created_by: userResult[0].clerk_id
        }
      ])
      .execute();

    const result = await getPurchaseOrders();
    expect(result).toHaveLength(4);

    const statuses = result.map(po => po.status);
    expect(statuses).toContain('DRAFT');
    expect(statuses).toContain('PENDING');
    expect(statuses).toContain('APPROVED');
    expect(statuses).toContain('REJECTED');

    // Verify all amounts are properly converted to numbers
    result.forEach(po => {
      expect(typeof po.total_amount).toBe('number');
    });
  });

  it('should handle purchase orders with null notes', async () => {
    // Create prerequisite user and supplier
    const userResult = await db.insert(usersTable)
      .values({
        clerk_id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'PURCHASING_STAFF'
      })
      .returning()
      .execute();

    const supplierResult = await db.insert(suppliersTable)
      .values({
        name: 'Test Supplier',
        contact_email: 'supplier@example.com'
      })
      .returning()
      .execute();

    // Create purchase order without notes
    await db.insert(purchaseOrdersTable)
      .values({
        po_number: 'PO-NO-NOTES',
        supplier_id: supplierResult[0].id,
        status: 'DRAFT',
        total_amount: '500.00',
        created_by: userResult[0].clerk_id
        // notes is intentionally omitted (will be null)
      })
      .execute();

    const result = await getPurchaseOrders();
    expect(result).toHaveLength(1);
    expect(result[0].notes).toBeNull();
    expect(result[0].po_number).toBe('PO-NO-NOTES');
  });
});
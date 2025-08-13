import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, suppliersTable, itemsTable, purchaseOrdersTable, purchaseOrderItemsTable } from '../db/schema';
import { type CreatePurchaseOrderInput } from '../schema';
import { createPurchaseOrder } from '../handlers/create_purchase_order';
import { eq } from 'drizzle-orm';

describe('createPurchaseOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  const createTestData = async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        clerk_id: 'test_user_123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'PURCHASING_STAFF',
      })
      .returning()
      .execute();

    // Create test supplier
    const supplierResult = await db.insert(suppliersTable)
      .values({
        name: 'Test Supplier',
        contact_email: 'supplier@example.com',
        contact_phone: '123-456-7890',
      })
      .returning()
      .execute();

    // Create test items
    const itemsResult = await db.insert(itemsTable)
      .values([
        {
          sku: 'ITEM001',
          name: 'Test Item 1',
          description: 'First test item',
          current_stock: 100,
          minimum_stock: 10,
          unit_price: '15.50',
        },
        {
          sku: 'ITEM002',
          name: 'Test Item 2',
          description: 'Second test item',
          current_stock: 50,
          minimum_stock: 5,
          unit_price: '25.75',
        }
      ])
      .returning()
      .execute();

    return {
      user: userResult[0],
      supplier: supplierResult[0],
      items: itemsResult,
    };
  };

  it('should create a purchase order with valid input', async () => {
    const { supplier, items } = await createTestData();

    const input: CreatePurchaseOrderInput = {
      supplier_id: supplier.id,
      items: [
        {
          item_id: items[0].id,
          quantity: 10,
          unit_price: 15.50,
        },
        {
          item_id: items[1].id,
          quantity: 5,
          unit_price: 25.75,
        }
      ],
      notes: 'Test purchase order',
    };

    const result = await createPurchaseOrder(input, 'test_user_123');

    // Validate basic fields
    expect(result.id).toBeDefined();
    expect(result.po_number).toMatch(/^PO-\d{4}-\d{2}-\d{2}-\d{4}$/);
    expect(result.supplier_id).toEqual(supplier.id);
    expect(result.status).toEqual('DRAFT');
    expect(result.total_amount).toEqual(283.75); // (10 * 15.50) + (5 * 25.75)
    expect(result.notes).toEqual('Test purchase order');
    expect(result.created_by).toEqual('test_user_123');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.total_amount).toBe('number');
  });

  it('should save purchase order to database', async () => {
    const { supplier, items } = await createTestData();

    const input: CreatePurchaseOrderInput = {
      supplier_id: supplier.id,
      items: [
        {
          item_id: items[0].id,
          quantity: 2,
          unit_price: 15.50,
        }
      ],
      notes: 'Database test',
    };

    const result = await createPurchaseOrder(input, 'test_user_123');

    // Verify purchase order was saved
    const savedPO = await db.select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, result.id))
      .execute();

    expect(savedPO).toHaveLength(1);
    expect(savedPO[0].po_number).toEqual(result.po_number);
    expect(savedPO[0].supplier_id).toEqual(supplier.id);
    expect(parseFloat(savedPO[0].total_amount)).toEqual(31.00);
  });

  it('should create purchase order items', async () => {
    const { supplier, items } = await createTestData();

    const input: CreatePurchaseOrderInput = {
      supplier_id: supplier.id,
      items: [
        {
          item_id: items[0].id,
          quantity: 3,
          unit_price: 15.50,
        },
        {
          item_id: items[1].id,
          quantity: 2,
          unit_price: 25.75,
        }
      ],
    };

    const result = await createPurchaseOrder(input, 'test_user_123');

    // Verify purchase order items were created
    const savedItems = await db.select()
      .from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.po_id, result.id))
      .execute();

    expect(savedItems).toHaveLength(2);
    
    // First item
    expect(savedItems[0].item_id).toEqual(items[0].id);
    expect(savedItems[0].quantity).toEqual(3);
    expect(parseFloat(savedItems[0].unit_price)).toEqual(15.50);
    expect(parseFloat(savedItems[0].total_price)).toEqual(46.50);

    // Second item
    expect(savedItems[1].item_id).toEqual(items[1].id);
    expect(savedItems[1].quantity).toEqual(2);
    expect(parseFloat(savedItems[1].unit_price)).toEqual(25.75);
    expect(parseFloat(savedItems[1].total_price)).toEqual(51.50);
  });

  it('should handle purchase order without notes', async () => {
    const { supplier, items } = await createTestData();

    const input: CreatePurchaseOrderInput = {
      supplier_id: supplier.id,
      items: [
        {
          item_id: items[0].id,
          quantity: 1,
          unit_price: 15.50,
        }
      ],
      // notes is optional
    };

    const result = await createPurchaseOrder(input, 'test_user_123');

    expect(result.notes).toBeNull();
  });

  it('should generate unique PO numbers', async () => {
    const { supplier, items } = await createTestData();

    const input: CreatePurchaseOrderInput = {
      supplier_id: supplier.id,
      items: [
        {
          item_id: items[0].id,
          quantity: 1,
          unit_price: 15.50,
        }
      ],
    };

    // Create multiple purchase orders
    const result1 = await createPurchaseOrder(input, 'test_user_123');
    const result2 = await createPurchaseOrder(input, 'test_user_123');

    expect(result1.po_number).not.toEqual(result2.po_number);
    expect(result1.po_number).toMatch(/^PO-\d{4}-\d{2}-\d{2}-\d{4}$/);
    expect(result2.po_number).toMatch(/^PO-\d{4}-\d{2}-\d{2}-\d{4}$/);
  });

  it('should throw error for non-existent supplier', async () => {
    const { items } = await createTestData();

    const input: CreatePurchaseOrderInput = {
      supplier_id: 99999, // Non-existent supplier
      items: [
        {
          item_id: items[0].id,
          quantity: 1,
          unit_price: 15.50,
        }
      ],
    };

    await expect(createPurchaseOrder(input, 'test_user_123'))
      .rejects.toThrow(/Supplier with id 99999 not found/);
  });

  it('should throw error for non-existent items', async () => {
    const { supplier } = await createTestData();

    const input: CreatePurchaseOrderInput = {
      supplier_id: supplier.id,
      items: [
        {
          item_id: 99999, // Non-existent item
          quantity: 1,
          unit_price: 15.50,
        }
      ],
    };

    await expect(createPurchaseOrder(input, 'test_user_123'))
      .rejects.toThrow(/Items with ids \[99999\] not found/);
  });

  it('should throw error for multiple non-existent items', async () => {
    const { supplier, items } = await createTestData();

    const input: CreatePurchaseOrderInput = {
      supplier_id: supplier.id,
      items: [
        {
          item_id: items[0].id, // Valid item
          quantity: 1,
          unit_price: 15.50,
        },
        {
          item_id: 99998, // Non-existent item
          quantity: 1,
          unit_price: 20.00,
        },
        {
          item_id: 99999, // Non-existent item
          quantity: 1,
          unit_price: 30.00,
        }
      ],
    };

    await expect(createPurchaseOrder(input, 'test_user_123'))
      .rejects.toThrow(/Items with ids \[99998, 99999\] not found/);
  });

  it('should calculate total amount correctly with decimal prices', async () => {
    const { supplier, items } = await createTestData();

    const input: CreatePurchaseOrderInput = {
      supplier_id: supplier.id,
      items: [
        {
          item_id: items[0].id,
          quantity: 7,
          unit_price: 12.33,
        },
        {
          item_id: items[1].id,
          quantity: 3,
          unit_price: 45.67,
        }
      ],
    };

    const result = await createPurchaseOrder(input, 'test_user_123');

    // Expected: (7 * 12.33) + (3 * 45.67) = 86.31 + 137.01 = 223.32
    expect(result.total_amount).toEqual(223.32);
  });
});
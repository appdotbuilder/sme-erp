import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type CreateItemInput } from '../schema';
import { createItem } from '../handlers/create_item';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateItemInput = {
  sku: 'TEST-SKU-001',
  name: 'Test Item',
  description: 'A test inventory item',
  current_stock: 50,
  minimum_stock: 10,
  unit_price: 25.99
};

// Test input without optional description
const minimalInput: CreateItemInput = {
  sku: 'MINIMAL-001',
  name: 'Minimal Item',
  current_stock: 0,
  minimum_stock: 5,
  unit_price: 15.50
};

describe('createItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an item with all fields', async () => {
    const result = await createItem(testInput);

    // Verify all fields are correctly set
    expect(result.sku).toEqual('TEST-SKU-001');
    expect(result.name).toEqual('Test Item');
    expect(result.description).toEqual('A test inventory item');
    expect(result.current_stock).toEqual(50);
    expect(result.minimum_stock).toEqual(10);
    expect(result.unit_price).toEqual(25.99);
    expect(typeof result.unit_price).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an item without description', async () => {
    const result = await createItem(minimalInput);

    expect(result.sku).toEqual('MINIMAL-001');
    expect(result.name).toEqual('Minimal Item');
    expect(result.description).toBeNull();
    expect(result.current_stock).toEqual(0);
    expect(result.minimum_stock).toEqual(5);
    expect(result.unit_price).toEqual(15.50);
    expect(typeof result.unit_price).toEqual('number');
  });

  it('should save item to database', async () => {
    const result = await createItem(testInput);

    // Query database to verify item was saved
    const items = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    const savedItem = items[0];
    expect(savedItem.sku).toEqual('TEST-SKU-001');
    expect(savedItem.name).toEqual('Test Item');
    expect(savedItem.description).toEqual('A test inventory item');
    expect(savedItem.current_stock).toEqual(50);
    expect(savedItem.minimum_stock).toEqual(10);
    expect(parseFloat(savedItem.unit_price)).toEqual(25.99);
    expect(savedItem.created_at).toBeInstanceOf(Date);
    expect(savedItem.updated_at).toBeInstanceOf(Date);
  });

  it('should handle zero stock levels correctly', async () => {
    const zeroStockInput: CreateItemInput = {
      sku: 'ZERO-STOCK-001',
      name: 'Zero Stock Item',
      current_stock: 0,
      minimum_stock: 0,
      unit_price: 10.00
    };

    const result = await createItem(zeroStockInput);

    expect(result.current_stock).toEqual(0);
    expect(result.minimum_stock).toEqual(0);
    expect(result.unit_price).toEqual(10.00);
  });

  it('should enforce unique SKU constraint', async () => {
    // Create first item
    await createItem(testInput);

    // Attempt to create second item with same SKU
    const duplicateInput: CreateItemInput = {
      ...testInput,
      name: 'Different Name'
    };

    await expect(createItem(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should handle decimal prices correctly', async () => {
    const decimalPriceInput: CreateItemInput = {
      sku: 'DECIMAL-001',
      name: 'Decimal Price Item',
      current_stock: 100,
      minimum_stock: 20,
      unit_price: 99.99
    };

    const result = await createItem(decimalPriceInput);

    expect(result.unit_price).toEqual(99.99);
    expect(typeof result.unit_price).toEqual('number');

    // Verify in database
    const items = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, result.id))
      .execute();

    expect(parseFloat(items[0].unit_price)).toEqual(99.99);
  });

  it('should handle large stock quantities', async () => {
    const largeStockInput: CreateItemInput = {
      sku: 'LARGE-STOCK-001',
      name: 'Large Stock Item',
      current_stock: 999999,
      minimum_stock: 1000,
      unit_price: 0.01
    };

    const result = await createItem(largeStockInput);

    expect(result.current_stock).toEqual(999999);
    expect(result.minimum_stock).toEqual(1000);
    expect(result.unit_price).toEqual(0.01);
  });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type CreateItemInput } from '../schema';
import { getItems } from '../handlers/get_items';

// Test data
const testItem1: CreateItemInput = {
  sku: 'ITEM-001',
  name: 'Test Item 1',
  description: 'First test item',
  current_stock: 50,
  minimum_stock: 10,
  unit_price: 25.99
};

const testItem2: CreateItemInput = {
  sku: 'ITEM-002',
  name: 'Test Item 2',
  description: null,
  current_stock: 100,
  minimum_stock: 20,
  unit_price: 15.50
};

describe('getItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no items exist', async () => {
    const result = await getItems();
    
    expect(result).toEqual([]);
  });

  it('should return all items from database', async () => {
    // Insert test data
    await db.insert(itemsTable)
      .values([
        {
          ...testItem1,
          unit_price: testItem1.unit_price.toString()
        },
        {
          ...testItem2,
          unit_price: testItem2.unit_price.toString()
        }
      ])
      .execute();

    const result = await getItems();

    expect(result).toHaveLength(2);
    
    // Verify first item
    const item1 = result.find(item => item.sku === 'ITEM-001');
    expect(item1).toBeDefined();
    expect(item1!.name).toEqual('Test Item 1');
    expect(item1!.description).toEqual('First test item');
    expect(item1!.current_stock).toEqual(50);
    expect(item1!.minimum_stock).toEqual(10);
    expect(item1!.unit_price).toEqual(25.99);
    expect(typeof item1!.unit_price).toBe('number');
    expect(item1!.id).toBeDefined();
    expect(item1!.created_at).toBeInstanceOf(Date);
    expect(item1!.updated_at).toBeInstanceOf(Date);
    
    // Verify second item
    const item2 = result.find(item => item.sku === 'ITEM-002');
    expect(item2).toBeDefined();
    expect(item2!.name).toEqual('Test Item 2');
    expect(item2!.description).toBeNull();
    expect(item2!.current_stock).toEqual(100);
    expect(item2!.minimum_stock).toEqual(20);
    expect(item2!.unit_price).toEqual(15.50);
    expect(typeof item2!.unit_price).toBe('number');
  });

  it('should handle items with zero stock correctly', async () => {
    const zeroStockItem: CreateItemInput = {
      sku: 'ZERO-001',
      name: 'Zero Stock Item',
      description: 'Item with no stock',
      current_stock: 0,
      minimum_stock: 0,
      unit_price: 10.00
    };

    await db.insert(itemsTable)
      .values({
        ...zeroStockItem,
        unit_price: zeroStockItem.unit_price.toString()
      })
      .execute();

    const result = await getItems();

    expect(result).toHaveLength(1);
    expect(result[0].current_stock).toEqual(0);
    expect(result[0].minimum_stock).toEqual(0);
    expect(result[0].unit_price).toEqual(10.00);
  });

  it('should correctly convert decimal unit prices', async () => {
    const precisionTestItem: CreateItemInput = {
      sku: 'PRECISION-001',
      name: 'Precision Test Item',
      description: 'Item with precise pricing',
      current_stock: 25,
      minimum_stock: 5,
      unit_price: 123.45
    };

    await db.insert(itemsTable)
      .values({
        ...precisionTestItem,
        unit_price: precisionTestItem.unit_price.toString()
      })
      .execute();

    const result = await getItems();

    expect(result).toHaveLength(1);
    expect(result[0].unit_price).toEqual(123.45);
    expect(typeof result[0].unit_price).toBe('number');
  });

  it('should return items ordered by creation time', async () => {
    // Insert items with slight delay to ensure different timestamps
    await db.insert(itemsTable)
      .values({
        sku: 'FIRST-ITEM',
        name: 'First Item',
        description: 'Created first',
        current_stock: 10,
        minimum_stock: 5,
        unit_price: '10.00'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(itemsTable)
      .values({
        sku: 'SECOND-ITEM',
        name: 'Second Item',
        description: 'Created second',
        current_stock: 20,
        minimum_stock: 5,
        unit_price: '20.00'
      })
      .execute();

    const result = await getItems();

    expect(result).toHaveLength(2);
    // Items should be returned in the order they were created (database default order)
    expect(result[0].sku).toEqual('FIRST-ITEM');
    expect(result[1].sku).toEqual('SECOND-ITEM');
  });
});
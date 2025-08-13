import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type CreateItemInput } from '../schema';
import { getLowStockAlerts } from '../handlers/get_low_stock_alerts';

describe('getLowStockAlerts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no items are low stock', async () => {
    // Create items with healthy stock levels
    await db.insert(itemsTable).values([
      {
        sku: 'HEALTHY-001',
        name: 'Healthy Item 1',
        description: 'Item with good stock',
        current_stock: 100,
        minimum_stock: 10,
        unit_price: '25.99'
      },
      {
        sku: 'HEALTHY-002',
        name: 'Healthy Item 2',
        description: 'Another healthy item',
        current_stock: 50,
        minimum_stock: 25,
        unit_price: '15.50'
      }
    ]).execute();

    const result = await getLowStockAlerts();

    expect(result).toHaveLength(0);
  });

  it('should return items with current_stock <= minimum_stock', async () => {
    await db.insert(itemsTable).values([
      {
        sku: 'LOW-001',
        name: 'Low Stock Item',
        description: 'Item below minimum',
        current_stock: 5,
        minimum_stock: 10,
        unit_price: '12.99'
      },
      {
        sku: 'EQUAL-001',
        name: 'Equal Stock Item',
        description: 'Item at minimum threshold',
        current_stock: 15,
        minimum_stock: 15,
        unit_price: '8.75'
      },
      {
        sku: 'HEALTHY-001',
        name: 'Healthy Item',
        description: 'Item above minimum',
        current_stock: 25,
        minimum_stock: 10,
        unit_price: '20.00'
      }
    ]).execute();

    const result = await getLowStockAlerts();

    expect(result).toHaveLength(2);
    expect(result.map(item => item.sku)).toEqual(['LOW-001', 'EQUAL-001']);
  });

  it('should prioritize items with zero stock', async () => {
    await db.insert(itemsTable).values([
      {
        sku: 'ZERO-001',
        name: 'Zero Stock Item',
        description: 'Out of stock item',
        current_stock: 0,
        minimum_stock: 10,
        unit_price: '15.99'
      },
      {
        sku: 'LOW-001',
        name: 'Low Stock Item',
        description: 'Low but not zero',
        current_stock: 3,
        minimum_stock: 10,
        unit_price: '12.50'
      },
      {
        sku: 'CRITICAL-001',
        name: 'Another Low Item',
        description: 'Also low stock',
        current_stock: 1,
        minimum_stock: 5,
        unit_price: '18.25'
      }
    ]).execute();

    const result = await getLowStockAlerts();

    expect(result).toHaveLength(3);
    // Items should be sorted by current_stock ascending (zero stock first)
    expect(result[0].sku).toEqual('ZERO-001');
    expect(result[0].current_stock).toEqual(0);
    expect(result[1].current_stock).toEqual(1);
    expect(result[2].current_stock).toEqual(3);
  });

  it('should sort items with same stock level by name alphabetically', async () => {
    await db.insert(itemsTable).values([
      {
        sku: 'ZEBRA-001',
        name: 'Zebra Item',
        description: 'Item starting with Z',
        current_stock: 2,
        minimum_stock: 10,
        unit_price: '10.00'
      },
      {
        sku: 'APPLE-001',
        name: 'Apple Item',
        description: 'Item starting with A',
        current_stock: 2,
        minimum_stock: 10,
        unit_price: '15.00'
      },
      {
        sku: 'BANANA-001',
        name: 'Banana Item',
        description: 'Item starting with B',
        current_stock: 2,
        minimum_stock: 10,
        unit_price: '20.00'
      }
    ]).execute();

    const result = await getLowStockAlerts();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('Apple Item');
    expect(result[1].name).toEqual('Banana Item');
    expect(result[2].name).toEqual('Zebra Item');
  });

  it('should convert numeric unit_price field correctly', async () => {
    await db.insert(itemsTable).values({
      sku: 'NUMERIC-001',
      name: 'Test Numeric Item',
      description: 'Testing numeric conversion',
      current_stock: 1,
      minimum_stock: 10,
      unit_price: '123.45'
    }).execute();

    const result = await getLowStockAlerts();

    expect(result).toHaveLength(1);
    expect(typeof result[0].unit_price).toBe('number');
    expect(result[0].unit_price).toEqual(123.45);
  });

  it('should return all item fields correctly', async () => {
    await db.insert(itemsTable).values({
      sku: 'COMPLETE-001',
      name: 'Complete Test Item',
      description: 'Testing all fields',
      current_stock: 0,
      minimum_stock: 5,
      unit_price: '29.99'
    }).execute();

    const result = await getLowStockAlerts();

    expect(result).toHaveLength(1);
    const item = result[0];
    
    expect(item.id).toBeDefined();
    expect(item.sku).toEqual('COMPLETE-001');
    expect(item.name).toEqual('Complete Test Item');
    expect(item.description).toEqual('Testing all fields');
    expect(item.current_stock).toEqual(0);
    expect(item.minimum_stock).toEqual(5);
    expect(item.unit_price).toEqual(29.99);
    expect(item.created_at).toBeInstanceOf(Date);
    expect(item.updated_at).toBeInstanceOf(Date);
  });

  it('should handle items with null description', async () => {
    await db.insert(itemsTable).values({
      sku: 'NULL-DESC-001',
      name: 'No Description Item',
      description: null,
      current_stock: 2,
      minimum_stock: 10,
      unit_price: '5.00'
    }).execute();

    const result = await getLowStockAlerts();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].name).toEqual('No Description Item');
  });

  it('should handle complex sorting scenario with mixed stock levels', async () => {
    await db.insert(itemsTable).values([
      {
        sku: 'MIX-001',
        name: 'Beta Zero Stock',
        current_stock: 0,
        minimum_stock: 10,
        unit_price: '10.00'
      },
      {
        sku: 'MIX-002',
        name: 'Alpha Zero Stock',
        current_stock: 0,
        minimum_stock: 5,
        unit_price: '15.00'
      },
      {
        sku: 'MIX-003',
        name: 'Charlie Low Stock',
        current_stock: 3,
        minimum_stock: 8,
        unit_price: '20.00'
      },
      {
        sku: 'MIX-004',
        name: 'Alpha Low Stock',
        current_stock: 3,
        minimum_stock: 12,
        unit_price: '25.00'
      },
      {
        sku: 'MIX-005',
        name: 'High Stock Item',
        current_stock: 50,
        minimum_stock: 10,
        unit_price: '30.00'
      }
    ]).execute();

    const result = await getLowStockAlerts();

    expect(result).toHaveLength(4);
    
    // Should be sorted by current_stock ascending, then by name ascending
    expect(result[0].name).toEqual('Alpha Zero Stock'); // 0 stock, alphabetically first
    expect(result[1].name).toEqual('Beta Zero Stock'); // 0 stock, alphabetically second
    expect(result[2].name).toEqual('Alpha Low Stock'); // 3 stock, alphabetically first
    expect(result[3].name).toEqual('Charlie Low Stock'); // 3 stock, alphabetically second
  });
});
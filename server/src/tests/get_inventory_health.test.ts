import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type CreateItemInput } from '../schema';
import { getInventoryHealth } from '../handlers/get_inventory_health';

describe('getInventoryHealth', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty report when no items exist', async () => {
    const result = await getInventoryHealth();

    expect(result.critical).toHaveLength(0);
    expect(result.warning).toHaveLength(0);
    expect(result.healthy).toHaveLength(0);
    expect(result.summary.total_items).toEqual(0);
    expect(result.summary.critical_count).toEqual(0);
    expect(result.summary.warning_count).toEqual(0);
    expect(result.summary.healthy_count).toEqual(0);
  });

  it('should categorize items correctly by stock levels', async () => {
    // Create test items with different stock scenarios
    const testItems: CreateItemInput[] = [
      {
        sku: 'CRITICAL-001',
        name: 'Critical Item',
        description: 'Out of stock item',
        current_stock: 0, // CRITICAL: exactly 0
        minimum_stock: 10,
        unit_price: 25.99
      },
      {
        sku: 'WARNING-001',
        name: 'Warning Item 1',
        description: 'Low stock item',
        current_stock: 5, // WARNING: below minimum
        minimum_stock: 10,
        unit_price: 15.50
      },
      {
        sku: 'WARNING-002',
        name: 'Warning Item 2',
        description: 'At minimum stock',
        current_stock: 20, // WARNING: exactly at minimum
        minimum_stock: 20,
        unit_price: 8.75
      },
      {
        sku: 'HEALTHY-001',
        name: 'Healthy Item',
        description: 'Good stock level',
        current_stock: 50, // HEALTHY: above minimum
        minimum_stock: 20,
        unit_price: 12.00
      }
    ];

    // Insert test items
    for (const item of testItems) {
      await db.insert(itemsTable)
        .values({
          sku: item.sku,
          name: item.name,
          description: item.description,
          current_stock: item.current_stock,
          minimum_stock: item.minimum_stock,
          unit_price: item.unit_price.toString()
        })
        .execute();
    }

    const result = await getInventoryHealth();

    // Verify categorization
    expect(result.critical).toHaveLength(1);
    expect(result.warning).toHaveLength(2);
    expect(result.healthy).toHaveLength(1);

    // Check critical item
    expect(result.critical[0].sku).toEqual('CRITICAL-001');
    expect(result.critical[0].status).toEqual('CRITICAL');
    expect(result.critical[0].current_stock).toEqual(0);

    // Check warning items
    const warningSKUs = result.warning.map(item => item.sku).sort();
    expect(warningSKUs).toEqual(['WARNING-001', 'WARNING-002']);
    result.warning.forEach(item => {
      expect(item.status).toEqual('WARNING');
      expect(item.current_stock).toBeLessThanOrEqual(item.minimum_stock);
      expect(item.current_stock).toBeGreaterThan(0);
    });

    // Check healthy item
    expect(result.healthy[0].sku).toEqual('HEALTHY-001');
    expect(result.healthy[0].status).toEqual('HEALTHY');
    expect(result.healthy[0].current_stock).toBeGreaterThan(result.healthy[0].minimum_stock);

    // Verify summary counts
    expect(result.summary.total_items).toEqual(4);
    expect(result.summary.critical_count).toEqual(1);
    expect(result.summary.warning_count).toEqual(2);
    expect(result.summary.healthy_count).toEqual(1);
  });

  it('should include all required item fields in health items', async () => {
    // Create single test item
    await db.insert(itemsTable)
      .values({
        sku: 'TEST-001',
        name: 'Test Item',
        description: 'Test description',
        current_stock: 15,
        minimum_stock: 10,
        unit_price: '29.99'
      })
      .execute();

    const result = await getInventoryHealth();

    expect(result.healthy).toHaveLength(1);
    const healthItem = result.healthy[0];
    
    // Verify all required fields are present
    expect(healthItem.id).toBeDefined();
    expect(typeof healthItem.id).toBe('number');
    expect(healthItem.sku).toEqual('TEST-001');
    expect(healthItem.name).toEqual('Test Item');
    expect(healthItem.current_stock).toEqual(15);
    expect(healthItem.minimum_stock).toEqual(10);
    expect(healthItem.status).toEqual('HEALTHY');
  });

  it('should handle edge case where minimum_stock is 0', async () => {
    // Create items with zero minimum stock
    const testItems = [
      {
        sku: 'ZERO-MIN-1',
        name: 'Zero Min Critical',
        current_stock: 0, // CRITICAL
        minimum_stock: 0,
        unit_price: '10.00'
      },
      {
        sku: 'ZERO-MIN-2',
        name: 'Zero Min Healthy',
        current_stock: 5, // HEALTHY (above minimum of 0)
        minimum_stock: 0,
        unit_price: '15.00'
      }
    ];

    for (const item of testItems) {
      await db.insert(itemsTable)
        .values({
          sku: item.sku,
          name: item.name,
          description: null,
          current_stock: item.current_stock,
          minimum_stock: item.minimum_stock,
          unit_price: item.unit_price
        })
        .execute();
    }

    const result = await getInventoryHealth();

    // Item with 0 current stock should still be critical
    expect(result.critical).toHaveLength(1);
    expect(result.critical[0].sku).toEqual('ZERO-MIN-1');
    expect(result.critical[0].status).toEqual('CRITICAL');

    // Item with stock > 0 and minimum = 0 should be healthy
    expect(result.healthy).toHaveLength(1);
    expect(result.healthy[0].sku).toEqual('ZERO-MIN-2');
    expect(result.healthy[0].status).toEqual('HEALTHY');

    expect(result.warning).toHaveLength(0);
  });

  it('should handle large number of items efficiently', async () => {
    // Create multiple items across all categories
    const itemsToCreate = [];
    
    // Create 10 items of each category
    for (let i = 1; i <= 10; i++) {
      itemsToCreate.push({
        sku: `CRIT-${i.toString().padStart(3, '0')}`,
        name: `Critical Item ${i}`,
        current_stock: 0,
        minimum_stock: 10,
        unit_price: '10.00'
      });
      
      itemsToCreate.push({
        sku: `WARN-${i.toString().padStart(3, '0')}`,
        name: `Warning Item ${i}`,
        current_stock: 5,
        minimum_stock: 10,
        unit_price: '15.00'
      });
      
      itemsToCreate.push({
        sku: `HLTH-${i.toString().padStart(3, '0')}`,
        name: `Healthy Item ${i}`,
        current_stock: 25,
        minimum_stock: 10,
        unit_price: '20.00'
      });
    }

    // Insert all items
    for (const item of itemsToCreate) {
      await db.insert(itemsTable)
        .values({
          sku: item.sku,
          name: item.name,
          description: null,
          current_stock: item.current_stock,
          minimum_stock: item.minimum_stock,
          unit_price: item.unit_price
        })
        .execute();
    }

    const result = await getInventoryHealth();

    // Verify counts
    expect(result.summary.total_items).toEqual(30);
    expect(result.summary.critical_count).toEqual(10);
    expect(result.summary.warning_count).toEqual(10);
    expect(result.summary.healthy_count).toEqual(10);

    // Verify arrays have correct lengths
    expect(result.critical).toHaveLength(10);
    expect(result.warning).toHaveLength(10);
    expect(result.healthy).toHaveLength(10);

    // Verify all items are properly categorized
    result.critical.forEach(item => {
      expect(item.status).toEqual('CRITICAL');
      expect(item.current_stock).toEqual(0);
    });

    result.warning.forEach(item => {
      expect(item.status).toEqual('WARNING');
      expect(item.current_stock).toBeGreaterThan(0);
      expect(item.current_stock).toBeLessThanOrEqual(item.minimum_stock);
    });

    result.healthy.forEach(item => {
      expect(item.status).toEqual('HEALTHY');
      expect(item.current_stock).toBeGreaterThan(item.minimum_stock);
    });
  });
});
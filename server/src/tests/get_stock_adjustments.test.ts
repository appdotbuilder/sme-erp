import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, itemsTable, stockAdjustmentsTable } from '../db/schema';
import { getStockAdjustments } from '../handlers/get_stock_adjustments';

describe('getStockAdjustments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no stock adjustments exist', async () => {
    const result = await getStockAdjustments();
    expect(result).toEqual([]);
  });

  it('should fetch all stock adjustments with default behavior', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        clerk_id: 'test_user_1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'WAREHOUSE_MANAGER',
      })
      .returning()
      .execute();

    // Create test item
    const itemResult = await db.insert(itemsTable)
      .values({
        sku: 'TEST-001',
        name: 'Test Item',
        description: 'Test item description',
        current_stock: 100,
        minimum_stock: 10,
        unit_price: '25.99',
      })
      .returning()
      .execute();

    // Create stock adjustments
    const adjustment1 = await db.insert(stockAdjustmentsTable)
      .values({
        item_id: itemResult[0].id,
        adjustment_type: 'ADDITION',
        quantity_change: 50,
        reason: 'Stock replenishment',
        previous_stock: 50,
        new_stock: 100,
        adjusted_by: userResult[0].clerk_id,
      })
      .returning()
      .execute();

    const adjustment2 = await db.insert(stockAdjustmentsTable)
      .values({
        item_id: itemResult[0].id,
        adjustment_type: 'REMOVAL',
        quantity_change: -20,
        reason: 'Damaged goods',
        previous_stock: 100,
        new_stock: 80,
        adjusted_by: userResult[0].clerk_id,
      })
      .returning()
      .execute();

    const results = await getStockAdjustments();

    expect(results).toHaveLength(2);
    
    // Results should be ordered by most recent first
    expect(results[0].id).toEqual(adjustment2[0].id);
    expect(results[1].id).toEqual(adjustment1[0].id);

    // Verify first result details
    expect(results[0].item_id).toEqual(itemResult[0].id);
    expect(results[0].adjustment_type).toEqual('REMOVAL');
    expect(results[0].quantity_change).toEqual(-20);
    expect(results[0].reason).toEqual('Damaged goods');
    expect(results[0].previous_stock).toEqual(100);
    expect(results[0].new_stock).toEqual(80);
    expect(results[0].adjusted_by).toEqual(userResult[0].clerk_id);
    expect(results[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter by item_id', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        clerk_id: 'test_user_1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'WAREHOUSE_MANAGER',
      })
      .returning()
      .execute();

    // Create two test items
    const item1Result = await db.insert(itemsTable)
      .values({
        sku: 'TEST-001',
        name: 'Test Item 1',
        current_stock: 100,
        minimum_stock: 10,
        unit_price: '25.99',
      })
      .returning()
      .execute();

    const item2Result = await db.insert(itemsTable)
      .values({
        sku: 'TEST-002',
        name: 'Test Item 2',
        current_stock: 50,
        minimum_stock: 5,
        unit_price: '15.99',
      })
      .returning()
      .execute();

    // Create adjustments for both items
    await db.insert(stockAdjustmentsTable)
      .values([
        {
          item_id: item1Result[0].id,
          adjustment_type: 'ADDITION',
          quantity_change: 50,
          reason: 'Restock item 1',
          previous_stock: 50,
          new_stock: 100,
          adjusted_by: userResult[0].clerk_id,
        },
        {
          item_id: item2Result[0].id,
          adjustment_type: 'CORRECTION',
          quantity_change: 10,
          reason: 'Count correction item 2',
          previous_stock: 40,
          new_stock: 50,
          adjusted_by: userResult[0].clerk_id,
        },
      ])
      .execute();

    // Filter by first item only
    const results = await getStockAdjustments({ item_id: item1Result[0].id });

    expect(results).toHaveLength(1);
    expect(results[0].item_id).toEqual(item1Result[0].id);
    expect(results[0].reason).toEqual('Restock item 1');
  });

  it('should filter by adjusted_by user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        clerk_id: 'user_1',
        email: 'user1@example.com',
        name: 'User One',
        role: 'WAREHOUSE_MANAGER',
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        clerk_id: 'user_2',
        email: 'user2@example.com',
        name: 'User Two',
        role: 'WAREHOUSE_MANAGER',
      })
      .returning()
      .execute();

    // Create test item
    const itemResult = await db.insert(itemsTable)
      .values({
        sku: 'TEST-001',
        name: 'Test Item',
        current_stock: 100,
        minimum_stock: 10,
        unit_price: '25.99',
      })
      .returning()
      .execute();

    // Create adjustments by different users
    await db.insert(stockAdjustmentsTable)
      .values([
        {
          item_id: itemResult[0].id,
          adjustment_type: 'ADDITION',
          quantity_change: 25,
          reason: 'Adjustment by user 1',
          previous_stock: 75,
          new_stock: 100,
          adjusted_by: user1Result[0].clerk_id,
        },
        {
          item_id: itemResult[0].id,
          adjustment_type: 'REMOVAL',
          quantity_change: -10,
          reason: 'Adjustment by user 2',
          previous_stock: 110,
          new_stock: 100,
          adjusted_by: user2Result[0].clerk_id,
        },
      ])
      .execute();

    // Filter by user 1 only
    const results = await getStockAdjustments({ adjusted_by: 'user_1' });

    expect(results).toHaveLength(1);
    expect(results[0].adjusted_by).toEqual('user_1');
    expect(results[0].reason).toEqual('Adjustment by user 1');
  });

  it('should filter by adjustment_type', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        clerk_id: 'test_user_1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'WAREHOUSE_MANAGER',
      })
      .returning()
      .execute();

    // Create test item
    const itemResult = await db.insert(itemsTable)
      .values({
        sku: 'TEST-001',
        name: 'Test Item',
        current_stock: 100,
        minimum_stock: 10,
        unit_price: '25.99',
      })
      .returning()
      .execute();

    // Create different types of adjustments
    await db.insert(stockAdjustmentsTable)
      .values([
        {
          item_id: itemResult[0].id,
          adjustment_type: 'ADDITION',
          quantity_change: 50,
          reason: 'Addition adjustment',
          previous_stock: 50,
          new_stock: 100,
          adjusted_by: userResult[0].clerk_id,
        },
        {
          item_id: itemResult[0].id,
          adjustment_type: 'REMOVAL',
          quantity_change: -20,
          reason: 'Removal adjustment',
          previous_stock: 120,
          new_stock: 100,
          adjusted_by: userResult[0].clerk_id,
        },
        {
          item_id: itemResult[0].id,
          adjustment_type: 'CORRECTION',
          quantity_change: 5,
          reason: 'Correction adjustment',
          previous_stock: 95,
          new_stock: 100,
          adjusted_by: userResult[0].clerk_id,
        },
      ])
      .execute();

    // Filter by CORRECTION type only
    const results = await getStockAdjustments({ adjustment_type: 'CORRECTION' });

    expect(results).toHaveLength(1);
    expect(results[0].adjustment_type).toEqual('CORRECTION');
    expect(results[0].reason).toEqual('Correction adjustment');
  });

  it('should filter by date range', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        clerk_id: 'test_user_1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'WAREHOUSE_MANAGER',
      })
      .returning()
      .execute();

    // Create test item
    const itemResult = await db.insert(itemsTable)
      .values({
        sku: 'TEST-001',
        name: 'Test Item',
        current_stock: 100,
        minimum_stock: 10,
        unit_price: '25.99',
      })
      .returning()
      .execute();

    // Create an adjustment
    await db.insert(stockAdjustmentsTable)
      .values({
        item_id: itemResult[0].id,
        adjustment_type: 'ADDITION',
        quantity_change: 50,
        reason: 'Recent adjustment',
        previous_stock: 50,
        new_stock: 100,
        adjusted_by: userResult[0].clerk_id,
      })
      .execute();

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Test with date range that includes today
    const results = await getStockAdjustments({
      start_date: yesterday,
      end_date: tomorrow,
    });

    expect(results.length).toBeGreaterThan(0);
    results.forEach(result => {
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.created_at >= yesterday).toBe(true);
      expect(result.created_at <= tomorrow).toBe(true);
    });
  });

  it('should apply pagination correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        clerk_id: 'test_user_1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'WAREHOUSE_MANAGER',
      })
      .returning()
      .execute();

    // Create test item
    const itemResult = await db.insert(itemsTable)
      .values({
        sku: 'TEST-001',
        name: 'Test Item',
        current_stock: 100,
        minimum_stock: 10,
        unit_price: '25.99',
      })
      .returning()
      .execute();

    // Create multiple adjustments
    const adjustments = [];
    for (let i = 0; i < 15; i++) {
      adjustments.push({
        item_id: itemResult[0].id,
        adjustment_type: 'ADDITION' as const,
        quantity_change: i + 1,
        reason: `Adjustment ${i + 1}`,
        previous_stock: 100 + i,
        new_stock: 100 + i + 1,
        adjusted_by: userResult[0].clerk_id,
      });
    }
    await db.insert(stockAdjustmentsTable).values(adjustments).execute();

    // Test first page
    const firstPage = await getStockAdjustments({ limit: 5, offset: 0 });
    expect(firstPage).toHaveLength(5);

    // Test second page
    const secondPage = await getStockAdjustments({ limit: 5, offset: 5 });
    expect(secondPage).toHaveLength(5);

    // Ensure different results
    expect(firstPage[0].id).not.toEqual(secondPage[0].id);
  });

  it('should combine multiple filters correctly', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        clerk_id: 'user_1',
        email: 'user1@example.com',
        name: 'User One',
        role: 'WAREHOUSE_MANAGER',
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        clerk_id: 'user_2',
        email: 'user2@example.com',
        name: 'User Two',
        role: 'WAREHOUSE_MANAGER',
      })
      .returning()
      .execute();

    // Create test item
    const itemResult = await db.insert(itemsTable)
      .values({
        sku: 'TEST-001',
        name: 'Test Item',
        current_stock: 100,
        minimum_stock: 10,
        unit_price: '25.99',
      })
      .returning()
      .execute();

    // Create mixed adjustments
    await db.insert(stockAdjustmentsTable)
      .values([
        {
          item_id: itemResult[0].id,
          adjustment_type: 'ADDITION',
          quantity_change: 25,
          reason: 'User 1 addition',
          previous_stock: 75,
          new_stock: 100,
          adjusted_by: user1Result[0].clerk_id,
        },
        {
          item_id: itemResult[0].id,
          adjustment_type: 'REMOVAL',
          quantity_change: -10,
          reason: 'User 1 removal',
          previous_stock: 110,
          new_stock: 100,
          adjusted_by: user1Result[0].clerk_id,
        },
        {
          item_id: itemResult[0].id,
          adjustment_type: 'ADDITION',
          quantity_change: 15,
          reason: 'User 2 addition',
          previous_stock: 85,
          new_stock: 100,
          adjusted_by: user2Result[0].clerk_id,
        },
      ])
      .execute();

    // Filter by user 1 and ADDITION type
    const results = await getStockAdjustments({
      adjusted_by: 'user_1',
      adjustment_type: 'ADDITION',
    });

    expect(results).toHaveLength(1);
    expect(results[0].adjusted_by).toEqual('user_1');
    expect(results[0].adjustment_type).toEqual('ADDITION');
    expect(results[0].reason).toEqual('User 1 addition');
  });
});
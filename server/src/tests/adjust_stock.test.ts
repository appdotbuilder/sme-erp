import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, usersTable, stockAdjustmentsTable } from '../db/schema';
import { type AdjustStockInput } from '../schema';
import { adjustStock } from '../handlers/adjust_stock';
import { eq } from 'drizzle-orm';

describe('adjustStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testItemId: number;
  let testUserId: string;

  beforeEach(async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        clerk_id: 'user_test123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'WAREHOUSE_MANAGER'
      })
      .returning()
      .execute();

    testUserId = userResult[0].clerk_id;

    // Create a test item with initial stock
    const itemResult = await db.insert(itemsTable)
      .values({
        sku: 'TEST-001',
        name: 'Test Item',
        description: 'A test item for stock adjustments',
        current_stock: 100,
        minimum_stock: 10,
        unit_price: '25.50'
      })
      .returning()
      .execute();

    testItemId = itemResult[0].id;
  });

  describe('ADDITION adjustments', () => {
    it('should add stock to an item', async () => {
      const input: AdjustStockInput = {
        item_id: testItemId,
        adjustment_type: 'ADDITION',
        quantity_change: 50,
        reason: 'Restocking from supplier'
      };

      const result = await adjustStock(input, testUserId);

      expect(result.item_id).toEqual(testItemId);
      expect(result.adjustment_type).toEqual('ADDITION');
      expect(result.quantity_change).toEqual(50);
      expect(result.reason).toEqual('Restocking from supplier');
      expect(result.previous_stock).toEqual(100);
      expect(result.new_stock).toEqual(150);
      expect(result.adjusted_by).toEqual(testUserId);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should handle negative quantity_change for ADDITION by using absolute value', async () => {
      const input: AdjustStockInput = {
        item_id: testItemId,
        adjustment_type: 'ADDITION',
        quantity_change: -30, // Should be treated as +30
        reason: 'Stock addition with negative input'
      };

      const result = await adjustStock(input, testUserId);

      expect(result.quantity_change).toEqual(30);
      expect(result.previous_stock).toEqual(100);
      expect(result.new_stock).toEqual(130);
    });

    it('should update the item stock in database', async () => {
      const input: AdjustStockInput = {
        item_id: testItemId,
        adjustment_type: 'ADDITION',
        quantity_change: 25,
        reason: 'Stock addition test'
      };

      await adjustStock(input, testUserId);

      const updatedItem = await db.select()
        .from(itemsTable)
        .where(eq(itemsTable.id, testItemId))
        .execute();

      expect(updatedItem[0].current_stock).toEqual(125);
      expect(updatedItem[0].updated_at).toBeInstanceOf(Date);
    });
  });

  describe('REMOVAL adjustments', () => {
    it('should remove stock from an item', async () => {
      const input: AdjustStockInput = {
        item_id: testItemId,
        adjustment_type: 'REMOVAL',
        quantity_change: 30,
        reason: 'Damaged items removed'
      };

      const result = await adjustStock(input, testUserId);

      expect(result.adjustment_type).toEqual('REMOVAL');
      expect(result.quantity_change).toEqual(-30);
      expect(result.previous_stock).toEqual(100);
      expect(result.new_stock).toEqual(70);
    });

    it('should handle negative quantity_change for REMOVAL by using absolute value', async () => {
      const input: AdjustStockInput = {
        item_id: testItemId,
        adjustment_type: 'REMOVAL',
        quantity_change: -40, // Should be treated as -40
        reason: 'Stock removal with negative input'
      };

      const result = await adjustStock(input, testUserId);

      expect(result.quantity_change).toEqual(-40);
      expect(result.previous_stock).toEqual(100);
      expect(result.new_stock).toEqual(60);
    });

    it('should reject removal that would result in negative stock', async () => {
      const input: AdjustStockInput = {
        item_id: testItemId,
        adjustment_type: 'REMOVAL',
        quantity_change: 150, // More than current stock of 100
        reason: 'Attempted over-removal'
      };

      await expect(adjustStock(input, testUserId))
        .rejects.toThrow(/insufficient stock/i);
    });

    it('should allow removal that exactly empties stock', async () => {
      const input: AdjustStockInput = {
        item_id: testItemId,
        adjustment_type: 'REMOVAL',
        quantity_change: 100, // Exact current stock
        reason: 'Complete stock removal'
      };

      const result = await adjustStock(input, testUserId);

      expect(result.new_stock).toEqual(0);
      expect(result.previous_stock).toEqual(100);
      expect(result.quantity_change).toEqual(-100);
    });
  });

  describe('CORRECTION adjustments', () => {
    it('should handle positive correction (increase)', async () => {
      const input: AdjustStockInput = {
        item_id: testItemId,
        adjustment_type: 'CORRECTION',
        quantity_change: 20,
        reason: 'Inventory count correction - found more items'
      };

      const result = await adjustStock(input, testUserId);

      expect(result.adjustment_type).toEqual('CORRECTION');
      expect(result.quantity_change).toEqual(20);
      expect(result.previous_stock).toEqual(100);
      expect(result.new_stock).toEqual(120);
    });

    it('should handle negative correction (decrease)', async () => {
      const input: AdjustStockInput = {
        item_id: testItemId,
        adjustment_type: 'CORRECTION',
        quantity_change: -25,
        reason: 'Inventory count correction - found fewer items'
      };

      const result = await adjustStock(input, testUserId);

      expect(result.quantity_change).toEqual(-25);
      expect(result.previous_stock).toEqual(100);
      expect(result.new_stock).toEqual(75);
    });

    it('should reject correction that would result in negative stock', async () => {
      const input: AdjustStockInput = {
        item_id: testItemId,
        adjustment_type: 'CORRECTION',
        quantity_change: -150, // Would result in -50 stock
        reason: 'Invalid correction attempt'
      };

      await expect(adjustStock(input, testUserId))
        .rejects.toThrow(/correction would result in negative stock/i);
    });

    it('should allow correction to exactly zero', async () => {
      const input: AdjustStockInput = {
        item_id: testItemId,
        adjustment_type: 'CORRECTION',
        quantity_change: -100,
        reason: 'Correction to zero stock'
      };

      const result = await adjustStock(input, testUserId);

      expect(result.new_stock).toEqual(0);
    });
  });

  describe('validation and error handling', () => {
    it('should reject adjustment for non-existent item', async () => {
      const input: AdjustStockInput = {
        item_id: 99999, // Non-existent item
        adjustment_type: 'ADDITION',
        quantity_change: 10,
        reason: 'Test with invalid item'
      };

      await expect(adjustStock(input, testUserId))
        .rejects.toThrow(/item with id 99999 not found/i);
    });

    it('should create audit trail in stock_adjustments table', async () => {
      const input: AdjustStockInput = {
        item_id: testItemId,
        adjustment_type: 'ADDITION',
        quantity_change: 15,
        reason: 'Audit trail test'
      };

      const result = await adjustStock(input, testUserId);

      const adjustmentRecords = await db.select()
        .from(stockAdjustmentsTable)
        .where(eq(stockAdjustmentsTable.id, result.id))
        .execute();

      expect(adjustmentRecords).toHaveLength(1);
      expect(adjustmentRecords[0].item_id).toEqual(testItemId);
      expect(adjustmentRecords[0].adjustment_type).toEqual('ADDITION');
      expect(adjustmentRecords[0].quantity_change).toEqual(15);
      expect(adjustmentRecords[0].reason).toEqual('Audit trail test');
      expect(adjustmentRecords[0].adjusted_by).toEqual(testUserId);
      expect(adjustmentRecords[0].created_at).toBeInstanceOf(Date);
    });

    it('should handle multiple consecutive adjustments correctly', async () => {
      // First adjustment
      await adjustStock({
        item_id: testItemId,
        adjustment_type: 'ADDITION',
        quantity_change: 50,
        reason: 'First adjustment'
      }, testUserId);

      // Second adjustment
      const result = await adjustStock({
        item_id: testItemId,
        adjustment_type: 'REMOVAL',
        quantity_change: 30,
        reason: 'Second adjustment'
      }, testUserId);

      expect(result.previous_stock).toEqual(150); // After first adjustment
      expect(result.new_stock).toEqual(120);

      // Verify final item stock
      const finalItem = await db.select()
        .from(itemsTable)
        .where(eq(itemsTable.id, testItemId))
        .execute();

      expect(finalItem[0].current_stock).toEqual(120);
    });
  });
});
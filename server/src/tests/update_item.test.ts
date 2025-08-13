import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type UpdateItemInput, type CreateItemInput } from '../schema';
import { updateItem } from '../handlers/update_item';
import { eq } from 'drizzle-orm';

// Helper function to create a test item
const createTestItem = async (itemData?: Partial<CreateItemInput>) => {
  const defaultData: CreateItemInput = {
    sku: 'TEST-SKU-001',
    name: 'Test Item',
    description: 'A test item for testing',
    current_stock: 100,
    minimum_stock: 10,
    unit_price: 25.99,
  };

  const mergedData = { ...defaultData, ...itemData };

  const result = await db.insert(itemsTable)
    .values({
      ...mergedData,
      unit_price: mergedData.unit_price.toString(), // Convert to string for numeric column
    })
    .returning()
    .execute();

  const item = result[0];
  return {
    ...item,
    unit_price: parseFloat(item.unit_price), // Convert back to number
  };
};

describe('updateItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update item name', async () => {
    // Create test item
    const testItem = await createTestItem();

    const updateInput: UpdateItemInput = {
      id: testItem.id,
      name: 'Updated Item Name',
    };

    const result = await updateItem(updateInput);

    expect(result.id).toEqual(testItem.id);
    expect(result.name).toEqual('Updated Item Name');
    expect(result.sku).toEqual(testItem.sku); // Should remain unchanged
    expect(result.description).toEqual(testItem.description);
    expect(result.current_stock).toEqual(testItem.current_stock);
    expect(result.minimum_stock).toEqual(testItem.minimum_stock);
    expect(result.unit_price).toEqual(testItem.unit_price);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testItem.updated_at).toBe(true);
  });

  it('should update item SKU', async () => {
    // Create test item
    const testItem = await createTestItem();

    const updateInput: UpdateItemInput = {
      id: testItem.id,
      sku: 'UPDATED-SKU-001',
    };

    const result = await updateItem(updateInput);

    expect(result.sku).toEqual('UPDATED-SKU-001');
    expect(result.name).toEqual(testItem.name); // Should remain unchanged
  });

  it('should update item description', async () => {
    // Create test item
    const testItem = await createTestItem();

    const updateInput: UpdateItemInput = {
      id: testItem.id,
      description: 'Updated description',
    };

    const result = await updateItem(updateInput);

    expect(result.description).toEqual('Updated description');
    expect(result.name).toEqual(testItem.name); // Should remain unchanged
  });

  it('should update description to null', async () => {
    // Create test item
    const testItem = await createTestItem();

    const updateInput: UpdateItemInput = {
      id: testItem.id,
      description: null,
    };

    const result = await updateItem(updateInput);

    expect(result.description).toBeNull();
    expect(result.name).toEqual(testItem.name); // Should remain unchanged
  });

  it('should update minimum stock', async () => {
    // Create test item
    const testItem = await createTestItem();

    const updateInput: UpdateItemInput = {
      id: testItem.id,
      minimum_stock: 20,
    };

    const result = await updateItem(updateInput);

    expect(result.minimum_stock).toEqual(20);
    expect(result.current_stock).toEqual(testItem.current_stock); // Should remain unchanged
    expect(result.name).toEqual(testItem.name);
  });

  it('should update unit price', async () => {
    // Create test item
    const testItem = await createTestItem();

    const updateInput: UpdateItemInput = {
      id: testItem.id,
      unit_price: 35.50,
    };

    const result = await updateItem(updateInput);

    expect(result.unit_price).toEqual(35.50);
    expect(typeof result.unit_price).toBe('number'); // Verify numeric conversion
    expect(result.name).toEqual(testItem.name); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    // Create test item
    const testItem = await createTestItem();

    const updateInput: UpdateItemInput = {
      id: testItem.id,
      name: 'Multi-Updated Item',
      sku: 'MULTI-SKU-001',
      description: 'Multi-updated description',
      minimum_stock: 15,
      unit_price: 42.99,
    };

    const result = await updateItem(updateInput);

    expect(result.id).toEqual(testItem.id);
    expect(result.name).toEqual('Multi-Updated Item');
    expect(result.sku).toEqual('MULTI-SKU-001');
    expect(result.description).toEqual('Multi-updated description');
    expect(result.minimum_stock).toEqual(15);
    expect(result.unit_price).toEqual(42.99);
    expect(typeof result.unit_price).toBe('number');
    expect(result.current_stock).toEqual(testItem.current_stock); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testItem.updated_at).toBe(true);
  });

  it('should save updated item to database', async () => {
    // Create test item
    const testItem = await createTestItem();

    const updateInput: UpdateItemInput = {
      id: testItem.id,
      name: 'Database Updated Item',
      unit_price: 99.99,
    };

    const result = await updateItem(updateInput);

    // Verify in database
    const dbItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, result.id))
      .execute();

    expect(dbItems).toHaveLength(1);
    const dbItem = dbItems[0];
    expect(dbItem.name).toEqual('Database Updated Item');
    expect(parseFloat(dbItem.unit_price)).toEqual(99.99);
    expect(dbItem.sku).toEqual(testItem.sku); // Should remain unchanged
    expect(dbItem.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when item does not exist', async () => {
    const updateInput: UpdateItemInput = {
      id: 999999, // Non-existent ID
      name: 'Non-existent Item',
    };

    await expect(updateItem(updateInput)).rejects.toThrow(/Item with ID 999999 not found/i);
  });

  it('should handle zero values correctly', async () => {
    // Create test item
    const testItem = await createTestItem();

    const updateInput: UpdateItemInput = {
      id: testItem.id,
      minimum_stock: 0,
      unit_price: 0,
    };

    const result = await updateItem(updateInput);

    expect(result.minimum_stock).toEqual(0);
    expect(result.unit_price).toEqual(0);
    expect(typeof result.unit_price).toBe('number');
  });

  it('should not update current_stock through this handler', async () => {
    // Create test item
    const testItem = await createTestItem({ current_stock: 50 });

    const updateInput: UpdateItemInput = {
      id: testItem.id,
      name: 'Updated Item',
    };

    const result = await updateItem(updateInput);

    // Current stock should remain unchanged (not updatable through this handler)
    expect(result.current_stock).toEqual(50);
    expect(result.name).toEqual('Updated Item');
  });
});
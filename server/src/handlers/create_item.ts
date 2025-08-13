import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type CreateItemInput, type Item } from '../schema';

export const createItem = async (input: CreateItemInput): Promise<Item> => {
  try {
    // Insert item record
    const result = await db.insert(itemsTable)
      .values({
        sku: input.sku,
        name: input.name,
        description: input.description || null,
        current_stock: input.current_stock,
        minimum_stock: input.minimum_stock,
        unit_price: input.unit_price.toString(), // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const item = result[0];
    return {
      ...item,
      unit_price: parseFloat(item.unit_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Item creation failed:', error);
    throw error;
  }
};
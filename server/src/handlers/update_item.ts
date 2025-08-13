import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type UpdateItemInput, type Item } from '../schema';
import { eq } from 'drizzle-orm';

export const updateItem = async (input: UpdateItemInput): Promise<Item> => {
  try {
    // First, verify the item exists
    const existingItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.id))
      .execute();

    if (existingItems.length === 0) {
      throw new Error(`Item with ID ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (input.sku !== undefined) {
      updateData['sku'] = input.sku;
    }
    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }
    if (input.description !== undefined) {
      updateData['description'] = input.description;
    }
    if (input.minimum_stock !== undefined) {
      updateData['minimum_stock'] = input.minimum_stock;
    }
    if (input.unit_price !== undefined) {
      updateData['unit_price'] = input.unit_price.toString(); // Convert number to string for numeric column
    }

    // Update the item
    const result = await db.update(itemsTable)
      .set(updateData)
      .where(eq(itemsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const updatedItem = result[0];
    return {
      ...updatedItem,
      unit_price: parseFloat(updatedItem.unit_price), // Convert string back to number
    };
  } catch (error) {
    console.error('Item update failed:', error);
    throw error;
  }
};
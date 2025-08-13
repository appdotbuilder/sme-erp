import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type Item } from '../schema';

export const getItems = async (): Promise<Item[]> => {
  try {
    const results = await db.select()
      .from(itemsTable)
      .execute();

    // Convert numeric fields back to numbers for the API
    return results.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price), // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch items:', error);
    throw error;
  }
};
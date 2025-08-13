import { db } from '../db';
import { itemsTable } from '../db/schema';
import { lte, asc, desc } from 'drizzle-orm';
import { type Item } from '../schema';

export async function getLowStockAlerts(): Promise<Item[]> {
  try {
    // Query items where current_stock <= minimum_stock
    // Sort by current_stock ascending (most critical first) then by name for consistency
    const results = await db
      .select()
      .from(itemsTable)
      .where(lte(itemsTable.current_stock, itemsTable.minimum_stock))
      .orderBy(
        asc(itemsTable.current_stock), // Items with lower stock first (0 stock items first)
        asc(itemsTable.name) // Secondary sort by name for consistency
      )
      .execute();

    // Convert numeric fields from string to number
    return results.map(item => ({
      ...item,
      unit_price: parseFloat(item.unit_price)
    }));
  } catch (error) {
    console.error('Failed to fetch low stock alerts:', error);
    throw error;
  }
}
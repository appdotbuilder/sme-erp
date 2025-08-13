import { db } from '../db';
import { itemsTable, stockAdjustmentsTable } from '../db/schema';
import { type AdjustStockInput, type StockAdjustment } from '../schema';
import { eq } from 'drizzle-orm';

export async function adjustStock(input: AdjustStockInput, adjustedBy: string): Promise<StockAdjustment> {
  try {
    // 1. Validate that the item exists and get current stock
    const existingItem = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.item_id))
      .execute();

    if (existingItem.length === 0) {
      throw new Error(`Item with id ${input.item_id} not found`);
    }

    const item = existingItem[0];
    const previousStock = item.current_stock;

    // 2. Calculate new stock levels based on adjustment type and quantity
    let newStock: number;
    let actualQuantityChange: number;

    switch (input.adjustment_type) {
      case 'ADDITION':
        actualQuantityChange = Math.abs(input.quantity_change);
        newStock = previousStock + actualQuantityChange;
        break;
      case 'REMOVAL':
        actualQuantityChange = -Math.abs(input.quantity_change);
        newStock = previousStock + actualQuantityChange;
        // 3. Ensure stock doesn't go below zero for REMOVAL adjustments
        if (newStock < 0) {
          throw new Error(`Insufficient stock. Current stock: ${previousStock}, attempted removal: ${Math.abs(input.quantity_change)}`);
        }
        break;
      case 'CORRECTION':
        // For corrections, use the quantity_change as-is (can be positive or negative)
        actualQuantityChange = input.quantity_change;
        newStock = previousStock + actualQuantityChange;
        if (newStock < 0) {
          throw new Error(`Stock correction would result in negative stock. Current stock: ${previousStock}, correction: ${input.quantity_change}`);
        }
        break;
      default:
        throw new Error(`Invalid adjustment type: ${input.adjustment_type}`);
    }

    // 4. Update the item's current_stock in the items table
    await db.update(itemsTable)
      .set({ 
        current_stock: newStock,
        updated_at: new Date()
      })
      .where(eq(itemsTable.id, input.item_id))
      .execute();

    // 5. Create a stock adjustment record for audit trail
    const adjustmentResult = await db.insert(stockAdjustmentsTable)
      .values({
        item_id: input.item_id,
        adjustment_type: input.adjustment_type,
        quantity_change: actualQuantityChange,
        reason: input.reason,
        previous_stock: previousStock,
        new_stock: newStock,
        adjusted_by: adjustedBy
      })
      .returning()
      .execute();

    // 6. Return the created adjustment record
    return adjustmentResult[0];
  } catch (error) {
    console.error('Stock adjustment failed:', error);
    throw error;
  }
}
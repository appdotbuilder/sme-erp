import { db } from '../db';
import { stockAdjustmentsTable, itemsTable, usersTable } from '../db/schema';
import { type StockAdjustment } from '../schema';
import { desc, eq, and, gte, lte, SQL } from 'drizzle-orm';

export interface GetStockAdjustmentsFilters {
  item_id?: number;
  adjusted_by?: string; // clerk_id
  adjustment_type?: 'ADDITION' | 'REMOVAL' | 'CORRECTION';
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

export async function getStockAdjustments(
  filters: GetStockAdjustmentsFilters = {}
): Promise<StockAdjustment[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (filters.item_id !== undefined) {
      conditions.push(eq(stockAdjustmentsTable.item_id, filters.item_id));
    }

    if (filters.adjusted_by) {
      conditions.push(eq(stockAdjustmentsTable.adjusted_by, filters.adjusted_by));
    }

    if (filters.adjustment_type) {
      conditions.push(eq(stockAdjustmentsTable.adjustment_type, filters.adjustment_type));
    }

    if (filters.start_date) {
      conditions.push(gte(stockAdjustmentsTable.created_at, filters.start_date));
    }

    if (filters.end_date) {
      conditions.push(lte(stockAdjustmentsTable.created_at, filters.end_date));
    }

    // Build the complete query in one go to avoid TypeScript issues
    const baseQuery = db.select({
      id: stockAdjustmentsTable.id,
      item_id: stockAdjustmentsTable.item_id,
      adjustment_type: stockAdjustmentsTable.adjustment_type,
      quantity_change: stockAdjustmentsTable.quantity_change,
      reason: stockAdjustmentsTable.reason,
      previous_stock: stockAdjustmentsTable.previous_stock,
      new_stock: stockAdjustmentsTable.new_stock,
      adjusted_by: stockAdjustmentsTable.adjusted_by,
      created_at: stockAdjustmentsTable.created_at,
    })
    .from(stockAdjustmentsTable)
    .innerJoin(itemsTable, eq(stockAdjustmentsTable.item_id, itemsTable.id))
    .innerJoin(usersTable, eq(stockAdjustmentsTable.adjusted_by, usersTable.clerk_id));

    // Apply pagination defaults
    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;

    // Build final query with all clauses
    const finalQuery = conditions.length > 0
      ? baseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(stockAdjustmentsTable.created_at))
          .limit(limit)
          .offset(offset)
      : baseQuery
          .orderBy(desc(stockAdjustmentsTable.created_at))
          .limit(limit)
          .offset(offset);

    const results = await finalQuery.execute();

    // Transform results to match StockAdjustment schema
    return results.map(result => ({
      id: result.id,
      item_id: result.item_id,
      adjustment_type: result.adjustment_type,
      quantity_change: result.quantity_change,
      reason: result.reason,
      previous_stock: result.previous_stock,
      new_stock: result.new_stock,
      adjusted_by: result.adjusted_by,
      created_at: result.created_at,
    }));
  } catch (error) {
    console.error('Failed to fetch stock adjustments:', error);
    throw error;
  }
}
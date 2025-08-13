import { db } from '../db';
import { purchaseOrdersTable, suppliersTable, purchaseOrderItemsTable, itemsTable } from '../db/schema';
import { type PurchaseOrder } from '../schema';
import { eq } from 'drizzle-orm';

export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  try {
    // Fetch all purchase orders with their supplier information
    const results = await db.select()
      .from(purchaseOrdersTable)
      .innerJoin(suppliersTable, eq(purchaseOrdersTable.supplier_id, suppliersTable.id))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(result => ({
      ...result.purchase_orders,
      total_amount: parseFloat(result.purchase_orders.total_amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch purchase orders:', error);
    throw error;
  }
};
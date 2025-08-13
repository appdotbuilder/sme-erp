import { db } from '../db';
import { purchaseOrdersTable, purchaseOrderItemsTable, suppliersTable, itemsTable } from '../db/schema';
import { type CreatePurchaseOrderInput, type PurchaseOrder } from '../schema';
import { eq, inArray } from 'drizzle-orm';

export async function createPurchaseOrder(input: CreatePurchaseOrderInput, createdBy: string): Promise<PurchaseOrder> {
  try {
    // 1. Generate unique PO number (PO-YYYY-MM-DD-XXXX format)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = String(Date.now()).slice(-4);
    const poNumber = `PO-${year}-${month}-${day}-${timestamp}`;

    // 2. Validate that supplier exists
    const supplier = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, input.supplier_id))
      .execute();

    if (supplier.length === 0) {
      throw new Error(`Supplier with id ${input.supplier_id} not found`);
    }

    // 3. Validate that all items exist
    const itemIds = input.items.map(item => item.item_id);
    const existingItems = await db.select()
      .from(itemsTable)
      .where(inArray(itemsTable.id, itemIds))
      .execute();

    if (existingItems.length !== itemIds.length) {
      const foundIds = existingItems.map(item => item.id);
      const missingIds = itemIds.filter(id => !foundIds.includes(id));
      throw new Error(`Items with ids [${missingIds.join(', ')}] not found`);
    }

    // 4. Calculate total amount from items
    const totalAmount = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    // 5. Create the purchase order record
    const purchaseOrderResult = await db.insert(purchaseOrdersTable)
      .values({
        po_number: poNumber,
        supplier_id: input.supplier_id,
        status: 'DRAFT',
        total_amount: totalAmount.toString(), // Convert to string for numeric column
        notes: input.notes || null,
        created_by: createdBy,
      })
      .returning()
      .execute();

    const purchaseOrder = purchaseOrderResult[0];

    // 6. Create purchase order items records
    const purchaseOrderItems = input.items.map(item => ({
      po_id: purchaseOrder.id,
      item_id: item.item_id,
      quantity: item.quantity,
      unit_price: item.unit_price.toString(), // Convert to string for numeric column
      total_price: (item.quantity * item.unit_price).toString(), // Convert to string for numeric column
    }));

    await db.insert(purchaseOrderItemsTable)
      .values(purchaseOrderItems)
      .execute();

    // 7. Return the created purchase order with numeric conversion
    return {
      ...purchaseOrder,
      total_amount: parseFloat(purchaseOrder.total_amount), // Convert string back to number
    };
  } catch (error) {
    console.error('Purchase order creation failed:', error);
    throw error;
  }
}
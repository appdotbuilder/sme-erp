import { db } from '../db';
import { workOrdersTable, workOrderItemsTable, itemsTable, stockAdjustmentsTable } from '../db/schema';
import { type CompleteWorkOrderInput, type WorkOrder } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function completeWorkOrder(input: CompleteWorkOrderInput): Promise<WorkOrder> {
  try {
    // 1. Validate that work order exists and is in IN_PROGRESS status
    const workOrderResults = await db.select()
      .from(workOrdersTable)
      .where(eq(workOrdersTable.id, input.work_order_id))
      .execute();

    if (workOrderResults.length === 0) {
      throw new Error(`Work order with ID ${input.work_order_id} not found`);
    }

    const workOrder = workOrderResults[0];
    if (workOrder.status !== 'IN_PROGRESS') {
      throw new Error(`Work order must be IN_PROGRESS to complete. Current status: ${workOrder.status}`);
    }

    // 2. Fetch all work order items associated with this work order
    const workOrderItems = await db.select()
      .from(workOrderItemsTable)
      .where(eq(workOrderItemsTable.work_order_id, input.work_order_id))
      .execute();

    // 3. For each work order item, deduct the quantity_used from the item's current_stock
    // 4. Create stock adjustment records for audit trail (REMOVAL type)
    for (const workOrderItem of workOrderItems) {
      // Get current item stock
      const itemResults = await db.select()
        .from(itemsTable)
        .where(eq(itemsTable.id, workOrderItem.item_id))
        .execute();

      if (itemResults.length === 0) {
        throw new Error(`Item with ID ${workOrderItem.item_id} not found`);
      }

      const item = itemResults[0];
      const previousStock = item.current_stock;
      const newStock = previousStock - workOrderItem.quantity_used;

      if (newStock < 0) {
        throw new Error(`Insufficient stock for item ${item.sku}. Available: ${previousStock}, Required: ${workOrderItem.quantity_used}`);
      }

      // Update item stock
      await db.update(itemsTable)
        .set({ 
          current_stock: newStock,
          updated_at: new Date()
        })
        .where(eq(itemsTable.id, workOrderItem.item_id))
        .execute();

      // Create stock adjustment record for audit trail
      await db.insert(stockAdjustmentsTable)
        .values({
          item_id: workOrderItem.item_id,
          adjustment_type: 'REMOVAL',
          quantity_change: -workOrderItem.quantity_used,
          reason: `Work order completion: ${workOrder.work_order_number}`,
          previous_stock: previousStock,
          new_stock: newStock,
          adjusted_by: workOrder.assigned_technician
        })
        .execute();
    }

    // 5. Update work order status to COMPLETED and set completed_at timestamp
    const completedAt = new Date();
    const updatedWorkOrderResults = await db.update(workOrdersTable)
      .set({
        status: 'COMPLETED',
        completed_at: completedAt,
        updated_at: completedAt
      })
      .where(eq(workOrdersTable.id, input.work_order_id))
      .returning()
      .execute();

    // 6. Return the updated work order
    return updatedWorkOrderResults[0];
  } catch (error) {
    console.error('Work order completion failed:', error);
    throw error;
  }
}
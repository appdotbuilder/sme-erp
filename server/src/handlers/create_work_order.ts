import { db } from '../db';
import { workOrdersTable, workOrderItemsTable, usersTable, itemsTable } from '../db/schema';
import { type CreateWorkOrderInput, type WorkOrder } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createWorkOrder(input: CreateWorkOrderInput, createdBy: string): Promise<WorkOrder> {
  try {
    // 1. Generate unique work order number (WO-YYYY-MM-DD-XXXX format)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = String(Date.now()).slice(-4); // Last 4 digits for uniqueness
    const workOrderNumber = `WO-${dateStr}-${timestamp}`;

    // 2. Validate that assigned technician exists and has TECHNICIAN role
    const technician = await db.select()
      .from(usersTable)
      .where(eq(usersTable.clerk_id, input.assigned_technician))
      .execute();

    if (technician.length === 0) {
      throw new Error('Assigned technician not found');
    }

    if (technician[0].role !== 'TECHNICIAN') {
      throw new Error('Assigned user must have TECHNICIAN role');
    }

    // 3. Validate that all items exist and have sufficient stock
    for (const item of input.items) {
      const dbItem = await db.select()
        .from(itemsTable)
        .where(eq(itemsTable.id, item.item_id))
        .execute();

      if (dbItem.length === 0) {
        throw new Error(`Item with id ${item.item_id} not found`);
      }

      if (dbItem[0].current_stock < item.quantity_used) {
        throw new Error(`Insufficient stock for item ${dbItem[0].name}. Available: ${dbItem[0].current_stock}, Required: ${item.quantity_used}`);
      }
    }

    // 4. Create the work order record
    const workOrderResult = await db.insert(workOrdersTable)
      .values({
        work_order_number: workOrderNumber,
        description: input.description,
        assigned_technician: input.assigned_technician,
        status: 'OPEN',
        created_by: createdBy,
      })
      .returning()
      .execute();

    const workOrder = workOrderResult[0];

    // 5. Create work order items records
    const workOrderItems = input.items.map(item => ({
      work_order_id: workOrder.id,
      item_id: item.item_id,
      quantity_used: item.quantity_used,
    }));

    await db.insert(workOrderItemsTable)
      .values(workOrderItems)
      .execute();

    // 6. Return the created work order
    return {
      ...workOrder,
    };

  } catch (error) {
    console.error('Work order creation failed:', error);
    throw error;
  }
}
import { db } from '../db';
import { workOrdersTable, usersTable, workOrderItemsTable, itemsTable } from '../db/schema';
import { type WorkOrder } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getWorkOrders(): Promise<WorkOrder[]> {
  try {
    // Query work orders with creator and technician information
    const results = await db.select({
      id: workOrdersTable.id,
      work_order_number: workOrdersTable.work_order_number,
      description: workOrdersTable.description,
      assigned_technician: workOrdersTable.assigned_technician,
      status: workOrdersTable.status,
      created_by: workOrdersTable.created_by,
      created_at: workOrdersTable.created_at,
      updated_at: workOrdersTable.updated_at,
      completed_at: workOrdersTable.completed_at,
    })
    .from(workOrdersTable)
    .orderBy(desc(workOrdersTable.created_at))
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch work orders:', error);
    throw error;
  }
}
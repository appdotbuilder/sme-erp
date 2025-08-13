import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type InventoryHealthReport, type InventoryHealthItem } from '../schema';

export async function getInventoryHealth(): Promise<InventoryHealthReport> {
  try {
    // Fetch all items with their stock information
    const items = await db.select()
      .from(itemsTable)
      .execute();

    // Initialize categorized arrays
    const critical: InventoryHealthItem[] = [];
    const warning: InventoryHealthItem[] = [];
    const healthy: InventoryHealthItem[] = [];

    // Categorize items based on stock levels
    items.forEach(item => {
      const healthItem: InventoryHealthItem = {
        id: item.id,
        sku: item.sku,
        name: item.name,
        current_stock: item.current_stock,
        minimum_stock: item.minimum_stock,
        status: item.current_stock === 0 
          ? 'CRITICAL' 
          : item.current_stock <= item.minimum_stock 
            ? 'WARNING' 
            : 'HEALTHY'
      };

      // Add to appropriate category
      if (healthItem.status === 'CRITICAL') {
        critical.push(healthItem);
      } else if (healthItem.status === 'WARNING') {
        warning.push(healthItem);
      } else {
        healthy.push(healthItem);
      }
    });

    // Calculate summary statistics
    const summary = {
      total_items: items.length,
      critical_count: critical.length,
      warning_count: warning.length,
      healthy_count: healthy.length
    };

    return {
      critical,
      warning,
      healthy,
      summary
    };
  } catch (error) {
    console.error('Inventory health check failed:', error);
    throw error;
  }
}
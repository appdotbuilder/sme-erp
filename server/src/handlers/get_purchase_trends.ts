import { db } from '../db';
import { purchaseOrdersTable } from '../db/schema';
import { type PurchaseTrendInput, type PurchaseTrendsReport } from '../schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function getPurchaseTrends(input: PurchaseTrendInput): Promise<PurchaseTrendsReport> {
  try {
    // Parse the date strings into Date objects
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);

    // Calculate the date range in days to determine grouping strategy
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let dateFormat: string;
    let groupBy: string;
    
    // Determine grouping strategy based on date range
    if (daysDiff <= 31) {
      // Daily grouping for ranges up to 1 month
      dateFormat = 'YYYY-MM-DD';
      groupBy = 'DATE(created_at)';
    } else if (daysDiff <= 365) {
      // Weekly grouping for ranges up to 1 year
      dateFormat = 'YYYY-"W"WW';
      groupBy = 'DATE_TRUNC(\'week\', created_at)';
    } else {
      // Monthly grouping for longer ranges
      dateFormat = 'YYYY-MM';
      groupBy = 'DATE_TRUNC(\'month\', created_at)';
    }

    // Query approved purchase orders within date range using proper Drizzle syntax
    let query = db.select({
      period_date: sql`${sql.raw(groupBy)}`.as('period_date'),
      period: sql`TO_CHAR(${sql.raw(groupBy)}, ${dateFormat})`.as('period'),
      total_amount: sql`SUM(${purchaseOrdersTable.total_amount})`.as('total_amount'),
      order_count: sql`COUNT(*)`.as('order_count')
    })
    .from(purchaseOrdersTable)
    .where(and(
      eq(purchaseOrdersTable.status, 'APPROVED'),
      gte(purchaseOrdersTable.created_at, startDate),
      lte(purchaseOrdersTable.created_at, endDate)
    ))
    .groupBy(sql.raw(groupBy))
    .orderBy(sql`${sql.raw(groupBy)} ASC`);

    const trendsResult = await query.execute();

    // Transform the results and handle numeric conversions
    const trends = trendsResult.map((row: any) => ({
      period: row.period as string,
      total_amount: parseFloat(row.total_amount as string || '0'),
      order_count: Number(row.order_count || 0),
    }));

    // Calculate summary statistics
    const totalExpenditure = trends.reduce((sum: number, trend: any) => sum + trend.total_amount, 0);
    const totalOrders = trends.reduce((sum: number, trend: any) => sum + trend.order_count, 0);
    const averageOrderValue = totalOrders > 0 ? totalExpenditure / totalOrders : 0;

    return {
      trends,
      summary: {
        total_expenditure: totalExpenditure,
        total_orders: totalOrders,
        average_order_value: averageOrderValue,
      },
    };
  } catch (error) {
    console.error('Purchase trends analysis failed:', error);
    throw error;
  }
}
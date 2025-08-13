import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type Supplier } from '../schema';

export const getSuppliers = async (): Promise<Supplier[]> => {
  try {
    const results = await db.select()
      .from(suppliersTable)
      .execute();

    // Convert database results to schema format
    return results.map(supplier => ({
      ...supplier,
      // Note: In a real application, sensitive fields like bank_account and tax_id
      // should be decrypted here if they were encrypted in the database
      // and access should be controlled based on user roles
    }));
  } catch (error) {
    console.error('Failed to fetch suppliers:', error);
    throw error;
  }
};
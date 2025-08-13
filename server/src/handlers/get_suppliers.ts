import { type Supplier } from '../schema';

export async function getSuppliers(): Promise<Supplier[]> {
  // This is a placeholder declaration! Real code should be implemented here.
  // The goal of this handler is to fetch all suppliers from the database.
  // Should decrypt sensitive fields (bank_account, tax_id) before returning.
  // Consider implementing role-based access control for sensitive data visibility.
  return Promise.resolve([]);
}
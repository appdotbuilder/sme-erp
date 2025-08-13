import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput } from '../schema';
import { getSuppliers } from '../handlers/get_suppliers';

// Test supplier data
const testSupplier1: CreateSupplierInput = {
  name: 'ABC Supply Co.',
  contact_email: 'contact@abcsupply.com',
  contact_phone: '+1-555-0123',
  address: '123 Main St, City, State 12345',
  bank_account: 'ACC-123456789',
  tax_id: 'TAX-987654321'
};

const testSupplier2: CreateSupplierInput = {
  name: 'XYZ Manufacturing',
  contact_email: 'info@xyzmfg.com',
  contact_phone: '+1-555-0456',
  address: '456 Industrial Blvd, City, State 67890',
  bank_account: null,
  tax_id: null
};

const minimalSupplier: CreateSupplierInput = {
  name: 'Minimal Supplier',
  contact_email: null,
  contact_phone: null,
  address: null,
  bank_account: null,
  tax_id: null
};

describe('getSuppliers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no suppliers exist', async () => {
    const result = await getSuppliers();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should fetch single supplier with all fields', async () => {
    // Create test supplier
    await db.insert(suppliersTable)
      .values(testSupplier1)
      .execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('ABC Supply Co.');
    expect(result[0].contact_email).toBe('contact@abcsupply.com');
    expect(result[0].contact_phone).toBe('+1-555-0123');
    expect(result[0].address).toBe('123 Main St, City, State 12345');
    expect(result[0].bank_account).toBe('ACC-123456789');
    expect(result[0].tax_id).toBe('TAX-987654321');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should fetch multiple suppliers', async () => {
    // Create multiple test suppliers
    await db.insert(suppliersTable)
      .values([testSupplier1, testSupplier2])
      .execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(2);
    
    // Verify both suppliers are returned
    const supplierNames = result.map(s => s.name).sort();
    expect(supplierNames).toEqual(['ABC Supply Co.', 'XYZ Manufacturing']);

    // Check specific supplier details
    const abcSupplier = result.find(s => s.name === 'ABC Supply Co.');
    expect(abcSupplier?.contact_email).toBe('contact@abcsupply.com');
    expect(abcSupplier?.bank_account).toBe('ACC-123456789');

    const xyzSupplier = result.find(s => s.name === 'XYZ Manufacturing');
    expect(xyzSupplier?.contact_email).toBe('info@xyzmfg.com');
    expect(xyzSupplier?.bank_account).toBeNull();
  });

  it('should handle suppliers with null optional fields', async () => {
    // Create supplier with minimal required fields
    await db.insert(suppliersTable)
      .values(minimalSupplier)
      .execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Minimal Supplier');
    expect(result[0].contact_email).toBeNull();
    expect(result[0].contact_phone).toBeNull();
    expect(result[0].address).toBeNull();
    expect(result[0].bank_account).toBeNull();
    expect(result[0].tax_id).toBeNull();
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return suppliers ordered by database insertion order', async () => {
    // Insert suppliers in specific order
    await db.insert(suppliersTable)
      .values(testSupplier1)
      .execute();
    
    await db.insert(suppliersTable)
      .values(minimalSupplier)
      .execute();
      
    await db.insert(suppliersTable)
      .values(testSupplier2)
      .execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(3);
    // Verify order by id (insertion order)
    expect(result[0].name).toBe('ABC Supply Co.');
    expect(result[1].name).toBe('Minimal Supplier');
    expect(result[2].name).toBe('XYZ Manufacturing');
    
    // Verify ids are in ascending order
    expect(result[0].id).toBeLessThan(result[1].id);
    expect(result[1].id).toBeLessThan(result[2].id);
  });

  it('should handle large number of suppliers', async () => {
    // Create multiple suppliers
    const suppliers = Array.from({ length: 10 }, (_, i) => ({
      name: `Supplier ${i + 1}`,
      contact_email: `supplier${i + 1}@example.com`,
      contact_phone: `+1-555-${String(i).padStart(4, '0')}`,
      address: `${i + 1} Business St, City, State`,
      bank_account: i % 3 === 0 ? `ACC-${i}` : null, // Some have bank accounts
      tax_id: i % 2 === 0 ? `TAX-${i}` : null // Some have tax IDs
    }));

    await db.insert(suppliersTable)
      .values(suppliers)
      .execute();

    const result = await getSuppliers();

    expect(result).toHaveLength(10);
    
    // Verify all suppliers are returned with correct data
    result.forEach((supplier, index) => {
      expect(supplier.name).toBe(`Supplier ${index + 1}`);
      expect(supplier.contact_email).toBe(`supplier${index + 1}@example.com`);
      expect(supplier.id).toBeDefined();
      expect(supplier.created_at).toBeInstanceOf(Date);
      expect(supplier.updated_at).toBeInstanceOf(Date);
    });

    // Verify conditional fields
    const suppliersWithBankAccounts = result.filter(s => s.bank_account !== null);
    expect(suppliersWithBankAccounts.length).toBe(4); // Every 3rd supplier (0, 3, 6, 9)

    const suppliersWithTaxIds = result.filter(s => s.tax_id !== null);
    expect(suppliersWithTaxIds.length).toBe(5); // Every 2nd supplier (0, 2, 4, 6, 8)
  });
});
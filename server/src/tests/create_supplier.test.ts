import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput } from '../schema';
import { createSupplier } from '../handlers/create_supplier';
import { eq } from 'drizzle-orm';

// Test input with all fields
const fullSupplierInput: CreateSupplierInput = {
  name: 'Test Supplier Inc.',
  contact_email: 'supplier@test.com',
  contact_phone: '+1-555-0123',
  address: '123 Business St, Commerce City, ST 12345',
  bank_account: '1234567890123456',
  tax_id: 'TAX123456789',
};

// Minimal test input (only required fields)
const minimalSupplierInput: CreateSupplierInput = {
  name: 'Minimal Supplier',
};

describe('createSupplier', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a supplier with all fields', async () => {
    const result = await createSupplier(fullSupplierInput);

    // Basic field validation
    expect(result.name).toEqual('Test Supplier Inc.');
    expect(result.contact_email).toEqual('supplier@test.com');
    expect(result.contact_phone).toEqual('+1-555-0123');
    expect(result.address).toEqual('123 Business St, Commerce City, ST 12345');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Encrypted fields should be present but encrypted (not original values)
    expect(result.bank_account).toBeDefined();
    expect(result.bank_account).not.toEqual('1234567890123456');
    expect(result.tax_id).toBeDefined();
    expect(result.tax_id).not.toEqual('TAX123456789');
  });

  it('should create a supplier with minimal fields', async () => {
    const result = await createSupplier(minimalSupplierInput);

    expect(result.name).toEqual('Minimal Supplier');
    expect(result.contact_email).toBeNull();
    expect(result.contact_phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.bank_account).toBeNull();
    expect(result.tax_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save supplier to database', async () => {
    const result = await createSupplier(fullSupplierInput);

    // Query using proper drizzle syntax
    const suppliers = await db.select()
      .from(suppliersTable)
      .where(eq(suppliersTable.id, result.id))
      .execute();

    expect(suppliers).toHaveLength(1);
    const dbSupplier = suppliers[0];
    expect(dbSupplier.name).toEqual('Test Supplier Inc.');
    expect(dbSupplier.contact_email).toEqual('supplier@test.com');
    expect(dbSupplier.contact_phone).toEqual('+1-555-0123');
    expect(dbSupplier.address).toEqual('123 Business St, Commerce City, ST 12345');
    expect(dbSupplier.created_at).toBeInstanceOf(Date);
    expect(dbSupplier.updated_at).toBeInstanceOf(Date);

    // Verify sensitive data is encrypted in database
    expect(dbSupplier.bank_account).toBeDefined();
    expect(dbSupplier.bank_account).not.toEqual('1234567890123456');
    expect(dbSupplier.tax_id).toBeDefined();
    expect(dbSupplier.tax_id).not.toEqual('TAX123456789');
  });

  it('should handle supplier with only bank account encryption', async () => {
    const inputWithBankOnly: CreateSupplierInput = {
      name: 'Bank Only Supplier',
      contact_email: 'bank@supplier.com',
      bank_account: '9876543210987654',
    };

    const result = await createSupplier(inputWithBankOnly);

    expect(result.name).toEqual('Bank Only Supplier');
    expect(result.contact_email).toEqual('bank@supplier.com');
    expect(result.bank_account).toBeDefined();
    expect(result.bank_account).not.toEqual('9876543210987654');
    expect(result.tax_id).toBeNull();
  });

  it('should handle supplier with only tax id encryption', async () => {
    const inputWithTaxOnly: CreateSupplierInput = {
      name: 'Tax Only Supplier',
      contact_phone: '+1-555-9999',
      tax_id: 'TAX987654321',
    };

    const result = await createSupplier(inputWithTaxOnly);

    expect(result.name).toEqual('Tax Only Supplier');
    expect(result.contact_phone).toEqual('+1-555-9999');
    expect(result.tax_id).toBeDefined();
    expect(result.tax_id).not.toEqual('TAX987654321');
    expect(result.bank_account).toBeNull();
  });

  it('should handle multiple suppliers creation', async () => {
    const supplier1 = await createSupplier({
      name: 'First Supplier',
      contact_email: 'first@test.com',
    });

    const supplier2 = await createSupplier({
      name: 'Second Supplier',
      contact_email: 'second@test.com',
    });

    expect(supplier1.id).toBeDefined();
    expect(supplier2.id).toBeDefined();
    expect(supplier1.id).not.toEqual(supplier2.id);
    expect(supplier1.name).toEqual('First Supplier');
    expect(supplier2.name).toEqual('Second Supplier');

    // Verify both suppliers exist in database
    const allSuppliers = await db.select()
      .from(suppliersTable)
      .execute();

    expect(allSuppliers).toHaveLength(2);
  });

  it('should convert empty strings to null for optional fields', async () => {
    const inputWithEmptyStrings: CreateSupplierInput = {
      name: 'Empty Fields Supplier',
      contact_email: '',
      contact_phone: '',
      address: '',
    };

    const result = await createSupplier(inputWithEmptyStrings);

    expect(result.name).toEqual('Empty Fields Supplier');
    // Empty strings should be converted to null for optional fields
    expect(result.contact_email).toBeNull();
    expect(result.contact_phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.bank_account).toBeNull();
    expect(result.tax_id).toBeNull();
  });

  it('should encrypt different values differently', async () => {
    const supplier1 = await createSupplier({
      name: 'Supplier One',
      bank_account: '1111111111111111',
    });

    const supplier2 = await createSupplier({
      name: 'Supplier Two',
      bank_account: '2222222222222222',
    });

    // Same encryption should produce different results due to random IV
    expect(supplier1.bank_account).not.toEqual(supplier2.bank_account);
    
    // Even encrypting the same value should produce different results
    const supplier3 = await createSupplier({
      name: 'Supplier Three',
      bank_account: '1111111111111111', // Same as supplier1
    });

    expect(supplier1.bank_account).not.toEqual(supplier3.bank_account);
  });
});
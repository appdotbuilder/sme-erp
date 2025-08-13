import { db } from '../db';
import { suppliersTable } from '../db/schema';
import { type CreateSupplierInput, type Supplier } from '../schema';
import crypto from 'crypto';

// Simple encryption for sensitive data - in production, use proper key management
const ENCRYPTION_KEY = process.env['ENCRYPTION_KEY'] || 'default-32-char-key-for-dev-only!!';
const ALGORITHM = 'aes-256-cbc';

function encryptData(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  try {
    // Helper function to convert empty strings to null for optional fields
    const normalizeOptionalString = (value: string | undefined | null): string | null => {
      if (!value || value.trim() === '') return null;
      return value;
    };

    // Encrypt sensitive fields if provided and not empty
    const encryptedBankAccount = input.bank_account && input.bank_account.trim() 
      ? encryptData(input.bank_account.trim()) 
      : null;
    const encryptedTaxId = input.tax_id && input.tax_id.trim() 
      ? encryptData(input.tax_id.trim()) 
      : null;

    // Insert supplier record
    const result = await db.insert(suppliersTable)
      .values({
        name: input.name.trim(),
        contact_email: normalizeOptionalString(input.contact_email),
        contact_phone: normalizeOptionalString(input.contact_phone),
        address: normalizeOptionalString(input.address),
        bank_account: encryptedBankAccount,
        tax_id: encryptedTaxId,
      })
      .returning()
      .execute();

    const supplier = result[0];
    return {
      ...supplier,
      // Keep encrypted fields encrypted in the response for security
    };
  } catch (error) {
    console.error('Supplier creation failed:', error);
    throw error;
  }
}
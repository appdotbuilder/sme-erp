import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateUserInput = {
  clerk_id: 'clerk_test_123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'TECHNICIAN'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all required fields', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.clerk_id).toEqual('clerk_test_123');
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.role).toEqual('TECHNICIAN');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database correctly', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.clerk_id, result.clerk_id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].clerk_id).toEqual('clerk_test_123');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].role).toEqual('TECHNICIAN');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create user with ADMIN role', async () => {
    const adminInput: CreateUserInput = {
      clerk_id: 'clerk_admin_456',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN'
    };

    const result = await createUser(adminInput);

    expect(result.role).toEqual('ADMIN');
    expect(result.email).toEqual('admin@example.com');
    expect(result.name).toEqual('Admin User');
  });

  it('should create user with WAREHOUSE_MANAGER role', async () => {
    const managerInput: CreateUserInput = {
      clerk_id: 'clerk_manager_789',
      email: 'manager@example.com',
      name: 'Manager User',
      role: 'WAREHOUSE_MANAGER'
    };

    const result = await createUser(managerInput);

    expect(result.role).toEqual('WAREHOUSE_MANAGER');
    expect(result.email).toEqual('manager@example.com');
    expect(result.name).toEqual('Manager User');
  });

  it('should create user with PURCHASING_STAFF role', async () => {
    const purchasingInput: CreateUserInput = {
      clerk_id: 'clerk_purchasing_101',
      email: 'purchasing@example.com',
      name: 'Purchasing User',
      role: 'PURCHASING_STAFF'
    };

    const result = await createUser(purchasingInput);

    expect(result.role).toEqual('PURCHASING_STAFF');
    expect(result.email).toEqual('purchasing@example.com');
    expect(result.name).toEqual('Purchasing User');
  });

  it('should fail when clerk_id is not unique', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same clerk_id
    const duplicateInput: CreateUserInput = {
      clerk_id: 'clerk_test_123', // Same clerk_id
      email: 'different@example.com',
      name: 'Different User',
      role: 'ADMIN'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should fail when email is not unique', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same email
    const duplicateEmailInput: CreateUserInput = {
      clerk_id: 'clerk_different_456',
      email: 'test@example.com', // Same email
      name: 'Different User',
      role: 'ADMIN'
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/unique/i);
  });

  it('should handle multiple users with different details', async () => {
    const users = [
      {
        clerk_id: 'clerk_user1',
        email: 'user1@example.com',
        name: 'User One',
        role: 'TECHNICIAN' as const
      },
      {
        clerk_id: 'clerk_user2',
        email: 'user2@example.com',
        name: 'User Two',
        role: 'ADMIN' as const
      },
      {
        clerk_id: 'clerk_user3',
        email: 'user3@example.com',
        name: 'User Three',
        role: 'WAREHOUSE_MANAGER' as const
      }
    ];

    // Create all users
    const results = await Promise.all(users.map(user => createUser(user)));

    // Verify all were created successfully
    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.clerk_id).toEqual(users[index].clerk_id);
      expect(result.email).toEqual(users[index].email);
      expect(result.name).toEqual(users[index].name);
      expect(result.role).toEqual(users[index].role);
    });

    // Verify they exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(3);
  });
});
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
  });

  it('should return all users from database', async () => {
    // Create test users
    const testUsers: CreateUserInput[] = [
      {
        clerk_id: 'clerk_123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'ADMIN'
      },
      {
        clerk_id: 'clerk_456',
        email: 'manager@test.com',
        name: 'Warehouse Manager',
        role: 'WAREHOUSE_MANAGER'
      },
      {
        clerk_id: 'clerk_789',
        email: 'tech@test.com',
        name: 'Technician User',
        role: 'TECHNICIAN'
      }
    ];

    // Insert test users
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Verify user data
    const adminUser = result.find(u => u.clerk_id === 'clerk_123');
    expect(adminUser).toBeDefined();
    expect(adminUser?.email).toEqual('admin@test.com');
    expect(adminUser?.name).toEqual('Admin User');
    expect(adminUser?.role).toEqual('ADMIN');
    expect(typeof adminUser?.id).toEqual('string');
    expect(adminUser?.created_at).toBeInstanceOf(Date);
    expect(adminUser?.updated_at).toBeInstanceOf(Date);

    const managerUser = result.find(u => u.clerk_id === 'clerk_456');
    expect(managerUser).toBeDefined();
    expect(managerUser?.role).toEqual('WAREHOUSE_MANAGER');

    const techUser = result.find(u => u.clerk_id === 'clerk_789');
    expect(techUser).toBeDefined();
    expect(techUser?.role).toEqual('TECHNICIAN');
  });

  it('should return users with all required fields', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        clerk_id: 'clerk_test',
        email: 'test@example.com',
        name: 'Test User',
        role: 'PURCHASING_STAFF'
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];
    
    // Verify all required fields are present
    expect(user.id).toBeDefined();
    expect(typeof user.id).toEqual('string');
    expect(user.clerk_id).toEqual('clerk_test');
    expect(user.email).toEqual('test@example.com');
    expect(user.name).toEqual('Test User');
    expect(user.role).toEqual('PURCHASING_STAFF');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should return users in consistent order', async () => {
    // Create multiple users
    const testUsers = [
      { clerk_id: 'clerk_001', email: 'user1@test.com', name: 'User One', role: 'ADMIN' as const },
      { clerk_id: 'clerk_002', email: 'user2@test.com', name: 'User Two', role: 'TECHNICIAN' as const },
      { clerk_id: 'clerk_003', email: 'user3@test.com', name: 'User Three', role: 'WAREHOUSE_MANAGER' as const }
    ];

    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result1 = await getUsers();
    const result2 = await getUsers();

    expect(result1).toHaveLength(3);
    expect(result2).toHaveLength(3);
    
    // Results should be in the same order (by default database order)
    expect(result1.map(u => u.clerk_id)).toEqual(result2.map(u => u.clerk_id));
  });

  it('should handle all user roles correctly', async () => {
    const allRoles = ['ADMIN', 'WAREHOUSE_MANAGER', 'PURCHASING_STAFF', 'TECHNICIAN'] as const;
    
    // Create users with all possible roles
    const testUsers = allRoles.map((role, index) => ({
      clerk_id: `clerk_${index}`,
      email: `${role.toLowerCase()}@test.com`,
      name: `${role} User`,
      role: role
    }));

    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(4);
    
    // Verify all roles are represented
    const resultRoles = result.map(u => u.role).sort();
    expect(resultRoles).toEqual(['ADMIN', 'PURCHASING_STAFF', 'TECHNICIAN', 'WAREHOUSE_MANAGER']);
  });
});
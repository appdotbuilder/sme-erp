import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        clerk_id: input.clerk_id,
        email: input.email,
        name: input.name,
        role: input.role
      })
      .returning()
      .execute();

    // Return the created user
    const user = result[0];
    return {
      ...user,
      id: user.id.toString() // Convert serial ID to string to match schema
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

export const getUsers = async (): Promise<User[]> => {
  try {
    const result = await db.select()
      .from(usersTable)
      .execute();

    return result.map(user => ({
      ...user,
      id: user.id.toString() // Convert number to string as per schema
    }));
  } catch (error) {
    console.error('Get users failed:', error);
    throw error;
  }
};
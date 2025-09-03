import { 
  users, 
  type User, 
  type InsertUser 
} from "@shared/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export class UserService {
  // User operations
  async getUser(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  async updateUser(walletAddress: string, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.walletAddress, walletAddress))
      .returning();
    return updatedUser || undefined;
  }
}

export const userService = new UserService();
import { Request } from "express";
import { db } from "../db";
import { users, type User } from "../db/schema";
import { eq } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export class UserController {
  /**
   * Register a new user
   */
  static async register(email: string, name: string, password: string) {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser.length > 0) {
      throw new Error("User with this email already exists");
    }

    // TODO: Hash password properly
    const hashedPassword = password; // Placeholder - implement proper hashing

    const [user] = await db
      .insert(users)
      .values({
        email,
        name,
        password: hashedPassword,
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  /**
   * Login user
   */
  static async login(email: string, password: string) {
    // Find user
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (userResult.length === 0) {
      throw new Error("Invalid credentials");
    }

    const user = userResult[0];

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // TODO: Verify password properly
    if (user.password !== password) {
      throw new Error("Invalid credentials");
    }

    // TODO: Generate JWT token
    const token = "placeholder-token"; // Implement proper JWT

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Get user profile
   */
  static async getProfile(userId: string) {
    if (userId === "anonymous") {
      throw new Error("Authentication required");
    }

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (userResult.length === 0) {
      throw new Error("User not found");
    }

    const user = userResult[0];

    if (!user) {
      throw new Error("User not found");
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, name?: string, email?: string) {
    if (userId === "anonymous") {
      throw new Error("Authentication required");
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error("Failed to update user");
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    return userWithoutPassword;
  }
}

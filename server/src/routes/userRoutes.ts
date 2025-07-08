import express from "express";
import { body, validationResult } from "express-validator";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// Validation middleware
const validateUserRegistration = [
  body("email").isEmail().normalizeEmail(),
  body("name").isString().trim().isLength({ min: 1, max: 100 }),
  body("password").isString().isLength({ min: 6 }),
];

const validateUserLogin = [
  body("email").isEmail().normalizeEmail(),
  body("password").isString(),
];

/**
 * POST /api/users/register
 * Register a new user
 */
router.post("/register", validateUserRegistration, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, name, password } = req.body;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
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

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/login
 * Login user
 */
router.post("/login", validateUserLogin, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find user
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (userResult.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const user = userResult[0];

    // TODO: Verify password properly
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // TODO: Generate JWT token
    const token = "placeholder-token"; // Implement proper JWT

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/profile
 * Get user profile
 */
router.get("/profile", async (req, res, next) => {
  try {
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    if (userId === "anonymous") {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (userResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const user = userResult[0];

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put("/profile", async (req, res, next) => {
  try {
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    if (userId === "anonymous") {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const { name, email } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

import express, { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import {
  UserController,
  AuthenticatedRequest,
} from "../controllers/userController";

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
router.post(
  "/register",
  validateUserRegistration,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { email, name, password } = req.body;
      const user = await UserController.register(email, name, password);

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "User with this email already exists"
      ) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * POST /api/users/login
 * Login user
 */
router.post(
  "/login",
  validateUserLogin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;
      const result = await UserController.login(email, password);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid credentials") {
        return res.status(401).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/users/profile
 * Get user profile
 */
router.get(
  "/profile",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      const user = await UserController.getProfile(userId);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Authentication required") {
          return res.status(401).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === "User not found") {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
      }
      next(error);
    }
  }
);

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put(
  "/profile",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      const { name, email } = req.body;
      const user = await UserController.updateProfile(userId, name, email);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Authentication required") {
          return res.status(401).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === "Failed to update user") {
          return res.status(500).json({
            success: false,
            error: error.message,
          });
        }
      }
      next(error);
    }
  }
);

export default router;

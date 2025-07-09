import express, { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { StoreController } from "../controllers/storeController";
import { AuthenticatedRequest } from "../controllers/userController";

const router = express.Router();

// Validation middleware
const validateStorePreference = [
  body("storeId").isString().trim().isLength({ min: 1 }),
  body("priority").optional().isInt({ min: 0, max: 10 }),
  body("isActive").optional().isBoolean(),
];

/**
 * GET /api/stores
 * Get all available stores
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stores = await StoreController.getAllStores();

    res.json({
      success: true,
      data: stores,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stores/:id
 * Get a specific store
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Store ID is required",
      });
    }
    const store = await StoreController.getStoreById(id);

    res.json({
      success: true,
      data: store,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Store not found") {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
});

/**
 * GET /api/stores/preferences
 * Get user's store preferences
 */
router.get(
  "/preferences",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      const preferences = await StoreController.getUserPreferences(userId);

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/stores/preferences
 * Create or update store preference
 */
router.post(
  "/preferences",
  validateStorePreference,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      const { storeId, priority = 0, isActive = true } = req.body;
      const preference = await StoreController.upsertPreference(
        userId,
        storeId,
        priority,
        isActive
      );

      res.json({
        success: true,
        data: preference,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Store not found") {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/stores/preferences/:storeId
 * Remove store preference
 */
router.delete(
  "/preferences/:storeId",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      const { storeId } = req.params;
      if (!storeId) {
        return res.status(400).json({
          success: false,
          error: "Store ID is required",
        });
      }
      await StoreController.removePreference(userId, storeId);

      res.json({
        success: true,
        message: "Store preference removed successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

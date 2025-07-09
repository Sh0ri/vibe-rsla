import express, { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { ShoppingListController } from "../controllers/shoppingListController";
import { AuthenticatedRequest } from "../controllers/userController";

const router = express.Router();

// Validation middleware
const validateShoppingListCreate = [
  body("name").isString().trim().isLength({ min: 1, max: 200 }),
  body("storeId").optional().isString().trim().isLength({ min: 1 }),
  body("items").isArray(),
];

const validateShoppingListUpdate = [
  body("name").optional().isString().trim().isLength({ min: 1, max: 200 }),
  body("storeId").optional().isString().trim().isLength({ min: 1 }),
  body("items").optional().isArray(),
  body("status").optional().isIn(["active", "completed", "archived"]),
];

/**
 * GET /api/shopping-lists
 * Get all shopping lists for user
 */
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      const page = parseInt(req.query["page"] as string) || 1;
      const limit = parseInt(req.query["limit"] as string) || 10;
      const status = req.query["status"] as string;
      const result = await ShoppingListController.getUserShoppingLists(
        userId,
        page,
        limit,
        status
      );

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/shopping-lists/:id
 * Get a specific shopping list
 */
router.get(
  "/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Shopping list ID is required",
        });
      }
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      const shoppingList = await ShoppingListController.getShoppingListById(
        id,
        userId
      );

      res.json({
        success: true,
        data: shoppingList,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Shopping list not found"
      ) {
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
 * POST /api/shopping-lists
 * Create a new shopping list
 */
router.post(
  "/",
  validateShoppingListCreate,
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
      const { name, storeId, items = [] } = req.body;
      const shoppingList = await ShoppingListController.createShoppingList(
        userId,
        name,
        storeId,
        items
      );

      res.status(201).json({
        success: true,
        data: shoppingList,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Failed to create shopping list"
      ) {
        return res.status(500).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * PUT /api/shopping-lists/:id
 * Update a shopping list
 */
router.put(
  "/:id",
  validateShoppingListUpdate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Shopping list ID is required",
        });
      }
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      const { name, storeId, items, status } = req.body;
      const shoppingList = await ShoppingListController.updateShoppingList(
        id,
        userId,
        name,
        storeId,
        items,
        status
      );

      res.json({
        success: true,
        data: shoppingList,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Shopping list not found") {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === "Failed to update shopping list") {
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

/**
 * DELETE /api/shopping-lists/:id
 * Delete a shopping list
 */
router.delete(
  "/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Shopping list ID is required",
        });
      }
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      await ShoppingListController.deleteShoppingList(id, userId);

      res.json({
        success: true,
        message: "Shopping list deleted successfully",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Shopping list not found"
      ) {
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
 * POST /api/shopping-lists/:id/export
 * Export shopping list to various formats
 */
router.post(
  "/:id/export",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Shopping list ID is required",
        });
      }
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      const { format = "json" } = req.body;
      const result = await ShoppingListController.exportShoppingList(
        id,
        userId,
        format
      );

      res.setHeader("Content-Type", result.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`
      );
      res.send(result.data);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Shopping list not found"
      ) {
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
 * POST /api/shopping-lists/:id/cart-links
 * Generate cart links for shopping list items
 */
router.post(
  "/:id/cart-links",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Shopping list ID is required",
        });
      }
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      const result = await ShoppingListController.generateCartLinks(id, userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Shopping list not found"
      ) {
        return res.status(404).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

export default router;

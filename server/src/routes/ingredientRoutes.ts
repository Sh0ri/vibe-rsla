import express, { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { IngredientController } from "../controllers/ingredientController";

const router = express.Router();

// Validation middleware
const validateProductSearch = [
  body("ingredientName").isString().trim().isLength({ min: 1, max: 100 }),
  body("quantity").isFloat({ min: 0 }),
  body("unit").optional().isString().trim().isLength({ max: 20 }),
  body("options").optional().isObject(),
];

/**
 * POST /api/ingredients/search-products
 * Search for products matching an ingredient
 */
router.post(
  "/search-products",
  validateProductSearch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { ingredientName, quantity, unit, options = {} } = req.body;
      const result = await IngredientController.searchProducts(
        ingredientName,
        quantity,
        unit,
        options
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/ingredients/:id/products
 * Get products for a specific ingredient
 */
router.get(
  "/:id/products",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Ingredient ID is required",
        });
      }
      const page = parseInt(req.query["page"] as string) || 1;
      const limit = parseInt(req.query["limit"] as string) || 10;
      const result = await IngredientController.getIngredientProducts(
        id,
        page,
        limit
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Ingredient not found") {
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
 * GET /api/ingredients
 * Get all ingredients with pagination
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query["page"] as string) || 1;
    const limit = parseInt(req.query["limit"] as string) || 20;
    const search = req.query["search"] as string;
    const result = await IngredientController.getAllIngredients(
      page,
      limit,
      search
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

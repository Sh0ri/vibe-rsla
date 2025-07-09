import express, { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { RecipeController } from "../controllers/recipeController";
import { AuthenticatedRequest } from "../controllers/userController";

const router = express.Router();

// Validation middleware
const validateRecipeInput = [
  body("title").isString().trim().isLength({ min: 1, max: 200 }),
  body("description").optional().isString().trim().isLength({ max: 1000 }),
  body("ingredients")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 10000 }),
  body("instructions").optional().isString().trim().isLength({ max: 5000 }),
  body("sourceUrl").optional().isURL(),
];

const validateRecipeParse = [
  body("recipeText").isString().trim().isLength({ min: 10, max: 10000 }),
];

const validateShoppingListCreate = [
  body("recipeId").isString().trim().isLength({ min: 1 }),
  body("storeId").optional().isString().trim().isLength({ min: 1 }),
  body("excludePantryItems").optional().isBoolean(),
  body("preferences").optional().isObject(),
];

/**
 * POST /api/recipes/parse
 * Parse ingredients from recipe text
 */
router.post(
  "/parse",
  validateRecipeParse,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { recipeText } = req.body;
      const result = await RecipeController.parseIngredients(recipeText);

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
 * POST /api/recipes
 * Create a new recipe
 */
router.post(
  "/",
  validateRecipeInput,
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
      const { title, description, ingredients, instructions, sourceUrl } =
        req.body;
      const recipe = await RecipeController.createRecipe(
        userId,
        title,
        description,
        ingredients,
        instructions,
        sourceUrl
      );

      res.status(201).json({
        success: true,
        data: recipe,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Failed to create recipe"
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
 * GET /api/recipes
 * Get all recipes for the user
 */
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      const page = parseInt(req.query["page"] as string) || 1;
      const limit = parseInt(req.query["limit"] as string) || 10;
      const result = await RecipeController.getUserRecipes(userId, page, limit);

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
 * GET /api/recipes/:id
 * Get a specific recipe
 */
router.get(
  "/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Recipe ID is required",
        });
      }
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      const recipe = await RecipeController.getRecipeById(id, userId);

      res.json({
        success: true,
        data: recipe,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Recipe not found") {
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
 * PUT /api/recipes/:id
 * Update a recipe
 */
router.put(
  "/:id",
  validateRecipeInput,
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
          error: "Recipe ID is required",
        });
      }
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      const { title, description, ingredients, instructions, sourceUrl } =
        req.body;
      const recipe = await RecipeController.updateRecipe(
        id,
        userId,
        title,
        description,
        ingredients,
        instructions,
        sourceUrl
      );

      res.json({
        success: true,
        data: recipe,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Recipe not found") {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === "Failed to update recipe") {
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
 * DELETE /api/recipes/:id
 * Delete a recipe
 */
router.delete(
  "/:id",
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Recipe ID is required",
        });
      }
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      await RecipeController.deleteRecipe(id, userId);

      res.json({
        success: true,
        message: "Recipe deleted successfully",
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Recipe not found") {
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
 * POST /api/recipes/:id/shopping-list
 * Generate shopping list from recipe
 */
router.post(
  "/:id/shopping-list",
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

      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          error: "Recipe ID is required",
        });
      }
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
      const {
        storeId,
        excludePantryItems = false,
        preferences = {},
      } = req.body;
      const result = await RecipeController.generateShoppingList(
        id,
        userId,
        storeId,
        excludePantryItems,
        preferences
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Recipe not found") {
          return res.status(404).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === "Invalid ingredients format") {
          return res.status(400).json({
            success: false,
            error: error.message,
          });
        }
        if (error.message === "Failed to create shopping list") {
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

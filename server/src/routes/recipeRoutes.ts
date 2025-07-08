import express from "express";
import { body, validationResult } from "express-validator";
import {
  IngredientParserService,
  ParsedIngredients,
} from "../services/ingredientParserService";
import { ProductSearchService } from "../services/productSearchService";
import { db } from "../db";
import { recipes, shoppingLists, pantryItems } from "../db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

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
router.post("/parse", validateRecipeParse, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { recipeText } = req.body;

    // Parse ingredients using AI
    const parsedIngredients = await IngredientParserService.parseIngredients(
      recipeText
    );

    // Enhance ingredients with additional data
    const enhancedIngredients = parsedIngredients.ingredients.map(
      (ingredient) => ({
        ...ingredient,
        category:
          ingredient.category ||
          IngredientParserService.categorizeIngredient(ingredient.name),
        synonyms: IngredientParserService.getIngredientSynonyms(
          ingredient.name
        ),
      })
    );

    res.json({
      success: true,
      data: {
        ingredients: enhancedIngredients,
        totalIngredients: enhancedIngredients.length,
        originalText: recipeText,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/recipes
 * Create a new recipe
 */
router.post("/", validateRecipeInput, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { title, description, ingredients, instructions, sourceUrl } =
      req.body;
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    // If ingredients are provided as text, parse them
    let parsedIngredients: ParsedIngredients | null = null;
    if (ingredients && typeof ingredients === "string") {
      parsedIngredients = await IngredientParserService.parseIngredients(
        ingredients
      );
    }

    const [recipe] = await db
      .insert(recipes)
      .values({
        title,
        description,
        ingredients: parsedIngredients
          ? JSON.stringify(parsedIngredients.ingredients)
          : ingredients,
        instructions,
        sourceUrl,
        userId,
      })
      .returning();

    res.status(201).json({
      success: true,
      data: recipe,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recipes
 * Get all recipes for the user
 */
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const recipes = await db
      .select()
      .from(recipes)
      .where(eq(recipes.userId, userId))
      .orderBy(desc(recipes.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: recipes.id })
      .from(recipes)
      .where(eq(recipes.userId, userId));
    const total = totalResult.length;

    res.json({
      success: true,
      data: recipes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/recipes/:id
 * Get a specific recipe
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    const recipeResult = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)));

    if (recipeResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Recipe not found",
      });
    }

    const recipe = recipeResult[0];

    // Parse ingredients if they're stored as JSON string
    let ingredients = recipe.ingredients;
    try {
      ingredients = JSON.parse(recipe.ingredients);
    } catch {
      // Ingredients are already in string format
    }

    res.json({
      success: true,
      data: {
        ...recipe,
        ingredients,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/recipes/:id
 * Update a recipe
 */
router.put("/:id", validateRecipeInput, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { title, description, ingredients, instructions, sourceUrl } =
      req.body;
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    // Check if recipe exists and belongs to user
    const existingRecipeResult = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)));

    if (existingRecipeResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Recipe not found",
      });
    }

    // Parse ingredients if provided as text
    let parsedIngredients: ParsedIngredients | null = null;
    if (ingredients && typeof ingredients === "string") {
      parsedIngredients = await IngredientParserService.parseIngredients(
        ingredients
      );
    }

    const [updatedRecipe] = await db
      .update(recipes)
      .set({
        title,
        description,
        ingredients: parsedIngredients
          ? JSON.stringify(parsedIngredients.ingredients)
          : ingredients,
        instructions,
        sourceUrl,
      })
      .where(eq(recipes.id, id))
      .returning();

    res.json({
      success: true,
      data: updatedRecipe,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/recipes/:id
 * Delete a recipe
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    // Check if recipe exists and belongs to user
    const existingRecipeResult = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)));

    if (existingRecipeResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Recipe not found",
      });
    }

    await db.delete(recipes).where(eq(recipes.id, id));

    res.json({
      success: true,
      message: "Recipe deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/recipes/:id/shopping-list
 * Generate shopping list from recipe
 */
router.post(
  "/:id/shopping-list",
  validateShoppingListCreate,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const {
        storeId,
        excludePantryItems = false,
        preferences = {},
      } = req.body;
      const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

      // Get recipe
      const recipeResult = await db
        .select()
        .from(recipes)
        .where(and(eq(recipes.id, id), eq(recipes.userId, userId)));

      if (recipeResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Recipe not found",
        });
      }

      const recipe = recipeResult[0];

      // Parse ingredients
      let ingredients: any[] = [];
      try {
        ingredients = JSON.parse(recipe.ingredients);
      } catch {
        return res.status(400).json({
          success: false,
          error: "Invalid ingredients format",
        });
      }

      // Filter out pantry items if requested
      let filteredIngredients = ingredients;
      if (excludePantryItems) {
        const userPantryItems = await db
          .select({
            ingredientId: pantryItems.ingredientId,
          })
          .from(pantryItems)
          .where(eq(pantryItems.userId, userId));

        const pantryIngredientIds = userPantryItems.map(
          (item) => item.ingredientId
        );
        filteredIngredients = ingredients.filter((ingredient) => {
          // This is a simplified check - in a real app you'd want more sophisticated matching
          return !pantryIngredientIds.some((id) => id === ingredient.id);
        });
      }

      // Search for products for each ingredient
      const shoppingListItems = await Promise.all(
        filteredIngredients.map(async (ingredient) => {
          const products = await ProductSearchService.searchProducts(
            ingredient.name,
            ingredient.quantity,
            ingredient.unit,
            preferences
          );

          return {
            ingredient,
            products,
            selectedProduct: products[0] || null, // Default to first product
          };
        })
      );

      // Create shopping list
      const [shoppingList] = await db
        .insert(shoppingLists)
        .values({
          name: `Shopping List - ${recipe.title}`,
          userId,
          storeId,
          recipeId: id,
          items: JSON.stringify(shoppingListItems),
          status: "active",
        })
        .returning();

      res.status(201).json({
        success: true,
        data: {
          shoppingList,
          items: shoppingListItems,
          totalItems: shoppingListItems.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

import { db } from "../db";
import { recipes, shoppingLists, pantryItems } from "../db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import {
  IngredientParserService,
  ParsedIngredients,
} from "../services/ingredientParserService";
import { ProductSearchService } from "../services/productSearchService";

export class RecipeController {
  /**
   * Parse ingredients from recipe text
   */
  static async parseIngredients(recipeText: string) {
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

    return {
      ingredients: enhancedIngredients,
      totalIngredients: enhancedIngredients.length,
      originalText: recipeText,
    };
  }

  /**
   * Create a new recipe
   */
  static async createRecipe(
    userId: string,
    title: string,
    description: string,
    ingredients: string,
    instructions: string,
    sourceUrl?: string
  ) {
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

    if (!recipe) {
      throw new Error("Failed to create recipe");
    }

    return recipe;
  }

  /**
   * Get all recipes for the user
   */
  static async getUserRecipes(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    const offset = (page - 1) * limit;

    const recipesData = await db
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

    return {
      data: recipesData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a specific recipe
   */
  static async getRecipeById(id: string, userId: string) {
    const recipeResult = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)));

    if (recipeResult.length === 0) {
      throw new Error("Recipe not found");
    }

    const recipe = recipeResult[0];

    if (!recipe) {
      throw new Error("Recipe not found");
    }

    // Parse ingredients if they're stored as JSON string
    let ingredients = recipe.ingredients;
    try {
      ingredients = JSON.parse(recipe.ingredients);
    } catch {
      // Ingredients are already in string format
    }

    return {
      ...recipe,
      ingredients,
    };
  }

  /**
   * Update a recipe
   */
  static async updateRecipe(
    id: string,
    userId: string,
    title: string,
    description: string,
    ingredients: string,
    instructions: string,
    sourceUrl?: string
  ) {
    // Check if recipe exists and belongs to user
    const existingRecipeResult = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)));

    if (existingRecipeResult.length === 0) {
      throw new Error("Recipe not found");
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

    if (!updatedRecipe) {
      throw new Error("Failed to update recipe");
    }

    return updatedRecipe;
  }

  /**
   * Delete a recipe
   */
  static async deleteRecipe(id: string, userId: string) {
    // Check if recipe exists and belongs to user
    const existingRecipeResult = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)));

    if (existingRecipeResult.length === 0) {
      throw new Error("Recipe not found");
    }

    await db.delete(recipes).where(eq(recipes.id, id));
  }

  /**
   * Generate shopping list from recipe
   */
  static async generateShoppingList(
    id: string,
    userId: string,
    storeId?: string,
    excludePantryItems: boolean = false,
    preferences: any = {}
  ) {
    // Get recipe
    const recipeResult = await db
      .select()
      .from(recipes)
      .where(and(eq(recipes.id, id), eq(recipes.userId, userId)));

    if (recipeResult.length === 0) {
      throw new Error("Recipe not found");
    }

    const recipe = recipeResult[0];

    if (!recipe) {
      throw new Error("Recipe not found");
    }

    // Parse ingredients
    let ingredients: any[] = [];
    try {
      ingredients = JSON.parse(recipe.ingredients);
    } catch {
      throw new Error("Invalid ingredients format");
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

    if (!shoppingList) {
      throw new Error("Failed to create shopping list");
    }

    return {
      shoppingList,
      items: shoppingListItems,
      totalItems: shoppingListItems.length,
    };
  }
}

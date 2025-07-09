import { db } from "../db";
import { ingredients, products, stores } from "../db/schema";
import { eq, like, asc, desc, or, ilike } from "drizzle-orm";
import { ProductSearchService } from "../services/productSearchService";

export class IngredientController {
  /**
   * Search for products matching an ingredient
   */
  static async searchProducts(
    ingredientName: string,
    quantity: number,
    unit: string,
    options: any = {}
  ) {
    const products = await ProductSearchService.searchProducts(
      ingredientName,
      quantity,
      unit,
      options
    );

    return {
      ingredientName,
      quantity,
      unit,
      products,
      totalProducts: products.length,
    };
  }

  /**
   * Get products for a specific ingredient
   */
  static async getIngredientProducts(
    id: string,
    page: number = 1,
    limit: number = 10
  ) {
    const offset = (page - 1) * limit;

    const ingredientResult = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.id, id));

    if (ingredientResult.length === 0) {
      throw new Error("Ingredient not found");
    }

    const ingredient = ingredientResult[0];

    if (!ingredient) {
      throw new Error("Ingredient not found");
    }

    // Get products for this ingredient with store info
    const ingredientProducts = await db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        barcode: products.barcode,
        imageUrl: products.imageUrl,
        price: products.price,
        currency: products.currency,
        unit: products.unit,
        packageSize: products.packageSize,
        productUrl: products.productUrl,
        lastUpdated: products.lastUpdated,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        store: {
          id: stores.id,
          name: stores.name,
          domain: stores.domain,
          country: stores.country,
          currency: stores.currency,
        },
      })
      .from(products)
      .innerJoin(stores, eq(products.storeId, stores.id))
      .where(eq(products.ingredientId, id))
      .orderBy(asc(products.price))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: products.id })
      .from(products)
      .where(eq(products.ingredientId, id));
    const total = totalResult.length;

    return {
      ingredient: {
        ...ingredient,
        products: ingredientProducts,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all ingredients with pagination
   */
  static async getAllIngredients(
    page: number = 1,
    limit: number = 20,
    search?: string
  ) {
    const offset = (page - 1) * limit;

    let ingredientsQuery = db.select().from(ingredients);
    let totalQuery = db.select({ count: ingredients.id }).from(ingredients);

    if (search) {
      ingredientsQuery = ingredientsQuery.where(
        or(
          ilike(ingredients.name, `%${search}%`),
          // Note: Drizzle doesn't have direct array contains, so we'll search in name for now
          ilike(ingredients.name, `%${search}%`)
        )
      );
      totalQuery = totalQuery.where(
        or(
          ilike(ingredients.name, `%${search}%`),
          ilike(ingredients.name, `%${search}%`)
        )
      );
    }

    const ingredientsData = await ingredientsQuery
      .orderBy(asc(ingredients.name))
      .limit(limit)
      .offset(offset);

    const totalResult = await totalQuery;
    const total = totalResult.length;

    return {
      data: ingredientsData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

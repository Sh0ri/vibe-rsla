import express from "express";
import { body, validationResult } from "express-validator";
import { ProductSearchService } from "../services/productSearchService";
import { db } from "../db";
import { ingredients, products, stores } from "../db/schema";
import { eq, like, asc, desc, or, ilike } from "drizzle-orm";

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
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { ingredientName, quantity, unit, options = {} } = req.body;

      const products = await ProductSearchService.searchProducts(
        ingredientName,
        quantity,
        unit,
        options
      );

      res.json({
        success: true,
        data: {
          ingredientName,
          quantity,
          unit,
          products,
          totalProducts: products.length,
        },
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
router.get("/:id/products", async (req, res, next) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const ingredientResult = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.id, id));

    if (ingredientResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Ingredient not found",
      });
    }

    const ingredient = ingredientResult[0];

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

    res.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ingredients
 * Get all ingredients with pagination
 */
router.get("/", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

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

    const ingredients = await ingredientsQuery
      .orderBy(asc(ingredients.name))
      .limit(limit)
      .offset(offset);

    const totalResult = await totalQuery;
    const total = totalResult.length;

    res.json({
      success: true,
      data: ingredients,
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

export default router;

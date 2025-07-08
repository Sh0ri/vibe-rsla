import express from "express";
import { body, validationResult } from "express-validator";
import { db } from "../db";
import { shoppingLists, stores } from "../db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

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
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: shoppingLists.id,
        name: shoppingLists.name,
        userId: shoppingLists.userId,
        storeId: shoppingLists.storeId,
        recipeId: shoppingLists.recipeId,
        items: shoppingLists.items,
        totalCost: shoppingLists.totalCost,
        status: shoppingLists.status,
        createdAt: shoppingLists.createdAt,
        updatedAt: shoppingLists.updatedAt,
        store: {
          id: stores.id,
          name: stores.name,
          domain: stores.domain,
          country: stores.country,
          currency: stores.currency,
        },
      })
      .from(shoppingLists)
      .leftJoin(stores, eq(shoppingLists.storeId, stores.id))
      .where(eq(shoppingLists.userId, userId));

    if (status) {
      query = query.where(eq(shoppingLists.status, status));
    }

    const shoppingListsData = await query
      .orderBy(desc(shoppingLists.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: shoppingLists.id })
      .from(shoppingLists)
      .where(eq(shoppingLists.userId, userId));
    const total = totalResult.length;

    res.json({
      success: true,
      data: shoppingListsData,
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
 * GET /api/shopping-lists/:id
 * Get a specific shopping list
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    const shoppingListResult = await db
      .select({
        id: shoppingLists.id,
        name: shoppingLists.name,
        userId: shoppingLists.userId,
        storeId: shoppingLists.storeId,
        recipeId: shoppingLists.recipeId,
        items: shoppingLists.items,
        totalCost: shoppingLists.totalCost,
        status: shoppingLists.status,
        createdAt: shoppingLists.createdAt,
        updatedAt: shoppingLists.updatedAt,
        store: {
          id: stores.id,
          name: stores.name,
          domain: stores.domain,
          country: stores.country,
          currency: stores.currency,
        },
      })
      .from(shoppingLists)
      .leftJoin(stores, eq(shoppingLists.storeId, stores.id))
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)));

    if (shoppingListResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Shopping list not found",
      });
    }

    const shoppingList = shoppingListResult[0];

    // Parse items if they're stored as JSON string
    let items = shoppingList.items;
    try {
      items = JSON.parse(shoppingList.items);
    } catch {
      // Items are already in object format
    }

    res.json({
      success: true,
      data: {
        ...shoppingList,
        items,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/shopping-lists
 * Create a new shopping list
 */
router.post("/", validateShoppingListCreate, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { name, storeId, items } = req.body;
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    const [shoppingList] = await db
      .insert(shoppingLists)
      .values({
        name,
        userId,
        storeId,
        items: JSON.stringify(items),
        status: "active",
      })
      .returning();

    res.status(201).json({
      success: true,
      data: shoppingList,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/shopping-lists/:id
 * Update a shopping list
 */
router.put("/:id", validateShoppingListUpdate, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { name, storeId, items, status } = req.body;
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    // Check if shopping list exists and belongs to user
    const existingListResult = await db
      .select()
      .from(shoppingLists)
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)));

    if (existingListResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Shopping list not found",
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (storeId !== undefined) updateData.storeId = storeId;
    if (items !== undefined) updateData.items = JSON.stringify(items);
    if (status !== undefined) updateData.status = status;

    const [updatedList] = await db
      .update(shoppingLists)
      .set(updateData)
      .where(eq(shoppingLists.id, id))
      .returning();

    res.json({
      success: true,
      data: updatedList,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/shopping-lists/:id
 * Delete a shopping list
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    // Check if shopping list exists and belongs to user
    const existingListResult = await db
      .select()
      .from(shoppingLists)
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)));

    if (existingListResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Shopping list not found",
      });
    }

    await db.delete(shoppingLists).where(eq(shoppingLists.id, id));

    res.json({
      success: true,
      message: "Shopping list deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/shopping-lists/:id/export
 * Export shopping list to various formats
 */
router.post("/:id/export", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = "json" } = req.body;
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    const shoppingListResult = await db
      .select({
        id: shoppingLists.id,
        name: shoppingLists.name,
        userId: shoppingLists.userId,
        storeId: shoppingLists.storeId,
        recipeId: shoppingLists.recipeId,
        items: shoppingLists.items,
        totalCost: shoppingLists.totalCost,
        status: shoppingLists.status,
        createdAt: shoppingLists.createdAt,
        updatedAt: shoppingLists.updatedAt,
        store: {
          id: stores.id,
          name: stores.name,
          domain: stores.domain,
          country: stores.country,
          currency: stores.currency,
        },
      })
      .from(shoppingLists)
      .leftJoin(stores, eq(shoppingLists.storeId, stores.id))
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)));

    if (shoppingListResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Shopping list not found",
      });
    }

    const shoppingList = shoppingListResult[0];

    // Parse items
    let items;
    try {
      items = JSON.parse(shoppingList.items);
    } catch {
      items = shoppingList.items;
    }

    let exportData: any;

    switch (format.toLowerCase()) {
      case "csv":
        // Generate CSV format
        const csvHeaders = [
          "Ingredient",
          "Quantity",
          "Unit",
          "Product",
          "Price",
          "Store",
        ];
        const csvRows = items.map((item: any) => [
          item.ingredient.name,
          item.ingredient.quantity,
          item.ingredient.unit || "",
          item.selectedProduct?.name || "",
          item.selectedProduct?.price || "",
          item.selectedProduct?.store?.name || "",
        ]);

        exportData = [csvHeaders, ...csvRows]
          .map((row) => row.map((cell) => `"${cell}"`).join(","))
          .join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="shopping-list-${id}.csv"`
        );
        break;

      case "txt":
        // Generate plain text format
        exportData = `Shopping List: ${shoppingList.name}\n`;
        exportData += `Created: ${shoppingList.createdAt.toLocaleDateString()}\n`;
        exportData += `Store: ${shoppingList.store?.name || "Any store"}\n\n`;

        items.forEach((item: any, index: number) => {
          exportData += `${index + 1}. ${item.ingredient.name} - ${
            item.ingredient.quantity
          } ${item.ingredient.unit || ""}\n`;
          if (item.selectedProduct) {
            exportData += `   Product: ${item.selectedProduct.name} (${item.selectedProduct.store.name})\n`;
            if (item.selectedProduct.price) {
              exportData += `   Price: ${item.selectedProduct.price} ${item.selectedProduct.currency}\n`;
            }
          }
          exportData += "\n";
        });

        res.setHeader("Content-Type", "text/plain");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="shopping-list-${id}.txt"`
        );
        break;

      default:
        // JSON format
        exportData = {
          shoppingList: {
            id: shoppingList.id,
            name: shoppingList.name,
            store: shoppingList.store,
            createdAt: shoppingList.createdAt,
            items,
          },
        };

        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="shopping-list-${id}.json"`
        );
    }

    res.send(exportData);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/shopping-lists/:id/cart-links
 * Generate cart links for shopping list items
 */
router.post("/:id/cart-links", async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    const shoppingListResult = await db.select({
      id: shoppingLists.id,
      name: shoppingLists.name,
      userId: shoppingLists.userId,
      storeId: shoppingLists.storeId,
      recipeId: shoppingLists.recipeId,
      items: shoppingLists.items,
      totalCost: shoppingLists.totalCost,
      status: shoppingLists.status,
      createdAt: shoppingLists.createdAt,
      updatedAt: shoppingLists.updatedAt,
      store: {
        id: stores.id,
        name: stores.name,
        domain: stores.domain,
        country: stores.country,
        currency: stores.currency,
      },
    })
    .from(shoppingLists)
    .leftJoin(stores, eq(shoppingLists.storeId, stores.id))
    .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)));

    if (shoppingListResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Shopping list not found",
      });
    }

    const shoppingList = shoppingListResult[0];

    // Parse items
    let items;
    try {
      items = JSON.parse(shoppingList.items);
    } catch {
      items = shoppingList.items;
    }

    // Generate cart links for each item
    const cartLinks = items.map((item: any) => {
      if (!item.selectedProduct) {
        return {
          ingredient: item.ingredient.name,
          product: null,
          cartLink: null,
          message: "No product selected",
        };
      }

      const product = item.selectedProduct;
      let cartLink = null;

      // Generate cart links based on store
      switch (product.store.domain) {
        case "amazon.com":
          cartLink = `${product.productUrl}?tag=${
            process.env.AMAZON_ASSOCIATE_TAG || ""
          }`;
          break;
        case "carrefour.fr":
          cartLink = `${product.productUrl}?addToCart=true`;
          break;
        case "monoprix.fr":
          cartLink = `${product.productUrl}?action=add`;
          break;
        default:
          cartLink = product.productUrl;
      }

      return {
        ingredient: item.ingredient.name,
        product: {
          name: product.name,
          price: product.price,
          currency: product.currency,
          store: product.store.name,
        },
        cartLink,
      };
    });

    res.json({
      success: true,
      data: {
        shoppingListId: id,
        shoppingListName: shoppingList.name,
        cartLinks,
        totalItems: cartLinks.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

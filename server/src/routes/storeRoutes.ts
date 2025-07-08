import express from "express";
import { body, validationResult } from "express-validator";
import { db } from "../db";
import { stores, storePreferences, products } from "../db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

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
router.get("/", async (req, res, next) => {
  try {
    const stores = await db.select().from(stores).orderBy(asc(stores.name));

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
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const storeResult = await db.select().from(stores).where(eq(stores.id, id));

    if (storeResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Store not found",
      });
    }

    const store = storeResult[0];

    // Get recent products for this store
    const storeProducts = await db
      .select()
      .from(products)
      .where(eq(products.storeId, id))
      .orderBy(desc(products.lastUpdated))
      .limit(10);

    res.json({
      success: true,
      data: {
        ...store,
        products: storeProducts,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stores/preferences
 * Get user's store preferences
 */
router.get("/preferences", async (req, res, next) => {
  try {
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    const preferences = await db
      .select({
        id: storePreferences.id,
        userId: storePreferences.userId,
        storeId: storePreferences.storeId,
        priority: storePreferences.priority,
        isActive: storePreferences.isActive,
        createdAt: storePreferences.createdAt,
        updatedAt: storePreferences.updatedAt,
        store: {
          id: stores.id,
          name: stores.name,
          domain: stores.domain,
          country: stores.country,
          currency: stores.currency,
          apiEnabled: stores.apiEnabled,
        },
      })
      .from(storePreferences)
      .innerJoin(stores, eq(storePreferences.storeId, stores.id))
      .where(eq(storePreferences.userId, userId))
      .orderBy(desc(storePreferences.priority));

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/stores/preferences
 * Create or update store preference
 */
router.post("/preferences", validateStorePreference, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { storeId, priority = 0, isActive = true } = req.body;
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    // Check if store exists
    const storeResult = await db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId));

    if (storeResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Store not found",
      });
    }

    // Check if preference already exists
    const existingPreference = await db
      .select()
      .from(storePreferences)
      .where(
        and(
          eq(storePreferences.userId, userId),
          eq(storePreferences.storeId, storeId)
        )
      );

    let preference;
    if (existingPreference.length > 0) {
      // Update existing preference
      const [updatedPreference] = await db
        .update(storePreferences)
        .set({ priority, isActive })
        .where(
          and(
            eq(storePreferences.userId, userId),
            eq(storePreferences.storeId, storeId)
          )
        )
        .returning();
      preference = updatedPreference;
    } else {
      // Create new preference
      const [newPreference] = await db
        .insert(storePreferences)
        .values({ userId, storeId, priority, isActive })
        .returning();
      preference = newPreference;
    }

    res.json({
      success: true,
      data: preference,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/stores/preferences/:storeId
 * Remove store preference
 */
router.delete("/preferences/:storeId", async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const userId = req.user?.id || "anonymous"; // TODO: Implement proper auth

    await db
      .delete(storePreferences)
      .where(
        and(
          eq(storePreferences.userId, userId),
          eq(storePreferences.storeId, storeId)
        )
      );

    res.json({
      success: true,
      message: "Store preference removed successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;

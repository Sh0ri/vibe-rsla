import { db } from "../db";
import { stores, storePreferences, products } from "../db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export class StoreController {
  /**
   * Get all available stores
   */
  static async getAllStores() {
    const storesData = await db.select().from(stores).orderBy(asc(stores.name));

    return storesData;
  }

  /**
   * Get a specific store with recent products
   */
  static async getStoreById(id: string) {
    const storeResult = await db.select().from(stores).where(eq(stores.id, id));

    if (storeResult.length === 0) {
      throw new Error("Store not found");
    }

    const store = storeResult[0];

    if (!store) {
      throw new Error("Store not found");
    }

    // Get recent products for this store
    const storeProducts = await db
      .select()
      .from(products)
      .where(eq(products.storeId, id))
      .orderBy(desc(products.lastUpdated))
      .limit(10);

    return {
      ...store,
      products: storeProducts,
    };
  }

  /**
   * Get user's store preferences
   */
  static async getUserPreferences(userId: string) {
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

    return preferences;
  }

  /**
   * Create or update store preference
   */
  static async upsertPreference(
    userId: string,
    storeId: string,
    priority: number = 0,
    isActive: boolean = true
  ) {
    // Check if store exists
    const storeResult = await db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId));

    if (storeResult.length === 0) {
      throw new Error("Store not found");
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

    if (!preference) {
      throw new Error("Failed to create or update preference");
    }

    return preference;
  }

  /**
   * Remove store preference
   */
  static async removePreference(userId: string, storeId: string) {
    await db
      .delete(storePreferences)
      .where(
        and(
          eq(storePreferences.userId, userId),
          eq(storePreferences.storeId, storeId)
        )
      );
  }
}

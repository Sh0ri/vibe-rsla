import { db } from "../db";
import { shoppingLists, stores } from "../db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export class ShoppingListController {
  /**
   * Get all shopping lists for user
   */
  static async getUserShoppingLists(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: string
  ) {
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

    return {
      data: shoppingListsData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a specific shopping list
   */
  static async getShoppingListById(id: string, userId: string) {
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
      throw new Error("Shopping list not found");
    }

    const shoppingList = shoppingListResult[0];

    if (!shoppingList) {
      throw new Error("Shopping list not found");
    }

    // Parse items if they're stored as JSON string
    let items = shoppingList.items;
    try {
      items = JSON.parse(shoppingList.items);
    } catch {
      // Items are already in object format
    }

    return {
      ...shoppingList,
      items,
    };
  }

  /**
   * Create a new shopping list
   */
  static async createShoppingList(
    userId: string,
    name: string,
    storeId?: string,
    items: any[] = []
  ) {
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

    if (!shoppingList) {
      throw new Error("Failed to create shopping list");
    }

    return shoppingList;
  }

  /**
   * Update a shopping list
   */
  static async updateShoppingList(
    id: string,
    userId: string,
    name?: string,
    storeId?: string,
    items?: any[],
    status?: string
  ) {
    // Check if shopping list exists and belongs to user
    const existingListResult = await db
      .select()
      .from(shoppingLists)
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)));

    if (existingListResult.length === 0) {
      throw new Error("Shopping list not found");
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

    if (!updatedList) {
      throw new Error("Failed to update shopping list");
    }

    return updatedList;
  }

  /**
   * Delete a shopping list
   */
  static async deleteShoppingList(id: string, userId: string) {
    // Check if shopping list exists and belongs to user
    const existingListResult = await db
      .select()
      .from(shoppingLists)
      .where(and(eq(shoppingLists.id, id), eq(shoppingLists.userId, userId)));

    if (existingListResult.length === 0) {
      throw new Error("Shopping list not found");
    }

    await db.delete(shoppingLists).where(eq(shoppingLists.id, id));
  }

  /**
   * Export shopping list to various formats
   */
  static async exportShoppingList(
    id: string,
    userId: string,
    format: string = "json"
  ) {
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
      throw new Error("Shopping list not found");
    }

    const shoppingList = shoppingListResult[0];

    if (!shoppingList) {
      throw new Error("Shopping list not found");
    }

    // Parse items
    let items;
    try {
      items = JSON.parse(shoppingList.items);
    } catch {
      items = shoppingList.items;
    }

    let exportData: any;
    let contentType: string;
    let filename: string;

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
        contentType = "text/csv";
        filename = `shopping-list-${id}.csv`;
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
        contentType = "text/plain";
        filename = `shopping-list-${id}.txt`;
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
        contentType = "application/json";
        filename = `shopping-list-${id}.json`;
    }

    return {
      data: exportData,
      contentType,
      filename,
    };
  }

  /**
   * Generate cart links for shopping list items
   */
  static async generateCartLinks(id: string, userId: string) {
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
      throw new Error("Shopping list not found");
    }

    const shoppingList = shoppingListResult[0];

    if (!shoppingList) {
      throw new Error("Shopping list not found");
    }

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

    return {
      shoppingListId: id,
      shoppingListName: shoppingList.name,
      cartLinks,
      totalItems: cartLinks.length,
    };
  }
}

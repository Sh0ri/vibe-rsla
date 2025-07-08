import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Recipes table
export const recipes = pgTable("recipes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  ingredients: text("ingredients").notNull(), // JSON string of parsed ingredients
  instructions: text("instructions"),
  sourceUrl: text("source_url"),
  imageUrl: text("image_url"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Ingredients table
export const ingredients = pgTable("ingredients", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit"),
  category: text("category"), // e.g., "produce", "dairy", "pantry"
  synonyms: text("synonyms").array(), // Array of alternative names
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Stores table
export const stores = pgTable("stores", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  domain: text("domain").notNull().unique(),
  country: text("country").notNull(),
  currency: text("currency").default("USD").notNull(),
  apiEnabled: boolean("api_enabled").default(false).notNull(),
  apiConfig: text("api_config"), // JSON string for API configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Products table
export const products = pgTable("products", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  brand: text("brand"),
  barcode: text("barcode").unique(),
  imageUrl: text("image_url"),
  price: real("price"),
  currency: text("currency").default("USD").notNull(),
  unit: text("unit"), // e.g., "kg", "piece", "bottle"
  packageSize: text("package_size"), // e.g., "500g", "1L"
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  ingredientId: text("ingredient_id").references(() => ingredients.id),
  productUrl: text("product_url").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Shopping Lists table
export const shoppingLists = pgTable("shopping_lists", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  storeId: text("store_id").references(() => stores.id),
  recipeId: text("recipe_id").references(() => recipes.id),
  items: text("items").notNull(), // JSON string of shopping list items
  totalCost: real("total_cost"),
  status: text("status").default("active").notNull(), // active, completed, archived
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Store Preferences table
export const storePreferences = pgTable(
  "store_preferences",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    priority: integer("priority").default(0).notNull(), // Higher number = higher priority
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userStoreUnique: uniqueIndex("user_store_unique").on(
      table.userId,
      table.storeId
    ),
  })
);

// Pantry Items table
export const pantryItems = pgTable(
  "pantry_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ingredientId: text("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    quantity: real("quantity").notNull(),
    unit: text("unit").notNull(),
    expiryDate: timestamp("expiry_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIngredientUnique: uniqueIndex("user_ingredient_unique").on(
      table.userId,
      table.ingredientId
    ),
  })
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  recipes: many(recipes),
  shoppingLists: many(shoppingLists),
  storePreferences: many(storePreferences),
  pantryItems: many(pantryItems),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  user: one(users, {
    fields: [recipes.userId],
    references: [users.id],
  }),
  shoppingLists: many(shoppingLists),
}));

export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  products: many(products),
  pantryItems: many(pantryItems),
}));

export const storesRelations = relations(stores, ({ many }) => ({
  products: many(products),
  storePreferences: many(storePreferences),
  shoppingLists: many(shoppingLists),
}));

export const productsRelations = relations(products, ({ one }) => ({
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
  }),
  ingredient: one(ingredients, {
    fields: [products.ingredientId],
    references: [ingredients.id],
  }),
}));

export const shoppingListsRelations = relations(shoppingLists, ({ one }) => ({
  user: one(users, {
    fields: [shoppingLists.userId],
    references: [users.id],
  }),
  store: one(stores, {
    fields: [shoppingLists.storeId],
    references: [stores.id],
  }),
  recipe: one(recipes, {
    fields: [shoppingLists.recipeId],
    references: [recipes.id],
  }),
}));

export const storePreferencesRelations = relations(
  storePreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [storePreferences.userId],
      references: [users.id],
    }),
    store: one(stores, {
      fields: [storePreferences.storeId],
      references: [stores.id],
    }),
  })
);

export const pantryItemsRelations = relations(pantryItems, ({ one }) => ({
  user: one(users, {
    fields: [pantryItems.userId],
    references: [users.id],
  }),
  ingredient: one(ingredients, {
    fields: [pantryItems.ingredientId],
    references: [ingredients.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;
export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type NewShoppingList = typeof shoppingLists.$inferInsert;
export type StorePreference = typeof storePreferences.$inferSelect;
export type NewStorePreference = typeof storePreferences.$inferInsert;
export type PantryItem = typeof pantryItems.$inferSelect;
export type NewPantryItem = typeof pantryItems.$inferInsert;

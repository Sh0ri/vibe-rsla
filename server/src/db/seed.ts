import { db } from "./index";
import { stores, ingredients, products } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Seeding database...");

  // Create stores
  const storeData = [
    {
      name: "Amazon",
      domain: "amazon.com",
      country: "US",
      currency: "USD",
      apiEnabled: true,
    },
    {
      name: "Carrefour",
      domain: "carrefour.fr",
      country: "FR",
      currency: "EUR",
      apiEnabled: false,
    },
    {
      name: "Monoprix",
      domain: "monoprix.fr",
      country: "FR",
      currency: "EUR",
      apiEnabled: false,
    },
    {
      name: "Walmart",
      domain: "walmart.com",
      country: "US",
      currency: "USD",
      apiEnabled: false,
    },
    {
      name: "Target",
      domain: "target.com",
      country: "US",
      currency: "USD",
      apiEnabled: false,
    },
  ];

  const createdStores = [];
  for (const store of storeData) {
    const existingStore = await db
      .select()
      .from(stores)
      .where(eq(stores.domain, store.domain));
    if (existingStore.length === 0) {
      const [newStore] = await db.insert(stores).values(store).returning();
      createdStores.push(newStore);
    } else {
      createdStores.push(existingStore[0]);
    }
  }

  console.log(`✅ Created ${createdStores.length} stores`);

  // Create sample ingredients
  const ingredientData = [
    {
      name: "all-purpose flour",
      quantity: 1,
      unit: "cup",
      category: "pantry",
      synonyms: ["flour", "plain flour", "wheat flour"],
    },
    {
      name: "sugar",
      quantity: 1,
      unit: "cup",
      category: "pantry",
      synonyms: ["granulated sugar", "white sugar"],
    },
    {
      name: "eggs",
      quantity: 2,
      unit: "large",
      category: "dairy",
      synonyms: ["egg", "large eggs"],
    },
    {
      name: "milk",
      quantity: 1,
      unit: "cup",
      category: "dairy",
      synonyms: ["whole milk", "skim milk", "2% milk"],
    },
    {
      name: "vanilla extract",
      quantity: 1,
      unit: "teaspoon",
      category: "pantry",
      synonyms: ["vanilla", "vanilla essence"],
    },
    {
      name: "tomatoes",
      quantity: 4,
      unit: "medium",
      category: "produce",
      synonyms: ["tomato", "roma tomatoes", "cherry tomatoes"],
    },
    {
      name: "onion",
      quantity: 1,
      unit: "large",
      category: "produce",
      synonyms: ["yellow onion", "white onion", "red onion"],
    },
    {
      name: "garlic",
      quantity: 3,
      unit: "cloves",
      category: "produce",
      synonyms: ["garlic cloves", "fresh garlic"],
    },
  ];

  const createdIngredients = [];
  for (const ingredient of ingredientData) {
    const existingIngredient = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.name, ingredient.name));
    if (existingIngredient.length === 0) {
      const [newIngredient] = await db
        .insert(ingredients)
        .values(ingredient)
        .returning();
      createdIngredients.push(newIngredient);
    } else {
      createdIngredients.push(existingIngredient[0]);
    }
  }

  console.log(`✅ Created ${createdIngredients.length} ingredients`);

  // Create sample products
  const productData = [
    {
      id: "sample-flour-1",
      name: "King Arthur All-Purpose Flour",
      brand: "King Arthur",
      price: 4.99,
      currency: "USD",
      unit: "cup",
      packageSize: "5 lb",
      storeId: createdStores[0].id, // Amazon
      productUrl: "https://amazon.com/flour",
      ingredientId: createdIngredients[0].id,
    },
    {
      id: "sample-sugar-1",
      name: "Domino Granulated Sugar",
      brand: "Domino",
      price: 3.49,
      currency: "USD",
      unit: "cup",
      packageSize: "4 lb",
      storeId: createdStores[0].id, // Amazon
      productUrl: "https://amazon.com/sugar",
      ingredientId: createdIngredients[1].id,
    },
    {
      id: "sample-eggs-1",
      name: "Organic Large Eggs",
      brand: "Organic Valley",
      price: 5.99,
      currency: "USD",
      unit: "large",
      packageSize: "12 count",
      storeId: createdStores[0].id, // Amazon
      productUrl: "https://amazon.com/eggs",
      ingredientId: createdIngredients[2].id,
    },
  ];

  const createdProducts = [];
  for (const product of productData) {
    const existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.id, product.id));
    if (existingProduct.length === 0) {
      const [newProduct] = await db
        .insert(products)
        .values(product)
        .returning();
      createdProducts.push(newProduct);
    } else {
      createdProducts.push(existingProduct[0]);
    }
  }

  console.log(`✅ Created ${createdProducts.length} products`);

  console.log("🎉 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    // Close the database connection
    process.exit(0);
  });

import axios from "axios";
import { db } from "../db";
import { products, stores, ingredients } from "../db/schema";
import { eq, or, ilike, gte, lte, inArray } from "drizzle-orm";
import { IngredientParserService } from "./ingredientParserService";

export interface ProductSearchResult {
  id: string;
  name: string;
  brand?: string;
  price?: number;
  currency: string;
  imageUrl?: string;
  productUrl: string;
  store: {
    id: string;
    name: string;
    domain: string;
  };
  matchScore: number;
  packageSize?: string;
  unit?: string;
}

export interface ProductSearchOptions {
  maxResults?: number;
  minPrice?: number;
  maxPrice?: number;
  preferredBrands?: string[];
  organic?: boolean;
  glutenFree?: boolean;
}

export class ProductSearchService {
  /**
   * Search for products matching an ingredient across multiple stores
   */
  static async searchProducts(
    ingredientName: string,
    quantity: number,
    unit?: string,
    options: ProductSearchOptions = {}
  ): Promise<ProductSearchResult[]> {
    try {
      const normalizedName =
        IngredientParserService.normalizeIngredientName(ingredientName);
      const synonyms =
        IngredientParserService.getIngredientSynonyms(ingredientName);

      // Search in database first
      const dbResults = await this.searchDatabase(
        normalizedName,
        synonyms,
        options
      );

      // Search external APIs
      const apiResults = await this.searchExternalAPIs(
        normalizedName,
        quantity,
        unit,
        options
      );

      // Combine and rank results
      const allResults = [...dbResults, ...apiResults];
      const rankedResults = this.rankProducts(
        allResults,
        normalizedName,
        quantity,
        unit
      );

      return rankedResults.slice(0, options.maxResults || 10);
    } catch (error) {
      console.error("Error searching products:", error);
      throw new Error(
        `Failed to search products: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Search for products in the database
   */
  private static async searchDatabase(
    ingredientName: string,
    synonyms: string[],
    options: ProductSearchOptions
  ): Promise<ProductSearchResult[]> {
    const searchTerms = [ingredientName, ...synonyms];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let query = db
      .select({
        id: products.id,
        name: products.name,
        brand: products.brand,
        price: products.price,
        currency: products.currency,
        imageUrl: products.imageUrl,
        productUrl: products.productUrl,
        packageSize: products.packageSize,
        unit: products.unit,
        lastUpdated: products.lastUpdated,
        store: {
          id: stores.id,
          name: stores.name,
          domain: stores.domain,
        },
      })
      .from(products)
      .innerJoin(stores, eq(products.storeId, stores.id))
      .where(
        or(
          ilike(products.name, `%${ingredientName}%`),
          ...synonyms.map((synonym) => ilike(products.name, `%${synonym}%`))
        )
      );

    // Add price filters
    if (options.minPrice) {
      query = query.where(gte(products.price, options.minPrice));
    }
    if (options.maxPrice) {
      query = query.where(lte(products.price, options.maxPrice));
    }

    // Add brand filter
    if (options.preferredBrands && options.preferredBrands.length > 0) {
      query = query.where(inArray(products.brand, options.preferredBrands));
    }

    // Add date filter
    query = query.where(gte(products.lastUpdated, sevenDaysAgo));

    const dbProducts = await query.limit(20);

    return dbProducts.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand || undefined,
      price: product.price || undefined,
      currency: product.currency,
      imageUrl: product.imageUrl || undefined,
      productUrl: product.productUrl,
      store: {
        id: product.store.id,
        name: product.store.name,
        domain: product.store.domain,
      },
      matchScore: this.calculateMatchScore(product.name, ingredientName),
      packageSize: product.packageSize || undefined,
      unit: product.unit || undefined,
    }));
  }

  /**
   * Search external APIs for products
   */
  private static async searchExternalAPIs(
    ingredientName: string,
    quantity: number,
    unit?: string,
    options: ProductSearchOptions = {}
  ): Promise<ProductSearchResult[]> {
    const results: ProductSearchResult[] = [];

    try {
      // Search Open Food Facts API
      const openFoodResults = await this.searchOpenFoodFacts(
        ingredientName,
        options
      );
      results.push(...openFoodResults);

      // Search Amazon Product API (if configured)
      if (process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY) {
        const amazonResults = await this.searchAmazonProducts(
          ingredientName,
          options
        );
        results.push(...amazonResults);
      }
    } catch (error) {
      console.error("Error searching external APIs:", error);
      // Continue with database results only
    }

    return results;
  }

  /**
   * Search Open Food Facts API
   */
  private static async searchOpenFoodFacts(
    ingredientName: string,
    options: ProductSearchOptions
  ): Promise<ProductSearchResult[]> {
    try {
      const searchUrl = `${process.env.OPENFOODFACTS_API_URL}/search`;
      const response = await axios.get(searchUrl, {
        params: {
          search_terms: ingredientName,
          search_simple: 1,
          action: "process",
          json: 1,
          page_size: options.maxResults || 10,
        },
        timeout: 5000,
      });

      const products = response.data.products || [];

      return products.map((product: any) => ({
        id: product.code || `openfood_${Date.now()}_${Math.random()}`,
        name: product.product_name || product.generic_name || ingredientName,
        brand: product.brands,
        price: undefined, // Open Food Facts doesn't provide pricing
        currency: "USD",
        imageUrl: product.image_front_url,
        productUrl: `https://world.openfoodfacts.org/product/${product.code}`,
        store: {
          id: "openfood",
          name: "Open Food Facts",
          domain: "world.openfoodfacts.org",
        },
        matchScore: this.calculateMatchScore(
          product.product_name || "",
          ingredientName
        ),
        packageSize: product.quantity,
        unit: undefined,
      }));
    } catch (error) {
      console.error("Error searching Open Food Facts:", error);
      return [];
    }
  }

  /**
   * Search Amazon Product API
   */
  private static async searchAmazonProducts(
    ingredientName: string,
    options: ProductSearchOptions
  ): Promise<ProductSearchResult[]> {
    // This would require implementing Amazon Product Advertising API
    // For now, return empty array as it requires AWS credentials and API setup
    console.log("Amazon Product API not implemented yet");
    return [];
  }

  /**
   * Calculate match score for product ranking
   */
  private static calculateMatchScore(
    productName: string,
    ingredientName: string
  ): number {
    const normalizedProduct =
      IngredientParserService.normalizeIngredientName(productName);
    const normalizedIngredient =
      IngredientParserService.normalizeIngredientName(ingredientName);

    // Exact match
    if (normalizedProduct === normalizedIngredient) {
      return 1.0;
    }

    // Contains ingredient name
    if (normalizedProduct.includes(normalizedIngredient)) {
      return 0.8;
    }

    // Contains ingredient name as part of a word
    const words = normalizedProduct.split(" ");
    const ingredientWords = normalizedIngredient.split(" ");

    const matchingWords = ingredientWords.filter((word) =>
      words.some((productWord) => productWord.includes(word))
    );

    if (matchingWords.length > 0) {
      return 0.6 * (matchingWords.length / ingredientWords.length);
    }

    // No match
    return 0.0;
  }

  /**
   * Rank products by relevance and other factors
   */
  private static rankProducts(
    products: ProductSearchResult[],
    ingredientName: string,
    quantity: number,
    unit?: string
  ): ProductSearchResult[] {
    return products
      .map((product) => ({
        ...product,
        matchScore: this.calculateMatchScore(product.name, ingredientName),
      }))
      .filter((product) => product.matchScore > 0.1) // Filter out poor matches
      .sort((a, b) => {
        // Primary sort by match score
        if (Math.abs(a.matchScore - b.matchScore) > 0.1) {
          return b.matchScore - a.matchScore;
        }

        // Secondary sort by price (cheaper first)
        if (a.price && b.price) {
          return a.price - b.price;
        }

        // Tertiary sort by store preference (could be enhanced with user preferences)
        return a.store.name.localeCompare(b.store.name);
      });
  }

  /**
   * Get product details by ID
   */
  static async getProductById(
    productId: string
  ): Promise<ProductSearchResult | null> {
    try {
      const productResult = await db
        .select({
          id: products.id,
          name: products.name,
          brand: products.brand,
          price: products.price,
          currency: products.currency,
          imageUrl: products.imageUrl,
          productUrl: products.productUrl,
          packageSize: products.packageSize,
          unit: products.unit,
          store: {
            id: stores.id,
            name: stores.name,
            domain: stores.domain,
          },
        })
        .from(products)
        .innerJoin(stores, eq(products.storeId, stores.id))
        .where(eq(products.id, productId));

      if (productResult.length === 0) {
        return null;
      }

      const product = productResult[0];

      return {
        id: product.id,
        name: product.name,
        brand: product.brand || undefined,
        price: product.price || undefined,
        currency: product.currency,
        imageUrl: product.imageUrl || undefined,
        productUrl: product.productUrl,
        store: {
          id: product.store.id,
          name: product.store.name,
          domain: product.store.domain,
        },
        matchScore: 1.0,
        packageSize: product.packageSize || undefined,
        unit: product.unit || undefined,
      };
    } catch (error) {
      console.error("Error getting product by ID:", error);
      return null;
    }
  }

  /**
   * Update product prices from external sources
   */
  static async updateProductPrices(): Promise<void> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const productsToUpdate = await db
        .select()
        .from(products)
        .where(lte(products.lastUpdated, twentyFourHoursAgo))
        .limit(100); // Update in batches

      for (const product of productsToUpdate) {
        try {
          // This would implement price scraping or API calls
          // For now, just update the timestamp
          await db
            .update(products)
            .set({ lastUpdated: new Date() })
            .where(eq(products.id, product.id));
        } catch (error) {
          console.error(`Error updating product ${product.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Error updating product prices:", error);
    }
  }
}

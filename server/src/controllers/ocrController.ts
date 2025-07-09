import { OCRService } from "../services/ocrService";
import { IngredientParserService } from "../services/ingredientParserService";

export class OCRController {
  /**
   * Extract recipe from Instagram post URL (focused on pinned comments)
   */
  static async extractRecipeFromInstagramUrl(instagramUrl: string) {
    // Check if scraping fallback is enabled
    const useScrapingFallback =
      process.env["ENABLE_SCRAPING_FALLBACK"] === "true";

    // Extract recipe from Instagram URL using API first, scraping as fallback
    const instagramResult = await OCRService.extractRecipeFromInstagramUrl(
      instagramUrl,
      useScrapingFallback
    );

    // Parse ingredients from the extracted recipe
    const parsedIngredients = await IngredientParserService.parseIngredients(
      instagramResult.extractedRecipe
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
      originalText: instagramResult.text,
      extractedRecipe: instagramResult.extractedRecipe,
      confidence: instagramResult.confidence,
      recipeConfidence: instagramResult.recipeConfidence,
      processingTime: instagramResult.processingTime,
      isComment: instagramResult.isComment,
      commentType: instagramResult.commentType,
      metadata: instagramResult.metadata,
      ingredients: enhancedIngredients,
      totalIngredients: enhancedIngredients.length,
      instagramUrl,
      source: instagramResult.source, // Add source information (api or scraping)
    };
  }
}

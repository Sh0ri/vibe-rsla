import { OCRService } from "../services/ocrService";
import { IngredientParserService } from "../services/ingredientParserService";
import fs from "fs";

export class OCRController {
  /**
   * Extract text from uploaded image
   */
  static async extractText(
    fileBuffer: Buffer,
    filePath: string,
    originalName: string,
    size: number,
    mimetype: string
  ) {
    // Extract text from image
    const ocrResult = await OCRService.extractText(
      fileBuffer || fs.readFileSync(filePath)
    );

    // Clean the extracted text
    const cleanedText = OCRService.cleanRecipeText(ocrResult.text);

    // Validate if the text looks like a recipe
    const validation = OCRService.validateRecipeText(cleanedText);

    return {
      originalText: ocrResult.text,
      cleanedText,
      confidence: ocrResult.confidence,
      processingTime: ocrResult.processingTime,
      validation,
      fileInfo: {
        originalName,
        size,
        mimetype,
      },
    };
  }

  /**
   * Extract text from image URL
   */
  static async extractTextFromUrl(imageUrl: string) {
    // Extract text from image URL
    const ocrResult = await OCRService.extractTextFromUrl(imageUrl);

    // Clean the extracted text
    const cleanedText = OCRService.cleanRecipeText(ocrResult.text);

    // Validate if the text looks like a recipe
    const validation = OCRService.validateRecipeText(cleanedText);

    return {
      originalText: ocrResult.text,
      cleanedText,
      confidence: ocrResult.confidence,
      processingTime: ocrResult.processingTime,
      validation,
      imageUrl,
    };
  }

  /**
   * Extract recipe from Instagram food post (focused on pinned comments)
   */
  static async extractRecipeFromInstagramPost(
    fileBuffer: Buffer,
    filePath: string,
    originalName: string,
    size: number,
    mimetype: string
  ) {
    // Extract recipe from Instagram post
    const instagramResult = await OCRService.extractRecipeFromInstagramPost(
      fileBuffer || fs.readFileSync(filePath)
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
      fileInfo: {
        originalName,
        size,
        mimetype,
      },
    };
  }

  /**
   * Extract text from image and parse ingredients
   */
  static async parseRecipeFromImage(
    fileBuffer: Buffer,
    filePath: string,
    originalName: string,
    size: number,
    mimetype: string
  ) {
    // Extract text from image
    const ocrResult = await OCRService.extractText(
      fileBuffer || fs.readFileSync(filePath)
    );

    // Clean the extracted text
    const cleanedText = OCRService.cleanRecipeText(ocrResult.text);

    // Validate if the text looks like a recipe
    const validation = OCRService.validateRecipeText(cleanedText);

    if (!validation.isValid) {
      throw new Error("Extracted text does not appear to be a recipe");
    }

    // Parse ingredients from the cleaned text
    const parsedIngredients = await IngredientParserService.parseIngredients(
      cleanedText
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
      originalText: ocrResult.text,
      cleanedText,
      confidence: ocrResult.confidence,
      processingTime: ocrResult.processingTime,
      validation,
      ingredients: enhancedIngredients,
      totalIngredients: enhancedIngredients.length,
      fileInfo: {
        originalName,
        size,
        mimetype,
      },
    };
  }
}

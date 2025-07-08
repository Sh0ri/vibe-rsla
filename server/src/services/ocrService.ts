import Tesseract from "tesseract.js";
import { createWorker } from "tesseract.js";

export interface OCRResult {
  text: string;
  confidence: number;
  processingTime: number;
}

export class OCRService {
  private static worker: Tesseract.Worker | null = null;
  private static isInitialized = false;

  /**
   * Initialize Tesseract worker
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.worker = await createWorker({
        logger:
          process.env.NODE_ENV === "development"
            ? (m) => console.log(m)
            : undefined,
      });

      await this.worker.loadLanguage(process.env.TESSERACT_LANG || "eng");
      await this.worker.initialize(process.env.TESSERACT_LANG || "eng");

      // Configure for better recipe text recognition
      await this.worker.setParameters({
        tessedit_char_whitelist:
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:()[]{}\"'-/\\\n\r\t ",
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        preserve_interword_spaces: "1",
      });

      this.isInitialized = true;
      console.log("Tesseract OCR initialized successfully");
    } catch (error) {
      console.error("Error initializing Tesseract OCR:", error);
      throw new Error("Failed to initialize OCR service");
    }
  }

  /**
   * Extract text from image buffer
   */
  static async extractText(imageBuffer: Buffer): Promise<OCRResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error("OCR worker not initialized");
    }

    const startTime = Date.now();

    try {
      const result = await this.worker.recognize(imageBuffer);

      const processingTime = Date.now() - startTime;

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        processingTime,
      };
    } catch (error) {
      console.error("Error extracting text from image:", error);
      throw new Error(
        `OCR processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Extract text from image URL
   */
  static async extractTextFromUrl(imageUrl: string): Promise<OCRResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error("OCR worker not initialized");
    }

    const startTime = Date.now();

    try {
      const result = await this.worker.recognize(imageUrl);

      const processingTime = Date.now() - startTime;

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        processingTime,
      };
    } catch (error) {
      console.error("Error extracting text from image URL:", error);
      throw new Error(
        `OCR processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Clean and preprocess extracted text for recipe parsing
   */
  static cleanRecipeText(text: string): string {
    return (
      text
        // Remove extra whitespace
        .replace(/\s+/g, " ")
        // Remove common OCR artifacts
        .replace(/[|]/g, "I")
        .replace(/[0]/g, "O")
        .replace(/[1]/g, "l")
        // Fix common recipe text issues
        .replace(/(\d+)\s*-\s*(\d+)/g, "$1-$2") // Fix number ranges
        .replace(/(\d+)\s*\/\s*(\d+)/g, "$1/$2") // Fix fractions
        .replace(/(\d+)\s*(\w+)/g, "$1 $2") // Ensure space between numbers and units
        // Remove lines that are likely not ingredients
        .split("\n")
        .filter((line) => {
          const trimmed = line.trim();
          // Remove empty lines
          if (!trimmed) return false;
          // Remove lines that are likely instructions (start with verbs)
          if (
            /^(preheat|heat|add|mix|stir|combine|place|put|set|turn|open|close|wash|cut|chop|slice|dice|mince|grate|peel|remove|drain|rinse|pat|dry|season|salt|pepper|taste|adjust|serve|garnish|decorate)/i.test(
              trimmed
            )
          ) {
            return false;
          }
          // Remove lines that are too short (likely not ingredients)
          if (trimmed.length < 3) return false;
          // Remove lines that are all uppercase (likely headers)
          if (trimmed === trimmed.toUpperCase() && trimmed.length > 10)
            return false;
          return true;
        })
        .join("\n")
        .trim()
    );
  }

  /**
   * Validate if extracted text is likely a recipe
   */
  static validateRecipeText(text: string): {
    isValid: boolean;
    confidence: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let confidence = 0;

    // Check for ingredient-like patterns
    const ingredientPatterns = [
      /\d+\s*(cup|tablespoon|teaspoon|ounce|pound|gram|kilogram|ml|liter|clove|pinch|dash)/i,
      /\d+\s*-\s*\d+\s*(cup|tablespoon|teaspoon|ounce|pound|gram|kilogram|ml|liter)/i,
      /\d+\/\d+\s*(cup|tablespoon|teaspoon|ounce|pound|gram|kilogram|ml|liter)/i,
    ];

    const hasIngredientPatterns = ingredientPatterns.some((pattern) =>
      pattern.test(text)
    );
    if (hasIngredientPatterns) {
      confidence += 0.4;
    } else {
      reasons.push("No ingredient quantity patterns found");
    }

    // Check for common ingredient words
    const commonIngredients = [
      "salt",
      "pepper",
      "oil",
      "butter",
      "flour",
      "sugar",
      "egg",
      "milk",
      "cheese",
      "tomato",
      "onion",
      "garlic",
      "carrot",
      "potato",
      "chicken",
      "beef",
      "pork",
      "rice",
      "pasta",
      "bread",
      "lettuce",
      "spinach",
      "mushroom",
      "bell pepper",
    ];

    const ingredientMatches = commonIngredients.filter((ingredient) =>
      text.toLowerCase().includes(ingredient)
    ).length;

    if (ingredientMatches >= 3) {
      confidence += 0.3;
    } else if (ingredientMatches >= 1) {
      confidence += 0.1;
    } else {
      reasons.push("No common ingredients found");
    }

    // Check for reasonable text length
    if (text.length >= 50 && text.length <= 2000) {
      confidence += 0.2;
    } else {
      reasons.push("Text length not suitable for recipe");
    }

    // Check for reasonable line count
    const lines = text.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length >= 3 && lines.length <= 50) {
      confidence += 0.1;
    } else {
      reasons.push("Number of lines not suitable for recipe");
    }

    const isValid = confidence >= 0.5;

    return {
      isValid,
      confidence,
      reasons,
    };
  }

  /**
   * Terminate OCR worker
   */
  static async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log("Tesseract OCR terminated");
    }
  }

  /**
   * Get OCR worker status
   */
  static getStatus(): { isInitialized: boolean; workerExists: boolean } {
    return {
      isInitialized: this.isInitialized,
      workerExists: this.worker !== null,
    };
  }
}

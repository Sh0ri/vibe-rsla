import Tesseract from "tesseract.js";
import { createWorker } from "tesseract.js";

export interface OCRResult {
  text: string;
  confidence: number;
  processingTime: number;
}

export interface InstagramOCRResult extends OCRResult {
  isComment: boolean;
  commentType: "pinned" | "regular" | "caption" | "unknown";
  recipeConfidence: number;
  extractedRecipe: string;
  metadata: {
    hasEmojis: boolean;
    hasHashtags: boolean;
    hasMentions: boolean;
    lineCount: number;
    wordCount: number;
  };
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
      this.worker = await createWorker(process.env["TESSERACT_LANG"] || "eng");

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
   * Extract recipe from Instagram food post (focused on pinned comments)
   */
  static async extractRecipeFromInstagramPost(
    imageBuffer: Buffer
  ): Promise<InstagramOCRResult> {
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

      // Analyze the extracted text for Instagram-specific patterns
      const analysis = this.analyzeInstagramText(result.data.text);

      // Extract recipe from the most likely comment section
      const extractedRecipe = this.extractRecipeFromInstagramText(
        result.data.text,
        analysis
      );

      // Calculate recipe confidence
      const recipeConfidence = this.calculateRecipeConfidence(extractedRecipe);

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        processingTime,
        isComment: analysis.isComment,
        commentType: analysis.commentType,
        recipeConfidence,
        extractedRecipe,
        metadata: analysis.metadata,
      };
    } catch (error) {
      console.error("Error extracting recipe from Instagram post:", error);
      throw new Error(
        `Instagram OCR processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Analyze Instagram text to identify comment sections and recipe content
   */
  static analyzeInstagramText(text: string): {
    isComment: boolean;
    commentType: "pinned" | "regular" | "caption" | "unknown";
    metadata: {
      hasEmojis: boolean;
      hasHashtags: boolean;
      hasMentions: boolean;
      lineCount: number;
      wordCount: number;
    };
  } {
    const lines = text.split("\n").filter((line) => line.trim().length > 0);
    const fullText = text.toLowerCase();

    // Check for Instagram-specific patterns
    const hasEmojis =
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(
        text
      );
    const hasHashtags = /#[a-zA-Z0-9_]+/g.test(text);
    const hasMentions = /@[a-zA-Z0-9_.]+/g.test(text);

    // Identify comment type based on patterns
    let commentType: "pinned" | "regular" | "caption" | "unknown" = "unknown";

    // Look for pinned comment indicators
    if (
      fullText.includes("pinned") ||
      fullText.includes("📌") ||
      lines.some((line) => line.includes("📌") || line.includes("PINNED"))
    ) {
      commentType = "pinned";
    }
    // Look for caption indicators
    else if (
      fullText.includes("caption") ||
      fullText.includes("description") ||
      lines.some(
        (line) => line.includes("Caption:") || line.includes("Description:")
      )
    ) {
      commentType = "caption";
    }
    // Check if it looks like a regular comment
    else if (hasEmojis || hasHashtags || hasMentions || lines.length > 3) {
      commentType = "regular";
    }

    const isComment = commentType !== "unknown";

    return {
      isComment,
      commentType,
      metadata: {
        hasEmojis,
        hasHashtags,
        hasMentions,
        lineCount: lines.length,
        wordCount: text.split(/\s+/).length,
      },
    };
  }

  /**
   * Extract recipe content from Instagram text
   */
  static extractRecipeFromInstagramText(text: string, analysis: any): string {
    const lines = text.split("\n").filter((line) => line.trim().length > 0);

    // Remove Instagram-specific content
    let cleanedText = text
      // Remove emojis
      .replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
        ""
      )
      // Remove hashtags
      .replace(/#[a-zA-Z0-9_]+/g, "")
      // Remove mentions
      .replace(/@[a-zA-Z0-9_.]+/g, "")
      // Remove common Instagram phrases
      .replace(
        /(recipe|ingredients|instructions|directions|steps|method|how to|tutorial|food|delicious|yummy|tasty|amazing|love this|try this|must try|save this|bookmark|share|follow|like|comment)/gi,
        ""
      )
      // Remove social media indicators
      .replace(
        /(pinned|caption|description|comment|reply|dm|message|link in bio|swipe|tap|click|follow for more)/gi,
        ""
      );

    // Split into lines and filter out non-recipe content
    const recipeLines = cleanedText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => {
        if (!line || line.length < 3) return false;

        // Keep lines that look like ingredients or instructions
        const hasQuantity = /\d+/.test(line);
        const hasUnit =
          /(cup|tbsp|tsp|oz|lb|g|kg|ml|l|clove|pinch|dash|slice|piece|whole|half|quarter)/i.test(
            line
          );
        const hasIngredient =
          /(salt|pepper|oil|butter|flour|sugar|egg|milk|cheese|tomato|onion|garlic|carrot|potato|chicken|beef|pork|rice|pasta|bread|lettuce|spinach|mushroom|bell pepper|lemon|lime|herb|spice|seasoning)/i.test(
            line
          );
        const hasInstruction =
          /(preheat|heat|add|mix|stir|combine|place|put|set|turn|open|close|wash|cut|chop|slice|dice|mince|grate|peel|remove|drain|rinse|pat|dry|season|taste|adjust|serve|garnish|decorate|bake|cook|fry|grill|roast|boil|simmer|blend|whisk|fold|knead|roll|spread|pour|drizzle|sprinkle)/i.test(
            line
          );

        return hasQuantity || hasUnit || hasIngredient || hasInstruction;
      });

    return recipeLines.join("\n").trim();
  }

  /**
   * Calculate confidence that extracted text is a recipe
   */
  static calculateRecipeConfidence(recipeText: string): number {
    if (!recipeText || recipeText.length < 10) return 0;

    let confidence = 0;
    const lines = recipeText
      .split("\n")
      .filter((line) => line.trim().length > 0);

    // Check for ingredient patterns
    const ingredientPatterns = [
      /\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l|clove|pinch|dash)/i,
      /\d+\s*-\s*\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l)/i,
      /\d+\/\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|l)/i,
    ];

    const hasIngredientPatterns = ingredientPatterns.some((pattern) =>
      pattern.test(recipeText)
    );
    if (hasIngredientPatterns) confidence += 0.3;

    // Check for common ingredients
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
      recipeText.toLowerCase().includes(ingredient)
    ).length;

    if (ingredientMatches >= 3) confidence += 0.3;
    else if (ingredientMatches >= 1) confidence += 0.1;

    // Check for cooking instructions
    const instructionWords = [
      "preheat",
      "heat",
      "add",
      "mix",
      "stir",
      "combine",
      "place",
      "put",
      "set",
      "cut",
      "chop",
      "slice",
      "dice",
      "mince",
      "grate",
      "peel",
      "remove",
      "drain",
      "rinse",
      "pat",
      "dry",
      "season",
      "taste",
      "adjust",
      "serve",
      "garnish",
      "bake",
      "cook",
      "fry",
      "grill",
      "roast",
      "boil",
      "simmer",
      "blend",
      "whisk",
    ];

    const instructionMatches = instructionWords.filter((word) =>
      recipeText.toLowerCase().includes(word)
    ).length;

    if (instructionMatches >= 2) confidence += 0.2;
    else if (instructionMatches >= 1) confidence += 0.1;

    // Check text length and structure
    if (recipeText.length >= 50 && recipeText.length <= 2000) confidence += 0.1;
    if (lines.length >= 3 && lines.length <= 30) confidence += 0.1;

    return Math.min(confidence, 1.0);
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

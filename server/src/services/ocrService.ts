import axios from "axios";
import * as cheerio from "cheerio";

export interface InstagramOCRResult {
  text: string;
  confidence: number;
  processingTime: number;
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
  source: "api" | "scraping";
}

export interface InstagramAPIResponse {
  id: string;
  caption?: {
    text: string;
  };
  comments?: {
    data: Array<{
      text: string;
      timestamp: string;
      from: {
        username: string;
      };
    }>;
  };
  media_type: string;
  media_url?: string;
  permalink: string;
}

export class OCRService {
  private static readonly INSTAGRAM_API_BASE_URL =
    "https://graph.instagram.com/v12.0";
  private static readonly INSTAGRAM_API_ACCESS_TOKEN =
    process.env["INSTAGRAM_ACCESS_TOKEN"];

  /**
   * Extract recipe from Instagram post URL using Instagram API first, then scraping as fallback
   */
  static async extractRecipeFromInstagramUrl(
    instagramUrl: string,
    useScrapingFallback: boolean = false
  ): Promise<InstagramOCRResult> {
    const startTime = Date.now();

    try {
      // Try Instagram API first if access token is available
      if (this.INSTAGRAM_API_ACCESS_TOKEN) {
        try {
          const apiResult = await this.extractRecipeFromInstagramAPI(
            instagramUrl
          );
          return {
            ...apiResult,
            processingTime: Date.now() - startTime,
            source: "api" as const,
          };
        } catch (apiError) {
          console.warn(
            "Instagram API failed, falling back to scraping:",
            apiError
          );
          // Only use scraping fallback if explicitly enabled
          if (!useScrapingFallback) {
            throw new Error(
              "Instagram API failed and scraping fallback is disabled"
            );
          }
        }
      }

      // Use scraping as fallback or primary method
      if (useScrapingFallback || !this.INSTAGRAM_API_ACCESS_TOKEN) {
        const scrapingResult = await this.extractRecipeFromInstagramScraping(
          instagramUrl
        );
        return {
          ...scrapingResult,
          processingTime: Date.now() - startTime,
          source: "scraping" as const,
        };
      }

      throw new Error(
        "No Instagram API access token available and scraping fallback is disabled"
      );
    } catch (error) {
      console.error("Error extracting recipe from Instagram URL:", error);
      throw new Error(
        `Instagram URL processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Extract recipe from Instagram post using Instagram Graph API
   */
  static async extractRecipeFromInstagramAPI(
    instagramUrl: string
  ): Promise<Omit<InstagramOCRResult, "source">> {
    if (!this.INSTAGRAM_API_ACCESS_TOKEN) {
      throw new Error("Instagram API access token not configured");
    }

    // Extract media ID from Instagram URL
    const mediaId = this.extractMediaIdFromUrl(instagramUrl);
    if (!mediaId) {
      throw new Error("Could not extract media ID from Instagram URL");
    }

    // Fetch post data from Instagram API
    const apiUrl = `${this.INSTAGRAM_API_BASE_URL}/${mediaId}`;
    const params = {
      fields: "id,caption,comments,media_type,media_url,permalink",
      access_token: this.INSTAGRAM_API_ACCESS_TOKEN,
    };

    const response = await axios.get(apiUrl, { params });
    const postData: InstagramAPIResponse = response.data;

    // Extract text content from API response
    let extractedText = "";
    let commentType: "pinned" | "regular" | "caption" | "unknown" = "unknown";

    // Extract caption
    if (postData.caption?.text) {
      extractedText += postData.caption.text + "\n";
      commentType = "caption";
    }

    // Extract comments (API doesn't distinguish pinned comments, so we'll analyze them)
    if (postData.comments?.data) {
      const comments = postData.comments.data;
      // Look for comments that might contain recipes (longer comments with recipe keywords)
      const recipeComments = comments.filter(
        (comment) =>
          comment.text.length > 50 &&
          (comment.text.toLowerCase().includes("ingredient") ||
            comment.text.toLowerCase().includes("recipe") ||
            comment.text.toLowerCase().includes("cup") ||
            comment.text.toLowerCase().includes("tbsp") ||
            comment.text.toLowerCase().includes("tsp"))
      );

      if (recipeComments.length > 0) {
        // Use the longest comment as it's most likely to contain a full recipe
        const bestComment = recipeComments.reduce((longest, current) =>
          current.text.length > longest.text.length ? current : longest
        );
        extractedText += bestComment.text + "\n";
        commentType = "regular"; // API doesn't provide pinned status
      }
    }

    if (!extractedText.trim()) {
      throw new Error("No recipe content found in Instagram post");
    }

    // Analyze the extracted text
    const analysis = this.analyzeInstagramText(extractedText);

    // Extract recipe from the text
    const extractedRecipe = this.extractRecipeFromInstagramText(
      extractedText,
      analysis
    );

    // Calculate recipe confidence
    const recipeConfidence = this.calculateRecipeConfidence(extractedRecipe);

    return {
      text: extractedText,
      confidence: 0.9, // Higher confidence for API data
      processingTime: 0, // Will be set by caller
      isComment: analysis.isComment,
      commentType: commentType,
      recipeConfidence,
      extractedRecipe,
      metadata: analysis.metadata,
    };
  }

  /**
   * Extract recipe from Instagram post using web scraping (original method)
   */
  static async extractRecipeFromInstagramScraping(
    instagramUrl: string
  ): Promise<Omit<InstagramOCRResult, "source">> {
    // Fetch Instagram post content
    const response = await axios.get(instagramUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    const html = response.data;
    const $ = cheerio.load(html);

    // Extract text content from Instagram post
    // Focus on pinned comments and captions
    let extractedText = "";
    // Look for pinned comments first (most likely to contain recipes)
    $('[data-testid="comment"], ._a9zr, ._a9zs').each((index, element) => {
      const commentText = $(element).text().trim();
      if (
        commentText.includes("📌") ||
        commentText.includes("PINNED") ||
        $(element).find('[data-testid="pin-icon"]').length > 0
      ) {
        extractedText += commentText + "\n";
      }
    });
    // If no pinned comments found, look for captions
    if (!extractedText.trim()) {
      $('[data-testid="post-caption"], ._a9zs, ._a9zr').each(
        (index, element) => {
          const captionText = $(element).text().trim();
          if (captionText) {
            extractedText += captionText + "\n";
          }
        }
      );
    }
    // If still no content, try general comment extraction
    if (!extractedText.trim()) {
      $("span, p, div").each((index, element) => {
        const text = $(element).text().trim();
        if (
          (text.length > 20 && text.includes("ingredient")) ||
          text.includes("recipe") ||
          text.includes("cup") ||
          text.includes("tbsp") ||
          text.includes("tsp")
        ) {
          extractedText += text + "\n";
        }
      });
    }

    if (!extractedText.trim()) {
      throw new Error("No recipe content found in Instagram post");
    }

    // Analyze the extracted text for Instagram-specific patterns
    const analysis = this.analyzeInstagramText(extractedText);
    // Extract recipe from the most likely comment section
    const extractedRecipe = this.extractRecipeFromInstagramText(
      extractedText,
      analysis
    );
    // Calculate recipe confidence
    const recipeConfidence = this.calculateRecipeConfidence(extractedRecipe);

    return {
      text: extractedText,
      confidence: 0.8, // Default confidence for web scraping
      processingTime: 0, // Will be set by caller
      isComment: analysis.isComment,
      commentType: analysis.commentType,
      recipeConfidence,
      extractedRecipe,
      metadata: analysis.metadata,
    };
  }

  /**
   * Extract media ID from Instagram URL
   */
  private static extractMediaIdFromUrl(instagramUrl: string): string | null {
    // Handle different Instagram URL formats
    const patterns = [
      /instagram\.com\/p\/([^\/\?]+)/, // Standard post URL
      /instagram\.com\/reel\/([^\/\?]+)/, // Reel URL
      /instagram\.com\/tv\/([^\/\?]+)/, // IGTV URL
    ];

    for (const pattern of patterns) {
      const match = instagramUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
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
   * Get OCR worker status (now just a stub for compatibility)
   */
  static getStatus(): { isInitialized: boolean; workerExists: boolean } {
    return {
      isInitialized: true,
      workerExists: false,
    };
  }
}

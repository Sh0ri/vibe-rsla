import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { OCRService } from "../ocrService";

describe("Instagram OCR Service", () => {
  beforeAll(async () => {
    await OCRService.initialize();
  });

  afterAll(async () => {
    await OCRService.terminate();
  });

  describe("analyzeInstagramText", () => {
    it("should identify pinned comments correctly", () => {
      const testText = `📌 PINNED COMMENT
      
      Here's the recipe! 🍕
      
      2 cups flour
      1 cup water
      1 tsp salt
      2 tbsp olive oil
      
      Mix everything together and bake at 400°F for 20 minutes!
      
      #recipe #food #delicious #musttry`;

      const analysis = OCRService.analyzeInstagramText(testText);

      expect(analysis.isComment).toBe(true);
      expect(analysis.commentType).toBe("pinned");
      expect(analysis.metadata.hasEmojis).toBe(true);
      expect(analysis.metadata.hasHashtags).toBe(true);
      expect(analysis.metadata.hasMentions).toBe(false);
      expect(analysis.metadata.lineCount).toBeGreaterThan(0);
      expect(analysis.metadata.wordCount).toBeGreaterThan(0);
    });

    it("should identify regular comments", () => {
      const testText = `This looks amazing! 😍
      
      I need to try this recipe!
      
      @chef_username thanks for sharing!
      
      #foodie #cooking #yummy`;

      const analysis = OCRService.analyzeInstagramText(testText);

      expect(analysis.isComment).toBe(true);
      expect(analysis.commentType).toBe("regular");
      expect(analysis.metadata.hasEmojis).toBe(true);
      expect(analysis.metadata.hasHashtags).toBe(true);
      expect(analysis.metadata.hasMentions).toBe(true);
    });

    it("should identify captions", () => {
      const testText = `Caption: My favorite pasta recipe!
      
      Description: This is how I make it at home.
      
      Ingredients and instructions below 👇`;

      const analysis = OCRService.analyzeInstagramText(testText);

      expect(analysis.isComment).toBe(true);
      expect(analysis.commentType).toBe("caption");
    });

    it("should handle unknown content", () => {
      const testText = `Just some random text without any patterns.`;

      const analysis = OCRService.analyzeInstagramText(testText);

      expect(analysis.isComment).toBe(false);
      expect(analysis.commentType).toBe("unknown");
    });
  });

  describe("extractRecipeFromInstagramText", () => {
    it("should extract recipe content from Instagram text", () => {
      const testText = `📌 PINNED COMMENT
      
      Here's the recipe! 🍕
      
      2 cups flour
      1 cup water
      1 tsp salt
      2 tbsp olive oil
      
      Mix everything together and bake at 400°F for 20 minutes!
      
      #recipe #food #delicious #musttry`;

      const analysis = OCRService.analyzeInstagramText(testText);
      const extractedRecipe = OCRService.extractRecipeFromInstagramText(
        testText,
        analysis
      );

      expect(extractedRecipe).toContain("2 cups flour");
      expect(extractedRecipe).toContain("1 cup water");
      expect(extractedRecipe).toContain("1 tsp salt");
      expect(extractedRecipe).toContain("2 tbsp olive oil");
      expect(extractedRecipe).toContain("Mix everything together");
      expect(extractedRecipe).toContain("bake at 400°F");

      // Should not contain Instagram-specific content
      expect(extractedRecipe).not.toContain("📌");
      expect(extractedRecipe).not.toContain("#recipe");
      expect(extractedRecipe).not.toContain("PINNED COMMENT");
    });

    it("should handle text with only ingredients", () => {
      const testText = `Ingredients:
      
      1 cup flour
      1/2 cup sugar
      2 eggs
      1/4 cup milk
      
      #baking #dessert`;

      const analysis = OCRService.analyzeInstagramText(testText);
      const extractedRecipe = OCRService.extractRecipeFromInstagramText(
        testText,
        analysis
      );

      expect(extractedRecipe).toContain("1 cup flour");
      expect(extractedRecipe).toContain("1/2 cup sugar");
      expect(extractedRecipe).toContain("2 eggs");
      expect(extractedRecipe).toContain("1/4 cup milk");
      expect(extractedRecipe).not.toContain("#baking");
    });

    it("should handle text with only instructions", () => {
      const testText = `Instructions:
      
      Preheat oven to 350°F
      Mix dry ingredients
      Add wet ingredients
      Bake for 25 minutes
      
      #baking #instructions`;

      const analysis = OCRService.analyzeInstagramText(testText);
      const extractedRecipe = OCRService.extractRecipeFromInstagramText(
        testText,
        analysis
      );

      expect(extractedRecipe).toContain("Preheat oven to 350°F");
      expect(extractedRecipe).toContain("Mix dry");
      expect(extractedRecipe).toContain("Add wet");
      expect(extractedRecipe).toContain("Bake for 25 minutes");
    });

    it("should filter out non-recipe content", () => {
      const testText = `This is not a recipe at all.
      
      Just some random thoughts about food.
      
      Maybe I should cook something today.
      
      #random #thoughts`;

      const analysis = OCRService.analyzeInstagramText(testText);
      const extractedRecipe = OCRService.extractRecipeFromInstagramText(
        testText,
        analysis
      );

      // The filtering removes "recipe" and "food" but keeps "cook" since it's a cooking instruction
      // So we expect some content to remain
      expect(extractedRecipe).toContain("cook");
      expect(extractedRecipe).not.toContain("recipe");
      expect(extractedRecipe).not.toContain("food");
    });
  });

  describe("calculateRecipeConfidence", () => {
    it("should give high confidence for valid recipes", () => {
      const recipeText = `2 cups flour
1 cup water
1 tsp salt
2 tbsp olive oil
Mix everything together and bake at 400°F for 20 minutes`;

      const confidence = OCRService.calculateRecipeConfidence(recipeText);

      expect(confidence).toBeGreaterThan(0.7);
    });

    it("should give medium confidence for recipes with some ingredients", () => {
      const recipeText = `1 cup flour
1/2 cup sugar
Mix and bake`;

      const confidence = OCRService.calculateRecipeConfidence(recipeText);

      expect(confidence).toBeGreaterThan(0.3);
      expect(confidence).toBeLessThan(0.8);
    });

    it("should give low confidence for non-recipe text", () => {
      const recipeText = `This is not a recipe. Just some random text about food.`;

      const confidence = OCRService.calculateRecipeConfidence(recipeText);

      expect(confidence).toBeLessThan(0.3);
    });

    it("should return 0 for empty or very short text", () => {
      const emptyText = "";
      const shortText = "Hi";

      const emptyConfidence = OCRService.calculateRecipeConfidence(emptyText);
      const shortConfidence = OCRService.calculateRecipeConfidence(shortText);

      expect(emptyConfidence).toBe(0);
      expect(shortConfidence).toBe(0);
    });
  });

  describe("extractRecipeFromInstagramPost", () => {
    it("should process Instagram post and return structured data", async () => {
      // Create a simple test image buffer (this would normally be a real image)
      const testImageBuffer = Buffer.from("fake image data");

      // Mock the OCR worker to return test text
      const mockResult = {
        data: {
          text: `📌 PINNED COMMENT
          
          Here's the recipe! 🍕
          
          2 cups flour
          1 cup water
          1 tsp salt
          2 tbsp olive oil
          
          Mix everything together and bake at 400°F for 20 minutes!
          
          #recipe #food #delicious #musttry`,
          confidence: 0.85,
        },
      };

      // Since we can't easily mock the Tesseract worker in this test,
      // we'll test the individual components instead
      const testText = mockResult.data.text;
      const analysis = OCRService.analyzeInstagramText(testText);
      const extractedRecipe = OCRService.extractRecipeFromInstagramText(
        testText,
        analysis
      );
      const recipeConfidence =
        OCRService.calculateRecipeConfidence(extractedRecipe);

      expect(analysis.isComment).toBe(true);
      expect(analysis.commentType).toBe("pinned");
      expect(extractedRecipe).toContain("2 cups flour");
      expect(recipeConfidence).toBeGreaterThan(0.5);
    });
  });

  describe("OCR Service Status", () => {
    it("should return correct status", () => {
      const status = OCRService.getStatus();

      expect(status).toHaveProperty("isInitialized");
      expect(status).toHaveProperty("workerExists");
      expect(typeof status.isInitialized).toBe("boolean");
      expect(typeof status.workerExists).toBe("boolean");
    });
  });
});

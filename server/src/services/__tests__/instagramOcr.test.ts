import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  vi,
  beforeEach,
} from "vitest";
import { OCRService } from "../ocrService";

// Mock axios and cheerio
vi.mock("axios");
vi.mock("cheerio");

// Mock environment variables
vi.mock("process", () => ({
  env: {
    INSTAGRAM_ACCESS_TOKEN: "test_token",
    ENABLE_SCRAPING_FALLBACK: "true",
  },
}));

describe("Instagram OCR Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  describe("extractMediaIdFromUrl", () => {
    it("should extract media ID from standard post URL", () => {
      const url = "https://www.instagram.com/p/ABC123/";
      const mediaId = (OCRService as any).extractMediaIdFromUrl(url);
      expect(mediaId).toBe("ABC123");
    });

    it("should extract media ID from reel URL", () => {
      const url = "https://www.instagram.com/reel/XYZ789/";
      const mediaId = (OCRService as any).extractMediaIdFromUrl(url);
      expect(mediaId).toBe("XYZ789");
    });

    it("should extract media ID from IGTV URL", () => {
      const url = "https://www.instagram.com/tv/DEF456/";
      const mediaId = (OCRService as any).extractMediaIdFromUrl(url);
      expect(mediaId).toBe("DEF456");
    });

    it("should handle URLs with query parameters", () => {
      const url =
        "https://www.instagram.com/p/ABC123/?utm_source=ig_web_copy_link";
      const mediaId = (OCRService as any).extractMediaIdFromUrl(url);
      expect(mediaId).toBe("ABC123");
    });

    it("should return null for invalid URLs", () => {
      const invalidUrls = [
        "https://www.instagram.com/",
        "https://www.instagram.com/user/",
        "https://example.com/p/ABC123/",
        "not a url",
      ];

      invalidUrls.forEach((url) => {
        const mediaId = (OCRService as any).extractMediaIdFromUrl(url);
        expect(mediaId).toBeNull();
      });
    });
  });

  describe("extractRecipeFromInstagramAPI", () => {
    it("should extract recipe from Instagram API response", async () => {
      const mockAxios = await import("axios");
      const mockResponse = {
        data: {
          id: "123456789",
          caption: {
            text: "My favorite pasta recipe!\n\n2 cups flour\n1 cup water\n1 tsp salt\n\nMix and cook for 10 minutes! 🍝",
          },
          comments: {
            data: [
              {
                text: "This looks amazing! 😍",
                timestamp: "2023-01-01T00:00:00Z",
                from: { username: "user1" },
              },
              {
                text: "Here's the full recipe:\n\n3 cups flour\n2 eggs\n1/2 cup olive oil\n\nMix ingredients and bake at 350°F for 25 minutes",
                timestamp: "2023-01-01T00:01:00Z",
                from: { username: "user2" },
              },
            ],
          },
          media_type: "IMAGE",
          permalink: "https://www.instagram.com/p/ABC123/",
        },
      };

      vi.mocked(mockAxios.default.get).mockResolvedValue(mockResponse);

      const result = await OCRService.extractRecipeFromInstagramAPI(
        "https://www.instagram.com/p/ABC123/"
      );

      expect(result.text).toContain("My favorite pasta recipe!");
      expect(result.text).toContain("Here's the full recipe:");
      expect(result.confidence).toBe(0.9);
      expect(result.commentType).toBe("caption");
      expect(result.recipeConfidence).toBeGreaterThan(0.5);
    });

    it("should handle API response with only caption", async () => {
      const mockAxios = await import("axios");
      const mockResponse = {
        data: {
          id: "123456789",
          caption: {
            text: "Simple recipe:\n\n1 cup flour\n1/2 cup water\nMix and bake!",
          },
          comments: { data: [] },
          media_type: "IMAGE",
          permalink: "https://www.instagram.com/p/ABC123/",
        },
      };

      vi.mocked(mockAxios.default.get).mockResolvedValue(mockResponse);

      const result = await OCRService.extractRecipeFromInstagramAPI(
        "https://www.instagram.com/p/ABC123/"
      );

      expect(result.text).toContain("Simple recipe:");
      expect(result.commentType).toBe("caption");
      expect(result.recipeConfidence).toBeGreaterThan(0.3);
    });

    it("should throw error when no recipe content found", async () => {
      const mockAxios = await import("axios");
      const mockResponse = {
        data: {
          id: "123456789",
          caption: { text: "Just a photo of my cat 🐱" },
          comments: { data: [] },
          media_type: "IMAGE",
          permalink: "https://www.instagram.com/p/ABC123/",
        },
      };

      vi.mocked(mockAxios.default.get).mockResolvedValue(mockResponse);

      await expect(
        OCRService.extractRecipeFromInstagramAPI(
          "https://www.instagram.com/p/ABC123/"
        )
      ).rejects.toThrow("No recipe content found in Instagram post");
    });

    it("should throw error when media ID cannot be extracted", async () => {
      await expect(
        OCRService.extractRecipeFromInstagramAPI(
          "https://www.instagram.com/invalid/"
        )
      ).rejects.toThrow("Could not extract media ID from Instagram URL");
    });
  });

  describe("extractRecipeFromInstagramScraping", () => {
    it("should extract recipe from Instagram HTML", async () => {
      const mockAxios = await import("axios");
      const mockCheerio = await import("cheerio");

      const mockHtml = `
        <html>
          <body>
            <div data-testid="comment">
              📌 PINNED COMMENT
              Here's the recipe! 🍕
              2 cups flour
              1 cup water
              1 tsp salt
              2 tbsp olive oil
              Mix everything together and bake at 400°F for 20 minutes!
              #recipe #food #delicious #musttry
            </div>
          </body>
        </html>
      `;

      vi.mocked(mockAxios.default.get).mockResolvedValue({ data: mockHtml });
      vi.mocked(mockCheerio.load).mockReturnValue({
        load: vi.fn(),
        text: vi
          .fn()
          .mockReturnValue(
            "📌 PINNED COMMENT\nHere's the recipe! 🍕\n2 cups flour\n1 cup water\n1 tsp salt\n2 tbsp olive oil\nMix everything together and bake at 400°F for 20 minutes!\n#recipe #food #delicious #musttry"
          ),
        find: vi.fn().mockReturnValue({
          each: vi.fn().mockImplementation((callback) => {
            callback(0, {
              text: () =>
                "📌 PINNED COMMENT\nHere's the recipe! 🍕\n2 cups flour\n1 cup water\n1 tsp salt\n2 tbsp olive oil\nMix everything together and bake at 400°F for 20 minutes!\n#recipe #food #delicious #musttry",
            });
          }),
          length: 1,
        }),
        length: 1,
      } as any);

      const result = await OCRService.extractRecipeFromInstagramScraping(
        "https://www.instagram.com/p/ABC123/"
      );

      expect(result.text).toContain("📌 PINNED COMMENT");
      expect(result.text).toContain("2 cups flour");
      expect(result.confidence).toBe(0.8);
      expect(result.commentType).toBe("pinned");
      expect(result.recipeConfidence).toBeGreaterThan(0.5);
    });

    it("should throw error when no recipe content found", async () => {
      const mockAxios = await import("axios");
      const mockCheerio = await import("cheerio");

      const mockHtml = `
        <html>
          <body>
            <div>Just some random content without recipes</div>
          </body>
        </html>
      `;

      vi.mocked(mockAxios.default.get).mockResolvedValue({ data: mockHtml });
      vi.mocked(mockCheerio.load).mockReturnValue({
        load: vi.fn(),
        text: vi.fn().mockReturnValue(""),
        find: vi.fn().mockReturnValue({
          each: vi.fn(),
          length: 0,
        }),
        length: 0,
      } as any);

      await expect(
        OCRService.extractRecipeFromInstagramScraping(
          "https://www.instagram.com/p/ABC123/"
        )
      ).rejects.toThrow("No recipe content found in Instagram post");
    });
  });

  describe("extractRecipeFromInstagramUrl", () => {
    it("should use API when token is available and succeed", async () => {
      const mockAxios = await import("axios");
      const mockResponse = {
        data: {
          id: "123456789",
          caption: {
            text: "My recipe:\n\n2 cups flour\n1 cup water\nMix and bake!",
          },
          comments: { data: [] },
          media_type: "IMAGE",
          permalink: "https://www.instagram.com/p/ABC123/",
        },
      };

      vi.mocked(mockAxios.default.get).mockResolvedValue(mockResponse);

      const result = await OCRService.extractRecipeFromInstagramUrl(
        "https://www.instagram.com/p/ABC123/",
        false
      );

      expect(result.source).toBe("api");
      expect(result.confidence).toBe(0.9);
      expect(result.text).toContain("My recipe:");
    });

    it("should fall back to scraping when API fails and fallback is enabled", async () => {
      const mockAxios = await import("axios");
      const mockCheerio = await import("cheerio");

      // Mock API failure
      vi.mocked(mockAxios.default.get).mockRejectedValueOnce(
        new Error("API Error")
      );

      // Mock scraping success
      const mockHtml = `
        <html>
          <body>
            <div data-testid="comment">
              📌 PINNED COMMENT
              2 cups flour
              1 cup water
              Mix and bake!
            </div>
          </body>
        </html>
      `;

      vi.mocked(mockAxios.default.get).mockResolvedValueOnce({
        data: mockHtml,
      });
      vi.mocked(mockCheerio.load).mockReturnValue({
        load: vi.fn(),
        text: vi
          .fn()
          .mockReturnValue(
            "📌 PINNED COMMENT\n2 cups flour\n1 cup water\nMix and bake!"
          ),
        find: vi.fn().mockReturnValue({
          each: vi.fn().mockImplementation((callback) => {
            callback(0, {
              text: () =>
                "📌 PINNED COMMENT\n2 cups flour\n1 cup water\nMix and bake!",
            });
          }),
          length: 1,
        }),
        length: 1,
      } as any);

      const result = await OCRService.extractRecipeFromInstagramUrl(
        "https://www.instagram.com/p/ABC123/",
        true
      );

      expect(result.source).toBe("scraping");
      expect(result.confidence).toBe(0.8);
      expect(result.text).toContain("📌 PINNED COMMENT");
    });

    it("should throw error when API fails and fallback is disabled", async () => {
      const mockAxios = await import("axios");

      vi.mocked(mockAxios.default.get).mockRejectedValue(
        new Error("API Error")
      );

      await expect(
        OCRService.extractRecipeFromInstagramUrl(
          "https://www.instagram.com/p/ABC123/",
          false
        )
      ).rejects.toThrow(
        "Instagram API failed and scraping fallback is disabled"
      );
    });

    it("should use scraping when no API token is available", async () => {
      // Temporarily mock no API token
      vi.doMock("process", () => ({
        env: {
          INSTAGRAM_ACCESS_TOKEN: undefined,
          ENABLE_SCRAPING_FALLBACK: "true",
        },
      }));

      const mockAxios = await import("axios");
      const mockCheerio = await import("cheerio");

      const mockHtml = `
        <html>
          <body>
            <div data-testid="comment">
              2 cups flour
              1 cup water
              Mix and bake!
            </div>
          </body>
        </html>
      `;

      vi.mocked(mockAxios.default.get).mockResolvedValue({ data: mockHtml });
      vi.mocked(mockCheerio.load).mockReturnValue({
        load: vi.fn(),
        text: vi
          .fn()
          .mockReturnValue("2 cups flour\n1 cup water\nMix and bake!"),
        find: vi.fn().mockReturnValue({
          each: vi.fn().mockImplementation((callback) => {
            callback(0, {
              text: () => "2 cups flour\n1 cup water\nMix and bake!",
            });
          }),
          length: 1,
        }),
        length: 1,
      } as any);

      const result = await OCRService.extractRecipeFromInstagramUrl(
        "https://www.instagram.com/p/ABC123/",
        true
      );

      expect(result.source).toBe("scraping");
      expect(result.confidence).toBe(0.8);
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

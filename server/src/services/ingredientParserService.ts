import OpenAI from "openai";
import { z } from "zod";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema for ingredient parsing response
const IngredientSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

const ParsedIngredientsSchema = z.object({
  ingredients: z.array(IngredientSchema),
  totalIngredients: z.number(),
});

export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  notes?: string;
}

export interface ParsedIngredients {
  ingredients: ParsedIngredient[];
  totalIngredients: number;
}

export class IngredientParserService {
  private static readonly SYSTEM_PROMPT = `You are an expert recipe ingredient parser. Your job is to extract ingredients from recipe text and return them in a structured format.

Rules:
1. Extract only ingredients, not cooking instructions
2. Normalize ingredient names (e.g., "aubergine" → "eggplant", "courgette" → "zucchini")
3. Convert all quantities to numbers
4. Standardize units (e.g., "tbsp" → "tablespoon", "tsp" → "teaspoon")
5. Categorize ingredients when possible (produce, dairy, meat, pantry, etc.)
6. Handle fractions and mixed numbers (e.g., "1 1/2" → 1.5)
7. Handle ranges (e.g., "1-2" → use average 1.5)
8. Handle "to taste" or "as needed" as quantity 0 with notes

Common unit conversions:
- tbsp, tablespoon, T → tablespoon
- tsp, teaspoon, t → teaspoon
- cup, cups → cup
- oz, ounce, ounces → ounce
- lb, pound, pounds → pound
- g, gram, grams → gram
- kg, kilogram, kilograms → kilogram
- ml, milliliter, milliliters → milliliter
- l, liter, liters → liter
- clove, cloves → clove
- pinch, dashes → pinch

Return a JSON object with this exact structure:
{
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": number,
      "unit": "unit name (optional)",
      "category": "category (optional)",
      "notes": "additional notes (optional)"
    }
  ],
  "totalIngredients": number
}`;

  private static readonly USER_PROMPT_TEMPLATE = `Parse the following recipe and extract all ingredients:

{recipeText}

Return only the JSON response, no additional text.`;

  /**
   * Parse ingredients from recipe text using OpenAI API
   */
  static async parseIngredients(
    recipeText: string
  ): Promise<ParsedIngredients> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key not configured");
      }

      const userPrompt = this.USER_PROMPT_TEMPLATE.replace(
        "{recipeText}",
        recipeText
      );

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: this.SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1, // Low temperature for consistent parsing
        max_tokens: 2000,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("No response from OpenAI API");
      }

      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid JSON response from OpenAI API");
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      const validatedData = ParsedIngredientsSchema.parse(parsedData);

      return validatedData;
    } catch (error) {
      console.error("Error parsing ingredients:", error);
      throw new Error(
        `Failed to parse ingredients: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Normalize ingredient names for better matching
   */
  static normalizeIngredientName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/[^\w\s]/g, ""); // Remove special characters except spaces
  }

  /**
   * Get ingredient synonyms for better product matching
   */
  static getIngredientSynonyms(name: string): string[] {
    const synonyms: Record<string, string[]> = {
      eggplant: ["aubergine", "brinjal"],
      zucchini: ["courgette"],
      "bell pepper": ["capsicum", "sweet pepper"],
      cilantro: ["coriander", "fresh coriander"],
      scallion: ["green onion", "spring onion"],
      arugula: ["rocket", "rucola"],
      beetroot: ["beet"],
      courgette: ["zucchini"],
      aubergine: ["eggplant", "brinjal"],
      capsicum: ["bell pepper", "sweet pepper"],
      coriander: ["cilantro"],
      rocket: ["arugula", "rucola"],
      beet: ["beetroot"],
    };

    const normalizedName = this.normalizeIngredientName(name);
    return synonyms[normalizedName] || [];
  }

  /**
   * Categorize ingredients for better organization
   */
  static categorizeIngredient(name: string): string {
    const normalizedName = this.normalizeIngredientName(name);

    const categories: Record<string, string[]> = {
      produce: [
        "tomato",
        "onion",
        "garlic",
        "carrot",
        "potato",
        "lettuce",
        "spinach",
        "kale",
        "cucumber",
        "pepper",
        "mushroom",
        "broccoli",
        "cauliflower",
        "zucchini",
        "eggplant",
        "bell pepper",
        "scallion",
        "arugula",
        "beetroot",
        "courgette",
        "aubergine",
        "capsicum",
        "coriander",
        "rocket",
        "beet",
      ],
      dairy: [
        "milk",
        "cheese",
        "yogurt",
        "cream",
        "butter",
        "sour cream",
        "heavy cream",
        "half and half",
      ],
      meat: [
        "chicken",
        "beef",
        "pork",
        "lamb",
        "turkey",
        "fish",
        "salmon",
        "tuna",
        "shrimp",
        "bacon",
        "sausage",
      ],
      pantry: [
        "flour",
        "sugar",
        "salt",
        "pepper",
        "oil",
        "vinegar",
        "soy sauce",
        "honey",
        "maple syrup",
        "vanilla",
        "cinnamon",
        "nutmeg",
        "oregano",
        "basil",
        "thyme",
        "rosemary",
      ],
      grains: [
        "rice",
        "pasta",
        "bread",
        "quinoa",
        "couscous",
        "oats",
        "barley",
      ],
      nuts: ["almond", "walnut", "pecan", "cashew", "peanut", "pistachio"],
      fruits: [
        "apple",
        "banana",
        "orange",
        "lemon",
        "lime",
        "strawberry",
        "blueberry",
        "raspberry",
      ],
    };

    for (const [category, items] of Object.entries(categories)) {
      if (items.some((item) => normalizedName.includes(item))) {
        return category;
      }
    }

    return "other";
  }
}

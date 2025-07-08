import express from "express";
import multer from "multer";
import { body, validationResult } from "express-validator";
import { OCRService } from "../services/ocrService";
import { IngredientParserService } from "../services/ingredientParserService";
import path from "path";
import fs from "fs";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || "./uploads";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760"), // 10MB default
  },
});

// Validation middleware
const validateImageUrl = [
  body("imageUrl").isURL().withMessage("Valid image URL is required"),
];

/**
 * POST /api/ocr/extract
 * Extract text from uploaded image
 */
router.post("/extract", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    // Extract text from image
    const ocrResult = await OCRService.extractText(
      req.file.buffer || fs.readFileSync(req.file.path)
    );

    // Clean the extracted text
    const cleanedText = OCRService.cleanRecipeText(ocrResult.text);

    // Validate if the text looks like a recipe
    const validation = OCRService.validateRecipeText(cleanedText);

    res.json({
      success: true,
      data: {
        originalText: ocrResult.text,
        cleanedText,
        confidence: ocrResult.confidence,
        processingTime: ocrResult.processingTime,
        validation,
        fileInfo: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ocr/extract-url
 * Extract text from image URL
 */
router.post("/extract-url", validateImageUrl, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { imageUrl } = req.body;

    // Extract text from image URL
    const ocrResult = await OCRService.extractTextFromUrl(imageUrl);

    // Clean the extracted text
    const cleanedText = OCRService.cleanRecipeText(ocrResult.text);

    // Validate if the text looks like a recipe
    const validation = OCRService.validateRecipeText(cleanedText);

    res.json({
      success: true,
      data: {
        originalText: ocrResult.text,
        cleanedText,
        confidence: ocrResult.confidence,
        processingTime: ocrResult.processingTime,
        validation,
        imageUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ocr/parse-recipe
 * Extract text from image and parse ingredients
 */
router.post("/parse-recipe", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    // Extract text from image
    const ocrResult = await OCRService.extractText(
      req.file.buffer || fs.readFileSync(req.file.path)
    );

    // Clean the extracted text
    const cleanedText = OCRService.cleanRecipeText(ocrResult.text);

    // Validate if the text looks like a recipe
    const validation = OCRService.validateRecipeText(cleanedText);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Extracted text does not appear to be a recipe",
        data: {
          originalText: ocrResult.text,
          cleanedText,
          validation,
        },
      });
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

    res.json({
      success: true,
      data: {
        originalText: ocrResult.text,
        cleanedText,
        confidence: ocrResult.confidence,
        processingTime: ocrResult.processingTime,
        validation,
        ingredients: enhancedIngredients,
        totalIngredients: enhancedIngredients.length,
        fileInfo: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ocr/parse-recipe-url
 * Extract text from image URL and parse ingredients
 */
router.post("/parse-recipe-url", validateImageUrl, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { imageUrl } = req.body;

    // Extract text from image URL
    const ocrResult = await OCRService.extractTextFromUrl(imageUrl);

    // Clean the extracted text
    const cleanedText = OCRService.cleanRecipeText(ocrResult.text);

    // Validate if the text looks like a recipe
    const validation = OCRService.validateRecipeText(cleanedText);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Extracted text does not appear to be a recipe",
        data: {
          originalText: ocrResult.text,
          cleanedText,
          validation,
        },
      });
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

    res.json({
      success: true,
      data: {
        originalText: ocrResult.text,
        cleanedText,
        confidence: ocrResult.confidence,
        processingTime: ocrResult.processingTime,
        validation,
        ingredients: enhancedIngredients,
        totalIngredients: enhancedIngredients.length,
        imageUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ocr/status
 * Get OCR service status
 */
router.get("/status", (req, res) => {
  const status = OCRService.getStatus();

  res.json({
    success: true,
    data: {
      status,
      message: status.isInitialized
        ? "OCR service is ready"
        : "OCR service is not initialized",
    },
  });
});

export default router;

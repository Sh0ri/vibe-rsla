import express, { Request, Response, NextFunction } from "express";
import multer from "multer";
import { body, validationResult } from "express-validator";
import { OCRController } from "../controllers/ocrController";
import path from "path";
import fs from "fs";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env["UPLOAD_PATH"] || "./uploads";
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
    fileSize: parseInt(process.env["MAX_FILE_SIZE"] || "10485760"), // 10MB default
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
router.post(
  "/extract",
  upload.single("image"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No image file provided",
        });
      }

      const result = await OCRController.extractText(
        req.file.buffer,
        req.file.path,
        req.file.originalname,
        req.file.size,
        req.file.mimetype
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ocr/extract-url
 * Extract text from image URL
 */
router.post(
  "/extract-url",
  validateImageUrl,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { imageUrl } = req.body;
      const result = await OCRController.extractTextFromUrl(imageUrl);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ocr/parse-recipe
 * Extract text from image and parse ingredients
 */
router.post(
  "/parse-recipe",
  upload.single("image"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No image file provided",
        });
      }

      const result = await OCRController.parseRecipeFromImage(
        req.file.buffer,
        req.file.path,
        req.file.originalname,
        req.file.size,
        req.file.mimetype
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Extracted text does not appear to be a recipe"
      ) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }
      next(error);
    }
  }
);

/**
 * POST /api/ocr/parse-recipe-url
 * Extract text from image URL and parse ingredients
 */
router.post(
  "/parse-recipe-url",
  validateImageUrl,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      // This route would need a different controller method for URL-based parsing
      // For now, we'll return an error indicating this feature needs to be implemented
      res.status(501).json({
        success: false,
        error: "URL-based recipe parsing not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ocr/instagram-recipe
 * Extract recipe from Instagram food post (focused on pinned comments)
 */
router.post(
  "/instagram-recipe",
  upload.single("image"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No image file provided",
        });
      }

      const result = await OCRController.extractRecipeFromInstagramPost(
        req.file.buffer,
        req.file.path,
        req.file.originalname,
        req.file.size,
        req.file.mimetype
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/ocr/status
 * Get OCR service status
 */
router.get("/status", (req: Request, res: Response) => {
  // This route doesn't need a controller method since it's simple
  res.json({
    success: true,
    data: {
      status: { isInitialized: true },
      message: "OCR service is ready",
    },
  });
});

export default router;

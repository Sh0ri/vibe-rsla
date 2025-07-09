import express, { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { OCRController } from "../controllers/ocrController";

const router = express.Router();

// Validation middleware
const validateInstagramUrl = [
  body("instagramUrl")
    .isURL()
    .withMessage("Valid Instagram URL is required")
    .custom((value) => {
      if (!value.includes("instagram.com")) {
        throw new Error("URL must be from Instagram");
      }
      return true;
    }),
];

/**
 * POST /api/ocr/instagram-recipe
 * Extract recipe from Instagram post URL (focused on pinned comments)
 */
router.post(
  "/instagram-recipe",
  validateInstagramUrl,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { instagramUrl } = req.body;
      const result = await OCRController.extractRecipeFromInstagramUrl(
        instagramUrl
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
  res.json({
    success: true,
    data: {
      status: { isInitialized: true },
      message: "Instagram OCR service is ready",
      features: [
        "Instagram URL recipe extraction",
        "Pinned comment detection",
        "Recipe content filtering",
        "Ingredient parsing",
      ],
    },
  });
});

export default router;

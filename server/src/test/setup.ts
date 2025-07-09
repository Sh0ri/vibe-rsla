import { config } from "dotenv";
import { resolve } from "path";
import { beforeAll, afterAll, vi } from "vitest";

// Load environment variables from .env file
config({ path: resolve(__dirname, "../../.env") });

// Set up test environment variables if not already set
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.TESSERACT_LANG = process.env.TESSERACT_LANG || "eng";
process.env.UPLOAD_PATH = process.env.UPLOAD_PATH || "./test-uploads";
process.env.MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || "10485760";

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  if (process.env.VITEST_VERBOSE !== "true") {
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// backend/routes/notifyRoutes.js
import express from "express";
import { createRequire } from "module";

const router = express.Router();
const require = createRequire(import.meta.url);

// Load controller (prefer CJS, then fallback to ESM)
let mod;
try {
  mod = require("../controllers/notifyController.cjs");
} catch {
  try {
    mod = require("../controllers/notifyController.js");
  } catch {
    mod = await import("../controllers/notifyController.js");
  }
}

const sendEmailHandler =
  mod?.sendEmailHandler || mod?.default?.sendEmailHandler;

if (typeof sendEmailHandler !== "function") {
  throw new Error(
    "sendEmailHandler not found in ../controllers/notifyController.{cjs,js}"
  );
}

// Async safety wrapper
const asyncHandler =
  (fn) =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// POST /layout-be/api/notify/email
router.post("/email", asyncHandler(sendEmailHandler));

export default router;

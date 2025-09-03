// backend/routes/deliveryRoutes.js
import express from "express";
import { createRequire } from "module";

const router = express.Router();
const require = createRequire(import.meta.url);

let mod;
try {
  mod = require("../controllers/deliveryController.cjs");
} catch {
  try { mod = require("../controllers/deliveryController.js"); }
  catch { mod = await import("../controllers/deliveryController.js"); }
}

const deliverApiHandler = mod?.deliverApiHandler || mod?.default?.deliverApiHandler;
const deliverFtpHandler = mod?.deliverFtpHandler || mod?.default?.deliverFtpHandler;

if (typeof deliverApiHandler !== "function" || typeof deliverFtpHandler !== "function") {
  throw new Error("deliveryController missing handlers deliverApiHandler/deliverFtpHandler");
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post("/api", asyncHandler(deliverApiHandler));
router.post("/ftp", asyncHandler(deliverFtpHandler));

export default router;
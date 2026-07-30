import { Router, type RequestHandler } from "express";
import type { AuthController } from "./AuthController.js";
import { validate } from "../../../presentation/middlewares/validate.js";
import { registerSchema, loginSchema } from "./validation/authSchemas.js";

export function buildAuthRouter(
  controller: AuthController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.post("/register", validate(registerSchema), controller.register);
  router.post("/login", validate(loginSchema), controller.login);
  router.get("/me", authenticate, controller.me);

  return router;
}

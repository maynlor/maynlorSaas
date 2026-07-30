import { Router, type RequestHandler } from "express";
import type { ProductController } from "./ProductController.js";
import { validate } from "../../../presentation/middlewares/validate.js";
import {
  createProductSchema,
  deleteProductSchema,
  getProductByIdSchema,
  listProductsSchema,
  updateProductSchema,
} from "./validation/productSchemas.js";

export function buildProductRouter(
  controller: ProductController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.use(authenticate);
  router.post("/", validate(createProductSchema), controller.create);
  router.get("/:id", validate(getProductByIdSchema), controller.getById);
  router.get("/", validate(listProductsSchema), controller.list);
  router.patch("/:id", validate(updateProductSchema), controller.update);
  router.delete("/:id", validate(deleteProductSchema), controller.delete);

  return router;
}

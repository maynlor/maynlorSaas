import { Router } from "express";

export function buildRootRouter(moduleRouters: { path: string; router: Router }[]): Router {
  const router = Router();
  for (const { path, router: moduleRouter } of moduleRouters) {
    router.use(path, moduleRouter);
  }
  return router;
}

import { Router } from "express";
import type { IDbClient } from "../shared/database/DbClient.js";

/**
 * Endpoint que consulta la plataforma de hosting para decidir si la instancia
 * puede recibir tráfico. Comprueba la base porque sin ella la API no puede
 * responder nada útil, y es preferible que el balanceador la saque de rotación
 * a que devuelva errores a los clientes.
 */
export function buildHealthRouter(db: IDbClient): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    db.query("SELECT 1")
      .then(() => res.status(200).json({ status: "ok" }))
      .catch(() => res.status(503).json({ status: "unavailable", reason: "database" }));
  });

  return router;
}

import type { Request, Response } from "express";
import type { ILogger } from "../../../shared/logger/Logger.js";
import type { HandleMercadoPagoWebhookUseCase } from "../application/use-cases/HandleMercadoPagoWebhookUseCase.js";

export class MercadoPagoWebhookController {
  constructor(
    private readonly handleWebhookUseCase: HandleMercadoPagoWebhookUseCase,
    private readonly logger: ILogger,
  ) {}

  receive = async (req: Request, res: Response): Promise<void> => {
    const rawBody = req.rawBody ?? Buffer.from("");
    const result = await this.handleWebhookUseCase.execute(rawBody, req.headers);

    if (result.isFailure) {
      this.logger.warn("Rejected Mercado Pago webhook", { reason: result.error.message });
      res.sendStatus(result.error.statusCode);
      return;
    }

    res.sendStatus(200);
  };
}

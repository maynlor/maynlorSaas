import type { IDbClient } from "../../../../shared/database/DbClient.js";
import { Plan } from "../../domain/Plan.js";
import type { IPlanRepository } from "../../application/repositories/IPlanRepository.js";
import { PlanFactory, type PlanRow } from "../factories/PlanFactory.js";

export class PostgresPlanRepository implements IPlanRepository {
  constructor(private readonly db: IDbClient) {}

  async findAllActive(): Promise<Plan[]> {
    const result = await this.db.query<PlanRow>(
      `SELECT * FROM plans WHERE is_active = TRUE ORDER BY price_monthly ASC NULLS LAST`,
    );
    return result.rows.map((row) => PlanFactory.toDomain(row));
  }

  async findById(id: string): Promise<Plan | null> {
    const result = await this.db.query<PlanRow>(`SELECT * FROM plans WHERE id = $1`, [id]);
    const row = result.rows[0];
    return row ? PlanFactory.toDomain(row) : null;
  }

  async findBySlug(slug: string): Promise<Plan | null> {
    const result = await this.db.query<PlanRow>(`SELECT * FROM plans WHERE slug = $1`, [slug]);
    const row = result.rows[0];
    return row ? PlanFactory.toDomain(row) : null;
  }
}

import type { Plan } from "../../domain/Plan.js";

export interface IPlanRepository {
  findAllActive(): Promise<Plan[]>;
  findById(id: string): Promise<Plan | null>;
  findBySlug(slug: string): Promise<Plan | null>;
}

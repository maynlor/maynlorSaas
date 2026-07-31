import { Result } from "../../../shared/result/Result.js";
import { SubscriptionAlreadyCanceledError } from "./errors/SubscriptionDomainErrors.js";

export type SubscriptionStatus = "pending" | "trialing" | "active" | "past_due" | "canceled";

/** "manual" = activada sin cobro real (plan gratis o sin proveedor configurado). */
export type SubscriptionProvider = "manual" | "mercadopago";

/**
 * Días que un negocio conserva su plan tras un cobro fallido. Un rechazo suele
 * ser transitorio (tarjeta vencida, saldo insuficiente puntual) y el proveedor
 * reintenta; degradar en el acto castigaría a clientes que sí quieren pagar.
 */
export const PAST_DUE_GRACE_DAYS = 7;

export interface SubscriptionProps {
  id: string;
  businessId: string;
  planId: string;
  status: SubscriptionStatus;
  provider: SubscriptionProvider;
  externalId: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  /** Hasta cuándo se conserva el plan estando en `past_due`. Null fuera de ese estado. */
  graceEndsAt: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPersistenceProps {
  id: string;
  businessId: string;
  planId: string;
  status: SubscriptionStatus;
  provider: SubscriptionProvider;
  externalId: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  graceEndsAt: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Subscription {
  private constructor(private props: SubscriptionProps) {}

  static create(input: {
    businessId: string;
    planId: string;
    status: SubscriptionStatus;
    provider: SubscriptionProvider;
    externalId?: string | null;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  }): Subscription {
    const now = new Date();
    return new Subscription({
      id: crypto.randomUUID(),
      businessId: input.businessId,
      planId: input.planId,
      status: input.status,
      provider: input.provider,
      externalId: input.externalId ?? null,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      graceEndsAt: null,
      canceledAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(row: SubscriptionPersistenceProps): Subscription {
    return new Subscription({ ...row });
  }

  cancel(): Result<void, SubscriptionAlreadyCanceledError> {
    if (this.props.status === "canceled") {
      return Result.fail(new SubscriptionAlreadyCanceledError());
    }
    const now = new Date();
    this.props = { ...this.props, status: "canceled", canceledAt: now, updatedAt: now };
    return Result.ok(undefined);
  }

  /** Aplica la confirmación de pago que llega por webhook del proveedor. */
  applyProviderUpdate(update: {
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    now?: Date;
  }): void {
    const now = update.now ?? new Date();
    this.props = {
      ...this.props,
      status: update.status,
      currentPeriodStart: update.currentPeriodStart,
      currentPeriodEnd: update.currentPeriodEnd,
      graceEndsAt: this.nextGraceEndsAt(update.status, now),
      canceledAt: update.status === "canceled" ? now : this.props.canceledAt,
      updatedAt: now,
    };
  }

  /**
   * La gracia se fija al *entrar* en `past_due` y no se renueva mientras siga
   * ahí: si se recalculara en cada webhook, los reintentos del proveedor la
   * extenderían indefinidamente y nunca se degradaría al plan gratis.
   */
  private nextGraceEndsAt(nextStatus: SubscriptionStatus, now: Date): Date | null {
    if (nextStatus !== "past_due") return null;
    if (this.props.status === "past_due") return this.props.graceEndsAt;

    const graceEndsAt = new Date(now);
    graceEndsAt.setDate(graceEndsAt.getDate() + PAST_DUE_GRACE_DAYS);
    return graceEndsAt;
  }

  get id(): string {
    return this.props.id;
  }

  get businessId(): string {
    return this.props.businessId;
  }

  get planId(): string {
    return this.props.planId;
  }

  get status(): SubscriptionStatus {
    return this.props.status;
  }

  get provider(): SubscriptionProvider {
    return this.props.provider;
  }

  get externalId(): string | null {
    return this.props.externalId;
  }

  get currentPeriodStart(): Date {
    return this.props.currentPeriodStart;
  }

  get currentPeriodEnd(): Date {
    return this.props.currentPeriodEnd;
  }

  get canceledAt(): Date | null {
    return this.props.canceledAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Ocupa el cupo de "suscripción vigente" del negocio: incluye estados que
   * todavía no dan acceso (`pending`, `past_due`) para impedir que se creen
   * dos suscripciones en paralelo. No confundir con `grantsPlanAccess`.
   */
  get isCurrent(): boolean {
    return (
      this.props.status === "pending" ||
      this.props.status === "trialing" ||
      this.props.status === "active" ||
      this.props.status === "past_due"
    );
  }

  /**
   * Habilita los límites del plan contratado.
   *
   * - `pending` nunca da acceso: el checkout se creó pero nadie pagó todavía;
   *   si contara, bastaría con iniciar un checkout de Enterprise y abandonarlo
   *   para obtener sus límites gratis.
   * - `past_due` da acceso solo dentro del período de gracia; pasado ese plazo
   *   el negocio cae al plan gratis (conserva sus datos, deja de poder crecer).
   */
  grantsPlanAccessAt(now: Date): boolean {
    switch (this.props.status) {
      case "trialing":
      case "active":
        return true;
      case "past_due":
        return this.props.graceEndsAt !== null && now < this.props.graceEndsAt;
      default:
        return false;
    }
  }

  get graceEndsAt(): Date | null {
    return this.props.graceEndsAt;
  }
}

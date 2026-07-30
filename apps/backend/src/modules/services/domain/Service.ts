import { Result } from "../../../shared/result/Result.js";
import type { DomainError } from "../../../shared/errors/AppError.js";
import { ServiceName } from "./value-objects/ServiceName.js";
import { ServicePrice } from "./value-objects/ServicePrice.js";
import { InvalidServiceDurationError } from "./errors/ServiceDomainErrors.js";

export interface ServiceProps {
  id: string;
  businessId: string;
  name: ServiceName;
  description: string | null;
  price: ServicePrice;
  currency: string;
  durationMinutes: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ServicePersistenceProps {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  durationMinutes: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface UpdateServiceInput {
  name?: string;
  description?: string | null;
  price?: number;
  currency?: string;
  durationMinutes?: number | null;
  isActive?: boolean;
}

function validateDuration(
  durationMinutes: number | null,
): Result<number | null, InvalidServiceDurationError> {
  if (durationMinutes === null) return Result.ok(null);
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return Result.fail(new InvalidServiceDurationError("must be a positive integer of minutes"));
  }
  return Result.ok(durationMinutes);
}

export class Service {
  private constructor(private props: ServiceProps) {}

  static create(input: {
    businessId: string;
    name: string;
    description?: string;
    price: number;
    currency?: string;
    durationMinutes?: number;
    isActive?: boolean;
  }): Result<Service, DomainError> {
    const nameResult = ServiceName.create(input.name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);

    const priceResult = ServicePrice.create(input.price);
    if (priceResult.isFailure) return Result.fail(priceResult.error);

    const durationResult = validateDuration(input.durationMinutes ?? null);
    if (durationResult.isFailure) return Result.fail(durationResult.error);

    const now = new Date();
    return Result.ok(
      new Service({
        id: crypto.randomUUID(),
        businessId: input.businessId,
        name: nameResult.value,
        description: input.description ?? null,
        price: priceResult.value,
        currency: (input.currency ?? "ARS").toUpperCase(),
        durationMinutes: durationResult.value,
        isActive: input.isActive ?? true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }),
    );
  }

  static reconstitute(row: ServicePersistenceProps): Service {
    return new Service({
      id: row.id,
      businessId: row.businessId,
      name: ServiceName.create(row.name).value,
      description: row.description,
      price: ServicePrice.create(row.price).value,
      currency: row.currency,
      durationMinutes: row.durationMinutes,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }

  update(input: UpdateServiceInput): Result<void, DomainError> {
    let name = this.props.name;
    if (input.name !== undefined) {
      const nameResult = ServiceName.create(input.name);
      if (nameResult.isFailure) return Result.fail(nameResult.error);
      name = nameResult.value;
    }

    let price = this.props.price;
    if (input.price !== undefined) {
      const priceResult = ServicePrice.create(input.price);
      if (priceResult.isFailure) return Result.fail(priceResult.error);
      price = priceResult.value;
    }

    let durationMinutes = this.props.durationMinutes;
    if (input.durationMinutes !== undefined) {
      const durationResult = validateDuration(input.durationMinutes);
      if (durationResult.isFailure) return Result.fail(durationResult.error);
      durationMinutes = durationResult.value;
    }

    this.props = {
      ...this.props,
      name,
      price,
      durationMinutes,
      description: input.description !== undefined ? input.description : this.props.description,
      currency: input.currency !== undefined ? input.currency.toUpperCase() : this.props.currency,
      isActive: input.isActive !== undefined ? input.isActive : this.props.isActive,
      updatedAt: new Date(),
    };
    return Result.ok(undefined);
  }

  delete(): void {
    const now = new Date();
    this.props = { ...this.props, deletedAt: now, updatedAt: now };
  }

  get id(): string {
    return this.props.id;
  }

  get businessId(): string {
    return this.props.businessId;
  }

  get name(): string {
    return this.props.name.toString();
  }

  get description(): string | null {
    return this.props.description;
  }

  get price(): number {
    return this.props.price.toNumber();
  }

  get currency(): string {
    return this.props.currency;
  }

  get durationMinutes(): number | null {
    return this.props.durationMinutes;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }
}

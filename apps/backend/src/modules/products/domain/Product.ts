import { Result } from "../../../shared/result/Result.js";
import type { DomainError } from "../../../shared/errors/AppError.js";
import { ProductName } from "./value-objects/ProductName.js";
import { ProductPrice } from "./value-objects/ProductPrice.js";

export interface ProductProps {
  id: string;
  businessId: string;
  name: ProductName;
  description: string | null;
  price: ProductPrice;
  currency: string;
  stock: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ProductPersistenceProps {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  stock: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  price?: number;
  currency?: string;
  stock?: number | null;
  isActive?: boolean;
}

export class Product {
  private constructor(private props: ProductProps) {}

  static create(input: {
    businessId: string;
    name: string;
    description?: string;
    price: number;
    currency?: string;
    stock?: number;
    isActive?: boolean;
  }): Result<Product, DomainError> {
    const nameResult = ProductName.create(input.name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);

    const priceResult = ProductPrice.create(input.price);
    if (priceResult.isFailure) return Result.fail(priceResult.error);

    const now = new Date();
    return Result.ok(
      new Product({
        id: crypto.randomUUID(),
        businessId: input.businessId,
        name: nameResult.value,
        description: input.description ?? null,
        price: priceResult.value,
        currency: (input.currency ?? "ARS").toUpperCase(),
        stock: input.stock ?? null,
        isActive: input.isActive ?? true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }),
    );
  }

  static reconstitute(row: ProductPersistenceProps): Product {
    return new Product({
      id: row.id,
      businessId: row.businessId,
      name: ProductName.create(row.name).value,
      description: row.description,
      price: ProductPrice.create(row.price).value,
      currency: row.currency,
      stock: row.stock,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }

  update(input: UpdateProductInput): Result<void, DomainError> {
    let name = this.props.name;
    if (input.name !== undefined) {
      const nameResult = ProductName.create(input.name);
      if (nameResult.isFailure) return Result.fail(nameResult.error);
      name = nameResult.value;
    }

    let price = this.props.price;
    if (input.price !== undefined) {
      const priceResult = ProductPrice.create(input.price);
      if (priceResult.isFailure) return Result.fail(priceResult.error);
      price = priceResult.value;
    }

    this.props = {
      ...this.props,
      name,
      price,
      description: input.description !== undefined ? input.description : this.props.description,
      currency: input.currency !== undefined ? input.currency.toUpperCase() : this.props.currency,
      stock: input.stock !== undefined ? input.stock : this.props.stock,
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

  get stock(): number | null {
    return this.props.stock;
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

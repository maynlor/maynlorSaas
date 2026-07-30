import { Result } from "../../../shared/result/Result.js";
import { ClientName } from "./value-objects/ClientName.js";
import type { InvalidClientNameError } from "./errors/ClientDomainErrors.js";

export interface ClientProps {
  id: string;
  businessId: string;
  name: ClientName;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ClientPersistenceProps {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class Client {
  private constructor(private readonly props: ClientProps) {}

  static create(input: {
    businessId: string;
    name: string;
    phone?: string;
    email?: string;
  }): Result<Client, InvalidClientNameError> {
    const nameResult = ClientName.create(input.name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);

    const now = new Date();
    return Result.ok(
      new Client({
        id: crypto.randomUUID(),
        businessId: input.businessId,
        name: nameResult.value,
        phone: input.phone ?? null,
        email: input.email ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }),
    );
  }

  static reconstitute(row: ClientPersistenceProps): Client {
    return new Client({
      id: row.id,
      businessId: row.businessId,
      name: ClientName.create(row.name).value,
      phone: row.phone,
      email: row.email,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
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

  get phone(): string | null {
    return this.props.phone;
  }

  get email(): string | null {
    return this.props.email;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }
}

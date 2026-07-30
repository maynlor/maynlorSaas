import { Result } from "../../../shared/result/Result.js";
import { UserEmail } from "./value-objects/UserEmail.js";
import type { InvalidUserEmailError } from "./errors/UserDomainErrors.js";

export interface UserProps {
  id: string;
  businessId: string;
  email: UserEmail;
  passwordHash: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface UserPersistenceProps {
  id: string;
  businessId: string;
  email: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(input: {
    businessId: string;
    email: string;
    passwordHash: string;
    role?: string;
  }): Result<User, InvalidUserEmailError> {
    const emailResult = UserEmail.create(input.email);
    if (emailResult.isFailure) return Result.fail(emailResult.error);

    const now = new Date();
    return Result.ok(
      new User({
        id: crypto.randomUUID(),
        businessId: input.businessId,
        email: emailResult.value,
        passwordHash: input.passwordHash,
        role: input.role ?? "owner",
        isActive: true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }),
    );
  }

  static reconstitute(row: UserPersistenceProps): User {
    return new User({
      id: row.id,
      businessId: row.businessId,
      email: UserEmail.create(row.email).value,
      passwordHash: row.passwordHash,
      role: row.role,
      isActive: row.isActive,
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

  get email(): string {
    return this.props.email.toString();
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get role(): string {
    return this.props.role;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

import { Result } from "../../../shared/result/Result.js";
import { BusinessName } from "./value-objects/BusinessName.js";
import { BusinessEmail } from "./value-objects/BusinessEmail.js";
import { BusinessSlug } from "./value-objects/BusinessSlug.js";
import type {
  InvalidBusinessNameError,
  InvalidBusinessEmailError,
  InvalidBusinessSlugError,
} from "./errors/BusinessDomainErrors.js";

export interface BusinessProps {
  id: string;
  name: BusinessName;
  email: BusinessEmail;
  slug: BusinessSlug;
  isActive: boolean;
  whatsappPhoneNumberId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface BusinessPersistenceProps {
  id: string;
  name: string;
  email: string;
  slug: string;
  isActive: boolean;
  whatsappPhoneNumberId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type BusinessCreationError =
  | InvalidBusinessNameError
  | InvalidBusinessEmailError
  | InvalidBusinessSlugError;

export class Business {
  private constructor(private readonly props: BusinessProps) {}

  static create(input: {
    name: string;
    email: string;
    slug: string;
  }): Result<Business, BusinessCreationError> {
    const nameResult = BusinessName.create(input.name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);

    const emailResult = BusinessEmail.create(input.email);
    if (emailResult.isFailure) return Result.fail(emailResult.error);

    const slugResult = BusinessSlug.create(input.slug);
    if (slugResult.isFailure) return Result.fail(slugResult.error);

    const now = new Date();
    return Result.ok(
      new Business({
        id: crypto.randomUUID(),
        name: nameResult.value,
        email: emailResult.value,
        slug: slugResult.value,
        isActive: true,
        whatsappPhoneNumberId: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }),
    );
  }

  static reconstitute(row: BusinessPersistenceProps): Business {
    return new Business({
      id: row.id,
      name: BusinessName.create(row.name).value,
      email: BusinessEmail.create(row.email).value,
      slug: BusinessSlug.create(row.slug).value,
      isActive: row.isActive,
      whatsappPhoneNumberId: row.whatsappPhoneNumberId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name.toString();
  }

  get email(): string {
    return this.props.email.toString();
  }

  get slug(): string {
    return this.props.slug.toString();
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }

  get whatsappPhoneNumberId(): string | null {
    return this.props.whatsappPhoneNumberId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  linkWhatsAppPhoneNumberId(phoneNumberId: string): void {
    this.props.whatsappPhoneNumberId = phoneNumberId;
    this.props.updatedAt = new Date();
  }
}

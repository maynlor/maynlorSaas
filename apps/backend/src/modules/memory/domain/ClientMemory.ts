import { Result } from "../../../shared/result/Result.js";
import type { DomainError } from "../../../shared/errors/AppError.js";
import { MemoryContent } from "./value-objects/MemoryContent.js";

export interface ClientMemoryProps {
  id: string;
  businessId: string;
  clientId: string;
  content: MemoryContent;
  createdAt: Date;
}

export interface ClientMemoryPersistenceProps {
  id: string;
  businessId: string;
  clientId: string;
  content: string;
  createdAt: Date;
}

export class ClientMemory {
  private constructor(private readonly props: ClientMemoryProps) {}

  static create(input: {
    businessId: string;
    clientId: string;
    content: string;
  }): Result<ClientMemory, DomainError> {
    const contentResult = MemoryContent.create(input.content);
    if (contentResult.isFailure) return Result.fail(contentResult.error);

    return Result.ok(
      new ClientMemory({
        id: crypto.randomUUID(),
        businessId: input.businessId,
        clientId: input.clientId,
        content: contentResult.value,
        createdAt: new Date(),
      }),
    );
  }

  static reconstitute(row: ClientMemoryPersistenceProps): Result<ClientMemory, DomainError> {
    const contentResult = MemoryContent.create(row.content);
    if (contentResult.isFailure) return Result.fail(contentResult.error);

    return Result.ok(
      new ClientMemory({
        id: row.id,
        businessId: row.businessId,
        clientId: row.clientId,
        content: contentResult.value,
        createdAt: row.createdAt,
      }),
    );
  }

  get id(): string {
    return this.props.id;
  }

  get businessId(): string {
    return this.props.businessId;
  }

  get clientId(): string {
    return this.props.clientId;
  }

  get content(): string {
    return this.props.content.toString();
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}

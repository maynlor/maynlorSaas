import { Result } from "../../../../shared/result/Result.js";
import { InvalidKnowledgeDocumentTitleError } from "../errors/KnowledgeDocumentDomainErrors.js";

export class KnowledgeDocumentTitle {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<KnowledgeDocumentTitle, InvalidKnowledgeDocumentTitleError> {
    const trimmed = raw.trim();
    if (trimmed.length < 1 || trimmed.length > 200) {
      return Result.fail(
        new InvalidKnowledgeDocumentTitleError("must be between 1 and 200 characters"),
      );
    }
    return Result.ok(new KnowledgeDocumentTitle(trimmed));
  }

  toString(): string {
    return this.value;
  }
}

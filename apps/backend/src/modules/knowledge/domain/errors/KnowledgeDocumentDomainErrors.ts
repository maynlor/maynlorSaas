import { DomainError } from "../../../../shared/errors/AppError.js";

export class InvalidKnowledgeDocumentTitleError extends DomainError {
  constructor(reason: string) {
    super(`Invalid knowledge document title: ${reason}`);
  }
}

export class EmptyKnowledgeDocumentContentError extends DomainError {
  constructor() {
    super("The document has no extractable text content");
  }
}

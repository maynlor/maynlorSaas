import { describe, it, expect } from "vitest";
import { KnowledgeDocument } from "@modules/knowledge/domain/KnowledgeDocument.js";
import { InvalidKnowledgeDocumentTitleError } from "@modules/knowledge/domain/errors/KnowledgeDocumentDomainErrors.js";

describe("KnowledgeDocument", () => {
  it("creates a text document without a source filename", () => {
    const result = KnowledgeDocument.create({ businessId: "b1", title: "Catálogo", sourceType: "text" });

    expect(result.isSuccess).toBe(true);
    expect(result.value.sourceType).toBe("text");
    expect(result.value.sourceFilename).toBeNull();
    expect(result.value.deletedAt).toBeNull();
  });

  it("creates a pdf document keeping the original filename", () => {
    const result = KnowledgeDocument.create({
      businessId: "b1",
      title: "Manual",
      sourceType: "pdf",
      sourceFilename: "manual.pdf",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.sourceFilename).toBe("manual.pdf");
  });

  it("rejects an empty title", () => {
    const result = KnowledgeDocument.create({ businessId: "b1", title: "   ", sourceType: "text" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(InvalidKnowledgeDocumentTitleError);
  });

  it("rejects a title longer than 200 characters", () => {
    const result = KnowledgeDocument.create({ businessId: "b1", title: "a".repeat(201), sourceType: "text" });

    expect(result.isFailure).toBe(true);
  });

  it("soft-deletes by setting deletedAt", () => {
    const document = KnowledgeDocument.create({ businessId: "b1", title: "Catálogo", sourceType: "text" }).value;

    document.delete();

    expect(document.deletedAt).not.toBeNull();
  });
});

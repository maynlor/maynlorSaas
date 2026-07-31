import { describe, it, expect, vi } from "vitest";
import { UploadKnowledgeDocumentUseCase } from "@modules/knowledge/application/use-cases/UploadKnowledgeDocumentUseCase.js";
import type { IKnowledgeDocumentRepository } from "@modules/knowledge/application/repositories/IKnowledgeDocumentRepository.js";
import type { IDocumentChunkRepository } from "@modules/knowledge/application/repositories/IDocumentChunkRepository.js";
import type { IPdfTextExtractor } from "@modules/knowledge/application/services/IPdfTextExtractor.js";
import type { PlanLimitReader } from "@modules/subscriptions/application/services/PlanLimitReader.js";
import type { AIProvider } from "@modules/ai/application/providers/AIProvider.js";
import { PlanLimitExceededError, DomainError, AIProviderError } from "@shared/errors/AppError.js";
import { EmptyKnowledgeDocumentContentError } from "@modules/knowledge/domain/errors/KnowledgeDocumentDomainErrors.js";
import type { ProductTracker } from "@shared/telemetry/ProductTracker.js";

const businessId = "b1";

function createDocumentRepoMock(overrides: Partial<IKnowledgeDocumentRepository> = {}): IKnowledgeDocumentRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    countByBusinessId: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

function createChunkRepoMock(overrides: Partial<IDocumentChunkRepository> = {}): IDocumentChunkRepository {
  return {
    saveMany: vi.fn().mockResolvedValue(undefined),
    deleteByDocumentId: vi.fn().mockResolvedValue(undefined),
    searchSimilar: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function createPlanLimitReaderMock(limit: number | null = null): PlanLimitReader {
  return { getLimit: vi.fn().mockResolvedValue(limit) } as unknown as PlanLimitReader;
}

function createAiProviderMock(): AIProvider {
  return {
    generateText: vi.fn(),
    transcribeAudio: vi.fn(),
    embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    describeImage: vi.fn(),
  };
}

function createPdfExtractorMock(text = "texto extraído del pdf"): IPdfTextExtractor {
  return { extractText: vi.fn().mockResolvedValue(text) };
}

describe("UploadKnowledgeDocumentUseCase", () => {
  it("uploads a text document, chunking and embedding its content", async () => {
    const documentRepo = createDocumentRepoMock();
    const chunkRepo = createChunkRepoMock();
    const aiProvider = createAiProviderMock();
    const useCase = new UploadKnowledgeDocumentUseCase(
      documentRepo,
      chunkRepo,
      createPlanLimitReaderMock(),
      aiProvider,
      createPdfExtractorMock(),
    );

    const result = await useCase.execute(businessId, {
      title: "Políticas",
      sourceType: "text",
      content: "Aceptamos devoluciones dentro de los 30 días.",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.sourceType).toBe("text");
    expect(documentRepo.save).toHaveBeenCalledOnce();
    expect(aiProvider.embedText).toHaveBeenCalledWith("Aceptamos devoluciones dentro de los 30 días.");
    expect(chunkRepo.saveMany).toHaveBeenCalledOnce();
    const savedChunks = vi.mocked(chunkRepo.saveMany).mock.calls[0]![0];
    expect(savedChunks).toHaveLength(1);
    expect(savedChunks[0]!.embedding).toEqual([0.1, 0.2, 0.3]);
  });

  it("tracks document_uploaded on the product tracker", async () => {
    const documentRepo = createDocumentRepoMock();
    const chunkRepo = createChunkRepoMock();
    const aiProvider = createAiProviderMock();
    const tracker: ProductTracker = { track: vi.fn(), identify: vi.fn() };
    const useCase = new UploadKnowledgeDocumentUseCase(
      documentRepo,
      chunkRepo,
      createPlanLimitReaderMock(),
      aiProvider,
      createPdfExtractorMock(),
      tracker,
    );

    await useCase.execute(businessId, { title: "Políticas", sourceType: "text", content: "Contenido válido" });

    expect(tracker.track).toHaveBeenCalledWith(
      businessId,
      "document_uploaded",
      expect.objectContaining({ sourceType: "text" }),
    );
  });

  it("tracks plan_limit_exceeded when the document limit is reached", async () => {
    const documentRepo = createDocumentRepoMock({ countByBusinessId: vi.fn().mockResolvedValue(5) });
    const tracker: ProductTracker = { track: vi.fn(), identify: vi.fn() };
    const useCase = new UploadKnowledgeDocumentUseCase(
      documentRepo,
      createChunkRepoMock(),
      createPlanLimitReaderMock(5),
      createAiProviderMock(),
      createPdfExtractorMock(),
      tracker,
    );

    await useCase.execute(businessId, { title: "Doc", sourceType: "text", content: "algo" });

    expect(tracker.track).toHaveBeenCalledWith(
      businessId,
      "plan_limit_exceeded",
      expect.objectContaining({ limitType: "knowledgeDocuments" }),
    );
  });

  it("uploads a PDF by extracting its text before chunking", async () => {
    const documentRepo = createDocumentRepoMock();
    const chunkRepo = createChunkRepoMock();
    const pdfExtractor = createPdfExtractorMock("contenido real del pdf");
    const useCase = new UploadKnowledgeDocumentUseCase(
      documentRepo,
      chunkRepo,
      createPlanLimitReaderMock(),
      createAiProviderMock(),
      pdfExtractor,
    );

    const result = await useCase.execute(businessId, {
      title: "Manual",
      sourceType: "pdf",
      file: { buffer: Buffer.from("fake-pdf-bytes"), filename: "manual.pdf" },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.sourceFilename).toBe("manual.pdf");
    expect(pdfExtractor.extractText).toHaveBeenCalledOnce();
  });

  it("fails when the plan's document limit is already reached", async () => {
    const documentRepo = createDocumentRepoMock({ countByBusinessId: vi.fn().mockResolvedValue(5) });
    const useCase = new UploadKnowledgeDocumentUseCase(
      documentRepo,
      createChunkRepoMock(),
      createPlanLimitReaderMock(5),
      createAiProviderMock(),
      createPdfExtractorMock(),
    );

    const result = await useCase.execute(businessId, { title: "Doc", sourceType: "text", content: "algo" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(PlanLimitExceededError);
    expect(documentRepo.save).not.toHaveBeenCalled();
  });

  it("fails when the extracted text is empty (e.g. an image-only PDF)", async () => {
    const useCase = new UploadKnowledgeDocumentUseCase(
      createDocumentRepoMock(),
      createChunkRepoMock(),
      createPlanLimitReaderMock(),
      createAiProviderMock(),
      createPdfExtractorMock("   "),
    );

    const result = await useCase.execute(businessId, {
      title: "Escaneo",
      sourceType: "pdf",
      file: { buffer: Buffer.from("x"), filename: "escaneo.pdf" },
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(EmptyKnowledgeDocumentContentError);
  });

  it("fails with a domain error for a title that is too long", async () => {
    const useCase = new UploadKnowledgeDocumentUseCase(
      createDocumentRepoMock(),
      createChunkRepoMock(),
      createPlanLimitReaderMock(),
      createAiProviderMock(),
      createPdfExtractorMock(),
    );

    const result = await useCase.execute(businessId, {
      title: "a".repeat(300),
      sourceType: "text",
      content: "contenido válido",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DomainError);
  });

  it("fails cleanly instead of crashing when embedding generation fails", async () => {
    // Reproduce un bug real: sin este manejo, un error de embedText (sin
    // OPENAI_API_KEY, red caída, rate limit) quedaba sin capturar y tumbaba
    // el proceso entero, igual que el bug ya corregido en el pago de MP.
    const documentRepo = createDocumentRepoMock();
    const aiProvider = createAiProviderMock();
    vi.mocked(aiProvider.embedText).mockRejectedValue(new Error("OPENAI_API_KEY is not configured"));
    const useCase = new UploadKnowledgeDocumentUseCase(
      documentRepo,
      createChunkRepoMock(),
      createPlanLimitReaderMock(),
      aiProvider,
      createPdfExtractorMock(),
    );

    const result = await useCase.execute(businessId, { title: "Doc", sourceType: "text", content: "algo" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(AIProviderError);
  });

  it("soft-deletes the document if it was saved but embedding its chunks failed", async () => {
    // Sin esto, un fallo a mitad de carga deja un documento "cargado" en la
    // lista pero sin ningún fragmento indexado: invisible para
    // buscar_documentos y confuso para el negocio, que no sabría por qué el
    // asistente nunca lo usa.
    const documentRepo = createDocumentRepoMock();
    const aiProvider = createAiProviderMock();
    vi.mocked(aiProvider.embedText).mockRejectedValue(new Error("network error"));
    const useCase = new UploadKnowledgeDocumentUseCase(
      documentRepo,
      createChunkRepoMock(),
      createPlanLimitReaderMock(),
      aiProvider,
      createPdfExtractorMock(),
    );

    await useCase.execute(businessId, { title: "Doc", sourceType: "text", content: "algo" });

    expect(documentRepo.save).toHaveBeenCalledTimes(2);
    const secondSaveArg = vi.mocked(documentRepo.save).mock.calls[1]![0];
    expect(secondSaveArg.deletedAt).not.toBeNull();
  });

  it("fails cleanly instead of crashing when PDF text extraction fails", async () => {
    const useCase = new UploadKnowledgeDocumentUseCase(
      createDocumentRepoMock(),
      createChunkRepoMock(),
      createPlanLimitReaderMock(),
      createAiProviderMock(),
      { extractText: vi.fn().mockRejectedValue(new Error("corrupt PDF structure")) },
    );

    const result = await useCase.execute(businessId, {
      title: "Roto",
      sourceType: "pdf",
      file: { buffer: Buffer.from("not-a-pdf"), filename: "roto.pdf" },
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(AIProviderError);
  });

  it("does not enforce a limit when the plan allows unlimited documents", async () => {
    const documentRepo = createDocumentRepoMock();
    const useCase = new UploadKnowledgeDocumentUseCase(
      documentRepo,
      createChunkRepoMock(),
      createPlanLimitReaderMock(null),
      createAiProviderMock(),
      createPdfExtractorMock(),
    );

    const result = await useCase.execute(businessId, { title: "Doc", sourceType: "text", content: "algo" });

    expect(result.isSuccess).toBe(true);
    expect(documentRepo.countByBusinessId).not.toHaveBeenCalled();
  });
});

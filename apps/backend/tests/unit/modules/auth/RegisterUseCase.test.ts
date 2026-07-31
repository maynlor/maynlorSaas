import { describe, it, expect, vi } from "vitest";
import { RegisterUseCase } from "@modules/auth/application/use-cases/RegisterUseCase.js";
import { Plan } from "@modules/subscriptions/domain/Plan.js";
import type { IDbClient } from "@shared/database/DbClient.js";
import type { IBusinessRepository } from "@modules/businesses/application/repositories/IBusinessRepository.js";
import type { IUserRepository } from "@modules/users/application/repositories/IUserRepository.js";
import type { IPlanRepository } from "@modules/subscriptions/application/repositories/IPlanRepository.js";
import type { ISubscriptionRepository } from "@modules/subscriptions/application/repositories/ISubscriptionRepository.js";
import type { PaymentProvider } from "@modules/subscriptions/application/providers/PaymentProvider.js";
import type { IPasswordHasher } from "@shared/security/PasswordHasher.js";
import type { ITokenService } from "@shared/security/TokenService.js";
import type { ILogger } from "@shared/logger/Logger.js";
import { ConflictError, DomainError } from "@shared/errors/AppError.js";
import type { ProductTracker } from "@shared/telemetry/ProductTracker.js";

function createDbMock(): IDbClient {
  return {
    query: vi.fn(),
    transaction: vi.fn(async (fn) => fn(dbMock)),
  } as unknown as IDbClient;
}

let dbMock: IDbClient;

function createBusinessRepoMock(overrides: Partial<IBusinessRepository> = {}): IBusinessRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByWhatsAppPhoneNumberId: vi.fn(),
    findAll: vi.fn(),
    existsByEmailOrSlug: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function createUserRepoMock(overrides: Partial<IUserRepository> = {}): IUserRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    existsByEmail: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function buildStarterPlan(): Plan {
  return Plan.reconstitute({
    id: "plan-starter",
    name: "Starter",
    slug: "starter",
    description: null,
    priceMonthly: 0,
    currency: "ARS",
    limits: { maxProducts: 20, maxServices: 10, maxUsers: 1, maxConversationsPerMonth: 200, maxKnowledgeDocuments: 5 },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).value;
}

function createPlanRepoMock(overrides: Partial<IPlanRepository> = {}): IPlanRepository {
  return {
    findAllActive: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn().mockResolvedValue(buildStarterPlan()),
    ...overrides,
  };
}

function createSubscriptionRepoMock(
  overrides: Partial<ISubscriptionRepository> = {},
): ISubscriptionRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findCurrentByBusinessId: vi.fn(),
    findByExternalId: vi.fn(),
    ...overrides,
  };
}

const paymentProvider: PaymentProvider = {
  createCheckout: vi.fn().mockResolvedValue({
    status: "active",
    provider: "manual",
    externalId: null,
    checkoutUrl: null,
    currentPeriodStart: new Date("2026-01-01"),
    currentPeriodEnd: new Date("2026-01-31"),
  }),
  cancelSubscription: vi.fn().mockResolvedValue(undefined),
  parseWebhookEvent: vi.fn().mockResolvedValue(null),
};

const passwordHasher: IPasswordHasher = {
  hash: vi.fn().mockResolvedValue("hashed-password"),
  compare: vi.fn(),
};

const tokenService: ITokenService = {
  sign: vi.fn().mockReturnValue("signed-token"),
  verify: vi.fn(),
};

const noopLogger: ILogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

const validInput = {
  business: { name: "Acme", email: "biz@acme.com", slug: "acme" },
  user: { email: "owner@acme.com", password: "supersecret" },
};

describe("RegisterUseCase", () => {
  it("registers a business and its owner user, subscribed to the default plan", async () => {
    dbMock = createDbMock();
    const businessRepo = createBusinessRepoMock();
    const userRepo = createUserRepoMock();
    const planRepo = createPlanRepoMock();
    const subscriptionRepo = createSubscriptionRepoMock();
    const useCase = new RegisterUseCase(
      dbMock,
      () => businessRepo,
      () => userRepo,
      () => planRepo,
      () => subscriptionRepo,
      paymentProvider,
      passwordHasher,
      tokenService,
      noopLogger,
    );

    const result = await useCase.execute(validInput);

    expect(result.isSuccess).toBe(true);
    expect(result.value.token).toBe("signed-token");
    expect(result.value.business.slug).toBe("acme");
    expect(result.value.user.email).toBe("owner@acme.com");
    expect(businessRepo.save).toHaveBeenCalledOnce();
    expect(userRepo.save).toHaveBeenCalledOnce();
    expect(planRepo.findBySlug).toHaveBeenCalledWith("starter");
    expect(subscriptionRepo.save).toHaveBeenCalledOnce();
  });

  it("tracks business_registered on the product tracker", async () => {
    dbMock = createDbMock();
    const businessRepo = createBusinessRepoMock();
    const userRepo = createUserRepoMock();
    const planRepo = createPlanRepoMock();
    const subscriptionRepo = createSubscriptionRepoMock();
    const tracker: ProductTracker = { track: vi.fn(), identify: vi.fn() };
    const useCase = new RegisterUseCase(
      dbMock,
      () => businessRepo,
      () => userRepo,
      () => planRepo,
      () => subscriptionRepo,
      paymentProvider,
      passwordHasher,
      tokenService,
      noopLogger,
      tracker,
    );

    const result = await useCase.execute(validInput);

    expect(result.isSuccess).toBe(true);
    expect(tracker.identify).toHaveBeenCalledWith(
      result.value.business.id,
      expect.objectContaining({ email: "biz@acme.com" }),
    );
    expect(tracker.track).toHaveBeenCalledWith(
      result.value.business.id,
      "business_registered",
      expect.any(Object),
    );
  });

  it("still registers the business when the default plan is missing", async () => {
    dbMock = createDbMock();
    const businessRepo = createBusinessRepoMock();
    const userRepo = createUserRepoMock();
    const planRepo = createPlanRepoMock({ findBySlug: vi.fn().mockResolvedValue(null) });
    const subscriptionRepo = createSubscriptionRepoMock();
    const useCase = new RegisterUseCase(
      dbMock,
      () => businessRepo,
      () => userRepo,
      () => planRepo,
      () => subscriptionRepo,
      paymentProvider,
      passwordHasher,
      tokenService,
      noopLogger,
    );

    const result = await useCase.execute(validInput);

    expect(result.isSuccess).toBe(true);
    expect(subscriptionRepo.save).not.toHaveBeenCalled();
  });

  it("fails with ConflictError when the business already exists", async () => {
    dbMock = createDbMock();
    const businessRepo = createBusinessRepoMock({
      existsByEmailOrSlug: vi.fn().mockResolvedValue(true),
    });
    const userRepo = createUserRepoMock();
    const useCase = new RegisterUseCase(
      dbMock,
      () => businessRepo,
      () => userRepo,
      () => createPlanRepoMock(),
      () => createSubscriptionRepoMock(),
      paymentProvider,
      passwordHasher,
      tokenService,
      noopLogger,
    );

    const result = await useCase.execute(validInput);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(ConflictError);
  });

  it("fails with ConflictError when the user email already exists", async () => {
    dbMock = createDbMock();
    const businessRepo = createBusinessRepoMock();
    const userRepo = createUserRepoMock({ existsByEmail: vi.fn().mockResolvedValue(true) });
    const useCase = new RegisterUseCase(
      dbMock,
      () => businessRepo,
      () => userRepo,
      () => createPlanRepoMock(),
      () => createSubscriptionRepoMock(),
      paymentProvider,
      passwordHasher,
      tokenService,
      noopLogger,
    );

    const result = await useCase.execute(validInput);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(ConflictError);
  });

  it("fails with a domain error for a password shorter than 8 characters", async () => {
    dbMock = createDbMock();
    const businessRepo = createBusinessRepoMock();
    const userRepo = createUserRepoMock();
    const useCase = new RegisterUseCase(
      dbMock,
      () => businessRepo,
      () => userRepo,
      () => createPlanRepoMock(),
      () => createSubscriptionRepoMock(),
      paymentProvider,
      passwordHasher,
      tokenService,
      noopLogger,
    );

    const result = await useCase.execute({
      ...validInput,
      user: { email: "owner@acme.com", password: "short" },
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DomainError);
    expect(businessRepo.save).not.toHaveBeenCalled();
  });
});

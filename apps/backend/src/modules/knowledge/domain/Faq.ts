import { Result } from "../../../shared/result/Result.js";
import type { DomainError } from "../../../shared/errors/AppError.js";
import { FaqQuestion } from "./value-objects/FaqQuestion.js";
import { InvalidFaqAnswerError } from "./errors/FaqDomainErrors.js";

export interface FaqProps {
  id: string;
  businessId: string;
  question: FaqQuestion;
  answer: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FaqPersistenceProps {
  id: string;
  businessId: string;
  question: string;
  answer: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface UpdateFaqInput {
  question?: string;
  answer?: string;
  isActive?: boolean;
}

function validateAnswer(answer: string): Result<string, InvalidFaqAnswerError> {
  const trimmed = answer.trim();
  if (trimmed.length < 1 || trimmed.length > 5000) {
    return Result.fail(new InvalidFaqAnswerError("must be between 1 and 5000 characters"));
  }
  return Result.ok(trimmed);
}

export class Faq {
  private constructor(private props: FaqProps) {}

  static create(input: {
    businessId: string;
    question: string;
    answer: string;
    isActive?: boolean;
  }): Result<Faq, DomainError> {
    const questionResult = FaqQuestion.create(input.question);
    if (questionResult.isFailure) return Result.fail(questionResult.error);

    const answerResult = validateAnswer(input.answer);
    if (answerResult.isFailure) return Result.fail(answerResult.error);

    const now = new Date();
    return Result.ok(
      new Faq({
        id: crypto.randomUUID(),
        businessId: input.businessId,
        question: questionResult.value,
        answer: answerResult.value,
        isActive: input.isActive ?? true,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }),
    );
  }

  static reconstitute(row: FaqPersistenceProps): Faq {
    return new Faq({
      id: row.id,
      businessId: row.businessId,
      question: FaqQuestion.create(row.question).value,
      answer: row.answer,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }

  update(input: UpdateFaqInput): Result<void, DomainError> {
    let question = this.props.question;
    if (input.question !== undefined) {
      const questionResult = FaqQuestion.create(input.question);
      if (questionResult.isFailure) return Result.fail(questionResult.error);
      question = questionResult.value;
    }

    let answer = this.props.answer;
    if (input.answer !== undefined) {
      const answerResult = validateAnswer(input.answer);
      if (answerResult.isFailure) return Result.fail(answerResult.error);
      answer = answerResult.value;
    }

    this.props = {
      ...this.props,
      question,
      answer,
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

  get question(): string {
    return this.props.question.toString();
  }

  get answer(): string {
    return this.props.answer;
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

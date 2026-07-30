import type { Faq } from "../../domain/Faq.js";
import type { FaqOutputDTO } from "../dtos/FaqDTO.js";

export class FaqMapper {
  static toDTO(faq: Faq): FaqOutputDTO {
    return {
      id: faq.id,
      businessId: faq.businessId,
      question: faq.question,
      answer: faq.answer,
      isActive: faq.isActive,
      createdAt: faq.createdAt.toISOString(),
      updatedAt: faq.updatedAt.toISOString(),
    };
  }
}

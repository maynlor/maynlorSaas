export interface CreateFaqInputDTO {
  question: string;
  answer: string;
  isActive?: boolean;
}

export interface UpdateFaqInputDTO {
  question?: string;
  answer?: string;
  isActive?: boolean;
}

export interface FaqOutputDTO {
  id: string;
  businessId: string;
  question: string;
  answer: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListFaqsOutputDTO {
  items: FaqOutputDTO[];
  total: number;
  page: number;
  pageSize: number;
}

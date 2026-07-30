export interface CreateServiceInputDTO {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  durationMinutes?: number;
  isActive?: boolean;
}

export interface UpdateServiceInputDTO {
  name?: string;
  description?: string | null;
  price?: number;
  currency?: string;
  durationMinutes?: number | null;
  isActive?: boolean;
}

export interface ServiceOutputDTO {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  durationMinutes: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListServicesOutputDTO {
  items: ServiceOutputDTO[];
  total: number;
  page: number;
  pageSize: number;
}

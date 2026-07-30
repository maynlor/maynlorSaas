export interface CreateClientInputDTO {
  name: string;
  phone?: string;
  email?: string;
}

export interface ClientOutputDTO {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListClientsOutputDTO {
  items: ClientOutputDTO[];
  total: number;
  page: number;
  pageSize: number;
}

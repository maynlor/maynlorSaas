export interface CreateClientMemoryInputDTO {
  content: string;
}

export interface ClientMemoryOutputDTO {
  id: string;
  businessId: string;
  clientId: string;
  content: string;
  createdAt: string;
}

export interface ListClientMemoriesOutputDTO {
  items: ClientMemoryOutputDTO[];
}

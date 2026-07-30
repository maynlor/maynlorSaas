export interface MessageOutputDTO {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface ListMessagesOutputDTO {
  items: MessageOutputDTO[];
  total: number;
  page: number;
  pageSize: number;
}

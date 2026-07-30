export interface ConversationOutputDTO {
  id: string;
  clientId: string;
  channel: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListConversationsOutputDTO {
  items: ConversationOutputDTO[];
  total: number;
  page: number;
  pageSize: number;
}

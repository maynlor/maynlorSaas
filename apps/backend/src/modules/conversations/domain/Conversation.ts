export interface ConversationProps {
  id: string;
  businessId: string;
  clientId: string;
  channel: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Conversation {
  private constructor(private readonly props: ConversationProps) {}

  static create(input: {
    businessId: string;
    clientId: string;
    channel?: string | undefined;
  }): Conversation {
    const now = new Date();
    return new Conversation({
      id: crypto.randomUUID(),
      businessId: input.businessId,
      clientId: input.clientId,
      channel: input.channel ?? "api",
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: ConversationProps): Conversation {
    return new Conversation(props);
  }

  get id(): string {
    return this.props.id;
  }

  get businessId(): string {
    return this.props.businessId;
  }

  get clientId(): string {
    return this.props.clientId;
  }

  get channel(): string {
    return this.props.channel;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

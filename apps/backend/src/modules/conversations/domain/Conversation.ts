export interface ConversationProps {
  id: string;
  businessId: string;
  clientId: string;
  channel: string;
  /** Cuándo una persona tomó la conversación. `null` = el bot responde. */
  botPausedAt: Date | null;
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
      botPausedAt: null,
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

  get botPausedAt(): Date | null {
    return this.props.botPausedAt;
  }

  /**
   * Mientras una persona esté atendiendo, la IA no debe responder: el cliente
   * recibiría dos respuestas distintas al mismo mensaje.
   */
  get isBotPaused(): boolean {
    return this.props.botPausedAt !== null;
  }

  /**
   * Idempotente a propósito: cada respuesta manual la invoca, y renovar la
   * marca en cada mensaje perdería el dato de cuándo empezó la intervención.
   */
  pauseBot(): void {
    if (this.props.botPausedAt === null) {
      this.props.botPausedAt = new Date();
      this.props.updatedAt = new Date();
    }
  }

  resumeBot(): void {
    this.props.botPausedAt = null;
    this.props.updatedAt = new Date();
  }
}

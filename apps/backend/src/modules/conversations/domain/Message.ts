/**
 * `agent` es una respuesta escrita por una persona del negocio desde el panel.
 * Se distingue de `assistant` para poder auditar qué contestó la IA y qué un
 * humano; de cara al modelo, ambas son turnos del asistente.
 */
export type MessageRole = "user" | "assistant" | "agent";

export interface MessageProps {
  id: string;
  conversationId: string;
  businessId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

export class Message {
  private constructor(private readonly props: MessageProps) {}

  static create(input: {
    conversationId: string;
    businessId: string;
    role: MessageRole;
    content: string;
  }): Message {
    return new Message({
      id: crypto.randomUUID(),
      conversationId: input.conversationId,
      businessId: input.businessId,
      role: input.role,
      content: input.content,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: MessageProps): Message {
    return new Message(props);
  }

  get id(): string {
    return this.props.id;
  }

  get conversationId(): string {
    return this.props.conversationId;
  }

  get businessId(): string {
    return this.props.businessId;
  }

  get role(): MessageRole {
    return this.props.role;
  }

  get content(): string {
    return this.props.content;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}

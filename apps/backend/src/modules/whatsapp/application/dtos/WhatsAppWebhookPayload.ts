export interface WhatsAppMediaObject {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
}

export interface WhatsAppDocumentObject extends WhatsAppMediaObject {
  filename?: string;
}

export interface WhatsAppInteractiveObject {
  type: string;
  button_reply?: { id: string; title: string };
}

export interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: WhatsAppMediaObject;
  audio?: WhatsAppMediaObject;
  video?: WhatsAppMediaObject;
  document?: WhatsAppDocumentObject;
  interactive?: WhatsAppInteractiveObject;
}

export interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

export interface WhatsAppChangeValue {
  messaging_product: string;
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppIncomingMessage[];
}

export interface WhatsAppChange {
  value: WhatsAppChangeValue;
  field: string;
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export type BridgeAdapterStatus = {
  platform: string;
  running: boolean;
  connectedAt: string | null;
  error: string | null;
};

export type BridgeProbeResult = {
  ok: boolean;
  message: string;
};

export type BridgeFileAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
};

export type BridgeInboundMessage = {
  platform: string;
  chatId: string;
  userId?: string;
  text: string;
  messageId: string;
  timestamp: number;
  callbackData?: string;
  callbackMessageId?: string;
  updateId?: number;
  attachments?: BridgeFileAttachment[];
};

export type BridgeOutboundMessage = {
  platform: string;
  chatId: string;
  text: string;
  threadId?: string;
  replyToMessageId?: string;
  inlineButtons?: Array<Array<{ text: string; callbackData: string }>>;
  parseMode?: "plain" | "HTML" | "Markdown";
};

export type BridgePreviewCapabilities = {
  supported: boolean;
  privateOnly?: boolean;
};

export abstract class BaseBridgeAdapter {
  abstract readonly platform: string;

  abstract start(): Promise<void>;

  abstract stop(): Promise<void>;

  abstract validateConfig(): string | null;

  abstract consumeOne(): Promise<BridgeInboundMessage | null>;

  abstract send(message: BridgeOutboundMessage): Promise<void>;

  abstract getStatus(): BridgeAdapterStatus;

  acknowledgeUpdate?(_updateId: number): void;
  getPreviewCapabilities?(_chatId: string): BridgePreviewCapabilities | null;
  sendPreview?(
    _chatId: string,
    _text: string,
    _draftId: number,
  ): Promise<"sent" | "skip" | "degrade">;
  endPreview?(_chatId: string, _draftId: number): void;
  onMessageStart?(_chatId: string): void;
  onMessageEnd?(_chatId: string): void;

  async probe(): Promise<BridgeProbeResult> {
    const validation = this.validateConfig();
    if (validation) {
      return { ok: false, message: validation };
    }
    return { ok: true, message: `${this.platform} bridge is configured` };
  }
}

import * as lark from "@larksuiteoapi/node-sdk";

type FeishuGatewayConfig = {
  appId: string;
  appSecret: string;
  domain: string;
};

type CardActionHandler = (data: unknown) => Promise<unknown>;

const FALLBACK_TOAST = {
  toast: { type: "info" as const, content: "已收到，正在处理..." },
};

function resolveDomain(brand: string): lark.Domain | string {
  if (brand === "lark") {
    return lark.Domain.Lark;
  }
  if (brand === "feishu") {
    return lark.Domain.Feishu;
  }
  return brand.replace(/\/+$/, "");
}

export class FeishuGateway {
  private client: lark.Client | null = null;
  private wsClient: lark.WSClient | null = null;
  private running = false;
  private onMessage: ((data: unknown) => void) | null = null;
  private cardActionHandler: CardActionHandler | null = null;
  private eventDispatcher = new lark.EventDispatcher({
    encryptKey: "",
    verificationToken: "",
  });

  constructor(private readonly config: FeishuGatewayConfig) {}

  getRestClient(): lark.Client | null {
    return this.client;
  }

  registerMessageHandler(handler: (data: unknown) => void): void {
    this.onMessage = handler;
    this.eventDispatcher.register({
      "im.message.receive_v1": ((data: unknown) => {
        handler(data);
      }) as any,
    });
  }

  registerCardActionHandler(handler: CardActionHandler): void {
    this.cardActionHandler = handler;
    this.eventDispatcher.register({
      "card.action.trigger": ((data: unknown) => this.safeCardActionHandler(data)) as any,
    });
  }

  emitMessageForTest(data: unknown): void {
    this.onMessage?.(data);
  }

  private async safeCardActionHandler(data: unknown): Promise<unknown> {
    if (!this.cardActionHandler) {
      return FALLBACK_TOAST;
    }

    try {
      const result = await Promise.race([
        this.cardActionHandler(data),
        new Promise<undefined>((resolve) => {
          setTimeout(() => resolve(undefined), 2_500);
        }),
      ]);
      return result && typeof result === "object" ? result : FALLBACK_TOAST;
    } catch (error) {
      console.error("[bridge/feishu-gateway] card action handler failed", error);
      return FALLBACK_TOAST;
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    const domain = resolveDomain(this.config.domain);
    this.client = new lark.Client({
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      domain,
      disableTokenCache: false,
    });

    this.wsClient = new lark.WSClient({
      appId: this.config.appId,
      appSecret: this.config.appSecret,
      domain,
      loggerLevel: lark.LoggerLevel.warn,
    });

    const wsClient = this.wsClient as any;
    if (typeof wsClient.handleEventData === "function") {
      const originalHandleEventData = wsClient.handleEventData.bind(wsClient);
      wsClient.handleEventData = (data: any) => {
        const messageType = data?.headers?.find?.((header: any) => header.key === "type")?.value;
        if (messageType === "card") {
          return originalHandleEventData({
            ...data,
            headers: data.headers.map((header: any) =>
              header.key === "type" ? { ...header, value: "event" } : header,
            ),
          });
        }
        return originalHandleEventData(data);
      };
    }

    await this.wsClient.start({ eventDispatcher: this.eventDispatcher });
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
    this.wsClient = null;
    this.client = null;
  }

  isRunning(): boolean {
    return this.running;
  }
}

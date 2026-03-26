import {
  BaseBridgeAdapter,
  type BridgeAdapterStatus,
  type BridgeInboundMessage,
  type BridgeOutboundMessage,
} from "../base-adapter.js";
import {
  createFeishuCardStreamController,
  type FeishuCardStreamController,
} from "../feishu/card-controller.js";
import { FeishuGateway } from "../feishu/gateway.js";
import { parseFeishuInboundMessage } from "../feishu/inbound.js";
import { sendFeishuMessage } from "../feishu/outbound.js";

export class FeishuBridgeAdapter extends BaseBridgeAdapter {
  readonly platform = "feishu";
  private running = false;
  private inbox: BridgeInboundMessage[] = [];
  private gateway: FeishuGateway | null = null;
  private waiter: ((message: BridgeInboundMessage | null) => void) | null = null;
  private cardController: FeishuCardStreamController | null = null;

  constructor(private readonly settings: Record<string, string>) {
    super();
  }

  private enqueueMessage(message: BridgeInboundMessage) {
    if (this.waiter) {
      const resolve = this.waiter;
      this.waiter = null;
      resolve(message);
      return;
    }
    this.inbox.push(message);
  }

  async start(): Promise<void> {
    if (!this.gateway) {
      this.gateway = new FeishuGateway({
        appId: this.settings.bridge_feishu_app_id,
        appSecret: this.settings.bridge_feishu_app_secret,
        domain: this.settings.bridge_feishu_domain || "feishu",
      });
      this.gateway.registerMessageHandler((data: unknown) => {
        const inbound = parseFeishuInboundMessage(data);
        if (inbound) {
          this.enqueueMessage(inbound);
        }
      });
    }
    await this.gateway.start();
    this.running = true;
  }

  async stop(): Promise<void> {
    await this.gateway?.stop();
    this.cardController = null;
    this.running = false;
    if (this.waiter) {
      const resolve = this.waiter;
      this.waiter = null;
      resolve(null);
    }
  }

  async consumeOne(): Promise<BridgeInboundMessage | null> {
    const next = this.inbox.shift();
    if (next) {
      return next;
    }
    if (!this.running) {
      return null;
    }
    return new Promise<BridgeInboundMessage | null>((resolve) => {
      this.waiter = resolve;
    });
  }

  async send(message: BridgeOutboundMessage): Promise<void> {
    const validation = this.validateConfig();
    if (validation) {
      throw new Error(validation);
    }
    const client = this.gateway?.getRestClient();
    if (!client) {
      throw new Error("Feishu REST client is unavailable");
    }
    await sendFeishuMessage(client, message);
  }

  validateConfig(): string | null {
    if (this.settings.bridge_feishu_enabled !== "true") {
      return "bridge_feishu_enabled is not true";
    }
    if (!this.settings.bridge_feishu_app_id) {
      return "bridge_feishu_app_id not configured";
    }
    if (!this.settings.bridge_feishu_app_secret) {
      return "bridge_feishu_app_secret not configured";
    }
    return null;
  }

  getStatus(): BridgeAdapterStatus {
    return {
      platform: this.platform,
      running: this.running,
      connectedAt: null,
      error: this.validateConfig(),
    };
  }

  getCardStreamController() {
    const client = this.gateway?.getRestClient();
    if (!client) {
      return null;
    }
    this.cardController ??= createFeishuCardStreamController(
      {
        throttleMs: 200,
        footer: { status: true, elapsed: true },
      },
      client,
    );
    return this.cardController;
  }

  async probe() {
    const validation = this.validateConfig();
    if (validation) {
      return { ok: false, message: validation };
    }

    const baseUrl =
      this.settings.bridge_feishu_domain === "lark"
        ? "https://open.larksuite.com"
        : "https://open.feishu.cn";

    const tokenResponse = await fetch(
      `${baseUrl}/open-apis/auth/v3/tenant_access_token/internal`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: this.settings.bridge_feishu_app_id,
          app_secret: this.settings.bridge_feishu_app_secret,
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const tokenPayload = (await tokenResponse.json()) as {
      tenant_access_token?: string;
      msg?: string;
    };

    if (!tokenPayload.tenant_access_token) {
      return {
        ok: false,
        message: tokenPayload.msg || "Failed to get Feishu access token",
      };
    }

    const botResponse = await fetch(`${baseUrl}/open-apis/bot/v3/info/`, {
      headers: {
        Authorization: `Bearer ${tokenPayload.tenant_access_token}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    const botPayload = (await botResponse.json()) as {
      bot?: { app_name?: string; open_id?: string };
      msg?: string;
    };

    if (!botPayload.bot?.open_id) {
      return {
        ok: false,
        message: botPayload.msg || "Could not retrieve Feishu bot info",
      };
    }

    return {
      ok: true,
      message: botPayload.bot.app_name || botPayload.bot.open_id,
    };
  }
}

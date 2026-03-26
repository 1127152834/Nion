import fs from "node:fs";
import path from "node:path";

export type WeixinBridgeAccount = {
  accountId: string;
  userId: string;
  baseUrl: string;
  cdnBaseUrl: string;
  token: string;
  name: string;
  enabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WeixinContextTokenRecord = {
  accountId: string;
  peerUserId: string;
  contextToken: string;
  updatedAt: string;
};

type WeixinStoreDocument = {
  accounts: WeixinBridgeAccount[];
  contextTokens: WeixinContextTokenRecord[];
};

const DEFAULT_DOCUMENT: WeixinStoreDocument = {
  accounts: [],
  contextTokens: [],
};

export function createWeixinBridgeStore(filePath: string) {
  const resolvedPath = path.resolve(filePath);

  const ensureParent = () => {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  };

  const readDocument = (): WeixinStoreDocument => {
    if (!fs.existsSync(resolvedPath)) {
      return { ...DEFAULT_DOCUMENT };
    }

    const raw = fs.readFileSync(resolvedPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<WeixinStoreDocument>;
    return {
      accounts: Array.isArray(parsed.accounts) ? [...parsed.accounts] : [],
      contextTokens: Array.isArray(parsed.contextTokens) ? [...parsed.contextTokens] : [],
    };
  };

  const writeDocument = (document: WeixinStoreDocument) => {
    ensureParent();
    fs.writeFileSync(resolvedPath, JSON.stringify(document, null, 2), "utf8");
  };

  const listAccounts = () => readDocument().accounts;

  const upsertAccount = (input: {
    accountId: string;
    userId: string;
    baseUrl: string;
    cdnBaseUrl: string;
    token: string;
    name?: string;
    enabled?: boolean;
  }): WeixinBridgeAccount => {
    const document = readDocument();
    const now = new Date().toISOString();
    const existingIndex = document.accounts.findIndex((item) => item.accountId === input.accountId);

    const nextAccount: WeixinBridgeAccount = existingIndex >= 0
      ? {
          ...document.accounts[existingIndex],
          ...input,
          name: input.name ?? document.accounts[existingIndex].name,
          enabled: input.enabled ?? document.accounts[existingIndex].enabled,
          lastLoginAt: now,
          updatedAt: now,
        }
      : {
          accountId: input.accountId,
          userId: input.userId,
          baseUrl: input.baseUrl,
          cdnBaseUrl: input.cdnBaseUrl,
          token: input.token,
          name: input.name ?? input.accountId,
          enabled: input.enabled ?? true,
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now,
        };

    if (existingIndex >= 0) {
      document.accounts[existingIndex] = nextAccount;
    } else {
      document.accounts.push(nextAccount);
    }

    writeDocument(document);
    return nextAccount;
  };

  const setAccountEnabled = (accountId: string, enabled: boolean) => {
    const document = readDocument();
    const index = document.accounts.findIndex((item) => item.accountId === accountId);
    if (index < 0) {
      return null;
    }
    document.accounts[index] = {
      ...document.accounts[index],
      enabled,
      updatedAt: new Date().toISOString(),
    };
    writeDocument(document);
    return document.accounts[index];
  };

  const deleteAccount = (accountId: string) => {
    const document = readDocument();
    const nextAccounts = document.accounts.filter((item) => item.accountId !== accountId);
    const removed = nextAccounts.length !== document.accounts.length;
    if (!removed) {
      return false;
    }
    document.accounts = nextAccounts;
    document.contextTokens = document.contextTokens.filter((item) => item.accountId !== accountId);
    writeDocument(document);
    return true;
  };

  const getAccount = (accountId: string) =>
    readDocument().accounts.find((item) => item.accountId === accountId) ?? null;

  const getContextToken = (accountId: string, peerUserId: string) =>
    readDocument().contextTokens.find(
      (item) => item.accountId === accountId && item.peerUserId === peerUserId,
    )?.contextToken ?? "";

  const upsertContextToken = (accountId: string, peerUserId: string, contextToken: string) => {
    const document = readDocument();
    const now = new Date().toISOString();
    const existingIndex = document.contextTokens.findIndex(
      (item) => item.accountId === accountId && item.peerUserId === peerUserId,
    );

    const record: WeixinContextTokenRecord = {
      accountId,
      peerUserId,
      contextToken,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      document.contextTokens[existingIndex] = record;
    } else {
      document.contextTokens.push(record);
    }

    writeDocument(document);
    return record;
  };

  return {
    listAccounts,
    getAccount,
    upsertAccount,
    setAccountEnabled,
    deleteAccount,
    getContextToken,
    upsertContextToken,
  };
}

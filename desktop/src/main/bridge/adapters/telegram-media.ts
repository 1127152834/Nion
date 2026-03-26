import type { BridgeFileAttachment } from "../base-adapter.js";

const TELEGRAM_API = "https://api.telegram.org";
const TELEGRAM_DEFAULT_MAX_IMAGE_SIZE = 20 * 1024 * 1024;

export type TelegramPhotoSize = {
  file_id: string;
  width: number;
  height: number;
  file_size?: number;
};

export type TelegramDocument = {
  file_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
};

function inferTelegramMimeType(filePath: string) {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return undefined;
  }
}

function selectOptimalTelegramPhoto(photos: TelegramPhotoSize[]) {
  if (photos.length === 1) {
    return photos[0];
  }
  return [...photos].sort((left, right) => {
    const leftLongEdge = Math.max(left.width, left.height);
    const rightLongEdge = Math.max(right.width, right.height);
    return leftLongEdge - rightLongEdge;
  }).at(-1)!;
}

async function downloadTelegramFileById(
  botToken: string,
  fileId: string,
  messageId: string,
  maxSize = TELEGRAM_DEFAULT_MAX_IMAGE_SIZE,
): Promise<BridgeFileAttachment | null> {
  const getFileResponse = await fetch(`${TELEGRAM_API}/bot${botToken}/getFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
    signal: AbortSignal.timeout(15_000),
  });
  const getFilePayload = (await getFileResponse.json()) as {
    ok?: boolean;
    result?: { file_path?: string; file_size?: number };
  };

  if (!getFilePayload.ok || !getFilePayload.result?.file_path) {
    return null;
  }

  const filePath = getFilePayload.result.file_path;
  const fileSize = getFilePayload.result.file_size;
  if (typeof fileSize === "number" && fileSize > maxSize) {
    return null;
  }

  const downloadResponse = await fetch(`${TELEGRAM_API}/file/bot${botToken}/${filePath}`, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!downloadResponse.ok) {
    return null;
  }

  const buffer = Buffer.from(await downloadResponse.arrayBuffer());
  if (buffer.length > maxSize) {
    return null;
  }

  return {
    id: `${messageId}:${fileId}`,
    name: filePath.split("/").pop() || "telegram-image",
    type: inferTelegramMimeType(filePath) || "image/jpeg",
    size: buffer.length,
    data: buffer.toString("base64"),
  };
}

export async function downloadTelegramPhoto(
  botToken: string,
  photos: TelegramPhotoSize[],
  messageId: string,
) {
  return downloadTelegramFileById(
    botToken,
    selectOptimalTelegramPhoto(photos).file_id,
    messageId,
  );
}

export async function downloadTelegramDocumentImage(
  botToken: string,
  document: TelegramDocument,
  messageId: string,
) {
  const mime = document.mime_type || inferTelegramMimeType(document.file_name || "");
  if (!mime?.startsWith("image/")) {
    return null;
  }
  if (typeof document.file_size === "number" && document.file_size > TELEGRAM_DEFAULT_MAX_IMAGE_SIZE) {
    return null;
  }
  return downloadTelegramFileById(botToken, document.file_id, messageId);
}

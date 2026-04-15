import { createHash } from "node:crypto";
import { once } from "node:events";
import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
  type WriteStream
} from "node:fs";
import path from "node:path";

import { dialog } from "electron";

function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? "");
}

type RetrievalModelId =
  | "zh-embedding-lite"
  | "zh-rerank-lite"
  | "en-embedding-lite"
  | "en-rerank-lite";
type RetrievalPackId = "zh" | "en";

interface RetrievalModelSpec {
  modelId: RetrievalModelId;
  family: "embedding" | "rerank";
  displayName: string;
  sourceModelId: string;
  sourceFile: string;
  assets: Array<{ role: "onnx" | "tokenizer" | "config"; sourceFile: string; required: boolean }>;
  fallbackSources?: Array<{ sourceModelId: string; sourceFile: string }>;
  approxSizeBytes: number;
  license: string;
}

interface RetrievalPackSpec {
  packId: RetrievalPackId;
  displayName: string;
  locale: string;
  modelIds: RetrievalModelId[];
  approxSizeBytes: number;
}

interface RetrievalModelRegistryItem {
  installed: boolean;
  file_path: string;
  assets?: Record<string, string>;
  sha256: string;
  size_bytes: number;
  source: "modelscope" | "manual_import";
  updated_at: string;
  pack_id: RetrievalPackId;
}

interface RetrievalRegistryStore {
  version: 1;
  updated_at: string | null;
  models: Partial<Record<RetrievalModelId, RetrievalModelRegistryItem>>;
}

export interface RetrievalModelDownloadProgress {
  packId: RetrievalPackId;
  modelId: RetrievalModelId;
  family: "embedding" | "rerank";
  status: "started" | "downloading" | "verifying" | "completed" | "failed" | "cancelled";
  downloadedBytes: number;
  totalBytes: number | null;
  message: string;
}

export interface RetrievalModelManagerOptions {
  appDataDir: string;
  onProgress?: (payload: RetrievalModelDownloadProgress) => void;
}

export interface RetrievalPackActionResult {
  success: boolean;
  message: string;
}

const MODEL_SPECS: Record<RetrievalModelId, RetrievalModelSpec> = {
  "zh-embedding-lite": {
    modelId: "zh-embedding-lite",
    family: "embedding",
    displayName: "Jina Embeddings v2 Base ZH (INT8)",
    sourceModelId: "jinaai/jina-embeddings-v2-base-zh",
    sourceFile: "onnx/model_quantized.onnx",
    assets: [
      { role: "onnx", sourceFile: "onnx/model_quantized.onnx", required: true },
      { role: "tokenizer", sourceFile: "tokenizer.json", required: true },
      { role: "config", sourceFile: "config.json", required: true }
    ],
    approxSizeBytes: 154 * 1024 * 1024,
    license: "apache-2.0"
  },
  "zh-rerank-lite": {
    modelId: "zh-rerank-lite",
    family: "rerank",
    displayName: "Jina Reranker v2 Base Multilingual (Quantized)",
    sourceModelId: "jinaai/jina-reranker-v2-base-multilingual",
    sourceFile: "onnx/model_quantized.onnx",
    assets: [
      { role: "onnx", sourceFile: "onnx/model_quantized.onnx", required: true },
      { role: "tokenizer", sourceFile: "tokenizer.json", required: true },
      { role: "config", sourceFile: "config.json", required: true }
    ],
    fallbackSources: [
      {
        sourceModelId: "jinaai/jina-reranker-v2-base-multilingual",
        sourceFile: "onnx/model_int8.onnx"
      }
    ],
    approxSizeBytes: 279577152,
    license: "apache-2.0"
  },
  "en-embedding-lite": {
    modelId: "en-embedding-lite",
    family: "embedding",
    displayName: "BGE Small EN v1.5 (ONNX)",
    sourceModelId: "BAAI/bge-small-en-v1.5",
    sourceFile: "onnx/model.onnx",
    assets: [
      { role: "onnx", sourceFile: "onnx/model.onnx", required: true },
      { role: "tokenizer", sourceFile: "tokenizer.json", required: true },
      { role: "config", sourceFile: "config.json", required: true }
    ],
    approxSizeBytes: 127 * 1024 * 1024,
    license: "mit"
  },
  "en-rerank-lite": {
    modelId: "en-rerank-lite",
    family: "rerank",
    displayName: "Jina Reranker v1 Tiny EN (INT8)",
    sourceModelId: "jinaai/jina-reranker-v1-tiny-en",
    sourceFile: "onnx/model_int8.onnx",
    assets: [
      { role: "onnx", sourceFile: "onnx/model_int8.onnx", required: true },
      { role: "tokenizer", sourceFile: "tokenizer.json", required: true },
      { role: "config", sourceFile: "config.json", required: true }
    ],
    approxSizeBytes: 32 * 1024 * 1024,
    license: "apache-2.0"
  }
};

const PACK_SPECS: Record<RetrievalPackId, RetrievalPackSpec> = {
  zh: {
    packId: "zh",
    displayName: "Chinese Retrieval Pack",
    locale: "zh-CN",
    modelIds: ["zh-embedding-lite", "zh-rerank-lite"],
    approxSizeBytes: 154 * 1024 * 1024 + 279577152
  },
  en: {
    packId: "en",
    displayName: "English Retrieval Pack",
    locale: "en-US",
    modelIds: ["en-embedding-lite", "en-rerank-lite"],
    approxSizeBytes: (127 + 32) * 1024 * 1024
  }
};

export class RetrievalModelManager {
  private readonly rootDir: string;
  private readonly registryPath: string;
  private readonly downloadsDir: string;
  private readonly onProgress?: (payload: RetrievalModelDownloadProgress) => void;
  private readonly activePackDownloads = new Map<RetrievalPackId, AbortController>();
  private readonly activeModelDownloads = new Map<RetrievalModelId, AbortController>();

  constructor(options: RetrievalModelManagerOptions) {
    this.rootDir = path.join(options.appDataDir, "models", "retrieval");
    this.registryPath = path.join(this.rootDir, "registry.json");
    this.downloadsDir = path.join(this.rootDir, "downloads");
    this.onProgress = options.onProgress;
    mkdirSync(this.rootDir, { recursive: true });
    mkdirSync(this.downloadsDir, { recursive: true });
  }

  private getText() {
    return {
      zhPackDisplayName: "中文检索包",
      modelDownloading: "该模型正在下载。",
      modelDownloadCompleted: "模型下载完成。",
      downloadCancelled: "下载已取消。",
      downloadFailedPrefix: "下载失败：",
      noActiveDownload: "没有正在进行的下载任务。",
      cancelTaskCompleted: "已取消下载任务。",
      modelRemoved: "模型已删除。",
      selectOnnxTitleTemplate: "选择 {displayName} 的 ONNX 文件",
      importCancelled: "已取消导入。",
      modelImportSuccess: "模型导入成功。",
      packDownloading: "该模型包正在下载。",
      packDownloadCompleted: "模型包下载完成。",
      packRemoved: "模型包已删除。",
      packImportSuccess: "模型包导入成功。",
      progressStartTemplate: "开始下载 {displayName}",
      progressDownloadingTemplate: "正在下载 {displayName}",
      progressCancelledTemplate: "已取消下载 {displayName}",
      progressFailedTemplate: "下载 {displayName} 失败：{error}",
      progressVerifiedTemplate: "正在校验 {displayName}",
      progressCompletedTemplate: "{displayName} 下载完成。",
    };
  }

  listModels(): Record<string, unknown> {
    const registry = this.readRegistry();
    const models = Object.values(MODEL_SPECS).map((spec) => {
      const entry = registry.models[spec.modelId];
      const ready = this.isModelReady(spec, entry);
      const packId = this.packIdOfModel(spec.modelId);
      return {
        model_id: spec.modelId,
        family: spec.family,
        display_name: spec.displayName,
        source_model_id: spec.sourceModelId,
        source_file: spec.sourceFile,
        assets: spec.assets,
        approx_size_bytes: spec.approxSizeBytes,
        license: spec.license,
        installed: ready,
        pack_id: packId,
        locale: PACK_SPECS[packId].locale,
        downloading: this.activeModelDownloads.has(spec.modelId)
      };
    });

    return {
      root_dir: this.rootDir,
      registry_file: this.registryPath,
      models
    };
  }

  listPacks(): Record<string, unknown> {
    const registry = this.readRegistry();
    const packs = Object.values(PACK_SPECS).map((pack) => {
      let installedCount = 0;
      const models = pack.modelIds.map((modelId) => {
        const spec = MODEL_SPECS[modelId];
        const entry = registry.models[modelId];
        const ready = this.isModelReady(spec, entry);
        if (ready) {
          installedCount += 1;
        }
        return {
          model_id: modelId,
          family: spec.family,
          display_name: spec.displayName,
          source_model_id: spec.sourceModelId,
          source_file: spec.sourceFile,
          assets: spec.assets,
          approx_size_bytes: spec.approxSizeBytes,
          license: spec.license,
          installed: ready,
          downloading: this.activeModelDownloads.has(modelId)
        };
      });
      return {
        pack_id: pack.packId,
        display_name:
          pack.packId === "zh"
            ? (this.getText().zhPackDisplayName || pack.displayName)
            : pack.displayName,
        locale: pack.locale,
        approx_size_bytes: pack.approxSizeBytes,
        installed_count: installedCount,
        total_count: pack.modelIds.length,
        installed: installedCount === pack.modelIds.length,
        downloading: this.activePackDownloads.has(pack.packId),
        models
      };
    });
    return {
      root_dir: this.rootDir,
      registry_file: this.registryPath,
      packs
    };
  }

  async downloadModel(modelId: string): Promise<RetrievalPackActionResult> {
    const t = this.getText();
    const normalizedModelId = this.normalizeModelId(modelId);
    if (this.activeModelDownloads.has(normalizedModelId)) {
      return { success: false, message: t.modelDownloading };
    }

    const controller = new AbortController();
    this.activeModelDownloads.set(normalizedModelId, controller);
    try {
      await this.downloadModelInternal(this.packIdOfModel(normalizedModelId), normalizedModelId, controller);
      return { success: true, message: t.modelDownloadCompleted };
    } catch (error) {
      if (controller.signal.aborted) {
        return { success: false, message: t.downloadCancelled };
      }
      return { success: false, message: `${t.downloadFailedPrefix}${String(error)}` };
    } finally {
      this.activeModelDownloads.delete(normalizedModelId);
    }
  }

  cancelModel(modelId: string): RetrievalPackActionResult {
    const t = this.getText();
    const normalizedModelId = this.normalizeModelId(modelId);
    const controller = this.activeModelDownloads.get(normalizedModelId);
    if (!controller) {
      return { success: false, message: t.noActiveDownload };
    }
    controller.abort();
    return { success: true, message: t.cancelTaskCompleted };
  }

  removeModel(modelId: string): RetrievalPackActionResult {
    const t = this.getText();
    const normalizedModelId = this.normalizeModelId(modelId);
    const registry = this.readRegistry();
    const existing = registry.models[normalizedModelId];
    if (existing?.file_path && existsSync(existing.file_path)) {
      rmSync(existing.file_path, { force: true });
    }
    delete registry.models[normalizedModelId];
    registry.updated_at = new Date().toISOString();
    this.writeRegistry(registry);
    return { success: true, message: t.modelRemoved };
  }

  async importModel(modelId: string): Promise<RetrievalPackActionResult> {
    const t = this.getText();
    const normalizedModelId = this.normalizeModelId(modelId);
    const spec = MODEL_SPECS[normalizedModelId];
    const result = await dialog.showOpenDialog({
      title: renderTemplate(t.selectOnnxTitleTemplate, { displayName: spec.displayName }),
      properties: ["openFile"],
      filters: [{ name: "ONNX", extensions: ["onnx"] }, { name: "All Files", extensions: ["*"] }]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, message: t.importCancelled };
    }

    const srcPath = result.filePaths[0];
    const targetPath = this.resolveModelTargetPath(spec);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    copyFileSync(srcPath, targetPath);

    const registry = this.readRegistry();
    registry.models[normalizedModelId] = {
      installed: true,
      file_path: targetPath,
      assets: { onnx: targetPath },
      sha256: this.computeSha256(targetPath),
      size_bytes: this.safeFileSize(targetPath),
      source: "manual_import",
      updated_at: new Date().toISOString(),
      pack_id: this.packIdOfModel(normalizedModelId)
    };
    registry.updated_at = new Date().toISOString();
    this.writeRegistry(registry);

    return { success: true, message: t.modelImportSuccess };
  }

  async downloadPack(packId: string): Promise<RetrievalPackActionResult> {
    const t = this.getText();
    const normalizedPackId = this.normalizePackId(packId);
    if (this.activePackDownloads.has(normalizedPackId)) {
      return { success: false, message: t.packDownloading };
    }

    const controller = new AbortController();
    this.activePackDownloads.set(normalizedPackId, controller);
    const pack = PACK_SPECS[normalizedPackId];

    try {
      for (const modelId of pack.modelIds) {
        if (!this.activeModelDownloads.has(modelId)) {
          this.activeModelDownloads.set(modelId, controller);
        }
        try {
          await this.downloadModelInternal(pack.packId, modelId, controller);
        } finally {
          this.activeModelDownloads.delete(modelId);
        }
      }
      return { success: true, message: t.packDownloadCompleted };
    } catch (error) {
      if (controller.signal.aborted) {
        return { success: false, message: t.downloadCancelled };
      }
      return { success: false, message: `${t.downloadFailedPrefix}${String(error)}` };
    } finally {
      this.activePackDownloads.delete(normalizedPackId);
    }
  }

  cancelPack(packId: string): RetrievalPackActionResult {
    const t = this.getText();
    const normalizedPackId = this.normalizePackId(packId);
    const controller = this.activePackDownloads.get(normalizedPackId);
    if (!controller) {
      return { success: false, message: t.noActiveDownload };
    }
    controller.abort();
    return { success: true, message: t.cancelTaskCompleted };
  }

  removePack(packId: string): RetrievalPackActionResult {
    const t = this.getText();
    const normalizedPackId = this.normalizePackId(packId);
    const pack = PACK_SPECS[normalizedPackId];
    const registry = this.readRegistry();
    for (const modelId of pack.modelIds) {
      const existing = registry.models[modelId];
      if (existing?.file_path && existsSync(existing.file_path)) {
        rmSync(existing.file_path, { force: true });
      }
      delete registry.models[modelId];
    }
    registry.updated_at = new Date().toISOString();
    this.writeRegistry(registry);
    return { success: true, message: t.packRemoved };
  }

  async importPack(packId: string): Promise<RetrievalPackActionResult> {
    const t = this.getText();
    const normalizedPackId = this.normalizePackId(packId);
    const pack = PACK_SPECS[normalizedPackId];

    for (const modelId of pack.modelIds) {
      const result = await this.importModel(modelId);
      if (!result.success) {
        return result;
      }
    }

    return { success: true, message: t.packImportSuccess };
  }

  private async downloadModelInternal(
    packId: RetrievalPackId,
    modelId: RetrievalModelId,
    controller: AbortController
  ): Promise<void> {
    const t = this.getText();
    const spec = MODEL_SPECS[modelId];
    const assetTargets = this.resolveModelAssetTargets(spec);
    for (const targetPath of Object.values(assetTargets)) {
      mkdirSync(path.dirname(targetPath), { recursive: true });
      rmSync(`${targetPath}.part`, { force: true });
    }

    this.emitProgress({
      packId,
      modelId,
      family: spec.family,
      status: "started",
      downloadedBytes: 0,
      totalBytes: null,
      message: renderTemplate(t.progressStartTemplate, { displayName: spec.displayName })
    });

    const completedAssets: Record<string, string> = {};
    let lastSha256 = "";
    let downloadedBytes = 0;
    let totalBytes: number | null = null;

    try {
      for (const asset of spec.assets) {
        const targetPath = assetTargets[asset.role];
        const result = await this.downloadAsset(spec, asset.sourceFile, targetPath, controller, {
          packId,
          modelId,
          family: spec.family,
          displayName: spec.displayName,
        });
        completedAssets[asset.role] = targetPath;
        lastSha256 = result.sha256;
        downloadedBytes += result.downloadedBytes;
        if (result.totalBytes !== null) {
          totalBytes = (totalBytes ?? 0) + result.totalBytes;
        }
      }
    } catch (error) {
      this.emitProgress({
        packId,
        modelId,
        family: spec.family,
        status: controller.signal.aborted ? "cancelled" : "failed",
        downloadedBytes,
        totalBytes,
        message: controller.signal.aborted
          ? renderTemplate(t.progressCancelledTemplate, { displayName: spec.displayName })
          : renderTemplate(t.progressFailedTemplate, { displayName: spec.displayName, error: String(error) }),
      });
      throw error;
    }

    this.emitProgress({
      packId,
      modelId,
      family: spec.family,
      status: "verifying",
      downloadedBytes,
      totalBytes,
      message: renderTemplate(t.progressVerifiedTemplate, { displayName: spec.displayName })
    });

    renameSync(partPath, targetPath);
    const registry = this.readRegistry();
    registry.models[modelId] = {
      installed: true,
      file_path: assetTargets.onnx,
      assets: completedAssets,
      sha256: lastSha256,
      size_bytes: this.safeFileSize(assetTargets.onnx),
      source: "modelscope",
      updated_at: new Date().toISOString(),
      pack_id: packId
    };
    registry.updated_at = new Date().toISOString();
    this.writeRegistry(registry);

    this.emitProgress({
      packId,
      modelId,
      family: spec.family,
      status: "completed",
      downloadedBytes,
      totalBytes,
      message: renderTemplate(t.progressCompletedTemplate, { displayName: spec.displayName })
    });
  }

  private async downloadAsset(
    spec: RetrievalModelSpec,
    sourceFile: string,
    targetPath: string,
    controller: AbortController,
    progress: {
      packId: RetrievalPackId;
      modelId: RetrievalModelId;
      family: "embedding" | "rerank";
      displayName: string;
    }
  ): Promise<{ sha256: string; downloadedBytes: number; totalBytes: number | null }> {
    const response = await this.fetchModelWithFallback(spec, sourceFile, controller);
    const responseBody = response.body;
    if (!responseBody) {
      throw new Error("model download response body is empty");
    }

    const totalBytes = Number.parseInt(response.headers.get("content-length") ?? "0", 10) || null;
    const partPath = `${targetPath}.part`;
    const writer = createWriteStream(partPath, { flags: "w" });
    const hash = createHash("sha256");
    const reader = responseBody.getReader();
    let downloadedBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (!value) {
          continue;
        }
        const chunk = Buffer.from(value);
        hash.update(chunk);
        downloadedBytes += chunk.length;
        if (!writer.write(chunk)) {
          await once(writer as WriteStream, "drain");
        }
        this.emitProgress({
          packId: progress.packId,
          modelId: progress.modelId,
          family: progress.family,
          status: "downloading",
          downloadedBytes,
          totalBytes,
          message: renderTemplate(this.getText().progressDownloadingTemplate, {
            displayName: progress.displayName,
          }),
        });
      }
    } finally {
      reader.releaseLock();
      await new Promise<void>((resolve) => writer.end(() => resolve()));
    }

    const sha256 = hash.digest("hex");
    renameSync(partPath, targetPath);
    return { sha256, downloadedBytes, totalBytes };
  }

  private normalizePackId(packId: string): RetrievalPackId {
    const normalized = packId.trim().toLowerCase();
    if (normalized !== "zh" && normalized !== "en") {
      throw new Error(`Unknown pack id: ${packId}`);
    }
    return normalized;
  }

  private normalizeModelId(modelId: string): RetrievalModelId {
    const normalized = modelId.trim() as RetrievalModelId;
    if (!(normalized in MODEL_SPECS)) {
      throw new Error(`Unknown model id: ${modelId}`);
    }
    return normalized;
  }

  private packIdOfModel(modelId: RetrievalModelId): RetrievalPackId {
    for (const [packId, pack] of Object.entries(PACK_SPECS) as Array<[RetrievalPackId, RetrievalPackSpec]>) {
      if (pack.modelIds.includes(modelId)) {
        return packId;
      }
    }
    throw new Error(`Pack not found for model id: ${modelId}`);
  }

  private resolveModelTargetPath(spec: RetrievalModelSpec): string {
    const modelFolder = spec.sourceModelId.replace("/", "__");
    const normalizedFile = spec.sourceFile.replace(/\//g, "__");
    return path.join(this.rootDir, "modelscope", modelFolder, normalizedFile);
  }

  private resolveModelAssetTargets(spec: RetrievalModelSpec): Record<string, string> {
    const modelFolder = spec.sourceModelId.replace("/", "__");
    return Object.fromEntries(
      spec.assets.map((asset) => [
        asset.role,
        path.join(this.rootDir, "modelscope", modelFolder, asset.sourceFile.replace(/\//g, "__")),
      ]),
    );
  }

  private toModelScopeUrl(sourceModelId: string, sourceFile: string): string {
    return `https://modelscope.cn/models/${sourceModelId}/resolve/master/${sourceFile}`;
  }

  private modelUrlCandidates(spec: RetrievalModelSpec, sourceFile: string): string[] {
    const sourcePairs = [
      { sourceModelId: spec.sourceModelId, sourceFile },
    ];
    const hosts = ["modelscope.cn", "www.modelscope.cn"];
    const branches = ["master", "main"];
    const urls: string[] = [];
    for (const pair of sourcePairs) {
      for (const host of hosts) {
        for (const branch of branches) {
          urls.push(`https://${host}/models/${pair.sourceModelId}/resolve/${branch}/${pair.sourceFile}`);
        }
      }
    }
    return urls;
  }

  private async fetchModelWithFallback(
    spec: RetrievalModelSpec,
    sourceFile: string,
    controller: AbortController
  ): Promise<Response> {
    const candidates = this.modelUrlCandidates(spec, sourceFile);
    let lastError = "";
    for (const url of candidates) {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          Accept: "application/octet-stream",
          "User-Agent": "nion-desktop-retrieval-model-manager"
        }
      });
      if (response.ok && response.body) {
        return response;
      }
      lastError = `HTTP ${response.status} ${response.statusText} @ ${url}`;
      if (response.body) {
        await response.body.cancel().catch(() => undefined);
      }
    }
    throw new Error(lastError || "no downloadable source found");
  }

  private readRegistry(): RetrievalRegistryStore {
    if (!existsSync(this.registryPath)) {
      return { version: 1, updated_at: null, models: {} };
    }
    try {
      const parsed = JSON.parse(readFileSync(this.registryPath, "utf-8")) as RetrievalRegistryStore;
      if (!parsed || typeof parsed !== "object" || typeof parsed.models !== "object") {
        return { version: 1, updated_at: null, models: {} };
      }
      return {
        version: 1,
        updated_at: parsed.updated_at ?? null,
        models: parsed.models ?? {}
      };
    } catch {
      return { version: 1, updated_at: null, models: {} };
    }
  }

  private writeRegistry(store: RetrievalRegistryStore): void {
    mkdirSync(path.dirname(this.registryPath), { recursive: true });
    writeFileSync(this.registryPath, JSON.stringify(store, null, 2), "utf-8");
  }

  private emitProgress(payload: RetrievalModelDownloadProgress): void {
    this.onProgress?.(payload);
  }

  private safeFileSize(filePath: string): number {
    try {
      const stat = statSync(filePath);
      return Number.isFinite(stat.size) ? stat.size : 0;
    } catch {
      return 0;
    }
  }

  private computeSha256(filePath: string): string {
    const content = readFileSync(filePath);
    return createHash("sha256").update(content).digest("hex");
  }
}

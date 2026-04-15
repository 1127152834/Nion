import { mkdtemp, mkdir, readdir, rename } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { shell } from "electron";

export type DesktopLocalActionPlan = {
  actions: Array<{
    action_type: string;
    target?: string;
    parameters?: Record<string, unknown>;
  }>;
};

export type DesktopLocalActionExecutionResult = {
  executed: Array<{
    action_type: string;
    status: "succeeded" | "failed" | "skipped";
    result_summary: string;
    error_reason?: string;
  }>;
};

type ExecutorDependencies = {
  captureFullScreen?: () => Promise<string>;
  captureActiveWindow?: () => Promise<string>;
  listDirectory?: (target: string) => Promise<string[]>;
  openPath?: (target: string) => Promise<void>;
  organizeDownloads?: () => Promise<{
    moved_count: number;
    trashed_count: number;
    summary: string;
  }>;
};

const TEMP_DOWNLOAD_EXTENSIONS = new Set([".tmp", ".crdownload", ".part"]);

async function defaultCaptureFullScreen(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "nion-local-actions-"));
  const outputPath = path.join(directory, "full-screen.png");
  const { execFile } = await import("node:child_process");

  await new Promise<void>((resolve, reject) => {
    execFile("screencapture", ["-x", outputPath], (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  return outputPath;
}

async function defaultCaptureActiveWindow(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "nion-local-actions-"));
  const outputPath = path.join(directory, "active-window.png");
  const { execFile } = await import("node:child_process");

  await new Promise<void>((resolve, reject) => {
    execFile("screencapture", ["-x", "-w", outputPath], (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  return outputPath;
}

async function defaultOrganizeDownloads(): Promise<{
  moved_count: number;
  trashed_count: number;
  summary: string;
}> {
  const downloadsDir = path.join(os.homedir(), "Downloads");
  const organizedDir = path.join(downloadsDir, "Organized");
  await mkdir(organizedDir, { recursive: true });

  const entries = await readdir(downloadsDir, { withFileTypes: true });
  let movedCount = 0;
  let trashedCount = 0;

  for (const entry of entries) {
    if (entry.name === "Organized" || entry.name.startsWith(".")) {
      continue;
    }
    const sourcePath = path.join(downloadsDir, entry.name);
    if (entry.isDirectory()) {
      continue;
    }
    const extension = path.extname(entry.name).toLowerCase();
    if (TEMP_DOWNLOAD_EXTENSIONS.has(extension)) {
      await shell.trashItem(sourcePath);
      trashedCount += 1;
      continue;
    }
    const destinationPath = path.join(organizedDir, entry.name);
    await rename(sourcePath, destinationPath);
    movedCount += 1;
  }

  return {
    moved_count: movedCount,
    trashed_count: trashedCount,
    summary: `Organized Downloads: moved ${movedCount} file(s), trashed ${trashedCount} temporary file(s)`,
  };
}

async function defaultListDirectory(target: string): Promise<string[]> {
  return readdir(target);
}

async function defaultOpenPath(target: string): Promise<void> {
  await shell.openPath(target);
}

export class LocalActionsExecutor {
  private readonly history: DesktopLocalActionExecutionResult[] = [];

  private readonly captureFullScreenImpl: () => Promise<string>;

  private readonly captureActiveWindowImpl: () => Promise<string>;

  private readonly organizeDownloadsImpl: () => Promise<{
    moved_count: number;
    trashed_count: number;
    summary: string;
  }>;

  private readonly listDirectoryImpl: (target: string) => Promise<string[]>;

  private readonly openPathImpl: (target: string) => Promise<void>;

  constructor(dependencies: ExecutorDependencies = {}) {
    this.captureFullScreenImpl =
      dependencies.captureFullScreen ?? defaultCaptureFullScreen;
    this.captureActiveWindowImpl =
      dependencies.captureActiveWindow ?? defaultCaptureActiveWindow;
    this.organizeDownloadsImpl =
      dependencies.organizeDownloads ?? defaultOrganizeDownloads;
    this.listDirectoryImpl = dependencies.listDirectory ?? defaultListDirectory;
    this.openPathImpl = dependencies.openPath ?? defaultOpenPath;
  }

  async executePlan(
    plan: DesktopLocalActionPlan,
  ): Promise<DesktopLocalActionExecutionResult> {
    const executed: DesktopLocalActionExecutionResult["executed"] = [];

    for (const action of plan.actions) {
      if (action.action_type === "capture_full_screen") {
        try {
          const outputPath = await this.captureFullScreenImpl();
          executed.push({
            action_type: action.action_type,
            status: "succeeded",
            result_summary: `Captured full screen to ${outputPath}`,
          });
        } catch (error) {
          executed.push({
            action_type: action.action_type,
            status: "failed",
            result_summary: "Failed to capture full screen",
            error_reason: error instanceof Error ? error.message : String(error),
          });
        }
        continue;
      }

      if (action.action_type === "capture_active_window") {
        try {
          const outputPath = await this.captureActiveWindowImpl();
          executed.push({
            action_type: action.action_type,
            status: "succeeded",
            result_summary: `Captured active window to ${outputPath}`,
          });
        } catch (error) {
          executed.push({
            action_type: action.action_type,
            status: "failed",
            result_summary: "Failed to capture active window",
            error_reason: error instanceof Error ? error.message : String(error),
          });
        }
        continue;
      }

      if (action.action_type === "organize_downloads") {
        try {
          const result = await this.organizeDownloadsImpl();
          executed.push({
            action_type: action.action_type,
            status: "succeeded",
            result_summary: result.summary,
          });
        } catch (error) {
          executed.push({
            action_type: action.action_type,
            status: "failed",
            result_summary: "Failed to organize Downloads",
            error_reason: error instanceof Error ? error.message : String(error),
          });
        }
        continue;
      }

      if (action.action_type === "list_directory" && action.target) {
        try {
          const entries = await this.listDirectoryImpl(action.target);
          executed.push({
            action_type: action.action_type,
            status: "succeeded",
            result_summary: `Listed ${entries.length} item(s) in ${action.target}`,
          });
        } catch (error) {
          executed.push({
            action_type: action.action_type,
            status: "failed",
            result_summary: "Failed to list directory",
            error_reason: error instanceof Error ? error.message : String(error),
          });
        }
        continue;
      }

      if (
        (action.action_type === "open_directory" || action.action_type === "open_file") &&
        action.target
      ) {
        try {
          await this.openPathImpl(action.target);
          executed.push({
            action_type: action.action_type,
            status: "succeeded",
            result_summary: `Opened ${action.target}`,
          });
        } catch (error) {
          executed.push({
            action_type: action.action_type,
            status: "failed",
            result_summary: `Failed to open ${action.target}`,
            error_reason: error instanceof Error ? error.message : String(error),
          });
        }
        continue;
      }

      executed.push({
        action_type: action.action_type,
        status: "skipped",
        result_summary: "Execution not supported for this local action yet",
      });
    }

    const result = { executed };
    this.history.unshift(result);
    if (this.history.length > 20) {
      this.history.length = 20;
    }
    return result;
  }

  async listHistory(): Promise<DesktopLocalActionExecutionResult[]> {
    return [...this.history];
  }
}

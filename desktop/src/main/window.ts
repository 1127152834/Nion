import { BrowserWindow } from "electron";

export type MainWindowOptions = {
  preloadPath: string;
  rendererUrl: string;
};

export async function createMainWindow(options: MainWindowOptions): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    webPreferences: {
      preload: options.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  const isDev = !process.mainModule?.filename.includes("app.asar");

  if (isDev) {
    window.webContents.on("console-message", (details) => {
      console.log(
        `[renderer:${details.level}] ${details.sourceId}:${details.lineNumber} ${details.message}`,
      );
    });
    window.webContents.on("did-finish-load", () => {
      console.log(`[renderer] loaded ${options.rendererUrl}`);
    });
    window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl) => {
      console.error(
        `[renderer] failed to load ${validatedUrl} (${errorCode} ${errorDescription})`,
      );
    });
    window.webContents.on("render-process-gone", (_event, details) => {
      console.error(`[renderer] process gone: ${details.reason}`);
    });
  }

  const showWindow = () => {
    if (!window.isDestroyed()) {
      window.show();
    }
  };

  window.once("ready-to-show", showWindow);
  await window.loadURL(options.rendererUrl);
  if (!window.isVisible()) {
    showWindow();
  }

  return window;
}

export function focusMainWindow(window: BrowserWindow | null): void {
  if (!window || window.isDestroyed()) {
    return;
  }

  if (window.isMinimized()) {
    window.restore();
  }
  window.focus();
}

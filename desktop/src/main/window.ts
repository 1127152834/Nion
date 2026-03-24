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
      sandbox: true,
    },
  });

  await window.loadURL(options.rendererUrl);
  window.once("ready-to-show", () => {
    window.show();
  });

  return window;
}

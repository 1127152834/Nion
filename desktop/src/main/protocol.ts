import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { app, net, protocol } from "electron";

export const DESKTOP_APP_PROTOCOL = "nion";

const PLACEHOLDER_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Nion Desktop</title>
  </head>
  <body>
    <main>
      <h1>Nion Desktop</h1>
      <p>The desktop renderer asset bridge will be wired in a later task.</p>
    </main>
  </body>
</html>`;

export async function registerDesktopProtocol(): Promise<void> {
  if (await protocol.isProtocolHandled(DESKTOP_APP_PROTOCOL)) {
    return;
  }

  protocol.handle(DESKTOP_APP_PROTOCOL, async (request) => {
    const requestUrl = new URL(request.url);
    const requestPath = requestUrl.pathname === "/"
      ? "/index.html"
      : requestUrl.pathname;

    const rendererRoot = app.isPackaged
      ? path.join(process.resourcesPath, "renderer-dist")
      : path.join(process.cwd(), "renderer-dist");

    const resolvedPath = path.join(rendererRoot, requestPath);
    const filePath = fs.existsSync(resolvedPath)
      ? resolvedPath
      : path.join(rendererRoot, "index.html");

    if (!fs.existsSync(filePath)) {
      return net.fetch(
        `data:text/html;charset=utf-8,${encodeURIComponent(PLACEHOLDER_HTML)}`,
      );
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

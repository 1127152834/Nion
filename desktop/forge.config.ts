import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    ignore: [
      /^\/out($|\/)/,
      /^\/release($|\/)/,
      /^\/src($|\/)/,
      /^\/tests($|\/)/,
      /^\/electron-builder\.yml$/,
      /^\/forge\.config\.ts$/,
      /^\/postcss\.config\.js$/,
      /^\/bundle-budget\.json$/,
      /^\/scripts($|\/)/,
    ],
    extraResource: ["../backend/dist/nion-backend"],
  },
  rebuildConfig: {},
  makers: [
    new MakerZIP({}, ["darwin"]),
    new MakerZIP({}, ["win32"]),
    new MakerSquirrel({}),
  ],
};

export default config;

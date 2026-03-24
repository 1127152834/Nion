import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const releaseDir = path.join(root, "desktop", "release");

if (!fs.existsSync(releaseDir)) {
  console.error(`Release directory not found: ${releaseDir}`);
  process.exit(1);
}

const artifacts = fs
  .readdirSync(releaseDir)
  .filter((entry) => !entry.startsWith("."))
  .map((entry) => path.join(releaseDir, entry));

console.log(
  JSON.stringify(
    {
      releaseDir,
      artifactCount: artifacts.length,
      artifacts,
      provider:
        process.env.NION_UPDATE_BASE_URL?.trim().length
          ? "generic+github"
          : "github",
    },
    null,
    2,
  ),
);

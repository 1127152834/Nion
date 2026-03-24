import fs from "node:fs";
import path from "node:path";

const workspaceRoot = path.resolve(import.meta.dirname, "..");
const budgetPath = path.join(workspaceRoot, "bundle-budget.json");

const budgets = JSON.parse(fs.readFileSync(budgetPath, "utf8"));

function bytesToMb(bytes) {
  return bytes / (1024 * 1024);
}

function assertWithinBudget(filePath, maxMb) {
  const stats = fs.statSync(filePath);
  const sizeMb = bytesToMb(stats.size);
  if (sizeMb > maxMb) {
    throw new Error(
      `${path.basename(filePath)} is ${sizeMb.toFixed(2)} MB which exceeds budget ${maxMb} MB`,
    );
  }
}

const targets = process.argv.slice(2);
for (const target of targets) {
  const resolved = path.resolve(target);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Bundle target not found: ${resolved}`);
  }

  if (resolved.includes("nion-backend")) {
    assertWithinBudget(resolved, budgets.python_helper_max_mb);
  } else if (resolved.endsWith(".zip")) {
    assertWithinBudget(resolved, budgets.macos_zip_max_mb);
  } else if (resolved.endsWith(".exe")) {
    assertWithinBudget(resolved, budgets.windows_nsis_max_mb);
  }
}

console.log("Bundle sizes are within budget.");

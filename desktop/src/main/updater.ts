export type DesktopUpdater = {
  provider: "github";
  initialized: true;
};

export function initializeUpdater(): DesktopUpdater {
  return {
    provider: "github",
    initialized: true
  };
}

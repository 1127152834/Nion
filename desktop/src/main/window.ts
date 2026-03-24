export type MainWindowOptions = {
  title: string;
  width: number;
  height: number;
  preloadEntry: string;
};

export function getMainWindowOptions(preloadEntry: string): MainWindowOptions {
  return {
    title: "Nion",
    width: 1440,
    height: 960,
    preloadEntry
  };
}

export function startDesktopMain(): void {
  console.log("Nion desktop shell bootstrap placeholder");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startDesktopMain();
}

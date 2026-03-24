export function isAutomationPath(pathname: string) {
  return pathname === "/workspace/automation" || pathname.startsWith("/workspace/automation/");
}

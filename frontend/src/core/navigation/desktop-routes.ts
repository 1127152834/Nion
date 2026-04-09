function withQuery(
  pathname: string,
  params: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function pathOfThread(
  threadId: string,
  extra: Record<string, string | undefined> = {},
) {
  return withQuery("/workspace/chats", { thread: threadId, ...extra });
}

export function pathOfChatHistoryType(
  type: string,
  extra: Record<string, string | undefined> = {},
) {
  return withQuery("/workspace/chats", { type, ...extra });
}

export function pathOfNotebook(
  extra: Record<string, string | undefined> = {},
) {
  return withQuery("/workspace/notebook", extra);
}

export function pathOfMemory() {
  return "/workspace/memory";
}

export function pathOfMemorySearch() {
  return "/workspace/memory/search";
}

export function pathOfMemorySearchResults(query?: string) {
  return withQuery("/workspace/memory/search/results", {
    q: query?.trim() || undefined,
  });
}

export function pathOfMemoryUser() {
  return "/workspace/memory/user";
}

export function pathOfMemoryHistory() {
  return "/workspace/memory/history";
}

export function pathOfMemoryFacts() {
  return "/workspace/memory/facts";
}

export function pathOfMemoryGrowth() {
  return "/workspace/memory/growth";
}

export function pathOfMemorySoul() {
  return "/workspace/memory/soul";
}

export function pathOfMemorySection(
  section:
    | "home"
    | "search"
    | "searchResults"
    | "user"
    | "history"
    | "facts"
    | "growth"
    | "soul",
) {
  switch (section) {
    case "home":
      return pathOfMemory();
    case "search":
      return pathOfMemorySearch();
    case "searchResults":
      return pathOfMemorySearchResults();
    case "user":
      return pathOfMemoryUser();
    case "history":
      return pathOfMemoryHistory();
    case "facts":
      return pathOfMemoryFacts();
    case "growth":
      return pathOfMemoryGrowth();
    case "soul":
      return pathOfMemorySoul();
  }
}

export function pathOfAutomation(
  extra: Record<string, string | undefined> = {},
) {
  return withQuery("/workspace/automation", extra);
}

export function pathOfAutomationReminders(
  extra: Record<string, string | undefined> = {},
) {
  return withQuery("/workspace/automation/reminders", extra);
}

export function pathOfAutomationReminderDetail(
  jobId: string,
  extra: Record<string, string | undefined> = {},
) {
  return withQuery(`/workspace/automation/reminders/${jobId}`, extra);
}

export function pathOfAutomationTasks(
  extra: Record<string, string | undefined> = {},
) {
  return withQuery("/workspace/automation/tasks", extra);
}

export function pathOfAutomationTaskDetail(
  jobId: string,
  extra: Record<string, string | undefined> = {},
) {
  return withQuery(`/workspace/automation/tasks/${jobId}`, extra);
}

export function pathOfNotebookTrash(
  extra: Record<string, string | undefined> = {},
) {
  return withQuery("/workspace/notebook/trash", extra);
}

export function pathOfNotebookSeededCreate(input: {
  title?: string;
  body?: string;
  directory?: string;
  source?: "chat";
  capture?: "thread" | "reply";
}) {
  return pathOfNotebook({
    create: "1",
    title: input.title,
    body: input.body,
    directory: input.directory,
    source: input.source,
    capture: input.capture,
  });
}

export function pathOfNewThread(
  extra: Record<string, string | undefined> = {},
) {
  return pathOfThread("new", extra);
}

export function pathOfAgentThread(
  agentName: string,
  threadId: string,
  extra: Record<string, string | undefined> = {},
) {
  return withQuery("/workspace/agents", {
    agent: agentName,
    thread: threadId,
    ...extra,
  });
}

export function pathOfNewAgentThread(
  agentName: string,
  extra: Record<string, string | undefined> = {},
) {
  return pathOfAgentThread(agentName, "new", extra);
}

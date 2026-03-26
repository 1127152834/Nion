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

export function pathOfNotebook(
  extra: Record<string, string | undefined> = {},
) {
  return withQuery("/workspace/notebook", extra);
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
}) {
  return pathOfNotebook({
    create: "1",
    title: input.title,
    body: input.body,
    directory: input.directory,
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

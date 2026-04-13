import { KnowledgePageReader } from "@/components/workspace/knowledge/knowledge-page-reader";
import { loadKnowledgePage } from "@/core/knowledge";

export default async function WorkspaceKnowledgePageDetail(props: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await props.params;
  const page = await loadKnowledgePage(pageId);

  return <KnowledgePageReader page={page} />;
}

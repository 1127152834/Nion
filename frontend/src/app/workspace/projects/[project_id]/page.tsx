import { ProjectDashboardPage } from "@/components/workspace/projects/project-dashboard-page";

export default async function WorkspaceProjectDashboardPage({
  params,
}: {
  params: Promise<{ project_id: string }>;
}) {
  const { project_id } = await params;
  return <ProjectDashboardPage projectId={project_id} />;
}


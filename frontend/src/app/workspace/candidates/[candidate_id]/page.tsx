import { CandidateDetailPage } from "@/components/workspace/candidates/candidate-detail-page";

export default async function WorkspaceCandidateDetailPage({
  params,
}: {
  params: Promise<{ candidate_id: string }>;
}) {
  const { candidate_id } = await params;
  return <CandidateDetailPage candidateId={candidate_id} />;
}

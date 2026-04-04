import { aiClient } from '@/lib/ai-client';
import { WorkflowDetailLivePage } from '@/components/live/WorkflowDetailLivePage';

export const dynamic = 'force-dynamic';

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialSnapshot = await aiClient.getLiveSnapshot().catch(() => null);
  return <WorkflowDetailLivePage workflowId={id} initialSnapshot={initialSnapshot} />;
}

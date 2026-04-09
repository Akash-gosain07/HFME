import { aiClient } from '@/lib/ai-client';
import { WorkflowsLivePage } from '@/components/live/WorkflowsLivePage';

export const dynamic = 'force-dynamic';

export default async function WorkflowsPage() {
  const initialSnapshot = await aiClient.getLiveSnapshot().catch(() => null);
  return <WorkflowsLivePage initialSnapshot={initialSnapshot} />;
}

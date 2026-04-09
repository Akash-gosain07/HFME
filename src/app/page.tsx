import { aiClient } from '@/lib/ai-client';
import { DashboardLivePage } from '@/components/live/DashboardLivePage';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const initialSnapshot = await aiClient.getLiveSnapshot().catch(() => null);
  return <DashboardLivePage initialSnapshot={initialSnapshot} />;
}

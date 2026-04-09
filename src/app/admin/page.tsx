import { aiClient } from '@/lib/ai-client';
import { AdminLivePage } from '@/components/live/AdminLivePage';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const initialSnapshot = await aiClient.getLiveSnapshot().catch(() => null);
  return <AdminLivePage initialSnapshot={initialSnapshot} />;
}

import { notFound, redirect } from 'next/navigation';

import { getSessionData } from '@/features/home';
import QueryDetailPage from '@/features/queries/components/QueryDetailPage';

export const dynamic = 'force-dynamic';

export default async function QuerySourcePage({
  params,
}: {
  params: Promise<{ queryId: string }>;
}) {
  const { queryId } = await params;
  const id = Number(queryId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const session = await getSessionData();
  if (!session.user) redirect('/login');

  return <QueryDetailPage queryId={queryId} session={session} mode="source" />;
}

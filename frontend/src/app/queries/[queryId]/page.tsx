import { notFound, redirect } from 'next/navigation';

import { getSessionData } from '@/features/home';
import QueryDetailPage from '@/features/queries/components/QueryDetailPage';

export const dynamic = 'force-dynamic';

export default async function QueryViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ queryId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { queryId } = await params;
  const resolvedSearchParams = await searchParams;
  const id = Number(queryId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const session = await getSessionData();
  if (!session.user) redirect('/login');

  return (
    <QueryDetailPage
      mode="view"
      queryId={queryId}
      searchParams={resolvedSearchParams}
      session={session}
    />
  );
}

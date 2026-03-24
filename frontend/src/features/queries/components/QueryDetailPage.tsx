'use client';

import { ApplicationLayout } from '@/features/application-layout';
import type { SessionResponse } from '@/features/home/types';

import QuerySourceEditor from './QuerySourceEditor';

interface QueryDetailPageProps {
  queryId: string;
  searchParams?: Record<string, string | string[] | undefined>;
  session: SessionResponse;
  mode: 'view' | 'source';
}

export default function QueryDetailPage({
  queryId,
  searchParams,
  session,
  mode,
}: QueryDetailPageProps) {
  return (
    <ApplicationLayout currentPath={`/queries/${queryId}`} session={session}>
      <QuerySourceEditor
        initialSearchParams={searchParams}
        mode={mode}
        queryId={queryId}
        session={session}
      />
    </ApplicationLayout>
  );
}

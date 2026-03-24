import { notFound, redirect } from 'next/navigation';

import DashboardDetailPage from '@/features/dashboards/components/DashboardDetailPage';
import type { DashboardDetail } from '@/features/dashboards/types';
import { getSessionData } from '@/features/home';
import { fetchServerJson } from '@/lib/server-backend';

export const dynamic = 'force-dynamic';

export default async function DashboardViewPage({
  params,
}: {
  params: Promise<{ dashboardId: string }>;
}) {
  const { dashboardId } = await params;
  const id = dashboardId.split('-')[0];

  if (!id) {
    notFound();
  }

  const sessionPromise = getSessionData();
  const dashboardPromise = fetchServerJson<DashboardDetail>(`/api/dashboards/${id}`).then(
    (dashboard) => ({
      dashboard,
      error: null as null,
    }),
    (error: unknown) => ({
      dashboard: null as DashboardDetail | null,
      error,
    }),
  );
  const session = await sessionPromise;

  if (!session.user) {
    redirect('/login');
  }

  const { dashboard, error } = await dashboardPromise;

  if (error) {
    throw error;
  }

  if (!dashboard) {
    notFound();
  }

  return <DashboardDetailPage dashboard={dashboard} session={session} />;
}

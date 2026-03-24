import { redirect } from 'next/navigation';

import { getSessionData } from '@/features/home';
import DashboardsListPage from '@/features/dashboards/components/DashboardsListPage';

export const dynamic = 'force-dynamic';

export default async function DashboardsPage() {
  const session = await getSessionData();

  if (!session.user) {
    redirect('/login');
  }

  return (
    <DashboardsListPage
      currentPath="/dashboards"
      session={session}
      view="all"
    />
  );
}

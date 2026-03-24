import { redirect } from 'next/navigation';

import AlertsListPage from '@/features/alerts/components/AlertsListPage';
import { getSessionData } from '@/features/home';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const session = await getSessionData();
  if (!session.user) redirect('/login');
  if (!session.user.permissions.includes('list_alerts')) {
    redirect('/');
  }
  return <AlertsListPage session={session} />;
}

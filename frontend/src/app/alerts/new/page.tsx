import { redirect } from 'next/navigation';

import AlertDetailPage from '@/features/alerts/components/AlertDetailPage';
import { getSessionData } from '@/features/home';

export const dynamic = 'force-dynamic';

export default async function NewAlertPage() {
  const session = await getSessionData();
  if (!session.user) redirect('/login');
  if (!session.user.permissions.includes('list_alerts')) {
    redirect('/');
  }
  return <AlertDetailPage alertId="new" session={session} mode="new" />;
}

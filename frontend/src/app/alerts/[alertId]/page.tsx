import { notFound, redirect } from 'next/navigation';

import AlertDetailPage from '@/features/alerts/components/AlertDetailPage';
import { getSessionData } from '@/features/home';

export const dynamic = 'force-dynamic';

export default async function AlertViewPage({
  params,
}: {
  params: Promise<{ alertId: string }>;
}) {
  const { alertId } = await params;
  const id = Number(alertId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const session = await getSessionData();
  if (!session.user) redirect('/login');
  if (!session.user.permissions.includes('list_alerts')) {
    redirect('/');
  }

  return <AlertDetailPage alertId={alertId} session={session} mode="view" />;
}

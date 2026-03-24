import { redirect } from 'next/navigation';

import { getAdminOutdatedQueriesServer } from '@/features/admin/api/adminServerApi';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminOutdatedQueriesPageContent from '@/features/admin/components/AdminOutdatedQueriesPage';
import { getSessionData } from '@/features/home';

export const dynamic = 'force-dynamic';

export default async function AdminOutdatedQueriesPage() {
  const session = await getSessionData();
  if (!session.user) redirect('/login');
  let initialData = null;
  let initialError: string | null = null;

  try {
    initialData = await getAdminOutdatedQueriesServer();
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : 'outdated query 목록을 불러오지 못했습니다.';
  }

  return (
    <AdminLayout activeTab="outdated_queries" session={session}>
      <AdminOutdatedQueriesPageContent
        initialData={initialData}
        initialError={initialError}
        timezone={session.client_config.timezone || 'UTC'}
      />
    </AdminLayout>
  );
}

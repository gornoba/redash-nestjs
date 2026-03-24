import { redirect } from 'next/navigation';

import { getAdminJobsServer } from '@/features/admin/api/adminServerApi';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminJobsPageContent from '@/features/admin/components/AdminJobsPage';
import { getSessionData } from '@/features/home';

export const dynamic = 'force-dynamic';

export default async function AdminJobsPage() {
  const session = await getSessionData();
  if (!session.user) redirect('/login');
  let initialData = null;
  let initialError: string | null = null;

  try {
    initialData = await getAdminJobsServer();
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : '큐 상태를 불러오지 못했습니다.';
  }

  return (
    <AdminLayout activeTab="jobs" session={session}>
      <AdminJobsPageContent
        initialData={initialData}
        initialError={initialError}
      />
    </AdminLayout>
  );
}

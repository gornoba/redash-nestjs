import { redirect } from 'next/navigation';

import { getAdminStatusServer } from '@/features/admin/api/adminServerApi';
import AdminLayout from '@/features/admin/components/AdminLayout';
import AdminStatusPageContent from '@/features/admin/components/AdminStatusPage';
import { getSessionData } from '@/features/home';

export const dynamic = 'force-dynamic';

export default async function AdminStatusPage() {
  const session = await getSessionData();
  if (!session.user) redirect('/login');
  let initialData = null;
  let initialError: string | null = null;

  try {
    initialData = await getAdminStatusServer();
  } catch (error) {
    initialError =
      error instanceof Error ? error.message : '상태 정보를 불러오지 못했습니다.';
  }

  return (
    <AdminLayout activeTab="system_status" session={session}>
      <AdminStatusPageContent
        initialData={initialData}
        initialError={initialError}
      />
    </AdminLayout>
  );
}

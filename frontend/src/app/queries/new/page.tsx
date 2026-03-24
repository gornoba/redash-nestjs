import { redirect } from 'next/navigation';

import { getSessionData } from '@/features/home';
import QueryDetailPage from '@/features/queries/components/QueryDetailPage';

export const dynamic = 'force-dynamic';

export default async function NewQueryPage() {
  const session = await getSessionData();
  if (!session.user) redirect('/login');
  if (
    !session.user.roles.includes('admin') &&
    !session.user.permissions.includes('create_query')
  ) {
    redirect('/queries');
  }
  return <QueryDetailPage queryId="new" session={session} mode="source" />;
}

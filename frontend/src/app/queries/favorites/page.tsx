import { redirect } from 'next/navigation';

import { getSessionData } from '@/features/home';
import QueriesListPage from '@/features/queries/components/QueriesListPage';

export const dynamic = 'force-dynamic';

export default async function QueriesFavoritesPage() {
  const session = await getSessionData();
  if (!session.user) redirect('/login');
  return <QueriesListPage currentPath="/queries/favorites" session={session} view="favorites" />;
}

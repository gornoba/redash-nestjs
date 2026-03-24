import { notFound, redirect } from 'next/navigation';

import {
  getDataSourceServer,
  getDataSourceTypesServer,
} from '@/features/data-sources/api/dataSourcesServerApi';
import EditDataSourceScreen from '@/features/data-sources/components/EditDataSourceScreen';
import { getSessionData } from '@/features/home';
import { getSettingsMenu } from '@/features/settings/api/settingsServerApi';
import { isForbiddenError, isUnauthorizedError } from '@/lib/server-backend';

export const dynamic = 'force-dynamic';

export default async function EditDataSourcePage({
  params,
}: {
  params: Promise<{ dataSourceId: string }>;
}) {
  const { dataSourceId } = await params;
  const id = Number(dataSourceId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  let session, menu, dataSource, types;

  try {
    [session, menu, dataSource, types] = await Promise.all([
      getSessionData(),
      getSettingsMenu(),
      getDataSourceServer(id),
      getDataSourceTypesServer(),
    ]);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      redirect('/login');
    }

    if (isForbiddenError(error)) {
      redirect('/groups');
    }

    throw error;
  }

  return (
    <EditDataSourceScreen
      dataSource={dataSource}
      menu={menu}
      session={session}
      types={types}
    />
  );
}

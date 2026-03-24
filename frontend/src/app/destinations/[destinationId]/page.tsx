import { notFound, redirect } from 'next/navigation';

import {
  getDestinationServer,
  getDestinationTypesServer,
} from '@/features/destinations/api/destinationsServerApi';
import EditDestinationScreen from '@/features/destinations/components/EditDestinationScreen';
import { getSessionData } from '@/features/home';
import { getSettingsMenu } from '@/features/settings/api/settingsServerApi';
import { isForbiddenError, isUnauthorizedError } from '@/lib/server-backend';

export const dynamic = 'force-dynamic';

export default async function EditDestinationPage({
  params,
}: {
  params: Promise<{ destinationId: string }>;
}) {
  const { destinationId } = await params;
  const id = Number(destinationId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  let session, menu;

  try {
    [session, menu] = await Promise.all([
      getSessionData(),
      getSettingsMenu(),
    ]);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      redirect('/login');
    }

    if (isForbiddenError(error)) {
      redirect('/users/me');
    }

    throw error;
  }

  if (!session.user) {
    redirect('/login');
  }

  if (!menu.items.some((item) => item.key === 'alert-destinations')) {
    redirect(menu.first_path || '/users/me');
  }

  let destination, types;

  try {
    [destination, types] = await Promise.all([
      getDestinationServer(id),
      getDestinationTypesServer(),
    ]);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      redirect('/login');
    }

    if (isForbiddenError(error)) {
      redirect(menu.first_path || '/users/me');
    }

    throw error;
  }

  return (
    <EditDestinationScreen
      destination={destination}
      menu={menu}
      session={session}
      types={types}
    />
  );
}

import { redirect } from 'next/navigation';

import { getSessionData } from '@/features/home';
import { LoginPage } from '@/features/login';
import { getSetupStateServerSafe } from '@/features/setup/api/setupServerApi';
import { isForbiddenError, isUnauthorizedError } from '@/lib/server-backend';

export const dynamic = 'force-dynamic';

export default async function LoginRoutePage() {
  const setupState = await getSetupStateServerSafe();

  if (setupState.isSetupRequired) {
    redirect('/');
  }

  try {
    await getSessionData();
    redirect('/');
  } catch (error) {
    if (isUnauthorizedError(error) || isForbiddenError(error)) {
      return <LoginPage />;
    }

    throw error;
  }
}

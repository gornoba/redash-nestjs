import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getHomePageSupportingData, getSessionData, HomePage } from '@/features/home';
import { SetupPage } from '@/features/setup';
import { getSetupStateServerSafe } from '@/features/setup/api/setupServerApi';
import { isForbiddenError, isUnauthorizedError } from '@/lib/server-backend';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const setupState = await getSetupStateServerSafe();

  return {
    title: setupState.isSetupRequired ? 'Redash Initial Setup' : 'Redash',
  };
}

export default async function Page() {
  const setupState = await getSetupStateServerSafe();

  if (setupState.isSetupRequired) {
    return <SetupPage defaults={setupState.defaults} />;
  }

  let session;

  try {
    session = await getSessionData();
  } catch (error) {
    if (isUnauthorizedError(error) || isForbiddenError(error)) {
      redirect('/login');
    }

    throw error;
  }

  const homePageData = await getHomePageSupportingData();

  return <HomePage {...homePageData} session={session} />;
}

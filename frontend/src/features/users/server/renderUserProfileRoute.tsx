import { redirect } from 'next/navigation';

import { getSettingsMenu } from '@/features/settings/api/settingsServerApi';
import { isUnauthorizedError } from '@/lib/server-backend';

import { getUserDetail, getUsersSession } from '../api/usersServerApi';
import UserProfileContent from '../components/UserProfileContent';

export async function renderUserProfileRoute(options: {
  currentPath: string;
  userId?: number;
}) {
  try {
    const session = await getUsersSession();
    const targetUserId = options.userId ?? session.user.id;
    const [menu, detail] = await Promise.all([
      getSettingsMenu(),
      getUserDetail(targetUserId),
    ]);

    return (
      <UserProfileContent
        currentPath={options.currentPath}
        detail={detail}
        menu={menu}
        session={session}
      />
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      redirect('/login');
    }

    throw error;
  }
}

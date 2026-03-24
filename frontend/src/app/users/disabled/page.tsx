import { renderSettingsRoute } from '@/features/settings/server/renderSettingsRoute';

export const dynamic = 'force-dynamic';

export default function DisabledUsersPage() {
  return renderSettingsRoute({
    currentPath: '/users/disabled',
    section: 'users',
    usersView: 'disabled',
  });
}

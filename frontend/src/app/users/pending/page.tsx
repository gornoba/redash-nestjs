import { renderSettingsRoute } from '@/features/settings/server/renderSettingsRoute';

export const dynamic = 'force-dynamic';

export default function PendingUsersPage() {
  return renderSettingsRoute({
    currentPath: '/users/pending',
    section: 'users',
    usersView: 'pending',
  });
}

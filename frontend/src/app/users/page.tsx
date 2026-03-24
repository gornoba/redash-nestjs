import { renderSettingsRoute } from '@/features/settings/server/renderSettingsRoute';

export const dynamic = 'force-dynamic';

export default function UsersPage() {
  return renderSettingsRoute({
    currentPath: '/users',
    section: 'users',
    usersView: 'active',
  });
}

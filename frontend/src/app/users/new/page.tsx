import { renderSettingsRoute } from '@/features/settings/server/renderSettingsRoute';

export const dynamic = 'force-dynamic';

export default function NewUserPage() {
  return renderSettingsRoute({
    currentPath: '/users/new',
    openUserDialog: true,
    section: 'users',
    usersView: 'active',
  });
}

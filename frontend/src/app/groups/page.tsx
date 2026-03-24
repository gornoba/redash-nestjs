import { renderSettingsRoute } from '@/features/settings/server/renderSettingsRoute';

export const dynamic = 'force-dynamic';

export default function GroupsPage() {
  return renderSettingsRoute({
    currentPath: '/groups',
    section: 'groups',
  });
}

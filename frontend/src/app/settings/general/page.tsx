import { renderSettingsRoute } from '@/features/settings/server/renderSettingsRoute';

export const dynamic = 'force-dynamic';

export default function SettingsGeneralPage() {
  return renderSettingsRoute({
    currentPath: '/settings/general',
    section: 'general',
  });
}

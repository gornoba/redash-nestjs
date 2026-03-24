import { renderSettingsRoute } from '@/features/settings/server/renderSettingsRoute';

export const dynamic = 'force-dynamic';

export default function DestinationsPage() {
  return renderSettingsRoute({
    currentPath: '/destinations',
    section: 'alert-destinations',
  });
}

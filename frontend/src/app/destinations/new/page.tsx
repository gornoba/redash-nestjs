import { renderSettingsRoute } from '@/features/settings/server/renderSettingsRoute';

export const dynamic = 'force-dynamic';

export default function NewDestinationPage() {
  return renderSettingsRoute({
    currentPath: '/destinations/new',
    openDestinationDialog: true,
    section: 'alert-destinations',
  });
}

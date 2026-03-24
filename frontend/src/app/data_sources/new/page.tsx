import { renderSettingsRoute } from '@/features/settings/server/renderSettingsRoute';

export const dynamic = 'force-dynamic';

export default function NewDataSourcesPage() {
  return renderSettingsRoute({
    currentPath: '/data_sources/new',
    openDataSourceDialog: true,
    section: 'data-sources',
  });
}

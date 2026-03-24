import { renderSettingsRoute } from '@/features/settings/server/renderSettingsRoute';

export const dynamic = 'force-dynamic';

export default function DataSourcesPage() {
  return renderSettingsRoute({
    currentPath: '/data_sources',
    section: 'data-sources',
  });
}

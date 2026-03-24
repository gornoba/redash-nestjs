import { renderSettingsRoute } from '@/features/settings/server/renderSettingsRoute';

export const dynamic = 'force-dynamic';

export default function QuerySnippetsPage() {
  return renderSettingsRoute({
    currentPath: '/query_snippets',
    section: 'query-snippets',
  });
}

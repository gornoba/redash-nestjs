import { renderSettingsRoute } from '@/features/settings/server/renderSettingsRoute';

export const dynamic = 'force-dynamic';

export default function NewQuerySnippetPage() {
  return renderSettingsRoute({
    activeQuerySnippetId: 'new',
    currentPath: '/query_snippets/new',
    section: 'query-snippets',
  });
}

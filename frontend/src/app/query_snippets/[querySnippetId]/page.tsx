import { notFound } from 'next/navigation';

import { renderSettingsRoute } from '@/features/settings/server/renderSettingsRoute';

export const dynamic = 'force-dynamic';

export default async function QuerySnippetDetailPage({
  params,
}: {
  params: Promise<{ querySnippetId: string }>;
}) {
  const { querySnippetId } = await params;
  const snippetId = Number(querySnippetId);

  if (!Number.isInteger(snippetId) || snippetId <= 0) {
    notFound();
  }

  return renderSettingsRoute({
    activeQuerySnippetId: snippetId,
    currentPath: `/query_snippets/${snippetId}`,
    section: 'query-snippets',
  });
}

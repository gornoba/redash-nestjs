import { renderGroupRoute } from '@/features/groups/server/renderGroupRoute';

export const dynamic = 'force-dynamic';

export default async function GroupDataSourcesPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  return renderGroupRoute({
    currentPath: `/groups/${groupId}/data_sources`,
    groupId: Number(groupId),
    view: 'data-sources',
  });
}

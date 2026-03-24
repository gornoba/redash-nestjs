import { renderGroupRoute } from '@/features/groups/server/renderGroupRoute';

export const dynamic = 'force-dynamic';

export default async function GroupPermissionsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  return renderGroupRoute({
    currentPath: `/groups/${groupId}/permissions`,
    groupId: Number(groupId),
    view: 'permissions',
  });
}

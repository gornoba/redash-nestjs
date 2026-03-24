import { renderGroupRoute } from '@/features/groups/server/renderGroupRoute';

export const dynamic = 'force-dynamic';

export default async function GroupMembersPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  return renderGroupRoute({
    currentPath: `/groups/${groupId}`,
    groupId: Number(groupId),
    view: 'members',
  });
}

import { renderUserProfileRoute } from '@/features/users/server/renderUserProfileRoute';

export const dynamic = 'force-dynamic';

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return renderUserProfileRoute({
    currentPath: `/users/${userId}`,
    userId: Number(userId),
  });
}

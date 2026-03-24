import { renderUserProfileRoute } from '@/features/users/server/renderUserProfileRoute';

export const dynamic = 'force-dynamic';

export default function UsersMePage() {
  return renderUserProfileRoute({
    currentPath: '/users/me',
  });
}

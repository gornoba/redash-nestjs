export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  orgId: number;
  orgSlug: string;
  groupIds: number[];
  roles: string[];
  permissions: string[];
  profileImageUrl: string;
  isEmailVerified: boolean;
}

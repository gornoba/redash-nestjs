export interface UserDetailsRecord extends Record<string, unknown> {
  active_at?: string;
  is_email_verified?: boolean;
  is_invitation_pending?: boolean;
  verification_email_requested_at?: string;
}

export function toUserDetailsRecord(
  details: Record<string, unknown> | null | undefined,
): UserDetailsRecord {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return {};
  }

  return { ...details };
}

export function isUserEmailVerified(
  details: Record<string, unknown> | null | undefined,
) {
  const normalized = toUserDetailsRecord(details);
  const value = normalized.is_email_verified ?? normalized.isEmailVerified;

  return typeof value === 'boolean' ? value : true;
}

export function isUserInvitationPending(
  details: Record<string, unknown> | null | undefined,
) {
  const normalized = toUserDetailsRecord(details);
  const value =
    normalized.is_invitation_pending ?? normalized.isInvitationPending;

  return typeof value === 'boolean' ? value : false;
}

export interface CreateUserPayload {
  name: string;
  email: string;
}

export interface CreatedUserResponse {
  id: number;
  name: string;
  email: string;
  profile_image_url: string;
  is_disabled: boolean;
  is_invitation_pending: boolean;
  group_ids?: number[];
  groups: Array<{
    id: number;
    name: string;
  }>;
  created_at: string;
  active_at: string | null;
  invite_link?: string;
  reset_link?: string;
}

export interface UserGroupOption {
  id: number;
  name: string;
}

export interface UserDetailResponse {
  user: CreatedUserResponse & {
    api_key: string | null;
    group_ids: number[];
  };
  all_groups: UserGroupOption[];
}

export interface LinkDetailsResponse {
  mode: 'invite' | 'reset';
  user: {
    name: string;
    email: string;
  };
}

export interface AcceptLinkPayload {
  password: string;
}

export interface AcceptLinkResponse {
  message: string;
}

export interface UpdateUserPayload {
  email?: string;
  group_ids?: number[];
  name?: string;
  old_password?: string;
  password?: string;
}

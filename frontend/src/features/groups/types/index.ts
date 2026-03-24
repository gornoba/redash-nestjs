export interface GroupSummary {
  id: number;
  name: string;
  type: string;
  permissions: string[];
  member_count: number;
  created_at: string;
}

export interface GroupMemberItem {
  id: number;
  name: string;
  email: string;
  profile_image_url: string;
  is_disabled: boolean;
  is_invitation_pending: boolean;
  created_at: string;
  active_at: string | null;
}

export interface GroupDataSourceItem {
  id: number;
  name: string;
  type: string;
  view_only: boolean;
  created_at: string;
}

export interface GroupDetailResponse {
  group: GroupSummary;
}

export interface GroupsListResponse {
  items: GroupSummary[];
}

export interface GroupMembersResponse {
  group: GroupSummary;
  members: GroupMemberItem[];
}

export interface GroupDataSourcesResponse {
  group: GroupSummary;
  data_sources: GroupDataSourceItem[];
}

export interface CreateGroupPayload {
  name: string;
}

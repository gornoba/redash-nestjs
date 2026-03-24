import { fetchServerJson } from '@/lib/server-backend';

import type {
  GroupDataSourcesResponse,
  GroupDetailResponse,
  GroupMembersResponse,
  GroupsListResponse,
} from '../types';

export function getGroups() {
  return fetchServerJson<GroupsListResponse>('/api/groups');
}

export function getGroup(groupId: number) {
  return fetchServerJson<GroupDetailResponse>(`/api/groups/${groupId}`);
}

export function getGroupMembers(groupId: number) {
  return fetchServerJson<GroupMembersResponse>(`/api/groups/${groupId}/members`);
}

export function getGroupDataSources(groupId: number) {
  return fetchServerJson<GroupDataSourcesResponse>(
    `/api/groups/${groupId}/data_sources`,
  );
}

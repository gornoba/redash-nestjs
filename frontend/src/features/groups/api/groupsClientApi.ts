import type {
  CreateGroupPayload,
  GroupDataSourcesResponse,
  GroupDetailResponse,
  GroupMembersResponse,
  GroupsListResponse,
} from '../types';

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message ?? 'Request failed.');
  }

  return payload as T;
}

export async function createGroup(payload: CreateGroupPayload) {
  const response = await fetch('/api/groups', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return readJson<GroupDetailResponse>(response);
}

export async function deleteGroup(groupId: number) {
  const response = await fetch(`/api/groups/${groupId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  return readJson<GroupDetailResponse>(response);
}

export async function addGroupMember(groupId: number, userId: number) {
  const response = await fetch(`/api/groups/${groupId}/members`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId }),
  });

  return readJson<GroupMembersResponse>(response);
}

export async function removeGroupMember(groupId: number, userId: number) {
  const response = await fetch(`/api/groups/${groupId}/members/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  return readJson<GroupMembersResponse>(response);
}

export async function addGroupDataSource(groupId: number, dataSourceId: number) {
  const response = await fetch(`/api/groups/${groupId}/data_sources`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data_source_id: dataSourceId }),
  });

  return readJson<GroupDataSourcesResponse>(response);
}

export async function removeGroupDataSource(
  groupId: number,
  dataSourceId: number,
) {
  const response = await fetch(
    `/api/groups/${groupId}/data_sources/${dataSourceId}`,
    {
      method: 'DELETE',
      credentials: 'include',
    },
  );

  return readJson<GroupDataSourcesResponse>(response);
}

export async function updateGroupDataSourcePermission(
  groupId: number,
  dataSourceId: number,
  viewOnly: boolean,
) {
  const response = await fetch(
    `/api/groups/${groupId}/data_sources/${dataSourceId}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ view_only: viewOnly }),
    },
  );

  return readJson<GroupDataSourcesResponse>(response);
}

export async function updateGroupPermissions(
  groupId: number,
  permissions: string[],
) {
  const response = await fetch(`/api/groups/${groupId}/permissions`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ permissions }),
  });

  return readJson<GroupDetailResponse>(response);
}

export async function getGroups() {
  const response = await fetch('/api/groups', {
    cache: 'no-store',
    credentials: 'include',
  });

  return readJson<GroupsListResponse>(response);
}

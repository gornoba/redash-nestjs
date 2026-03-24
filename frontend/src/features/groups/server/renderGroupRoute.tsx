import { redirect } from 'next/navigation';

import { isUnauthorizedError } from '@/lib/server-backend';
import { getSettingsSectionData, getSettingsMenu, getSettingsSession } from '@/features/settings/api/settingsServerApi';
import type { SettingsDataSourcesResponse, SettingsUsersResponse } from '@/features/settings/types';
import { getGroup, getGroupDataSources, getGroupMembers } from '../api/groupsServerApi';
import GroupDetailScreen from '../components/GroupDetailScreen';

export async function renderGroupRoute(options: {
  currentPath: string;
  groupId: number;
  view: 'members' | 'data-sources' | 'permissions';
}) {
  try {
    const session = await getSettingsSession();
    const menu = await getSettingsMenu();

    if (options.view === 'members') {
      const groupMembers = await getGroupMembers(options.groupId);
      const users =
        session.user.roles.includes('admin') ||
        session.user.permissions.includes('list_users')
          ? ((await getSettingsSectionData(
              'users',
            )) as SettingsUsersResponse)
          : null;

      return (
        <GroupDetailScreen
          availableUsers={users?.items}
          currentPath={options.currentPath}
          group={groupMembers.group}
          members={groupMembers.members}
          menu={menu}
          session={session}
          view="members"
        />
      );
    }

    if (options.view === 'permissions') {
      const groupDetail = await getGroup(options.groupId);

      return (
        <GroupDetailScreen
          currentPath={options.currentPath}
          group={groupDetail.group}
          menu={menu}
          session={session}
          view="permissions"
        />
      );
    }

    const groupDataSources = await getGroupDataSources(options.groupId);
    const dataSources =
      session.user.roles.includes('admin')
        ? ((await getSettingsSectionData(
            'data-sources',
          )) as SettingsDataSourcesResponse)
        : null;

    return (
      <GroupDetailScreen
        availableDataSources={dataSources?.items}
        currentPath={options.currentPath}
        dataSources={groupDataSources.data_sources}
        group={groupDataSources.group}
        menu={menu}
        session={session}
        view="data-sources"
      />
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      redirect('/login');
    }

    throw error;
  }
}

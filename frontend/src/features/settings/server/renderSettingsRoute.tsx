import { redirect } from 'next/navigation';

import { isForbiddenError, isUnauthorizedError } from '@/lib/server-backend';

import {
  getSettingsMenu,
  getSettingsSectionData,
  getSettingsSession,
} from '../api/settingsServerApi';
import SettingsPage from '../components/SettingsPage';
import type { SettingsSectionKey } from '../types';

interface RenderSettingsRouteOptions {
  activeQuerySnippetId?: number | 'new';
  currentPath: string;
  openDataSourceDialog?: boolean;
  openDestinationDialog?: boolean;
  openUserDialog?: boolean;
  section: SettingsSectionKey;
  usersView?: 'active' | 'pending' | 'disabled';
}

export async function renderSettingsRoute({
  activeQuerySnippetId,
  currentPath,
  openDataSourceDialog,
  openDestinationDialog,
  openUserDialog,
  section,
  usersView,
}: RenderSettingsRouteOptions) {
  try {
    const [session, menu] = await Promise.all([
      getSettingsSession(),
      getSettingsMenu(),
    ]);
    const isAllowedSection = menu.items.some((item) => item.key === section);

    if (!isAllowedSection) {
      redirect(menu.first_path || '/users/me');
    }

    const data = await getSettingsSectionData(section);

    return (
      <SettingsPage
        activeQuerySnippetId={activeQuerySnippetId}
        currentPath={currentPath}
        data={data}
        menu={menu}
        openDataSourceDialog={openDataSourceDialog}
        openDestinationDialog={openDestinationDialog}
        openUserDialog={openUserDialog}
        section={section}
        session={session}
        usersView={usersView}
      />
    );
  } catch (error) {
    if (isUnauthorizedError(error)) {
      redirect('/login');
    }

    if (isForbiddenError(error)) {
      redirect('/users/me');
    }

    throw error;
  }
}

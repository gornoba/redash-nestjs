/* eslint-disable @next/next/no-img-element */
import { ApplicationLayout } from '@/features/application-layout';
import GroupsListSection from '@/features/groups/components/GroupsListSection';
import type { SessionResponse } from '@/features/home/types';
import QuerySnippetsSection from '@/features/query-snippets/components/QuerySnippetsSection';

import DestinationsSection from './DestinationsSection';
import DataSourcesSection from './DataSourcesSection';
import GeneralSettingsForm from './GeneralSettingsForm';
import SettingsTabs from './SettingsTabs';
import UsersSection from './UsersSection';
import type {
  SettingsMenuResponse,
  SettingsSectionDataMap,
  SettingsSectionKey,
} from '../types';

interface SettingsPageProps<K extends SettingsSectionKey> {
  activeQuerySnippetId?: number | 'new';
  currentPath: string;
  data: SettingsSectionDataMap[K];
  menu: SettingsMenuResponse;
  openDataSourceDialog?: boolean;
  openDestinationDialog?: boolean;
  openUserDialog?: boolean;
  section: K;
  session: SessionResponse;
  usersView?: 'active' | 'pending' | 'disabled';
}

const cardClass = 'overflow-hidden rounded-[3px] bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]';
const inputClass =
  'h-9 w-full rounded border border-slate-300 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200';

export default function SettingsPage<K extends SettingsSectionKey>({
  activeQuerySnippetId,
  currentPath,
  data,
  menu,
  openDataSourceDialog = false,
  openDestinationDialog = false,
  openUserDialog = false,
  section,
  session,
  usersView = 'active',
}: SettingsPageProps<K>) {
  return (
    <ApplicationLayout currentPath={currentPath} session={session}>
      <div className="w-full px-4 py-5 md:px-6">
        <div className="w-full">
          <div className="mb-3 flex items-center">
            <h3 className="text-2xl font-medium leading-tight text-slate-800">
              Settings
            </h3>
          </div>
          <div className={cardClass}>
            <SettingsTabs currentPath={currentPath} menu={menu} />
            <div className="w-full min-w-0 overflow-x-clip p-[15px]">
              {renderSection(
                section,
                data,
                session,
                activeQuerySnippetId,
                usersView,
                openDataSourceDialog,
                openDestinationDialog,
                openUserDialog,
              )}
            </div>
          </div>
        </div>
      </div>
    </ApplicationLayout>
  );
}

function renderSection<K extends SettingsSectionKey>(
  section: K,
  data: SettingsSectionDataMap[K],
  session: SessionResponse,
  activeQuerySnippetId: number | 'new' | undefined,
  usersView: 'active' | 'pending' | 'disabled',
  openDataSourceDialog: boolean,
  openDestinationDialog: boolean,
  openUserDialog: boolean,
) {
  switch (section) {
    case 'account':
      return <AccountSection data={data as SettingsSectionDataMap['account']} />;
    case 'alert-destinations':
      return (
        <DestinationsSection
          items={(data as SettingsSectionDataMap['alert-destinations']).items}
          openOnLoad={openDestinationDialog}
        />
      );
    case 'data-sources':
      return (
        <DataSourcesSection
          canManage={session.user.roles.includes('admin')}
          items={(data as SettingsSectionDataMap['data-sources']).items}
          openOnLoad={openDataSourceDialog}
        />
      );
    case 'general':
      return (
        <GeneralSettingsForm
          dateFormatOptions={session.client_config.dateFormatList}
          initialSettings={(data as SettingsSectionDataMap['general']).settings}
          timeFormatOptions={session.client_config.timeFormatList}
        />
      );
    case 'groups':
      return (
        <GroupsListSection
          canManage={session.user.roles.includes('admin')}
          items={(data as SettingsSectionDataMap['groups']).items}
        />
      );
    case 'query-snippets':
      return (
        <QuerySnippetsSection
          activeQuerySnippetId={activeQuerySnippetId}
          canCreate
          currentUserId={session.user.id}
          isAdmin={session.user.roles.includes('admin')}
          items={(data as SettingsSectionDataMap['query-snippets']).items}
        />
      );
    case 'users':
      return (
        <UsersSection
          canCreateUser={session.user.roles.includes('admin')}
          currentUserId={session.user.id}
          items={(data as SettingsSectionDataMap['users']).items}
          mailSettingsMissing={session.client_config.mailSettingsMissing}
          openOnLoad={openUserDialog}
          usersView={usersView}
        />
      );
    default:
      return null;
  }
}

function AccountSection({
  data,
}: {
  data: SettingsSectionDataMap['account'];
}) {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[360px]">
        <div className="mb-4 flex items-center gap-3">
          <img
            alt="profile"
            className="h-10 w-10 rounded-full"
            height={40}
            src={data.user.profile_image_url}
            width={40}
          />
          <h3 className="text-[28px] font-medium text-slate-800">
            {data.user.name}
          </h3>
        </div>
        <div className="my-4 h-px bg-slate-200" />
        <div className="flex flex-col gap-4">
          <ReadOnlyField label="Name" value={data.user.name} />
          <ReadOnlyField label="Email" value={data.user.email} />
          <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)] md:items-start">
            <span className="font-medium text-slate-800">Groups</span>
            <div className="flex flex-wrap gap-2">
              {data.user.groups.map((group) => (
                <span
                  key={group.id}
                  className="inline-flex rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500"
                >
                  {group.name}
                </span>
              ))}
            </div>
          </div>
          <ReadOnlyField
            label="Roles"
            value={data.user.roles.join(', ') || 'user'}
          />
        </div>
        <div className="my-4 h-px bg-slate-200" />
        <button
          className="inline-flex h-8 w-full items-center justify-center rounded border border-slate-300 bg-white px-4 text-[13px] text-slate-700"
          type="button"
        >
          Change Password
        </button>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)] md:items-center">
      <span className="font-medium text-slate-800">{label}</span>
      <input
        className={inputClass}
        readOnly
        value={value}
      />
    </div>
  );
}

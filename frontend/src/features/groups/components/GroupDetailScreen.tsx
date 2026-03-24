'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { ApplicationLayout } from '@/features/application-layout';
import { getDataSourceLogoPath } from '@/features/data-sources/utils/logo';
import type { SessionResponse } from '@/features/home/types';
import SettingsTabs from '@/features/settings/components/SettingsTabs';
import type {
  SettingsDataSourceItem,
  SettingsMenuResponse,
  SettingsUserItem,
} from '@/features/settings/types';
import {
  addGroupDataSource,
  addGroupMember,
  removeGroupDataSource,
  removeGroupMember,
  updateGroupPermissions,
  updateGroupDataSourcePermission,
} from '../api/groupsClientApi';
import { GROUP_PERMISSION_OPTIONS } from '../constants/permissions';
import { useToastMessage } from '@/lib/toast';
import type {
  GroupDataSourceItem,
  GroupMemberItem,
  GroupSummary,
} from '../types';
import SelectItemsDialog from './SelectItemsDialog';

interface GroupDetailScreenProps {
  availableDataSources?: SettingsDataSourceItem[];
  availableUsers?: SettingsUserItem[];
  currentPath: string;
  dataSources?: GroupDataSourceItem[];
  group: GroupSummary;
  members?: GroupMemberItem[];
  menu: SettingsMenuResponse;
  session: SessionResponse;
  view: 'members' | 'data-sources' | 'permissions';
}

export default function GroupDetailScreen({
  availableDataSources = [],
  availableUsers = [],
  currentPath,
  dataSources = [],
  group,
  members = [],
  menu,
  session,
  view,
}: GroupDetailScreenProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    group.permissions,
  );
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  useToastMessage(error, 'error');

  const isAdmin = session.user.roles.includes('admin');
  const canViewGroupDataSources =
    isAdmin ||
    session.user.permissions.includes('list_data_sources') ||
    session.user.permissions.includes('view_source');
  const canEditPermissions = isAdmin && group.type !== 'builtin';

  useEffect(() => {
    setSelectedPermissions(group.permissions);
  }, [group.id, group.permissions]);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [dialogOpen]);

  const selectableUsers = useMemo(
    () =>
      availableUsers.filter(
        (user) =>
          !user.is_disabled &&
          !user.is_invitation_pending &&
          !members.some((member) => member.id === user.id),
      ),
    [availableUsers, members],
  );

  const selectableDataSources = useMemo(
    () =>
      availableDataSources.filter(
        (item) => !dataSources.some((dataSource) => dataSource.id === item.id),
      ),
    [availableDataSources, dataSources],
  );

  return (
    <ApplicationLayout currentPath={currentPath} session={session}>
      <div className="w-full px-4 py-5 md:px-6">
        <div className="w-full">
          <div className="mb-3 flex items-center">
            <h3 className="text-2xl font-medium leading-tight text-slate-800">
              Settings
            </h3>
          </div>
          <div className="overflow-hidden rounded-[3px] bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
            <SettingsTabs currentPath={currentPath} menu={menu} />
            <div className="p-[15px]">
              <h2 className="mb-4 text-[22px] font-medium text-slate-800">
                {group.name}
              </h2>

              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="min-w-0 flex-1">
                  {view === 'members' ? (
                    <MembersPanel
                      currentUserId={session.user.id}
                      group={group}
                      members={members}
                      onRemove={async (userId) => {
                        try {
                          setError(null);
                          await removeGroupMember(group.id, userId);
                          router.refresh();
                        } catch (actionError) {
                          setError(
                            actionError instanceof Error
                              ? actionError.message
                              : 'Failed to remove member from group.',
                          );
                        }
                      }}
                    />
                  ) : view === 'data-sources' ? (
                    <DataSourcesPanel
                      canEdit={isAdmin}
                      dataSources={dataSources}
                      onPermissionChange={async (dataSourceId, viewOnly) => {
                        try {
                          setError(null);
                          await updateGroupDataSourcePermission(
                            group.id,
                            dataSourceId,
                            viewOnly,
                          );
                          router.refresh();
                        } catch (actionError) {
                          setError(
                            actionError instanceof Error
                              ? actionError.message
                              : 'Failed change data source permissions.',
                          );
                        }
                      }}
                      onRemove={async (dataSourceId) => {
                        try {
                          setError(null);
                          await removeGroupDataSource(group.id, dataSourceId);
                          router.refresh();
                        } catch (actionError) {
                          setError(
                            actionError instanceof Error
                              ? actionError.message
                              : 'Failed to remove data source from group.',
                          );
                        }
                      }}
                    />
                  ) : (
                    <PermissionsPanel
                      canEdit={canEditPermissions}
                      isSaving={isSavingPermissions}
                      onSave={async () => {
                        try {
                          setError(null);
                          setIsSavingPermissions(true);
                          await updateGroupPermissions(
                            group.id,
                            selectedPermissions,
                          );
                          router.refresh();
                        } catch (actionError) {
                          setError(
                            actionError instanceof Error
                              ? actionError.message
                              : 'Failed to save permissions.',
                          );
                        } finally {
                          setIsSavingPermissions(false);
                        }
                      }}
                      permissions={GROUP_PERMISSION_OPTIONS}
                      selectedPermissions={selectedPermissions}
                      setSelectedPermissions={setSelectedPermissions}
                    />
                  )}
                </div>

                <aside className="w-full lg:max-w-[320px]">
                  <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
                    <SidebarLink active={view === 'members'} href={`/groups/${group.id}`}>
                      Members
                    </SidebarLink>
                    {canViewGroupDataSources ? (
                      <SidebarLink
                        active={view === 'data-sources'}
                        href={`/groups/${group.id}/data_sources`}
                      >
                        Data Sources
                      </SidebarLink>
                    ) : null}
                    {isAdmin ? (
                      <SidebarLink
                        active={view === 'permissions'}
                        href={`/groups/${group.id}/permissions`}
                      >
                        Permissions
                      </SidebarLink>
                    ) : null}
                  </div>
                  {isAdmin && view !== 'permissions' ? (
                    <button
                      className="mt-4 inline-flex h-8 w-full items-center justify-center gap-2 rounded border border-[#2196F3] bg-[#2196F3] px-4 text-[13px] text-white transition hover:bg-sky-600"
                      onClick={() => setDialogOpen(true)}
                      type="button"
                    >
                      <span aria-hidden="true">+</span>
                      {view === 'members' ? 'Add Members' : 'Add Data Sources'}
                    </button>
                  ) : null}
                </aside>
              </div>
            </div>
          </div>
        </div>
      </div>

      {dialogOpen ? (
        view === 'members' ? (
          <SelectItemsDialog
            dialogTitle="Add Members"
            inputPlaceholder="Search users..."
            itemKey={(item) => item.id}
            items={selectableUsers}
            onClose={() => setDialogOpen(false)}
            onSave={async (items) => {
              try {
                setError(null);
                await Promise.all(items.map((item) => addGroupMember(group.id, item.id)));
                setDialogOpen(false);
                router.refresh();
              } catch (actionError) {
                setError(
                  actionError instanceof Error
                    ? actionError.message
                    : 'Failed to add members.',
                );
              }
            }}
            renderItem={(item) => (
              <div className="flex items-center gap-4">
                <img
                  alt={item.name}
                  className="h-10 w-10 rounded-full"
                  src={item.profile_image_url}
                />
                <div className="min-w-0">
                  <div className="truncate text-[16px] text-[#2196F3]">{item.name}</div>
                  <div className="truncate text-[14px] text-slate-400">{item.email}</div>
                </div>
              </div>
            )}
            selectedItemsTitle="New Members"
          />
        ) : view === 'data-sources' ? (
          <SelectItemsDialog
            dialogTitle="Add Data Sources"
            inputPlaceholder="Search data sources..."
            itemKey={(item) => item.id}
            items={selectableDataSources}
            onClose={() => setDialogOpen(false)}
            onSave={async (items) => {
              try {
                setError(null);
                await Promise.all(
                  items.map((item) => addGroupDataSource(group.id, item.id)),
                );
                setDialogOpen(false);
                router.refresh();
              } catch (actionError) {
                setError(
                  actionError instanceof Error
                    ? actionError.message
                    : 'Failed to add data sources.',
                );
              }
            }}
            renderItem={(item) => (
              <div className="flex items-center gap-4">
                <img
                  alt={item.type}
                  className="h-8 w-8 object-contain"
                  src={getDataSourceLogoPath(item.type)}
                />
                <div className="min-w-0">
                  <div className="truncate text-[16px] text-slate-700">{item.name}</div>
                </div>
              </div>
            )}
            selectedItemsTitle="New Data Sources"
          />
        ) : null
      ) : null}
    </ApplicationLayout>
  );
}

function PermissionsPanel({
  canEdit,
  isSaving,
  onSave,
  permissions,
  selectedPermissions,
  setSelectedPermissions,
}: {
  canEdit: boolean;
  isSaving: boolean;
  onSave: () => Promise<void>;
  permissions: readonly string[];
  selectedPermissions: string[];
  setSelectedPermissions: Dispatch<SetStateAction<string[]>>;
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-[16px] text-slate-800">Permissions</h3>
        <p className="mt-1 text-[13px] text-slate-500">
          Add or remove permissions for this group.
        </p>
      </div>
      <div className="space-y-3 px-4 py-4">
        {!canEdit ? (
          <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-500">
            Built-in groups cannot be edited.
          </div>
        ) : null}
        {permissions.map((permission) => {
          const checked = selectedPermissions.includes(permission);

          return (
            <label
              key={permission}
              className={[
                'flex items-center gap-3 rounded border px-3 py-3 text-[14px] transition',
                checked
                  ? 'border-sky-200 bg-sky-50 text-slate-800'
                  : 'border-slate-200 bg-white text-slate-700',
                canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-70',
              ].join(' ')}
            >
              <input
                checked={checked}
                className="h-4 w-4 rounded border-slate-300 text-[#2196F3] focus:ring-sky-200"
                disabled={!canEdit || isSaving}
                onChange={() => {
                  setSelectedPermissions((currentPermissions) =>
                    currentPermissions.includes(permission)
                      ? currentPermissions.filter((item) => item !== permission)
                      : [...currentPermissions, permission],
                  );
                }}
                type="checkbox"
              />
              <span className="font-mono text-[13px]">{permission}</span>
            </label>
          );
        })}
      </div>
      <div className="border-t border-slate-200 px-4 py-4">
        <button
          className="inline-flex h-9 items-center justify-center rounded border border-[#2196F3] bg-[#2196F3] px-4 text-[13px] text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!canEdit || isSaving}
          onClick={() => {
            void onSave();
          }}
          type="button"
        >
          {isSaving ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
}

function MembersPanel({
  currentUserId,
  group,
  members,
  onRemove,
}: {
  currentUserId: number;
  group: GroupSummary;
  members: GroupMemberItem[];
  onRemove: (userId: number) => void;
}) {
  if (members.length === 0) {
    return (
      <div className="rounded-sm border border-slate-200 px-6 py-12 text-center text-[14px] text-slate-500">
        There are no members in this group yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
      {members.map((member) => {
        const canRemove = !(group.type === 'builtin' && currentUserId === member.id);

        return (
          <div
            key={member.id}
            className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 last:border-b-0 md:flex-row md:items-center md:justify-between"
          >
            <Link className="flex min-w-0 items-center gap-4" href={`/users/${member.id}`}>
              <img
                alt={member.name}
                className="h-10 w-10 rounded-full"
                src={member.profile_image_url}
              />
              <div className="min-w-0">
                <div className="truncate text-[16px] text-[#2196F3]">{member.name}</div>
                <div className="truncate text-[14px] text-slate-400">{member.email}</div>
              </div>
            </Link>
            {canRemove ? (
              <button
                className="inline-flex h-8 items-center justify-center rounded border border-rose-500 bg-rose-500 px-4 text-[13px] text-white transition hover:bg-rose-600"
                onClick={() => onRemove(member.id)}
                type="button"
              >
                Remove
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DataSourcesPanel({
  canEdit,
  dataSources,
  onPermissionChange,
  onRemove,
}: {
  canEdit: boolean;
  dataSources: GroupDataSourceItem[];
  onPermissionChange: (dataSourceId: number, viewOnly: boolean) => void;
  onRemove: (dataSourceId: number) => void;
}) {
  if (dataSources.length === 0) {
    return (
      <div className="rounded-sm border border-slate-200 px-6 py-12 text-center text-[14px] text-slate-500">
        There are no data sources in this group yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
      {dataSources.map((dataSource) => (
        <div
          key={dataSource.id}
          className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 last:border-b-0 md:flex-row md:items-center md:justify-between"
        >
          {canEdit ? (
            <Link
              className="flex min-w-0 items-center gap-4"
              href={`/data_sources/${dataSource.id}`}
            >
              <img
                alt={dataSource.type}
                className="h-8 w-8 object-contain"
                src={getDataSourceLogoPath(dataSource.type)}
              />
              <div className="truncate text-[16px] text-[#2196F3]">
                {dataSource.name}
              </div>
            </Link>
          ) : (
            <div className="flex min-w-0 items-center gap-4">
              <img
                alt={dataSource.type}
                className="h-8 w-8 object-contain"
                src={getDataSourceLogoPath(dataSource.type)}
              />
              <div className="truncate text-[16px] text-slate-700">
                {dataSource.name}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {canEdit ? (
              <>
                <select
                  className="h-8 rounded border border-slate-300 bg-white px-3 text-[13px] text-slate-700"
                  onChange={(event) =>
                    onPermissionChange(
                      dataSource.id,
                      event.target.value === 'viewonly',
                    )
                  }
                  value={dataSource.view_only ? 'viewonly' : 'full'}
                >
                  <option value="full">Full Access</option>
                  <option value="viewonly">View Only</option>
                </select>
                <button
                  className="inline-flex h-8 items-center justify-center rounded border border-rose-500 bg-rose-500 px-4 text-[13px] text-white transition hover:bg-rose-600"
                  onClick={() => onRemove(dataSource.id)}
                  type="button"
                >
                  Remove
                </button>
              </>
            ) : (
              <span className="inline-flex h-8 items-center rounded border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-500">
                {dataSource.view_only ? 'View Only' : 'Full Access'}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SidebarLink({
  active,
  children,
  href,
}: {
  active: boolean;
  children: string;
  href: string;
}) {
  return (
    <Link
      className={[
        'block border-l-[3px] px-6 py-3 text-[13px] transition',
        active
          ? 'border-[#2196F3] bg-sky-50 text-[#2196F3]'
          : 'border-transparent text-slate-500 hover:border-[#2196F3] hover:bg-slate-50 hover:text-[#2196F3]',
      ].join(' ')}
      href={href}
    >
      {children}
    </Link>
  );
}

'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import {
  deleteUser,
  disableUser,
  enableUser,
  UsersApiError,
} from '@/features/users/api/usersClientApi';
import CreateUserDialog from '@/features/users/components/CreateUserDialog';
import InviteLinkDialog from '@/features/users/components/InviteLinkDialog';
import { formatTimeAgo } from '@/features/users/utils/time';
import type { SettingsUserItem } from '../types';
import { useToastMessage } from '@/lib/toast';

interface UsersSectionProps {
  canCreateUser: boolean;
  currentUserId: number;
  items: SettingsUserItem[];
  mailSettingsMissing: boolean;
  openOnLoad?: boolean;
  usersView: 'active' | 'pending' | 'disabled';
}

const buttonBase =
  'inline-flex h-8 items-center justify-center rounded border px-4 text-[13px] transition';
const defaultButton = `${buttonBase} border-slate-300 bg-white text-slate-700`;
const primaryButton = `${buttonBase} border-[#2196F3] bg-[#2196F3] text-white`;
const dangerButton = `${buttonBase} border-rose-500 bg-rose-500 text-white`;

export default function UsersSection({
  canCreateUser,
  currentUserId,
  items,
  mailSettingsMissing,
  openOnLoad = false,
  usersView,
}: UsersSectionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(openOnLoad);
  const [inviteLinkInfo, setInviteLinkInfo] = useState<{
    inviteLink: string;
    userName: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useToastMessage(actionError, 'error');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesView =
        usersView === 'active'
          ? !item.is_disabled && !item.is_invitation_pending
          : usersView === 'pending'
            ? item.is_invitation_pending
            : item.is_disabled;

      if (!matchesView) {
        return false;
      }

      const haystack = [
        item.name,
        item.email,
        item.groups.map((group) => group.name).join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(searchTerm.toLowerCase());
    });
  }, [items, searchTerm, usersView]);

  useEffect(() => {
    setIsCreateModalOpen(openOnLoad);
  }, [openOnLoad]);

  useEffect(() => {
    if (!isCreateModalOpen && !inviteLinkInfo) {
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
  }, [inviteLinkInfo, isCreateModalOpen]);

  const openCreateModal = () => {
    setIsCreateModalOpen(true);

    if (pathname !== '/users/new') {
      router.push('/users/new');
    }
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);

    if (pathname === '/users/new') {
      router.push('/users');
    }
  };

  async function runUserAction(action: () => Promise<void>) {
    setActionError(null);

    try {
      await action();
    } catch (error) {
      if (error instanceof UsersApiError && error.statusCode === 401) {
        router.push('/login');
        return;
      }

      setActionError(
        error instanceof Error ? error.message : 'Request failed.',
      );
    }
  }

  return (
    <div>
      <div className="mb-4">
        {canCreateUser ? (
          <button className={primaryButton} onClick={openCreateModal} type="button">
            <span aria-hidden="true" className="mr-2">
              +
            </span>
            New User
          </button>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500">No users found.</div>
          ) : (
            <div className="w-full overflow-x-auto" data-test="UserList">
              <table className="w-full border-collapse bg-white text-[13px] text-slate-700">
                <thead>
                  <tr>
                    <th className="border-y border-slate-200 bg-slate-50 px-[30px] py-[15px] text-left font-medium">
                      Name
                    </th>
                    <th className="border-y border-slate-200 bg-slate-50 px-4 py-[15px] text-left font-medium">
                      Groups
                    </th>
                    <th className="border-y border-slate-200 bg-slate-50 px-4 py-[15px] text-left font-medium whitespace-nowrap">
                      Joined
                    </th>
                    <th className="border-y border-slate-200 bg-slate-50 px-4 py-[15px] text-left font-medium whitespace-nowrap">
                      Last Active At
                    </th>
                    {canCreateUser ? (
                      <th className="border-y border-slate-200 bg-slate-50 px-[30px] py-[15px] text-left font-medium whitespace-nowrap" />
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-100">
                      <td className="border-b border-slate-200 px-[30px] py-[10px] align-middle">
                        <Link
                          className="flex w-full items-center gap-2.5"
                          href={`/users/${item.id}`}
                        >
                          <img
                            alt={item.name}
                            className="h-8 w-8 shrink-0 rounded-full"
                            src={item.profile_image_url}
                          />
                          <div className="min-w-0">
                            <strong className="block truncate font-normal text-[#2196F3]">
                              {item.name}
                            </strong>
                            <div className="truncate text-slate-400">{item.email}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="border-b border-slate-200 px-4 py-[10px] align-middle">
                        {item.groups.map((group) => (
                          <Link
                            key={group.id}
                            className="mr-1 inline-block max-w-[135px] overflow-hidden rounded border border-slate-200 bg-slate-100 px-1.5 py-1 text-[11px] font-medium text-slate-500 text-ellipsis whitespace-nowrap"
                            href={`/groups/${group.id}`}
                          >
                            {group.name}
                          </Link>
                        ))}
                      </td>
                      <td className="border-b border-slate-200 px-4 py-[10px] align-middle whitespace-nowrap">
                        {formatTimeAgo(item.created_at)}
                      </td>
                      <td className="border-b border-slate-200 px-4 py-[10px] align-middle whitespace-nowrap">
                        {formatTimeAgo(item.active_at)}
                      </td>
                      {canCreateUser ? (
                        <td className="border-b border-slate-200 px-[30px] py-[10px] align-middle whitespace-nowrap">
                          {item.id === currentUserId ? null : item.is_invitation_pending ? (
                            <button
                              className={`${dangerButton} min-w-[74px]`}
                              onClick={() =>
                                void runUserAction(async () => {
                                  await deleteUser(item.id);
                                  router.refresh();
                                })
                              }
                              type="button"
                            >
                              Delete
                            </button>
                          ) : item.is_disabled ? (
                            <button
                              className={`${primaryButton} min-w-[74px]`}
                              onClick={() =>
                                void runUserAction(async () => {
                                  await enableUser(item.id);
                                  router.refresh();
                                })
                              }
                              type="button"
                            >
                              Enable
                            </button>
                          ) : (
                            <button
                              className={`${defaultButton} min-w-[74px]`}
                              onClick={() =>
                                void runUserAction(async () => {
                                  await disableUser(item.id);
                                  router.refresh();
                                })
                              }
                              type="button"
                            >
                              Disable
                            </button>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="w-full max-w-full lg:w-[25%] lg:max-w-[350px]">
          <div className="mb-3 rounded-sm bg-white p-3 shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
            <input
              aria-label="Search users"
              className="h-8 w-full rounded border border-slate-300 px-3 text-[13px] text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search users"
              value={searchTerm}
            />
          </div>
          <div className="overflow-hidden rounded-sm bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
            <SidebarLink active={usersView === 'active'} href="/users">
              Active Users
            </SidebarLink>
            <SidebarLink active={usersView === 'pending'} href="/users/pending">
              Pending Invitations
            </SidebarLink>
            {canCreateUser ? (
              <SidebarLink active={usersView === 'disabled'} href="/users/disabled">
                Disabled Users
              </SidebarLink>
            ) : null}
          </div>
        </aside>
      </div>

      {isCreateModalOpen && canCreateUser ? (
        <CreateUserDialog
          onClose={closeCreateModal}
          onCreated={(createdUser) => {
            closeCreateModal();
            router.refresh();

            if (mailSettingsMissing && createdUser.invite_link) {
              setInviteLinkInfo({
                inviteLink: createdUser.invite_link,
                userName: createdUser.name,
              });
            }
          }}
        />
      ) : null}

      {inviteLinkInfo ? (
        <InviteLinkDialog
          inviteLink={inviteLinkInfo.inviteLink}
          onClose={() => setInviteLinkInfo(null)}
          userName={inviteLinkInfo.userName}
        />
      ) : null}
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
        'block border-l-3 px-4 py-2.5 text-[13px] transition',
        active
          ? 'border-[#2196F3] bg-slate-50 text-[#2196F3]'
          : 'border-transparent text-slate-500 hover:border-[#2196F3] hover:bg-slate-50 hover:text-[#2196F3]',
      ].join(' ')}
      href={href}
    >
      {children}
    </Link>
  );
}

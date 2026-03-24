'use client';
/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { ApplicationLayout } from '@/features/application-layout';
import type { SessionResponse } from '@/features/home/types';
import SettingsTabs from '@/features/settings/components/SettingsTabs';
import type { SettingsMenuResponse } from '@/features/settings/types';
import { useToastMessage } from '@/lib/toast';

import {
  disableUser,
  enableUser,
  regenerateApiKey,
  resendInvitation,
  sendPasswordReset,
  updateUser,
} from '../api/usersClientApi';
import type { UserDetailResponse } from '../types';
import ChangePasswordDialog from './ChangePasswordDialog';
import InviteLinkDialog from './InviteLinkDialog';

interface UserProfileContentProps {
  currentPath: string;
  detail: UserDetailResponse;
  menu: SettingsMenuResponse;
  session: SessionResponse;
}

const inputClass =
  'h-10 w-full rounded border border-slate-300 bg-white px-3 text-[14px] text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100 disabled:text-slate-500';

export default function UserProfileContent({
  currentPath,
  detail,
  menu,
  session,
}: UserProfileContentProps) {
  const [userDetail, setUserDetail] = useState(detail);
  const [name, setName] = useState(detail.user.name);
  const [email, setEmail] = useState(detail.user.email);
  const [groupIds, setGroupIds] = useState<number[]>(detail.user.group_ids);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [isGroupPickerOpen, setIsGroupPickerOpen] = useState(false);
  const [linkDialog, setLinkDialog] = useState<{
    link: string;
    title: string;
  } | null>(null);

  useToastMessage(error, 'error');
  useToastMessage(success, 'success');

  const user = userDetail.user;
  const isAdmin = session.user.roles.includes('admin');
  const isSelf = session.user.id === user.id;

  const selectedGroups = useMemo(
    () =>
      userDetail.all_groups.filter((group) => groupIds.includes(group.id)),
    [groupIds, userDetail.all_groups],
  );

  async function refreshWith(callback: () => Promise<UserDetailResponse>) {
    setError(null);
    setSuccess(null);

    try {
      const nextDetail = await callback();
      setUserDetail(nextDetail);
      setName(nextDetail.user.name);
      setEmail(nextDetail.user.email);
      setGroupIds(nextDetail.user.group_ids);
      return nextDetail;
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : 'Request failed.',
      );
      throw actionError;
    }
  }

  function toggleGroup(groupId: number) {
    setGroupIds((currentGroupIds) =>
      currentGroupIds.includes(groupId)
        ? currentGroupIds.filter((id) => id !== groupId)
        : [...currentGroupIds, groupId],
    );
  }

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
              <div className="mx-auto w-full max-w-[620px]">
                <div className="rounded-sm bg-white">
                  <div className="mb-4 flex items-center gap-4">
                    <img
                      alt="Profile"
                      className="h-10 w-10 rounded-full"
                      src={user.profile_image_url}
                      width={40}
                    />
                    <h3 className="text-[28px] font-medium text-slate-800">
                      {user.name}
                    </h3>
                  </div>
                  <div className="mb-5 h-px bg-slate-200" />

                  <div className="space-y-5">
                    <Field label="Name" required>
                      <input
                        className={inputClass}
                        disabled={user.is_disabled}
                        onChange={(event) => setName(event.target.value)}
                        type="text"
                        value={name}
                      />
                    </Field>
                    <Field label="Email" required>
                      <input
                        className={inputClass}
                        disabled={user.is_disabled}
                        onChange={(event) => setEmail(event.target.value)}
                        type="email"
                        value={email}
                      />
                    </Field>

                    {isAdmin && !user.is_disabled && !isSelf ? (
                      <Field label="Groups">
                        <div className="relative">
                          <button
                            className="min-h-[40px] w-full rounded border border-slate-300 bg-white px-3 py-2 text-left text-[14px] text-slate-700 transition hover:border-slate-400"
                            onClick={() =>
                              setIsGroupPickerOpen(
                                (currentValue) => !currentValue,
                              )
                            }
                            type="button"
                          >
                            <div
                              className="flex flex-wrap gap-2"
                              data-test="Groups"
                            >
                              {selectedGroups.map((group) => (
                                <span
                                  key={group.id}
                                  className="inline-flex items-center rounded border border-slate-300 bg-slate-100 px-2 py-1 text-[13px] text-slate-600"
                                >
                                  {group.name}
                                  <span
                                    className="ml-1 cursor-pointer text-slate-400"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      toggleGroup(group.id);
                                    }}
                                    role="presentation"
                                  >
                                    x
                                  </span>
                                </span>
                              ))}
                            </div>
                          </button>
                          {isGroupPickerOpen ? (
                            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded border border-slate-200 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.15)]">
                              <div className="space-y-2">
                                {userDetail.all_groups.map((group) => (
                                  <label
                                    key={group.id}
                                    className="flex items-center gap-3 text-[14px] text-slate-700"
                                  >
                                    <input
                                      checked={groupIds.includes(group.id)}
                                      className="h-4 w-4 rounded border-slate-300 text-[#2196F3] focus:ring-sky-200"
                                      onChange={() => toggleGroup(group.id)}
                                      type="checkbox"
                                    />
                                    <span>{group.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </Field>
                    ) : (
                      <Field label="Groups">
                        <div
                          className="min-h-[40px] rounded border border-slate-300 bg-white px-3 py-2"
                          data-test="Groups"
                        >
                          <div className="flex flex-wrap gap-2">
                            {selectedGroups.map((group) => (
                              <span
                                key={group.id}
                                className="inline-flex items-center rounded border border-slate-300 bg-slate-100 px-2 py-1 text-[13px] text-slate-600"
                              >
                                {group.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Field>
                    )}
                  </div>

                  {!user.is_disabled ? (
                    <button
                      className="mt-5 inline-flex h-10 w-full items-center justify-center rounded border border-[#2196F3] bg-[#2196F3] px-4 text-[14px] text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={isSaving}
                      onClick={async () => {
                        setIsSaving(true);

                        try {
                          await refreshWith(() =>
                            updateUser(user.id, {
                              email,
                              group_ids:
                                isAdmin && !isSelf ? groupIds : undefined,
                              name,
                            }),
                          );
                          setSuccess('Saved.');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      type="button"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  ) : null}

                  {!user.is_disabled && user.api_key ? (
                    <>
                      <div className="my-5 h-px bg-slate-200" />
                      <SectionTitle>API Key</SectionTitle>
                      <div className="mt-3">
                        <div className="flex overflow-hidden rounded border border-slate-300">
                          <input
                            className="h-10 min-w-0 flex-1 border-0 bg-white px-3 text-[14px] text-slate-700 outline-none"
                            data-test="ApiKey"
                            readOnly
                            value={user.api_key}
                          />
                          <button
                            aria-label="Copy API key"
                            className="inline-flex h-10 w-10 items-center justify-center border-l border-slate-300 bg-slate-50 text-[13px] text-slate-500 transition hover:bg-slate-100"
                            onClick={async () => {
                              await navigator.clipboard.writeText(
                                user.api_key ?? '',
                              );
                              setCopiedApiKey(true);
                              setSuccess('API Key copied.');
                              setTimeout(() => setCopiedApiKey(false), 1200);
                            }}
                            type="button"
                          >
                            {copiedApiKey ? 'OK' : '⧉'}
                          </button>
                        </div>
                      </div>
                      <button
                        className="mt-3 inline-flex h-10 w-full items-center justify-center rounded border border-slate-300 bg-white px-4 text-[14px] text-slate-700 transition hover:bg-slate-50"
                        data-test="RegenerateApiKey"
                        onClick={async () => {
                          await refreshWith(() => regenerateApiKey(user.id));
                          setSuccess('The API Key has been updated.');
                        }}
                        type="button"
                      >
                        Regenerate
                      </button>
                    </>
                  ) : null}

                  {!user.is_disabled ? (
                    <>
                      <div className="my-5 h-px bg-slate-200" />
                      <SectionTitle>Password</SectionTitle>
                      {isSelf ? (
                        <button
                          className="mt-3 inline-flex h-10 w-full items-center justify-center rounded border border-slate-300 bg-white px-4 text-[14px] text-slate-700 transition hover:bg-slate-50"
                          data-test="ChangePassword"
                          onClick={() => setChangePasswordOpen(true)}
                          type="button"
                        >
                          Change Password
                        </button>
                      ) : isAdmin ? (
                        user.is_invitation_pending ? (
                          <button
                            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded border border-slate-300 bg-white px-4 text-[14px] text-slate-700 transition hover:bg-slate-50"
                            onClick={async () => {
                              const nextDetail = await refreshWith(() =>
                                resendInvitation(user.id),
                              );

                              if (nextDetail.user.invite_link) {
                                setLinkDialog({
                                  link: nextDetail.user.invite_link,
                                  title: 'Email not sent!',
                                });
                              } else {
                                setSuccess('Invitation sent.');
                              }
                            }}
                            type="button"
                          >
                            Resend Invitation
                          </button>
                        ) : (
                          <button
                            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded border border-slate-300 bg-white px-4 text-[14px] text-slate-700 transition hover:bg-slate-50"
                            onClick={async () => {
                              const nextDetail = await refreshWith(() =>
                                sendPasswordReset(user.id),
                              );

                              if (nextDetail.user.reset_link) {
                                setLinkDialog({
                                  link: nextDetail.user.reset_link,
                                  title: 'Email not sent!',
                                });
                              } else {
                                setSuccess('Password reset email sent.');
                              }
                            }}
                            type="button"
                          >
                            Send Password Reset Email
                          </button>
                        )
                      ) : null}
                    </>
                  ) : null}

                  {isAdmin && !isSelf ? (
                    <>
                      <div className="my-5 h-px bg-slate-200" />
                      <button
                        className={[
                          'inline-flex h-10 w-full items-center justify-center rounded border px-4 text-[14px] text-white transition',
                          user.is_disabled
                            ? 'border-[#2196F3] bg-[#2196F3] hover:bg-sky-600'
                            : 'border-rose-500 bg-rose-500 hover:bg-rose-600',
                        ].join(' ')}
                        onClick={async () => {
                          await refreshWith(() =>
                            user.is_disabled
                              ? enableUser(user.id)
                              : disableUser(user.id),
                          );
                          setSuccess(
                            user.is_disabled
                              ? `User ${user.name} is now enabled.`
                              : `User ${user.name} is now disabled.`,
                          );
                        }}
                        type="button"
                      >
                        {user.is_disabled ? 'Enable User' : 'Disable User'}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {changePasswordOpen ? (
        <ChangePasswordDialog
          onClose={() => setChangePasswordOpen(false)}
          onSaved={() => {
            setChangePasswordOpen(false);
            setSuccess('Saved.');
          }}
          userId={user.id}
        />
      ) : null}

      {linkDialog ? (
        <InviteLinkDialog
          inviteLink={linkDialog.link}
          onClose={() => setLinkDialog(null)}
          userName={user.name}
        />
      ) : null}
    </ApplicationLayout>
  );
}

function Field({
  children,
  label,
  required = false,
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[14px] text-slate-800">
        {required ? <span className="mr-1 text-rose-500">*</span> : null}
        {label}
      </span>
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h5 className="text-[15px] font-semibold text-slate-800">{children}</h5>;
}

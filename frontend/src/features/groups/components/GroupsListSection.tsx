'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { SettingsListGroupItem } from '@/features/settings/types';
import { deleteGroup } from '../api/groupsClientApi';
import CreateGroupDialog from './CreateGroupDialog';
import { useToastMessage } from '@/lib/toast';

interface GroupsListSectionProps {
  canManage: boolean;
  items: SettingsListGroupItem[];
}

export default function GroupsListSection({
  canManage,
  items,
}: GroupsListSectionProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null);

  useToastMessage(error, 'error');

  return (
    <div data-test="GroupList">
      {canManage ? (
        <div className="mb-4">
          <button
            className="inline-flex h-8 items-center gap-2 rounded border border-[#2196F3] bg-[#2196F3] px-4 text-[13px] text-white transition hover:bg-sky-600"
            onClick={() => setCreateOpen(true)}
            type="button"
          >
            <span aria-hidden="true">+</span>
            New Group
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
        {items.map((group) => {
          const canDelete = canManage && group.type !== 'builtin';

          return (
            <div
              key={group.id}
              className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 last:border-b-0 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <Link
                    className="truncate text-[16px] text-[#2196F3] hover:text-sky-600"
                    href={`/groups/${group.id}`}
                  >
                    {group.name}
                  </Link>
                  {group.type === 'builtin' ? (
                    <span className="inline-flex rounded bg-slate-500 px-2 py-1 text-[11px] text-white">
                      built-in
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <div className="inline-flex overflow-hidden rounded border border-slate-300">
                  <Link
                    className="inline-flex h-8 items-center border-r border-slate-300 bg-white px-4 text-[13px] text-slate-700 transition hover:bg-slate-50"
                    href={`/groups/${group.id}`}
                  >
                    Members
                  </Link>
                  {canManage ? (
                    <Link
                      className="inline-flex h-8 items-center bg-white px-4 text-[13px] text-slate-700 transition hover:bg-slate-50"
                      href={`/groups/${group.id}/data_sources`}
                    >
                      Data Sources
                    </Link>
                  ) : null}
                </div>
                {canManage ? (
                  <button
                    className={[
                      'inline-flex h-8 items-center rounded border px-4 text-[13px] transition',
                      canDelete
                        ? 'border-slate-300 bg-white text-slate-400 hover:bg-slate-50'
                        : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300',
                    ].join(' ')}
                    disabled={!canDelete || deletingGroupId === group.id}
                    onClick={async () => {
                      if (!canDelete) {
                        return;
                      }

                      setDeletingGroupId(group.id);
                      setError(null);

                      try {
                        await deleteGroup(group.id);
                        router.refresh();
                      } catch (deleteError) {
                        setError(
                          deleteError instanceof Error
                            ? deleteError.message
                            : 'Failed deleting group.',
                        );
                        setDeletingGroupId(null);
                      }
                    }}
                    title={canDelete ? undefined : 'Cannot delete built-in group'}
                    type="button"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {createOpen ? (
        <CreateGroupDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(groupId) => {
            setCreateOpen(false);
            router.push(`/groups/${groupId}`);
          }}
        />
      ) : null}
    </div>
  );
}

'use client';
/* eslint-disable @next/next/no-img-element */

import {
  CaretDownFilled,
  CaretUpFilled,
  ExclamationCircleOutlined,
  LoadingOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import type { SettingsQuerySnippetItem } from '@/features/settings/types';

import {
  createQuerySnippet,
  deleteQuerySnippet,
  updateQuerySnippet,
  type SaveQuerySnippetPayload,
} from '../api/querySnippetsClientApi';
import QuerySnippetDialog from './QuerySnippetDialog';
import { useToastMessage } from '@/lib/toast';

interface QuerySnippetsSectionProps {
  activeQuerySnippetId?: number | 'new';
  canCreate: boolean;
  currentUserId: number;
  isAdmin: boolean;
  items: SettingsQuerySnippetItem[];
}

type SortField = 'created_at' | 'description' | 'trigger';
type SortDirection = 'asc' | 'desc';

const buttonBase =
  'inline-flex h-8 items-center justify-center rounded-[2px] border px-4 text-[13px] transition';
const primaryButton =
  `${buttonBase} border-[#2196F3] bg-[#2196F3] text-white hover:bg-sky-600`;
const dangerButton =
  `${buttonBase} border-[#ff4d4f] bg-[#ff4d4f] text-white hover:bg-[#ff7875]`;

export default function QuerySnippetsSection({
  activeQuerySnippetId,
  canCreate,
  currentUserId,
  isAdmin,
  items,
}: QuerySnippetsSectionProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [dialogSnippet, setDialogSnippet] = useState<SettingsQuerySnippetItem | null>(
    null,
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(
    activeQuerySnippetId === 'new',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [snippetToDelete, setSnippetToDelete] =
    useState<SettingsQuerySnippetItem | null>(null);
  const [sortField, setSortField] = useState<SortField>('trigger');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useToastMessage(actionError, 'error');

  useEffect(() => {
    if (activeQuerySnippetId === 'new') {
      setIsCreateDialogOpen(true);
      setDialogSnippet(null);
      return;
    }

    if (typeof activeQuerySnippetId === 'number') {
      const matchedSnippet = items.find((item) => item.id === activeQuerySnippetId);

      if (!matchedSnippet) {
        if (pathname !== '/query_snippets') {
          router.replace('/query_snippets');
        }

        return;
      }

      setIsCreateDialogOpen(false);
      setDialogSnippet(matchedSnippet);
      return;
    }

    setIsCreateDialogOpen(false);
    setDialogSnippet(null);
  }, [activeQuerySnippetId, items, pathname, router]);

  useEffect(() => {
    if (!dialogSnippet && !isCreateDialogOpen && !snippetToDelete) {
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
  }, [dialogSnippet, isCreateDialogOpen, snippetToDelete]);

  const sortedItems = useMemo(() => {
    const nextItems = [...items];

    nextItems.sort((left, right) => {
      const leftValue =
        sortField === 'created_at'
          ? left.created_at
          : sortField === 'description'
            ? left.description
            : left.trigger;
      const rightValue =
        sortField === 'created_at'
          ? right.created_at
          : sortField === 'description'
            ? right.description
            : right.trigger;

      const comparison = leftValue.localeCompare(rightValue);

      return sortDirection === 'asc' ? comparison : comparison * -1;
    });

    return nextItems;
  }, [items, sortDirection, sortField]);

  function canEditQuerySnippet(item: SettingsQuerySnippetItem) {
    return isAdmin || item.user.id === currentUserId;
  }

  function openCreateDialog() {
    if (!canCreate) {
      return;
    }

    setActionError(null);
    setIsCreateDialogOpen(true);
    setDialogSnippet(null);

    if (pathname !== '/query_snippets/new') {
      router.push('/query_snippets/new');
    }
  }

  function openEditDialog(item: SettingsQuerySnippetItem) {
    setActionError(null);
    setIsCreateDialogOpen(false);
    setDialogSnippet(item);

    if (pathname !== `/query_snippets/${item.id}`) {
      router.push(`/query_snippets/${item.id}`);
    }
  }

  function closeEditor() {
    setActionError(null);
    setIsCreateDialogOpen(false);
    setDialogSnippet(null);

    if (pathname !== '/query_snippets') {
      router.push('/query_snippets');
    }
  }

  async function handleSave(payload: SaveQuerySnippetPayload) {
    setActionError(null);
    setIsSubmitting(true);

    try {
      if (dialogSnippet) {
        await updateQuerySnippet(dialogSnippet.id, payload);
      } else {
        await createQuerySnippet(payload);
      }

      closeEditor();
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed saving snippet.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!snippetToDelete) {
      return;
    }

    setActionError(null);
    setIsDeleting(true);

    try {
      await deleteQuerySnippet(snippetToDelete.id);

      if (dialogSnippet?.id === snippetToDelete.id) {
        closeEditor();
      }

      setSnippetToDelete(null);
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed deleting query snippet.',
      );
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  }

  const dialogTitle = dialogSnippet ? dialogSnippet.trigger : 'Create Query Snippet';
  const activeDialogSnippet = dialogSnippet ?? null;
  const activeDialogReadOnly = dialogSnippet
    ? !canEditQuerySnippet(dialogSnippet)
    : false;

  return (
    <div>
      <div className="mb-4">
        <button className={primaryButton} onClick={openCreateDialog} type="button">
          <PlusOutlined className="mr-2 text-[12px]" />
          New Query Snippet
        </button>
      </div>

      {sortedItems.length === 0 ? (
        <div className="px-4 py-8 text-center text-[14px] text-slate-500">
          <div>There are no query snippets yet.</div>
          {canCreate ? (
            <div className="mt-2">
              <button
                className="text-[#2196F3] transition hover:text-sky-600"
                onClick={openCreateDialog}
                type="button"
              >
                Click here
              </button>{' '}
              to add one.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="min-w-[920px] border-collapse bg-white text-[13px] text-slate-700">
            <thead>
              <tr>
                <SortableHeader
                  activeField={sortField}
                  direction={sortDirection}
                  field="trigger"
                  onClick={toggleSort}
                  title="Trigger"
                  widthClass="w-[28%]"
                />
                <SortableHeader
                  activeField={sortField}
                  direction={sortDirection}
                  field="description"
                  onClick={toggleSort}
                  title="Description"
                  widthClass="w-[26%]"
                />
                <th className="w-[24%] border-y border-slate-200 bg-slate-50 px-4 py-[15px] text-left font-medium text-[#323232]">
                  Snippet
                </th>
                <th className="w-[44px] border-y border-slate-200 bg-slate-50 px-2 py-[15px] text-left font-medium text-[#323232]" />
                <SortableHeader
                  activeField={sortField}
                  direction={sortDirection}
                  field="created_at"
                  onClick={toggleSort}
                  title="Created At"
                  widthClass="w-[12%]"
                />
                <th className="border-y border-slate-200 bg-slate-50 px-[30px] py-[15px] text-left font-medium text-[#323232]" />
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-200 px-[30px] py-[10px] align-middle">
                    <button
                      className="text-left text-[13px] text-[#2196F3] transition hover:text-sky-600"
                      onClick={() => openEditDialog(item)}
                      type="button"
                    >
                      {item.trigger}
                    </button>
                  </td>
                  <td className="border-b border-slate-200 px-4 py-[10px] align-middle text-[#595959]">
                    {item.description || ''}
                  </td>
                  <td className="border-b border-slate-200 px-4 py-[10px] align-middle">
                    <code
                      className="block overflow-hidden whitespace-pre-wrap font-mono text-[13px] text-[#d14]"
                      style={{
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 3,
                        display: '-webkit-box',
                        maxHeight: 56,
                      }}
                    >
                      {item.snippet}
                    </code>
                  </td>
                  <td className="border-b border-slate-200 px-2 py-[10px] align-middle">
                    <OwnerAvatar item={item} />
                  </td>
                  <td className="border-b border-slate-200 px-4 py-[10px] align-middle text-[#595959] whitespace-nowrap">
                    {formatCreatedAt(item.created_at)}
                  </td>
                  <td className="border-b border-slate-200 px-[30px] py-[10px] align-middle text-right">
                    {canEditQuerySnippet(item) ? (
                      <button
                        className={dangerButton}
                        onClick={() => setSnippetToDelete(item)}
                        type="button"
                      >
                        Delete
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isCreateDialogOpen || activeDialogSnippet ? (
        <QuerySnippetDialog
          key={activeDialogSnippet?.id ?? 'new'}
          initialValue={{
            description: activeDialogSnippet?.description ?? '',
            snippet: activeDialogSnippet?.snippet ?? '',
            trigger: activeDialogSnippet?.trigger ?? '',
          }}
          isSubmitting={isSubmitting}
          readOnly={activeDialogReadOnly}
          title={dialogTitle}
          onClose={closeEditor}
          onSubmit={handleSave}
        />
      ) : null}

      {snippetToDelete ? (
        <DeleteConfirmDialog
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) {
              setSnippetToDelete(null);
            }
          }}
          onConfirm={() => void handleDeleteConfirm()}
        />
      ) : null}
    </div>
  );
}

function SortableHeader({
  activeField,
  direction,
  field,
  onClick,
  title,
  widthClass,
}: {
  activeField: SortField;
  direction: SortDirection;
  field: SortField;
  onClick: (field: SortField) => void;
  title: string;
  widthClass?: string;
}) {
  const isActive = activeField === field;

  return (
    <th
      className={`${widthClass ?? ''} border-y border-slate-200 bg-slate-50 px-4 py-[15px] text-left font-medium text-[#323232] first:pl-[30px]`}
    >
      <button
        className="inline-flex items-center gap-2 text-left transition hover:text-[#2196F3]"
        onClick={() => onClick(field)}
        type="button"
      >
        <span>{title}</span>
        <span className="flex flex-col text-[9px] leading-[8px] text-slate-300">
          <CaretUpFilled className={isActive && direction === 'asc' ? 'text-[#2196F3]' : ''} />
          <CaretDownFilled
            className={isActive && direction === 'desc' ? 'text-[#2196F3]' : '-mt-[2px]'}
          />
        </span>
      </button>
    </th>
  );
}

function OwnerAvatar({ item }: { item: SettingsQuerySnippetItem }) {
  const [hasImageError, setHasImageError] = useState(false);

  return (
    <div className="flex items-center justify-center" title={`Created by ${item.user.name}`}>
      {!hasImageError ? (
        <img
          alt={item.user.name}
          className="h-5 w-5 rounded-full border border-slate-200 object-cover"
          onError={() => setHasImageError(true)}
          src={item.user.profile_image_url}
        />
      ) : (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-500">
          {item.user.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function DeleteConfirmDialog({
  isDeleting,
  onCancel,
  onConfirm,
}: {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8"
      role="dialog"
    >
      <div
        className="w-full max-w-[416px] rounded-[2px] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-8 py-8">
          <div className="flex items-start gap-4">
            <span className="mt-[2px] inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#faad14] text-[#faad14]">
              <ExclamationCircleOutlined className="text-[15px]" />
            </span>
            <div>
              <h4 className="text-[18px] font-medium text-[#323232]">
                Delete Query Snippet
              </h4>
              <p className="mt-3 text-[14px] text-[#595959]">
                Are you sure you want to delete this query snippet?
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-8 pb-6">
          <button
            className="inline-flex h-8 min-w-[48px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white px-4 text-[13px] text-[#595959] transition hover:border-[#40a9ff] hover:text-[#40a9ff]"
            onClick={onCancel}
            type="button"
          >
            No
          </button>
          <button
            className="inline-flex h-8 min-w-[52px] items-center justify-center rounded-[2px] border border-[#ff4d4f] bg-white px-4 text-[13px] text-[#ff4d4f] transition hover:bg-[#fff1f0] disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? <LoadingOutlined /> : 'Yes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatCreatedAt(value: string) {
  const [date] = value.split('T');

  return date || value;
}

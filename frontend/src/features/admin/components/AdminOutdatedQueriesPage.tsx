'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

import { getAdminOutdatedQueries } from '../api/adminClientApi';
import type {
  AdminOutdatedQueriesResponse,
  AdminOutdatedQueryItem,
} from '../types';
import { formatRuntime } from '@/features/queries/components/querySourceEditorUtils';
import { formatRefreshScheduleSummary } from '@/features/queries/utils/querySchedule';
import { formatTimeAgo } from '@/features/users/utils/time';
import { useToastMessage } from '@/lib/toast';

type SortField = 'created_at' | 'id' | 'name' | 'retrieved_at' | 'runtime' | 'schedule';
type SortDirection = 'asc' | 'desc';

function compareValues(
  left: AdminOutdatedQueryItem,
  right: AdminOutdatedQueryItem,
  field: SortField,
  direction: SortDirection,
) {
  const modifier = direction === 'asc' ? 1 : -1;

  if (field === 'id') {
    return (left.id - right.id) * modifier;
  }

  if (field === 'runtime') {
    return ((left.runtime ?? -1) - (right.runtime ?? -1)) * modifier;
  }

  if (field === 'schedule') {
    const leftInterval =
      typeof left.schedule?.interval === 'number'
        ? left.schedule.interval
        : typeof left.schedule?.interval === 'string'
          ? Number(left.schedule.interval)
          : 0;
    const rightInterval =
      typeof right.schedule?.interval === 'number'
        ? right.schedule.interval
        : typeof right.schedule?.interval === 'string'
          ? Number(right.schedule.interval)
          : 0;

    return (leftInterval - rightInterval) * modifier;
  }

  if (field === 'name') {
    return left.name.localeCompare(right.name) * modifier;
  }

  const leftTimestamp = left[field] ? Date.parse(left[field] as string) : 0;
  const rightTimestamp = right[field] ? Date.parse(right[field] as string) : 0;
  return (leftTimestamp - rightTimestamp) * modifier;
}

function renderSortArrow(
  activeField: SortField,
  currentField: SortField,
  direction: SortDirection,
) {
  if (activeField !== currentField) {
    return null;
  }

  return direction === 'asc' ? ' ↑' : ' ↓';
}

function formatLastUpdated(value: number | null) {
  if (!value) {
    return 'n/a';
  }

  return new Date(value * 1000).toISOString().replace('T', ' ').replace('Z', ' UTC');
}

function formatRelativeLastUpdated(value: number | null, isHydrated: boolean) {
  if (!value) {
    return 'n/a';
  }

  if (!isHydrated) {
    return formatLastUpdated(value);
  }

  return formatTimeAgo(new Date(value * 1000).toISOString()) || 'n/a';
}

export default function AdminOutdatedQueriesPage({
  initialData,
  initialError = null,
  timezone,
}: {
  initialData: AdminOutdatedQueriesResponse | null;
  initialError?: string | null;
  timezone: string;
}) {
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [data, setData] = useState<AdminOutdatedQueriesResponse | null>(
    initialData,
  );
  const [error, setError] = useState<string | null>(initialError);
  const [isHydrated, setIsHydrated] = useState(false);

  useToastMessage(error, 'error');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const nextData = await getAdminOutdatedQueries();

        if (!isCancelled) {
          setData(nextData);
          setError(null);
        }
      } catch {
        if (!isCancelled) {
          setError('outdated query 목록을 불러오지 못했습니다.');
        }
      }
    };

    if (!initialData) {
      void load();
    }

    const intervalId = window.setInterval(() => {
      if (autoUpdate) {
        void load();
      }
    }, 60_000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [autoUpdate, initialData]);

  const sortedItems = useMemo(() => {
    const items = [...(data?.queries ?? [])];
    items.sort((left, right) =>
      compareValues(left, right, sortField, sortDirection),
    );
    return items;
  }, [data, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const pageItems = useMemo(() => {
    const startIndex = (effectiveCurrentPage - 1) * pageSize;
    return sortedItems.slice(startIndex, startIndex + pageSize);
  }, [effectiveCurrentPage, pageSize, sortedItems]);

  function handleToggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((currentValue) =>
        currentValue === 'asc' ? 'desc' : 'asc',
      );
      return;
    }

    setSortField(field);
    setSortDirection(field === 'name' ? 'asc' : 'desc');
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-3 text-[14px] text-[#595959]">
          <span>Auto update</span>
          <button
            aria-pressed={autoUpdate}
            className={`relative inline-flex h-5 w-9 rounded-full transition ${
              autoUpdate ? 'bg-[#1890ff]' : 'bg-[#d9d9d9]'
            }`}
            onClick={() => setAutoUpdate((currentValue) => !currentValue)}
            type="button"
          >
            <span
              className={`absolute top-[3px] h-3.5 w-3.5 rounded-full bg-white transition ${
                autoUpdate ? 'left-[18px]' : 'left-[3px]'
              }`}
            />
          </button>
        </label>
        <span className="text-[13px] text-[#8c8c8c]">
          Last updated:{' '}
          {formatRelativeLastUpdated(data?.updated_at ?? null, isHydrated)}
        </span>
      </div>

      {sortedItems.length === 0 ? (
        <div className="rounded-[2px] border border-[#e8e8e8] bg-white px-4 py-10 text-center text-[13px] text-[#8c8c8c]">
          There are no outdated queries.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[2px] border border-[#e8e8e8] bg-white">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] border-collapse text-[13px] text-[#595959]">
              <thead>
                <tr>
                  <SortableHeader align="right" label={`ID${renderSortArrow(sortField, 'id', sortDirection)}`} onClick={() => handleToggleSort('id')} />
                  <SortableHeader label={`Name${renderSortArrow(sortField, 'name', sortDirection)}`} onClick={() => handleToggleSort('name')} />
                  <th className="border-b border-[#e8e8e8] bg-[#fafafa] px-4 py-3 text-left font-medium">Created By</th>
                  <SortableHeader label={`Created At${renderSortArrow(sortField, 'created_at', sortDirection)}`} onClick={() => handleToggleSort('created_at')} />
                  <SortableHeader label={`Runtime${renderSortArrow(sortField, 'runtime', sortDirection)}`} onClick={() => handleToggleSort('runtime')} />
                  <SortableHeader label={`Last Executed At${renderSortArrow(sortField, 'retrieved_at', sortDirection)}`} onClick={() => handleToggleSort('retrieved_at')} />
                  <SortableHeader label={`Update Schedule${renderSortArrow(sortField, 'schedule', sortDirection)}`} onClick={() => handleToggleSort('schedule')} />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#fafafa]">
                    <td className="border-b border-[#f0f0f0] px-4 py-3 text-right">{item.id}</td>
                    <td className="border-b border-[#f0f0f0] px-4 py-3">
                      <Link className="font-medium text-[#1890ff] hover:text-[#40a9ff]" href={`/queries/${item.id}`}>
                        {item.name}
                      </Link>
                      {item.tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-[#dfe7eb] px-[7px] py-[3px] text-[12px] text-[#5f6f7a]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="border-b border-[#f0f0f0] px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.user?.profile_image_url ? (
                          <Image
                            alt={item.user.name}
                            className="h-8 w-8 rounded-full border border-[#f0f0f0] object-cover"
                            height={32}
                            src={item.user.profile_image_url}
                            width={32}
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e6f7ff] text-[12px] font-semibold text-[#1890ff]">
                            {(item.user?.name ?? '?').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span>{item.user?.name ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="border-b border-[#f0f0f0] px-4 py-3">{formatTimeAgo(item.created_at)}</td>
                    <td className="border-b border-[#f0f0f0] px-4 py-3">{formatRuntime(item.runtime)}</td>
                    <td className="border-b border-[#f0f0f0] px-4 py-3">{formatTimeAgo(item.retrieved_at)}</td>
                    <td className="border-b border-[#f0f0f0] px-4 py-3">{formatRefreshScheduleSummary(item.schedule, timezone)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {pageItems.map((item) => (
              <div key={item.id} className="rounded-[2px] border border-[#f0f0f0] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link className="font-medium text-[#1890ff]" href={`/queries/${item.id}`}>
                      {item.name}
                    </Link>
                    <div className="mt-1 text-[12px] text-[#8c8c8c]">ID {item.id}</div>
                  </div>
                  <div className="text-right text-[12px] text-[#8c8c8c]">
                    <div>{formatRuntime(item.runtime)}</div>
                    <div>{formatTimeAgo(item.retrieved_at)}</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-[12px] text-[#595959]">
                  <span>Created by {item.user?.name ?? 'Unknown'}</span>
                  <span>Created {formatTimeAgo(item.created_at)}</span>
                  <span>{formatRefreshScheduleSummary(item.schedule, timezone)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8e8e8] px-4 py-3 text-[13px] text-[#8c8c8c]">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <select
                className="rounded-[2px] border border-[#d9d9d9] bg-white px-2 py-1 text-[13px] text-[#595959]"
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setCurrentPage(1);
                }}
                value={pageSize}
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="rounded-[2px] border border-[#d9d9d9] px-3 py-1 transition hover:border-[#40a9ff] hover:text-[#1890ff] disabled:cursor-not-allowed disabled:border-[#f0f0f0] disabled:text-[#bfbfbf]"
                disabled={effectiveCurrentPage <= 1}
                onClick={() =>
                  setCurrentPage((currentValue) => Math.max(1, currentValue - 1))
                }
                type="button"
              >
                Previous
              </button>
              <span>
                Page {effectiveCurrentPage} of {totalPages}
              </span>
              <button
                className="rounded-[2px] border border-[#d9d9d9] px-3 py-1 transition hover:border-[#40a9ff] hover:text-[#1890ff] disabled:cursor-not-allowed disabled:border-[#f0f0f0] disabled:text-[#bfbfbf]"
                disabled={effectiveCurrentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((currentValue) =>
                    Math.min(totalPages, currentValue + 1),
                  )
                }
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableHeader({
  align = 'left',
  label,
  onClick,
}: {
  align?: 'left' | 'right';
  label: string;
  onClick: () => void;
}) {
  return (
    <th
      className={`border-b border-[#e8e8e8] bg-[#fafafa] px-4 py-3 font-medium ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <button className="transition hover:text-[#1890ff]" onClick={onClick} type="button">
        {label}
      </button>
    </th>
  );
}

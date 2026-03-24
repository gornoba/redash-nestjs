'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  type MouseEvent,
  startTransition,
  useEffect,
  useState,
} from 'react';

import { ApplicationLayout } from '@/features/application-layout';
import type { SessionResponse } from '@/features/home/types';
import { useToastMessage } from '@/lib/toast';

import { getQueries, getQueryTags } from '../api/queriesClientApi';
import type {
  QueryListItem,
  QueryListResponse,
  QueryListView,
  QueryTagItem,
} from '../types';

interface QueriesListPageProps {
  session: SessionResponse;
  currentPath: string;
  view: QueryListView;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];

function formatDatePart(date: Date, format: string) {
  const yyyy = date.getFullYear();
  const yy = String(yyyy).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  switch (format) {
    case 'DD/MM/YY':
      return `${dd}/${mm}/${yy}`;
    case 'MM/DD/YY':
      return `${mm}/${dd}/${yy}`;
    case 'YYYY-MM-DD':
    default:
      return `${yyyy}-${mm}-${dd}`;
  }
}

function formatTimePart(date: Date, format: string) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

  switch (format) {
    case 'HH:mm':
      return `${hours}:${minutes}`;
    case 'HH:mm:ss.SSS':
      return `${hours}:${minutes}:${seconds}.${milliseconds}`;
    case 'HH:mm:ss':
    default:
      return `${hours}:${minutes}:${seconds}`;
  }
}

function formatDateTime(
  value: string | null,
  session: SessionResponse,
) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${formatDatePart(date, session.client_config.dateFormat)}\n${formatTimePart(date, session.client_config.timeFormat)}`;
}

function scheduleLabel(schedule: Record<string, unknown> | null) {
  if (!schedule || typeof schedule !== 'object') {
    return 'Never';
  }

  const intervalValue = Number(
    typeof schedule.interval === 'string' || typeof schedule.interval === 'number'
      ? schedule.interval
      : NaN,
  );

  if (!Number.isFinite(intervalValue) || intervalValue <= 0) {
    return 'Never';
  }

  if (intervalValue >= 86400) {
    return 'Every day';
  }

  if (intervalValue >= 3600) {
    const hours = intervalValue / 3600;
    return `Every ${hours} hour${hours > 1 ? 's' : ''}`;
  }

  if (intervalValue >= 60) {
    const minutes = intervalValue / 60;
    return `Every ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  return `Every ${intervalValue}s`;
}

function getPageTitle(view: QueryListView) {
  switch (view) {
    case 'favorites':
      return 'Favorite Queries';
    case 'my':
      return 'My Queries';
    case 'archive':
      return 'Archived Queries';
    case 'all':
    default:
      return 'Queries';
  }
}

function getOrderField(order: string | null) {
  if (!order) {
    return 'created_at';
  }

  const field = order.replace(/^-/, '');

  if (field === 'executed_at') {
    return 'retrieved_at';
  }

  return field;
}

function isOrderDesc(order: string | null) {
  return order ? order.startsWith('-') : true;
}

export default function QueriesListPage({
  session,
  currentPath,
  view,
}: QueriesListPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.max(
    1,
    Number(searchParams.get('page_size') ?? '25') || 25,
  );
  const searchParamsValue = searchParams.toString();
  const order = searchParams.get('order') || '-created_at';
  const query = searchParams.get('q') ?? '';
  const selectedTags = searchParams.getAll('tags');
  const selectedTagsKey = selectedTags.join('\u0000');
  const canCreateQuery =
    session.user.roles.includes('admin') ||
    session.user.permissions.includes('create_query');
  const [searchInput, setSearchInput] = useState(query);
  const [queries, setQueries] = useState<QueryListResponse>({
    count: 0,
    page: 1,
    page_size: 25,
    results: [],
  });
  const [tags, setTags] = useState<QueryTagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useToastMessage(errorMessage, 'error');

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (searchInput === query) {
        return;
      }

        replaceSearchParams(currentPath, router, searchParamsValue, {
          page: '1',
          q: searchInput || null,
        });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [currentPath, query, router, searchInput, searchParamsValue]);

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();
    const tagsForQuery = selectedTagsKey
      ? selectedTagsKey.split('\u0000')
      : [];

    setIsLoading(true);
    setErrorMessage(null);

    getQueries(view, {
      order,
      page,
      page_size: pageSize,
      q: query || undefined,
      tags: tagsForQuery,
    }, {
      signal: controller.signal,
    })
      .then((response) => {
        if (isCancelled) {
          return;
        }

        setQueries(response);

        const totalPages = Math.max(
          1,
          Math.ceil(response.count / response.page_size) || 1,
        );

        if (page > totalPages) {
          replaceSearchParams(currentPath, router, searchParamsValue, {
            page: String(totalPages),
          });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isCancelled) {
          return;
        }

        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Failed to load queries.',
          );
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [
    currentPath,
    order,
    page,
    pageSize,
    query,
    router,
    searchParamsValue,
    selectedTagsKey,
    view,
  ]);

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    setIsLoadingTags(true);

    // Next.js development remounts client components to surface side effects.
    // Abort the first request during cleanup so the tags endpoint is not fetched twice.
    getQueryTags({
      signal: controller.signal,
    })
      .then((response) => {
        if (!isCancelled) {
          setTags(response.tags);
        }
      })
      .catch((error: unknown) => {
        if (
          isCancelled ||
          (typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ERR_CANCELED')
        ) {
          return;
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingTags(false);
        }
      });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, []);

  const totalPages = Math.max(
    1,
    Math.ceil(queries.count / queries.page_size) || 1,
  );
  const activeSortField = getOrderField(order);
  const sortDescending = isOrderDesc(order);

  function toggleSort(field: 'created_at' | 'name' | 'retrieved_at' | 'schedule') {
    const backendField = field === 'retrieved_at' ? 'executed_at' : field;
    const currentField = order.replace(/^-/, '');
    const nextOrder =
      currentField === backendField
        ? sortDescending
          ? backendField
          : `-${backendField}`
        : `-${backendField}`;

    replaceSearchParams(currentPath, router, searchParamsValue, {
      order: nextOrder,
      page: '1',
    });
  }

  function sortArrow(field: 'created_at' | 'name' | 'retrieved_at' | 'schedule') {
    if (activeSortField !== field) {
      return ' ↕';
    }

    return sortDescending ? ' ↓' : ' ↑';
  }

  function updatePage(nextPage: number) {
    replaceSearchParams(currentPath, router, searchParamsValue, {
      page: String(nextPage),
    });
  }

  function updatePageSize(nextPageSize: number) {
    replaceSearchParams(currentPath, router, searchParamsValue, {
      page: '1',
      page_size: String(nextPageSize),
    });
  }

  function toggleTagSelection(event: MouseEvent<HTMLButtonElement>, tag: string) {
    let nextTags: string[];

    if (event.shiftKey) {
      nextTags = selectedTags.includes(tag)
        ? selectedTags.filter((value) => value !== tag)
        : [...selectedTags, tag];
    } else if (selectedTags.length === 1 && selectedTags[0] === tag) {
      nextTags = [];
    } else {
      nextTags = [tag];
    }

    replaceSearchParams(currentPath, router, searchParamsValue, {
      page: '1',
      tags: nextTags,
    });
  }

  return (
    <ApplicationLayout currentPath={currentPath} session={session}>
      <div className="pt-[15px]">
        <div className="w-full px-[15px] pb-10 max-md:px-3">
          <div className="mb-[15px]">
            <h3 className="m-0 text-[23px] font-medium leading-tight text-[#323232]">
              {getPageTitle(view)}
            </h3>
          </div>

          <div className="flex flex-col lg:flex-row">
            <div className="order-1 w-full lg:order-0 lg:w-3/4">
              <div className="overflow-hidden rounded-[3px] bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-[13px] text-[#767676]">
                    <thead>
                      <tr className="border-b border-[#e8e8e8]">
                        <th className="w-[32px] bg-[#fafafa] px-0 py-[10px] text-center font-normal" />
                        <th
                          className="cursor-pointer bg-[#fafafa] px-[10px] py-[10px] text-left font-normal select-none"
                          onClick={() => toggleSort('name')}
                        >
                          Name{sortArrow('name')}
                        </th>
                        <th className="bg-[#fafafa] px-[10px] py-[10px] text-left font-normal whitespace-nowrap">
                          Created By
                        </th>
                        <th
                          className="cursor-pointer bg-[#fafafa] px-[10px] py-[10px] text-left font-normal whitespace-nowrap select-none"
                          onClick={() => toggleSort('created_at')}
                        >
                          Created At{sortArrow('created_at')}
                        </th>
                        <th
                          className="cursor-pointer bg-[#fafafa] px-[10px] py-[10px] text-left font-normal whitespace-nowrap select-none"
                          onClick={() => toggleSort('retrieved_at')}
                        >
                          Last Executed At{sortArrow('retrieved_at')}
                        </th>
                        <th
                          className="cursor-pointer bg-[#fafafa] px-[10px] py-[10px] text-left font-normal whitespace-nowrap select-none"
                          onClick={() => toggleSort('schedule')}
                        >
                          Refresh Schedule{sortArrow('schedule')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td
                            className="px-4 py-8 text-center text-[#767676]"
                            colSpan={6}
                          >
                            Loading queries...
                          </td>
                        </tr>
                      ) : queries.results.length === 0 ? (
                        <tr>
                          <td
                            className="px-4 py-8 text-center text-[#767676]"
                            colSpan={6}
                          >
                            No queries found.
                          </td>
                        </tr>
                      ) : (
                        queries.results.map((item) => (
                          <QueryRow
                            key={item.id}
                            item={item}
                            session={session}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-[#e8e8e8] px-[15px] py-[10px] text-[13px] text-[#767676]">
                  <div className="flex items-center gap-2">
                    <span>Page Size:</span>
                    <select
                      className="rounded border border-[#d9d9d9] bg-white px-2 py-1 text-[13px]"
                      onChange={(event) =>
                        updatePageSize(Number(event.target.value))
                      }
                      value={pageSize}
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="rounded border border-[#d9d9d9] bg-white px-2.5 py-1 text-[13px] text-[#767676] disabled:opacity-30"
                      disabled={page <= 1}
                      onClick={() => updatePage(1)}
                      type="button"
                    >
                      «
                    </button>
                    <button
                      className="rounded border border-[#d9d9d9] bg-white px-2.5 py-1 text-[13px] text-[#767676] disabled:opacity-30"
                      disabled={page <= 1}
                      onClick={() => updatePage(page - 1)}
                      type="button"
                    >
                      ‹
                    </button>
                    <span className="px-2">
                      {Math.min(page, totalPages)} / {totalPages}
                    </span>
                    <button
                      className="rounded border border-[#d9d9d9] bg-white px-2.5 py-1 text-[13px] text-[#767676] disabled:opacity-30"
                      disabled={page >= totalPages}
                      onClick={() => updatePage(page + 1)}
                      type="button"
                    >
                      ›
                    </button>
                    <button
                      className="rounded border border-[#d9d9d9] bg-white px-2.5 py-1 text-[13px] text-[#767676] disabled:opacity-30"
                      disabled={page >= totalPages}
                      onClick={() => updatePage(totalPages)}
                      type="button"
                    >
                      »
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <aside className="order-0 mb-[15px] w-full lg:order-1 lg:mb-0 lg:w-1/4 lg:max-w-[350px] lg:pl-[15px]">
              {canCreateQuery ? (
                <Link
                  className="mb-[10px] flex h-[34px] w-full items-center justify-center rounded-[4px] bg-[#1890ff] text-[14px] font-normal text-white shadow-[0_2px_0_rgba(0,0,0,0.045)] transition hover:bg-[#40a9ff]"
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                  href="/queries/new"
                >
                  <span aria-hidden="true" className="mr-1.5">
                    +
                  </span>
                  New Query
                </Link>
              ) : null}

              <div className="mb-[10px]">
                <input
                  aria-label="Search queries"
                  className="h-[32px] w-full rounded-[4px] border border-[#d9d9d9] bg-white px-[11px] text-[14px] text-[#595959] outline-none transition focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]"
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search Queries..."
                  value={searchInput}
                />
              </div>

              <div className="mb-[10px] overflow-hidden rounded-[3px] bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
                <SidebarMenuItem active={view === 'all'} href="/queries" label="All Queries" />
                <SidebarMenuItem active={view === 'my'} href="/queries/my" label="My Queries" />
                <SidebarMenuItem active={view === 'favorites'} href="/queries/favorites" label="Favorites" />
                <SidebarMenuItem active={view === 'archive'} href="/queries/archive" label="Archived" />
              </div>

              <div>
                <div className="mx-[5px] mt-[15px] mb-[5px] flex items-center justify-between">
                  <span className="text-[14px] text-[#595959]">Tags</span>
                  {selectedTags.length > 0 ? (
                    <button
                      className="text-[12px] text-[#1890ff] hover:text-[#40a9ff]"
                      onClick={() =>
                        replaceSearchParams(currentPath, router, searchParamsValue, {
                          page: '1',
                          tags: [],
                        })
                      }
                      type="button"
                    >
                      clear
                    </button>
                  ) : null}
                </div>
                <div className="overflow-hidden rounded-[3px] bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
                  {isLoadingTags ? (
                    <div className="px-[16px] py-[12px] text-[13px] text-[#767676]">
                      Loading tags...
                    </div>
                  ) : tags.length === 0 ? (
                    <div className="px-[16px] py-[12px] text-[13px] text-[#767676]">
                      No tags
                    </div>
                  ) : (
                    tags.map((tag) => (
                      <button
                        key={tag.name}
                        className={[
                          'flex w-full items-center justify-between border-l-[3px] px-[16px] py-[10px] text-[14px] transition',
                          selectedTags.includes(tag.name)
                            ? 'border-[#1890ff] bg-[#e6f7ff] text-[#1890ff]'
                            : 'border-transparent text-[#595959] hover:border-[#1890ff] hover:text-[#1890ff]',
                        ].join(' ')}
                        onClick={(event) => toggleTagSelection(event, tag.name)}
                        type="button"
                      >
                        <span className="truncate">{tag.name}</span>
                        <span className="ml-2 inline-flex h-[20px] min-w-[20px] flex-shrink-0 items-center justify-center rounded-[10px] bg-[#f5f5f5] px-[6px] text-[12px] leading-none text-[#999]">
                          {tag.count}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </ApplicationLayout>
  );
}

function QueryRow({
  item,
  session,
}: {
  item: QueryListItem;
  session: SessionResponse;
}) {
  return (
    <tr className="border-b border-[#e8e8e8] hover:bg-[#fafafa]">
      <td className="w-[32px] px-0 py-[8px] text-center align-top">
        <button
          aria-label="Favorite"
          className={`text-[14px] ${item.is_favorite ? 'text-[#f5c342]' : 'text-[#d8d8d8]'} hover:text-[#f5c342]`}
          type="button"
        >
          ★
        </button>
      </td>
      <td className="px-[10px] py-[8px] align-top">
        <Link
          className="text-[14px] text-[#2196f3] hover:text-[#1976d2]"
          href={`/queries/${item.id}`}
        >
          {item.name}
        </Link>
        <div className="mt-[3px] flex flex-wrap items-center gap-[6px]">
          {item.is_draft ? (
            <span className="inline-block rounded-[3px] bg-[#f6f8f9] px-[7px] py-[2px] text-[12px] leading-[16px] text-[#a7b6c2]">
              Unpublished
            </span>
          ) : null}
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-block rounded-[3px] bg-[#f6f8f9] px-[7px] py-[2px] text-[12px] leading-[16px] text-[#6d7f8d]"
            >
              {tag}
            </span>
          ))}
        </div>
      </td>
      <td className="px-[10px] py-[8px] align-top whitespace-nowrap text-[13px]">
        {item.user?.name ?? '-'}
      </td>
      <td className="px-[10px] py-[8px] align-top whitespace-nowrap text-[13px]">
        <span className="whitespace-pre-line">
          {formatDateTime(item.created_at, session)}
        </span>
      </td>
      <td className="px-[10px] py-[8px] align-top whitespace-nowrap text-[13px]">
        <span className="whitespace-pre-line">
          {formatDateTime(item.retrieved_at, session)}
        </span>
      </td>
      <td className="px-[10px] py-[8px] align-top whitespace-nowrap text-[13px]">
        {scheduleLabel(item.schedule)}
      </td>
    </tr>
  );
}

function SidebarMenuItem({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={[
        'flex items-center border-l-[3px] px-[16px] py-[10px] text-[14px] transition',
        active
          ? 'border-[#1890ff] bg-[#e6f7ff] text-[#1890ff]'
          : 'border-transparent text-[#595959] hover:bg-[#fafafa] hover:text-[#1890ff]',
      ].join(' ')}
      href={href}
    >
      {label}
    </Link>
  );
}

function replaceSearchParams(
  currentPath: string,
  router: ReturnType<typeof useRouter>,
  searchParamsValue: string,
  changes: {
    order?: string | null;
    page?: string | null;
    page_size?: string | null;
    q?: string | null;
    tags?: string[];
  },
) {
  const nextParams = new URLSearchParams(searchParamsValue);

  if ('tags' in changes) {
    nextParams.delete('tags');
    for (const tag of changes.tags ?? []) {
      nextParams.append('tags', tag);
    }
  }

  updateStringSearchParam(nextParams, 'order', changes.order);
  updateStringSearchParam(nextParams, 'page', changes.page);
  updateStringSearchParam(nextParams, 'page_size', changes.page_size);
  updateStringSearchParam(nextParams, 'q', changes.q);

  const nextUrl = nextParams.toString()
    ? `${currentPath}?${nextParams.toString()}`
    : currentPath;

  startTransition(() => {
    router.replace(nextUrl, { scroll: false });
  });
}

function updateStringSearchParam(
  searchParams: URLSearchParams,
  key: string,
  value: string | null | undefined,
) {
  if (!value) {
    searchParams.delete(key);
    return;
  }

  searchParams.set(key, value);
}

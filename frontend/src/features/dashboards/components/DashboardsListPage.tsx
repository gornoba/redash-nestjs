'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  startTransition,
  useEffect,
  useState,
} from 'react';
import {
  CaretDownOutlined,
  CaretUpOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';

import { ApplicationLayout } from '@/features/application-layout';
import {
  createDashboard,
  favoriteDashboard,
  getDashboards,
  getDashboardTags,
  unfavoriteDashboard,
} from '@/features/dashboards/api/dashboardsClientApi';
import type {
  DashboardListItem,
  DashboardListResponse,
  DashboardListView,
  DashboardTagItem,
} from '@/features/dashboards/types';
import type { SessionResponse } from '@/features/home/types';
import { getApiErrorMessage } from '@/lib/api-error';
import { useToast, useToastMessage } from '@/lib/toast';

interface DashboardsListPageProps {
  session: SessionResponse;
  currentPath: string;
  view: DashboardListView;
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

function formatDateTime(value: string, session: SessionResponse) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${formatDatePart(date, session.client_config.dateFormat)}\n${formatTimePart(date, session.client_config.timeFormat)}`;
}

function getPageTitle(view: DashboardListView) {
  switch (view) {
    case 'favorites':
      return 'Favorite Dashboards';
    case 'my':
      return 'My Dashboards';
    case 'all':
    default:
      return 'Dashboards';
  }
}

function getOrderField(order: string | null) {
  if (!order) {
    return 'created_at';
  }

  return order.replace(/^-/, '');
}

function isOrderDesc(order: string | null) {
  return order ? order.startsWith('-') : true;
}

export default function DashboardsListPage({
  session,
  currentPath,
  view,
}: DashboardsListPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess } = useToast();
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
  const canCreateDashboard =
    session.user.roles.includes('admin') ||
    session.user.permissions.includes('create_dashboard');
  const [searchInput, setSearchInput] = useState(query);
  const [dashboards, setDashboards] = useState<DashboardListResponse>({
    count: 0,
    page: 1,
    page_size: 25,
    results: [],
  });
  const [tags, setTags] = useState<DashboardTagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<number[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [isCreatingDashboard, setIsCreatingDashboard] = useState(false);

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
    const tagsForQuery = selectedTagsKey
      ? selectedTagsKey.split('\u0000')
      : [];

    setIsLoading(true);
    setErrorMessage(null);

    getDashboards(view, {
      order,
      page,
      page_size: pageSize,
      q: query || undefined,
      tags: tagsForQuery,
    })
      .then((response) => {
        if (isCancelled) {
          return;
        }

        setDashboards(response);

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
        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Failed to load dashboards.',
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

    setIsLoadingTags(true);

    getDashboardTags()
      .then((response) => {
        if (!isCancelled) {
          setTags(response.tags);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setTags([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingTags(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const totalPages = Math.max(
    1,
    Math.ceil(dashboards.count / dashboards.page_size) || 1,
  );
  const activeSortField = getOrderField(order);
  const sortDescending = isOrderDesc(order);
  const showTagsPanel = isLoadingTags || tags.length > 0 || selectedTags.length > 0;

  function toggleSort(field: 'created_at' | 'name') {
    const currentField = order.replace(/^-/, '');
    const nextOrder =
      currentField === field
        ? sortDescending
          ? field
          : `-${field}`
        : `-${field}`;

    replaceSearchParams(currentPath, router, searchParamsValue, {
      order: nextOrder,
      page: '1',
    });
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

  async function handleFavoriteToggle(item: DashboardListItem) {
    setErrorMessage(null);
    setPendingFavoriteIds((current) => [...current, item.id]);

    try {
      const updated = item.is_favorite
        ? await unfavoriteDashboard(item.id)
        : await favoriteDashboard(item.id);

      const shouldMoveToPreviousPage =
        view === 'favorites' && item.is_favorite && dashboards.results.length === 1 && page > 1;

      setDashboards((current) => {
        if (view === 'favorites' && !updated.is_favorite) {
          return {
            ...current,
            count: Math.max(0, current.count - 1),
            results: current.results.filter((dashboard) => dashboard.id !== item.id),
          };
        }

        return {
          ...current,
          results: current.results.map((dashboard) =>
            dashboard.id === updated.id
              ? { ...dashboard, is_favorite: updated.is_favorite }
              : dashboard,
          ),
        };
      });

      if (shouldMoveToPreviousPage) {
        replaceSearchParams(currentPath, router, searchParamsValue, {
          page: String(page - 1),
        });
      }

      showSuccess(
        updated.is_favorite
          ? 'Added to favorites.'
          : 'Removed from favorites.',
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Failed to update favorite.'));
    } finally {
      setPendingFavoriteIds((current) =>
        current.filter((dashboardId) => dashboardId !== item.id),
      );
    }
  }

  async function handleCreateDashboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = newDashboardName.trim();

    if (!trimmedName) {
      setErrorMessage('Dashboard name is required.');
      return;
    }

    setErrorMessage(null);
    setIsCreatingDashboard(true);

    try {
      const dashboard = await createDashboard({
        name: trimmedName,
      });

      setIsCreateDialogOpen(false);
      setNewDashboardName('');
      showSuccess('Dashboard created.');
      router.push(`${dashboard.url}?edit=true`);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Failed to create dashboard.'));
      setIsCreatingDashboard(false);
      return;
    }

    setIsCreatingDashboard(false);
  }

  return (
    <ApplicationLayout currentPath={currentPath} session={session}>
      <div className="pt-[15px]">
        <div className="w-full px-[15px] pb-10 max-md:px-3">
          <div className="mb-[15px]">
            <h3 className="m-0 text-[23px] font-medium leading-tight text-[#333333]">
              {getPageTitle(view)}
            </h3>
          </div>

          <div className="flex flex-col lg:flex-row">
            <div className="order-1 w-full lg:order-0 lg:w-3/4">
              <div className="overflow-hidden rounded-[3px] bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-[13px] text-[#595959]">
                    <thead>
                      <tr className="border-b border-[#e8e8e8]">
                        <th className="w-[32px] bg-white px-0 py-[12px] text-center font-normal" />
                        <th className="bg-white px-[10px] py-[12px] text-left font-normal">
                          <button
                            className="inline-flex items-center text-[14px] text-[#333333]"
                            onClick={() => toggleSort('name')}
                            type="button"
                          >
                            Name
                            <SortArrows
                              active={activeSortField === 'name'}
                              descending={sortDescending}
                            />
                          </button>
                        </th>
                        <th className="bg-white px-[10px] py-[12px] text-left font-normal whitespace-nowrap text-[#333333]">
                          Created By
                        </th>
                        <th className="bg-white px-[10px] py-[12px] text-left font-normal whitespace-nowrap text-[#333333]">
                          <button
                            className="inline-flex items-center text-[14px] text-[#333333]"
                            onClick={() => toggleSort('created_at')}
                            type="button"
                          >
                            Created At
                            <SortArrows
                              active={activeSortField === 'created_at'}
                              descending={sortDescending}
                            />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td
                            className="px-4 py-8 text-center text-[#767676]"
                            colSpan={4}
                          >
                            Loading dashboards...
                          </td>
                        </tr>
                      ) : dashboards.results.length === 0 ? (
                        <tr>
                          <td
                            className="px-4 py-8 text-center text-[#767676]"
                            colSpan={4}
                          >
                            No dashboards found.
                          </td>
                        </tr>
                      ) : (
                        dashboards.results.map((item) => (
                          <DashboardRow
                            key={item.id}
                            isPending={pendingFavoriteIds.includes(item.id)}
                            item={item}
                            onFavoriteToggle={handleFavoriteToggle}
                            session={session}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-[#e8e8e8] px-[15px] py-[10px] text-[13px] text-[#767676] sm:flex-row sm:items-center sm:justify-between">
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
              {canCreateDashboard ? (
                <button
                  className="mb-[10px] flex h-[34px] w-full items-center justify-center rounded-[4px] bg-[#1890ff] text-[14px] font-normal text-white shadow-[0_2px_0_rgba(0,0,0,0.045)] transition hover:bg-[#40a9ff]"
                  onClick={() => setIsCreateDialogOpen(true)}
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                  type="button"
                >
                  <span aria-hidden="true" className="mr-1.5 text-[12px]">
                    +
                  </span>
                  New Dashboard
                </button>
              ) : null}

              <div className="mb-[10px] rounded-[3px] bg-white p-[15px] shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
                <input
                  aria-label="Search dashboards"
                  className="h-[32px] w-full rounded-[4px] border border-[#d9d9d9] bg-white px-[11px] text-[14px] text-[#595959] outline-none transition focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]"
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search Dashboards..."
                  value={searchInput}
                />
              </div>

              <div className="mb-[10px] overflow-hidden rounded-[3px] bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
                <SidebarMenuItem
                  active={view === 'all'}
                  href="/dashboards"
                  icon={<DashboardGridIcon />}
                  label="All Dashboards"
                />
                <SidebarMenuItem
                  active={view === 'my'}
                  href="/dashboards/my"
                  icon={
                    <img
                      alt="My profile"
                      className="mt-[-2px] h-[13px] w-[13px] rounded-full"
                      src={session.user.profile_image_url}
                    />
                  }
                  label="My Dashboards"
                />
                <SidebarMenuItem
                  active={view === 'favorites'}
                  href="/dashboards/favorites"
                  icon={
                    <span
                      className="text-[16px] leading-none"
                      style={{ color: '#f5c000' }}
                    >
                      ★
                    </span>
                  }
                  label="Favorites"
                />
              </div>

              {showTagsPanel ? (
                <div>
                  <div className="mx-[5px] mt-[15px] mb-[5px] flex items-center justify-between">
                    <span className="text-[14px] text-[#595959]">Tags</span>
                    {selectedTags.length > 0 ? (
                      <button
                        className="text-[12px] text-[#1890ff] hover:text-[#40a9ff]"
                        onClick={() =>
                          replaceSearchParams(
                            currentPath,
                            router,
                            searchParamsValue,
                            {
                              page: '1',
                              tags: [],
                            },
                          )
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
                          onClick={(event) =>
                            toggleTagSelection(event, tag.name)
                          }
                          type="button"
                        >
                          <span className="truncate">{tag.name}</span>
                          <span className="ml-2 inline-flex h-[20px] min-w-[20px] flex-shrink-0 items-center justify-center rounded-[10px] bg-[#f5f5f5] px-[6px] text-[12px] leading-none text-[#999999]">
                            {tag.count}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </div>
      </div>

      {isCreateDialogOpen ? (
        <CreateDashboardDialog
          isSubmitting={isCreatingDashboard}
          name={newDashboardName}
          onClose={() => {
            if (isCreatingDashboard) {
              return;
            }

            setIsCreateDialogOpen(false);
            setNewDashboardName('');
          }}
          onNameChange={setNewDashboardName}
          onSubmit={handleCreateDashboard}
        />
      ) : null}
    </ApplicationLayout>
  );
}

function DashboardGridIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[12px] w-[12px]"
      viewBox="0 0 12 12"
    >
      <rect x="0.5" y="0.5" width="4" height="4" fill="#d8d8d8" />
      <rect x="7.5" y="0.5" width="4" height="4" fill="#cccccc" />
      <rect x="0.5" y="7.5" width="4" height="4" fill="#cccccc" />
      <rect x="7.5" y="7.5" width="4" height="4" fill="#d8d8d8" />
    </svg>
  );
}

function DashboardRow({
  item,
  isPending,
  onFavoriteToggle,
  session,
}: {
  item: DashboardListItem;
  isPending: boolean;
  onFavoriteToggle: (item: DashboardListItem) => void;
  session: SessionResponse;
}) {
  return (
    <tr className="border-b border-[#e8e8e8] hover:bg-[#fafafa]">
      <td className="w-[32px] px-0 py-[10px] text-center align-middle">
        <button
          aria-label={
            item.is_favorite ? 'Remove from favorites' : 'Add to favorites'
          }
          className="inline-flex items-center justify-center align-middle text-[14px] leading-none disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          onClick={() => onFavoriteToggle(item)}
          title={
            item.is_favorite ? 'Remove from favorites' : 'Add to favorites'
          }
          type="button"
        >
          {item.is_favorite ? (
            <StarFilled style={{ color: '#ffbf00' }} />
          ) : (
            <StarOutlined className="text-[#c9d1d9] transition hover:text-[#ffbf00]" />
          )}
        </button>
      </td>
      <td className="px-[10px] py-[10px] align-top">
        <Link
          className="text-[14px] text-[#2196f3] hover:text-[#1976d2]"
          href={item.url}
        >
          {item.name}
        </Link>
        {item.is_draft || item.tags.length > 0 ? (
          <div className="mt-[4px] flex flex-wrap items-center gap-[6px]">
            {item.is_draft ? (
              <span className="inline-flex h-[20px] items-center rounded-[3px] bg-[#73808c] px-[6px] text-[11px] font-semibold leading-none text-white">
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
        ) : null}
      </td>
      <td className="px-[10px] py-[10px] align-top whitespace-nowrap text-[13px] text-[#4b5563]">
        {item.user?.name ?? '-'}
      </td>
      <td className="px-[10px] py-[10px] align-top whitespace-nowrap text-[13px] text-[#4b5563]">
        <span className="whitespace-pre-line">
          {formatDateTime(item.created_at, session)}
        </span>
      </td>
    </tr>
  );
}

function SortArrows({
  active,
  descending,
}: {
  active: boolean;
  descending: boolean;
}) {
  const activeColor = '#8c8c8c';
  const inactiveColor = '#d9d9d9';

  return (
    <span className="ml-[6px] inline-flex flex-col leading-[8px]">
      <CaretUpOutlined
        className="text-[9px]"
        style={{
          color: active && !descending ? activeColor : inactiveColor,
        }}
      />
      <CaretDownOutlined
        className="mt-[-2px] text-[9px]"
        style={{
          color: active && descending ? activeColor : inactiveColor,
        }}
      />
    </span>
  );
}

function SidebarMenuItem({
  active,
  href,
  icon,
  label,
}: {
  active: boolean;
  href: string;
  icon: ReactNode;
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
      <span className="mr-[10px] inline-flex h-[14px] w-[14px] items-center justify-center text-[14px]">
        {icon}
      </span>
      {label}
    </Link>
  );
}

function CreateDashboardDialog({
  name,
  isSubmitting,
  onClose,
  onNameChange,
  onSubmit,
}: {
  name: string;
  isSubmitting: boolean;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="w-full max-w-[520px] rounded-[3px] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={onSubmit}>
          <div className="border-b border-[#e8e8e8] px-6 py-4">
            <h4 className="text-[22px] font-medium text-[#333333]">
              Create a New Dashboard
            </h4>
          </div>

          <div className="px-6 py-5">
            <label
              className="mb-2 block text-[13px] font-medium text-[#595959]"
              htmlFor="dashboard-name"
            >
              Dashboard Name
            </label>
            <input
              autoFocus
              className="h-[36px] w-full rounded-[4px] border border-[#d9d9d9] bg-white px-[11px] text-[14px] text-[#595959] outline-none transition focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)]"
              id="dashboard-name"
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Enter dashboard name"
              value={name}
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#e8e8e8] px-6 py-4">
            <button
              className="inline-flex h-9 items-center justify-center rounded border border-slate-300 bg-white px-4 text-[13px] text-slate-700 transition hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-9 items-center justify-center rounded border border-[#2196F3] bg-[#2196F3] px-4 text-[13px] text-white transition hover:bg-[#40a9ff] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

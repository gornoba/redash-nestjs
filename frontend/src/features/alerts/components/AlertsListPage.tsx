'use client';

import {
  BellOutlined,
  CaretDownFilled,
  CaretUpFilled,
} from '@ant-design/icons';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  type ReactNode,
  startTransition,
  useEffect,
  useState,
} from 'react';

import { ApplicationLayout } from '@/features/application-layout';
import type { SessionResponse } from '@/features/home/types';
import { useToastMessage } from '@/lib/toast';

import { getAlerts } from '../api/alertsClientApi';
import type { AlertListItem } from '../types';

interface AlertsListPageProps {
  session: SessionResponse;
}

type AlertSortField = 'created_at' | 'muted' | 'name' | 'state' | 'updated_at';
type SortDirection = 'asc' | 'desc';

const STATE_CLASS: Record<string, string> = {
  ok: 'bg-[#dff0d8] text-[#3c763d]',
  triggered: 'bg-[#f2dede] text-[#a94442]',
  unknown: 'bg-slate-100 text-slate-600',
};

const buttonBase =
  'inline-flex h-8 items-center justify-center rounded border px-4 text-[13px] transition';
const primaryButton = `${buttonBase} border-[#2196F3] bg-[#2196F3] text-white hover:bg-sky-600`;

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

function formatDateTime(value: string | null, session: SessionResponse) {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${formatDatePart(date, session.client_config.dateFormat)}\n${formatTimePart(date, session.client_config.timeFormat)}`;
}

function formatRelativeTime(value: string | null, now: number) {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function getOrderField(order: string | null) {
  if (!order) {
    return 'created_at';
  }

  return order.replace(/^-/, '') as AlertSortField;
}

function isOrderDesc(order: string | null) {
  return order ? order.startsWith('-') : true;
}

export default function AlertsListPage({ session }: AlertsListPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsValue = searchParams.toString();
  const order = searchParams.get('order') || '-created_at';
  const query = searchParams.get('q') ?? '';
  const [alerts, setAlerts] = useState<AlertListItem[]>([]);
  const [searchInput, setSearchInput] = useState(query);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relativeTimeNow, setRelativeTimeNow] = useState(() => Date.now());
  const activeSortField = getOrderField(order);
  const sortDirection: SortDirection = isOrderDesc(order) ? 'desc' : 'asc';

  useToastMessage(error, 'error');

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (searchInput === query) {
        return;
      }

      replaceSearchParams(router, searchParamsValue, {
        q: searchInput || null,
      });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query, router, searchInput, searchParamsValue]);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    void getAlerts({
      order,
      q: query || undefined,
    })
      .then((response) => {
        if (isMounted) {
          setAlerts(response);
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Failed to load alerts.',
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [order, query]);

  useEffect(() => {
    let intervalId: number | null = null;
    const timeoutId = window.setTimeout(() => {
      setRelativeTimeNow(Date.now());

      intervalId = window.setInterval(() => {
        setRelativeTimeNow(Date.now());
      }, 60_000);
    }, 60_000 - (Date.now() % 60_000));

    return () => {
      window.clearTimeout(timeoutId);

      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  function handleSort(field: AlertSortField) {
    const currentField = order.replace(/^-/, '');
    const nextOrder =
      currentField === field
        ? sortDirection === 'desc'
          ? field
          : `-${field}`
        : field;

    replaceSearchParams(router, searchParamsValue, {
      order: nextOrder,
    });
  }

  return (
    <ApplicationLayout currentPath="/alerts" session={session}>
      <div className="pt-[15px]">
        <div className="w-full px-[15px] pb-10 max-md:px-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-2xl font-medium leading-tight text-slate-800">
              Alerts
            </h3>
            <Link className={primaryButton} href="/alerts/new">
              <span aria-hidden="true" className="mr-2">
                +
              </span>
              New Alert
            </Link>
          </div>

          <div className="mb-3 rounded-[3px] bg-white p-3 shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
            <input
              aria-label="Search alerts"
              className="h-8 w-full rounded border border-slate-300 px-3 text-[13px] text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search alerts..."
              value={searchInput}
            />
          </div>

          <div className="overflow-hidden rounded-[3px] bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-[13px] text-[#767676]">
                <thead>
                  <tr className="border-b border-[#e8e8e8]">
                    <SortableHeader
                      activeField={activeSortField}
                      direction={sortDirection}
                      field="muted"
                      title={
                        <>
                          <BellOutlined aria-hidden="true" />
                          <span className="sr-only">
                            Sort by notification status
                          </span>
                        </>
                      }
                      widthClass="w-[42px]"
                      onClick={handleSort}
                    />
                    <SortableHeader
                      activeField={activeSortField}
                      direction={sortDirection}
                      field="name"
                      title="Name"
                      onClick={handleSort}
                    />
                    <th className="bg-[#fafafa] px-[10px] py-[10px] text-left font-normal whitespace-nowrap">
                      Created By
                    </th>
                    <SortableHeader
                      activeField={activeSortField}
                      direction={sortDirection}
                      field="state"
                      title="State"
                      widthClass="whitespace-nowrap"
                      onClick={handleSort}
                    />
                    <SortableHeader
                      activeField={activeSortField}
                      direction={sortDirection}
                      field="updated_at"
                      title="Last Updated At"
                      widthClass="whitespace-nowrap"
                      onClick={handleSort}
                    />
                    <SortableHeader
                      activeField={activeSortField}
                      direction={sortDirection}
                      field="created_at"
                      title="Created At"
                      widthClass="whitespace-nowrap"
                      onClick={handleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-[#767676]" colSpan={6}>
                        Loading alerts...
                      </td>
                    </tr>
                  ) : alerts.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-[#767676]" colSpan={6}>
                        No alerts found.
                      </td>
                    </tr>
                  ) : (
                    alerts.map((item) => (
                      <tr key={item.id} className="border-b border-[#e8e8e8] hover:bg-slate-50">
                        <td className="px-[10px] py-[10px] text-center align-middle">
                          <MutedStatusIcon muted={item.muted} />
                        </td>
                        <td className="px-[10px] py-[10px] align-middle">
                          <Link
                            className="font-medium text-[#2196F3] hover:text-sky-600"
                            href={`/alerts/${item.id}`}
                          >
                            {item.name}
                          </Link>
                        </td>
                        <td className="px-[10px] py-[10px] align-middle whitespace-nowrap">
                          {item.user.name}
                        </td>
                        <td className="px-[10px] py-[10px] align-middle whitespace-nowrap">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[12px] font-medium ${
                              STATE_CLASS[item.state] ?? STATE_CLASS.unknown
                            }`}
                          >
                            {item.state.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-[10px] py-[10px] align-middle whitespace-nowrap">
                          <span title={formatDateTime(item.updated_at, session)}>
                            {formatRelativeTime(item.updated_at, relativeTimeNow)}
                          </span>
                        </td>
                        <td className="px-[10px] py-[10px] align-middle whitespace-pre-line">
                          {formatDateTime(item.created_at, session)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ApplicationLayout>
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
  activeField: AlertSortField;
  direction: SortDirection;
  field: AlertSortField;
  onClick: (field: AlertSortField) => void;
  title: ReactNode;
  widthClass?: string;
}) {
  const isActive = activeField === field;

  return (
    <th
      aria-sort={
        isActive
          ? direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
      className={`${widthClass ?? ''} bg-[#fafafa] px-[10px] py-[10px] text-left font-normal`}
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

function MutedStatusIcon({ muted }: { muted: boolean }) {
  return (
    <span
      className="relative inline-flex h-4 w-4 items-center justify-center text-[#595959]"
      title={muted ? 'Muted' : 'Active'}
    >
      <BellOutlined aria-hidden="true" />
      {muted ? (
        <span
          aria-hidden="true"
          className="absolute h-[2px] w-[18px] rotate-[-45deg] rounded bg-[#595959]"
        />
      ) : null}
      <span className="sr-only">{muted ? 'Muted' : 'Active'}</span>
    </span>
  );
}

function replaceSearchParams(
  router: ReturnType<typeof useRouter>,
  searchParamsValue: string,
  changes: {
    order?: string | null;
    q?: string | null;
  },
) {
  const nextParams = new URLSearchParams(searchParamsValue);

  updateStringSearchParam(nextParams, 'order', changes.order);
  updateStringSearchParam(nextParams, 'q', changes.q);

  const nextUrl = nextParams.toString()
    ? `/alerts?${nextParams.toString()}`
    : '/alerts';

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

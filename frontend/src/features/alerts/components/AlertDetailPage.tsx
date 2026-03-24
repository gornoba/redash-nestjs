'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ApplicationLayout } from '@/features/application-layout';
import type { SessionResponse } from '@/features/home/types';
import {
  getQueries,
  getQueryDetail,
} from '@/features/queries/api/queriesClientApi';
import type {
  QueryDetail,
  QueryExecutionColumn,
  QueryListItem,
} from '@/features/queries/types';
import { useToast, useToastMessage } from '@/lib/toast';

import {
  createAlert,
  deleteAlert,
  getAlert,
  getAlertSubscriptions,
  muteAlert,
  unmuteAlert,
  updateAlert,
} from '../api/alertsClientApi';
import AlertDestinationsPanel from './AlertDestinationsPanel';
import type { AlertDetail, AlertSubscriptionItem } from '../types';

interface AlertDetailPageProps {
  alertId: string;
  session: SessionResponse;
  mode: 'new' | 'view' | 'edit';
}

type AlertOperator = '!=' | '<' | '<=' | '==' | '>' | '>=';
type TemplateMode = 'custom' | 'default';

interface EditableAlertOptions extends Record<string, unknown> {
  column?: string;
  custom_body?: string;
  custom_subject?: string;
  muted?: boolean;
  op?: AlertOperator;
  value?: string | number;
}

interface EditableAlert {
  created_at?: string;
  id?: number;
  last_triggered_at?: string | null;
  name: string;
  options: EditableAlertOptions;
  query: AlertDetail['query'] | null;
  rearm: number | null;
  state?: string;
  updated_at?: string;
  user?: AlertDetail['user'];
}

const OPERATORS: Array<{ label: string; value: AlertOperator }> = [
  { label: '> greater than', value: '>' },
  { label: '>= greater than or equals', value: '>=' },
  { label: '< less than', value: '<' },
  { label: '<= less than or equals', value: '<=' },
  { label: '= equals', value: '==' },
  { label: '≠ not equal to', value: '!=' },
];

const REARM_UNITS = [
  { label: 'Second', seconds: 1 },
  { label: 'Minute', seconds: 60 },
  { label: 'Hour', seconds: 3600 },
  { label: 'Day', seconds: 86400 },
  { label: 'Week', seconds: 604800 },
];

const VIEW_BADGE_CLASS: Record<string, string> = {
  ok: 'bg-[#dff0d8] text-[#3c763d]',
  triggered: 'bg-[#f2dede] text-[#a94442]',
  unknown: 'bg-slate-100 text-slate-600',
};

function buildDefaultAlertName(alert: EditableAlert) {
  if (!alert.query) {
    return 'New Alert';
  }

  const column =
    typeof alert.options.column === 'string' && alert.options.column
      ? alert.options.column
      : 'value';
  const op =
    typeof alert.options.op === 'string' && alert.options.op
      ? alert.options.op
      : '>';
  const value =
    alert.options.value !== undefined && alert.options.value !== null
      ? String(alert.options.value)
      : '1';

  return `${alert.query.name}: ${column} ${op} ${value}`;
}

function getTopRowValue(
  queryDetail: QueryDetail | null,
  columnName: string | undefined,
) {
  if (!queryDetail?.latest_query_data || !columnName) {
    return null;
  }

  const firstRow = queryDetail.latest_query_data.data.rows[0];

  if (!firstRow || !(columnName in firstRow)) {
    return null;
  }

  return firstRow[columnName];
}

function renderTemplatePreview(
  text: string,
  alert: EditableAlert,
  queryDetail: QueryDetail | null,
) {
  const topValue = getTopRowValue(queryDetail, alert.options.column);
  const urlBase =
    typeof window === 'undefined' ? '' : window.location.origin;
  const replacements: Record<string, string> = {
    ALERT_CONDITION:
      typeof alert.options.op === 'string' ? alert.options.op : '',
    ALERT_NAME: alert.name || buildDefaultAlertName(alert),
    ALERT_STATUS: (alert.state ?? 'unknown').toUpperCase(),
    ALERT_THRESHOLD:
      alert.options.value !== undefined && alert.options.value !== null
        ? String(alert.options.value)
        : '',
    ALERT_URL: alert.id ? `${urlBase}/alerts/${alert.id}` : `${urlBase}/alerts`,
    QUERY_NAME: alert.query?.name ?? '',
    QUERY_RESULT_VALUE: topValue === null ? '' : String(topValue),
    QUERY_URL: alert.query ? `${urlBase}/queries/${alert.query.id}` : '',
  };

  return text.replace(/{{\s*([A-Z_]+)\s*}}/g, (_, token: string) => {
    return replacements[token] ?? '';
  });
}

function findRearmPreset(value: number) {
  if (value <= 0) {
    return { mode: 'once' as const, unitIndex: 2, unitValue: 1 };
  }

  if (value === 1) {
    return { mode: 'always' as const, unitIndex: 2, unitValue: 1 };
  }

  for (let index = REARM_UNITS.length - 1; index >= 0; index -= 1) {
    const unit = REARM_UNITS[index];

    if (value % unit.seconds === 0) {
      return {
        mode: 'interval' as const,
        unitIndex: index,
        unitValue: value / unit.seconds,
      };
    }
  }

  return { mode: 'interval' as const, unitIndex: 0, unitValue: value };
}

function formatAlertTimestamp(value: string | null | undefined) {
  if (!value) {
    return 'Never';
  }

  return new Date(value).toLocaleString();
}

function normalizeAlert(alert: AlertDetail): EditableAlert {
  return {
    created_at: alert.created_at,
    id: alert.id,
    last_triggered_at: alert.last_triggered_at,
    name: alert.name,
    options: { ...alert.options },
    query: alert.query,
    rearm: alert.rearm,
    state: alert.state,
    updated_at: alert.updated_at,
    user: alert.user,
  };
}

export default function AlertDetailPage({
  alertId,
  session,
  mode,
}: AlertDetailPageProps) {
  const router = useRouter();
  const { showSuccess, showWarning } = useToast();
  const [alert, setAlert] = useState<EditableAlert | null>(
    mode === 'new'
      ? {
          name: '',
          options: {
            muted: false,
            op: '>',
            value: 1,
          },
          query: null,
          rearm: null,
          state: 'unknown',
        }
      : null,
  );
  const [queryDetail, setQueryDetail] = useState<QueryDetail | null>(null);
  const [subscriptions, setSubscriptions] = useState<AlertSubscriptionItem[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(mode !== 'new');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [querySearchText, setQuerySearchText] = useState('');
  const [queryResults, setQueryResults] = useState<QueryListItem[]>([]);
  const [queryResultsLoading, setQueryResultsLoading] = useState(false);
  const [querySearchOpen, setQuerySearchOpen] = useState(false);
  const [rearmUnitIndex, setRearmUnitIndex] = useState(2);
  const [rearmUnitValue, setRearmUnitValue] = useState(1);
  const [templateMode, setTemplateMode] = useState<TemplateMode>('default');
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  useToastMessage(error, 'error');

  const isEditable = mode !== 'view';
  const canEditCurrentAlert = Boolean(
    alert &&
      (session.user.roles.includes('admin') || session.user.id === alert.user?.id),
  );
  const deferredQuerySearch = useDeferredValue(querySearchText);
  const availableColumns: QueryExecutionColumn[] = useMemo(
    () => queryDetail?.latest_query_data?.data.columns ?? [],
    [queryDetail],
  );
  const topRowValue = getTopRowValue(queryDetail, alert?.options.column);
  const selectedQuery = alert?.query ?? null;
  const pageTitle =
    mode === 'new'
      ? 'New Alert'
      : mode === 'edit'
        ? buildDefaultAlertName(alert ?? {
            name: '',
            options: {},
            query: null,
            rearm: null,
          })
        : alert?.name ?? `Alert #${alertId}`;
  const cardTitle = alert ? buildDefaultAlertName(alert) : 'New Alert';

  useEffect(() => {
    if (mode === 'new') {
      return;
    }

    let isMounted = true;

    async function loadAlert() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedAlert = await getAlert(Number(alertId));

        if (!isMounted) {
          return;
        }

        const nextAlert = normalizeAlert(loadedAlert);
        setAlert(nextAlert);
        setTemplateMode(
          nextAlert.options.custom_body || nextAlert.options.custom_subject
            ? 'custom'
            : 'default',
        );

        const nextRearm = nextAlert.rearm ?? 0;
        const rearmPreset = findRearmPreset(nextRearm);
        setRearmUnitIndex(rearmPreset.unitIndex);
        setRearmUnitValue(rearmPreset.unitValue);

        const [detail, nextSubscriptions] = await Promise.all([
          getQueryDetail(loadedAlert.query.id),
          getAlertSubscriptions(loadedAlert.id).catch(() => []),
        ]);

        if (!isMounted) {
          return;
        }

        setQueryDetail(detail);
        setSubscriptions(nextSubscriptions);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error ? loadError.message : 'Failed to load alert.',
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAlert();

    return () => {
      isMounted = false;
    };
  }, [alertId, mode]);

  useEffect(() => {
    if (!alert || !queryDetail) {
      return;
    }

    const columnNames = availableColumns.map((column) => column.name);
    const currentColumn = alert.options.column;

    if (
      columnNames.length > 0 &&
      (typeof currentColumn !== 'string' || !columnNames.includes(currentColumn))
    ) {
      setAlert((currentAlert) =>
        currentAlert
          ? {
              ...currentAlert,
              options: {
                ...currentAlert.options,
                column: columnNames[0],
              },
            }
          : currentAlert,
      );
    }
  }, [alert, availableColumns, queryDetail]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setQuerySearchOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isEditable || selectedQuery) {
      return;
    }

    let isMounted = true;
    setQueryResultsLoading(true);

    void getQueries('all', {
      page: 1,
      page_size: 8,
      q: deferredQuerySearch.trim() || undefined,
      tags: [],
    })
      .then((response) => {
        if (isMounted) {
          setQueryResults(response.results);
        }
      })
      .catch((searchError) => {
        if (isMounted) {
          setError(
            searchError instanceof Error
              ? searchError.message
              : 'Failed to search queries.',
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setQueryResultsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [deferredQuerySearch, isEditable, selectedQuery]);

  useEffect(() => {
    if (!alert) {
      return;
    }

    const nextRearm = alert.rearm ?? 0;
    const preset = findRearmPreset(nextRearm);
    setRearmUnitIndex(preset.unitIndex);
    setRearmUnitValue(preset.unitValue);
  }, [alert]);

  const templatePreview = useMemo(() => {
    if (!alert) {
      return { body: '', subject: '' };
    }

    return {
      body: renderTemplatePreview(
        String(alert.options.custom_body ?? ''),
        alert,
        queryDetail,
      ),
      subject: renderTemplatePreview(
        String(alert.options.custom_subject ?? ''),
        alert,
        queryDetail,
      ),
    };
  }, [alert, queryDetail]);

  async function selectQuery(nextQuery: QueryListItem) {
    setQueryLoading(true);
    setQuerySearchOpen(false);
    setQuerySearchText('');
    setError(null);

    try {
      const detail = await getQueryDetail(nextQuery.id);

      setAlert((currentAlert) => {
        if (!currentAlert) {
          return currentAlert;
        }

        const nextOptions = { ...currentAlert.options };
        const nextColumns = detail.latest_query_data?.data.columns ?? [];

        if (nextColumns.length > 0) {
          nextOptions.column = nextColumns[0].name;
        }

        return {
          ...currentAlert,
          options: nextOptions,
          query: {
            id: nextQuery.id,
            name: nextQuery.name,
            schedule: nextQuery.schedule,
          },
        };
      });
      setQueryDetail(detail);
    } catch (selectError) {
      setError(
        selectError instanceof Error
          ? selectError.message
          : 'Failed to load query.',
      );
    } finally {
      setQueryLoading(false);
    }
  }

  function clearSelectedQuery() {
    setAlert((currentAlert) =>
      currentAlert
        ? {
            ...currentAlert,
            query: null,
          }
        : currentAlert,
    );
    setQueryDetail(null);
    setQuerySearchText('');
    setQuerySearchOpen(false);
  }

  function updateAlertOptions(nextOptions: Partial<EditableAlertOptions>) {
    setAlert((currentAlert) =>
      currentAlert
        ? {
            ...currentAlert,
            options: {
              ...currentAlert.options,
              ...nextOptions,
            },
          }
        : currentAlert,
    );
  }

  function updateRearmValue(nextSeconds: number) {
    setAlert((currentAlert) =>
      currentAlert
        ? {
            ...currentAlert,
            rearm: nextSeconds > 0 ? nextSeconds : null,
          }
        : currentAlert,
    );
  }

  async function handleSave() {
    if (!alert?.query) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const nextName = alert.name.trim() || buildDefaultAlertName(alert);
    const nextOptions = { ...alert.options };

    if (templateMode === 'default') {
      delete nextOptions.custom_body;
      delete nextOptions.custom_subject;
    }

    try {
      const payload = {
        name: nextName,
        options: nextOptions,
        query_id: alert.query.id,
        rearm: alert.rearm ?? null,
      };
      const savedAlert =
        mode === 'edit' && alert.id
          ? await updateAlert(alert.id, payload)
          : await createAlert(payload);

      showSuccess(mode === 'edit' ? 'Saved.' : 'Alert created.');
      router.push(`/alerts/${savedAlert.id}`);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Failed saving alert.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!alert?.id || !window.confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteAlert(alert.id);
      showSuccess('Alert deleted successfully.');
      router.push('/alerts');
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Failed deleting alert.',
      );
      setIsDeleting(false);
    }
  }

  async function handleToggleMute() {
    if (!alert?.id) {
      return;
    }

    try {
      if (alert.options.muted) {
        await unmuteAlert(alert.id);
        updateAlertOptions({ muted: false });
        showSuccess('Notifications have been restored.');
      } else {
        await muteAlert(alert.id);
        updateAlertOptions({ muted: true });
        showWarning('Notifications have been muted.');
      }
    } catch (muteError) {
      setError(
        muteError instanceof Error
          ? muteError.message
          : 'Failed updating alert notifications.',
      );
    }
  }

  if (isLoading) {
    return (
      <ApplicationLayout
        currentPath={mode === 'new' ? '/alerts/new' : `/alerts/${alertId}`}
        session={session}
      >
        <div className="px-[15px] py-10 text-[14px] text-slate-500">
          Loading alert...
        </div>
      </ApplicationLayout>
    );
  }

  if (!alert) {
    return (
      <ApplicationLayout
        currentPath={mode === 'new' ? '/alerts/new' : `/alerts/${alertId}`}
        session={session}
      >
        <div className="px-[15px] py-10">
          <div className="rounded-[2px] border border-[#f2dede] bg-[#fcf2f2] px-4 py-3 text-[14px] text-[#a94442]">
            {error ?? 'Failed to load alert.'}
          </div>
        </div>
      </ApplicationLayout>
    );
  }

  const createDisabled =
    !isEditable ||
    isSaving ||
    !selectedQuery ||
    availableColumns.length === 0 ||
    queryLoading;
  const isMuted = Boolean(alert.options.muted);
  const topRowValueLabel =
    topRowValue === null || topRowValue === undefined
      ? 'unknown'
      : String(topRowValue);

  return (
    <ApplicationLayout
      currentPath={mode === 'new' ? '/alerts/new' : `/alerts/${alertId}`}
      session={session}
    >
      <div className="w-full px-[15px] pt-[15px] pb-10 max-md:px-3">
        <div className="mb-[15px]">
          <h3 className="text-[36px] leading-tight font-medium text-slate-800">
            {pageTitle}
          </h3>
        </div>

        <div className="overflow-visible rounded-[2px] bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
          <div className="border-b border-slate-200 bg-[#fafafa] px-5 py-3">
            <h4 className="text-[26px] font-medium leading-tight text-[#c1c7cd]">
              {cardTitle}
            </h4>
          </div>

          <div className="px-6 py-5 max-md:px-4">
            <div className="mb-8 text-[15px] leading-8 text-slate-700">
              <div>
                Start by selecting the query that you would like to monitor using the
                search bar.
              </div>
              <div>
                Keep in mind that Alerts do not work with queries that use parameters.
              </div>
            </div>

            <div
              className={`mx-auto ${
                mode === 'view' ? 'max-w-[1360px]' : 'max-w-[760px]'
              }`}
            >
              <div
                className={
                  mode === 'view'
                    ? 'relative grid gap-10 lg:grid-cols-2 lg:items-start'
                    : ''
                }
              >
                {mode === 'view' ? (
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-slate-200 lg:block" />
                ) : null}
                <div className="min-w-0">
                  {mode === 'view' ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex rounded px-2 py-1 text-[12px] font-medium ${
                            VIEW_BADGE_CLASS[alert.state ?? 'unknown'] ??
                            VIEW_BADGE_CLASS.unknown
                          }`}
                        >
                          {(alert.state ?? 'unknown').toUpperCase()}
                        </span>
                        <span className="text-[14px] text-slate-500">
                          Last triggered{' '}
                          {formatAlertTimestamp(alert.last_triggered_at)}
                        </span>
                      </div>
                      <div className="text-[14px] text-slate-500">
                        {alert.state === 'unknown'
                          ? 'Alert condition has not been evaluated.'
                          : 'Alert condition has been evaluated.'}
                      </div>
                    </div>
                  ) : null}

                  <div
                    className={`grid grid-cols-[180px_minmax(0,1fr)] gap-x-5 gap-y-8 max-md:grid-cols-1 max-md:gap-y-3 ${
                      mode === 'view'
                        ? 'mt-8 border-t border-slate-200 pt-8'
                        : ''
                    }`}
                  >
                <div className="pt-2 text-right text-[16px] font-medium text-slate-800 max-md:pt-0 max-md:text-left">
                  Query :
                </div>
                <div ref={searchContainerRef} className="relative">
                  {isEditable && !selectedQuery ? (
                    <>
                      <input
                        className="h-[38px] w-full rounded-[2px] border border-slate-300 px-3 text-[14px] text-slate-700 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-300"
                        onChange={(event) => setQuerySearchText(event.target.value)}
                        onFocus={() => setQuerySearchOpen(true)}
                        placeholder="Search a query by name"
                        value={querySearchText}
                      />
                      {querySearchOpen ? (
                        <div className="absolute left-0 right-0 top-[42px] z-20 max-h-[280px] overflow-y-auto rounded-[2px] border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.18)]">
                          {queryResultsLoading ? (
                            <div className="px-4 py-3 text-[14px] text-slate-500">
                              Loading...
                            </div>
                          ) : queryResults.length === 0 ? (
                            <div className="px-4 py-3 text-[14px] text-slate-500">
                              No queries found.
                            </div>
                          ) : (
                            queryResults.map((item) => (
                              <button
                                key={item.id}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[14px] text-slate-700 transition hover:bg-sky-50"
                                onClick={() => void selectQuery(item)}
                                type="button"
                              >
                                <span className="truncate">{item.name}</span>
                                {item.tags.length > 0 ? (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                                    {item.tags[0]}
                                  </span>
                                ) : null}
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="flex min-h-[38px] items-center justify-between gap-3 rounded-[2px] border border-slate-300 bg-white px-3 text-[14px] text-slate-700">
                      {mode === 'view' && selectedQuery ? (
                        <Link
                          className="truncate text-[#2b7dbc] hover:text-sky-700"
                          href={`/queries/${selectedQuery.id}`}
                        >
                          {selectedQuery.name}
                        </Link>
                      ) : (
                        <span className="truncate">{selectedQuery?.name}</span>
                      )}
                      {isEditable ? (
                        <button
                          className="text-[18px] leading-none text-slate-400 transition hover:text-slate-600"
                          onClick={clearSelectedQuery}
                          type="button"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  )}
                  {selectedQuery ? (
                    <div className="mt-2 text-[14px] text-slate-500">
                      {selectedQuery.schedule ? (
                        <span>
                          Scheduled to refresh.
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-[#e74c3c]">▲</span>
                          This query has no <i>refresh schedule</i>.{' '}
                          <span className="text-[#2b7dbc]">
                            Why it&apos;s recommended
                          </span>
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>

                {selectedQuery ? (
                  <>
                    <div className="pt-2 text-right text-[16px] font-medium text-slate-800 max-md:pt-0 max-md:text-left">
                      Trigger when :
                    </div>
                    <div>
                      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_110px] gap-2 max-sm:grid-cols-1">
                        <label className="text-[12px] text-slate-500">
                          <span className="mb-1 block">Value column</span>
                          <select
                            className="h-[38px] w-full rounded-[2px] border border-slate-300 bg-white px-3 text-[14px] text-slate-700"
                            disabled={!isEditable || availableColumns.length === 0}
                            onChange={(event) =>
                              updateAlertOptions({ column: event.target.value })
                            }
                            value={String(alert.options.column ?? '')}
                          >
                            {availableColumns.map((column) => (
                              <option key={column.name} value={column.name}>
                                {column.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-[12px] text-slate-500">
                          <span className="mb-1 block">Condition</span>
                          <select
                            className="h-[38px] w-full rounded-[2px] border border-slate-300 bg-white px-3 text-[14px] text-slate-700"
                            disabled={!isEditable}
                            onChange={(event) =>
                              updateAlertOptions({
                                op: event.target.value as AlertOperator,
                              })
                            }
                            value={String(alert.options.op ?? '>')}
                          >
                            {OPERATORS.map((operator) => (
                              <option key={operator.value} value={operator.value}>
                                {operator.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-[12px] text-slate-500">
                          <span className="mb-1 block">Threshold</span>
                          <input
                            className="h-[38px] w-full rounded-[2px] border border-slate-300 px-3 text-[14px] text-slate-700"
                            disabled={!isEditable}
                            onChange={(event) =>
                              updateAlertOptions({ value: event.target.value })
                            }
                            value={String(alert.options.value ?? '')}
                          />
                        </label>
                      </div>
                      <div className="mt-2 text-[14px] text-slate-500">
                        Top row value is{' '}
                        <span className="text-[#d9534f]">{topRowValueLabel}</span>
                      </div>
                    </div>

                    <div className="pt-2 text-right text-[16px] font-medium text-slate-800 max-md:pt-0 max-md:text-left">
                      When triggered, send notification :
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          className="h-[38px] min-w-[180px] rounded-[2px] border border-slate-300 bg-white px-3 text-[14px] text-slate-700"
                          disabled={!isEditable}
                          onChange={(event) => {
                            if (event.target.value === 'once') {
                              updateRearmValue(0);
                            } else if (event.target.value === 'always') {
                              updateRearmValue(1);
                            } else {
                              updateRearmValue(3600);
                              setRearmUnitIndex(2);
                              setRearmUnitValue(1);
                            }
                          }}
                          value={findRearmPreset(alert.rearm ?? 0).mode}
                        >
                          <option value="once">Just once</option>
                          <option value="always">Each time alert is evaluated</option>
                          <option value="interval">At most every</option>
                        </select>
                        {findRearmPreset(alert.rearm ?? 0).mode === 'interval' ? (
                          <>
                            <input
                              className="h-[38px] w-[84px] rounded-[2px] border border-slate-300 px-3 text-[14px] text-slate-700"
                              disabled={!isEditable}
                              min={1}
                              onChange={(event) => {
                                const nextValue = Number(event.target.value) || 1;
                                setRearmUnitValue(nextValue);
                                updateRearmValue(
                                  nextValue * REARM_UNITS[rearmUnitIndex].seconds,
                                );
                              }}
                              type="number"
                              value={rearmUnitValue}
                            />
                            <select
                              className="h-[38px] min-w-[120px] rounded-[2px] border border-slate-300 bg-white px-3 text-[14px] text-slate-700"
                              disabled={!isEditable}
                              onChange={(event) => {
                                const nextIndex = Number(event.target.value);
                                setRearmUnitIndex(nextIndex);
                                updateRearmValue(
                                  rearmUnitValue * REARM_UNITS[nextIndex].seconds,
                                );
                              }}
                              value={rearmUnitIndex}
                            >
                              {REARM_UNITS.map((unit, index) => (
                                <option key={unit.label} value={index}>
                                  {unit.label}
                                  {rearmUnitValue === 1 ? '' : 's'}
                                </option>
                              ))}
                            </select>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="pt-2 text-right text-[16px] font-medium text-slate-800 max-md:pt-0 max-md:text-left">
                      Template :
                    </div>
                    <div>
                      <select
                        className="h-[38px] min-w-[190px] rounded-[2px] border border-slate-300 bg-white px-3 text-[14px] text-slate-700"
                        disabled={!isEditable}
                        onChange={(event) =>
                          setTemplateMode(event.target.value as TemplateMode)
                        }
                        value={templateMode}
                      >
                        <option value="default">Use default template</option>
                        <option value="custom">Use custom template</option>
                      </select>

                      {templateMode === 'custom' ? (
                        <div className="mt-3 rounded-[2px] border border-dashed border-slate-300 p-3">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-[14px] text-slate-700">
                              Custom template
                            </span>
                            <label className="inline-flex items-center gap-2 text-[13px] text-slate-500">
                              <span>Preview</span>
                              <input
                                checked={showTemplatePreview}
                                onChange={(event) =>
                                  setShowTemplatePreview(event.target.checked)
                                }
                                type="checkbox"
                              />
                            </label>
                          </div>
                          {showTemplatePreview ? (
                            <div className="space-y-3 rounded-[2px] border border-slate-200 bg-slate-50 p-3 text-[14px] text-slate-700">
                              <div>
                                <div className="mb-1 text-[12px] text-slate-500">
                                  Subject
                                </div>
                                <div>{templatePreview.subject || '(empty)'}</div>
                              </div>
                              <div>
                                <div className="mb-1 text-[12px] text-slate-500">
                                  Body
                                </div>
                                <div className="whitespace-pre-wrap">
                                  {templatePreview.body || '(empty)'}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <input
                                className="h-[38px] w-full rounded-[2px] border border-slate-300 px-3 text-[14px] text-slate-700"
                                disabled={!isEditable}
                                onChange={(event) =>
                                  updateAlertOptions({
                                    custom_subject: event.target.value,
                                  })
                                }
                                placeholder="Subject"
                                value={String(alert.options.custom_subject ?? '')}
                              />
                              <textarea
                                className="min-h-[180px] w-full rounded-[2px] border border-slate-300 px-3 py-2 text-[14px] text-slate-700"
                                disabled={!isEditable}
                                onChange={(event) =>
                                  updateAlertOptions({
                                    custom_body: event.target.value,
                                  })
                                }
                                placeholder="Body"
                                value={String(alert.options.custom_body ?? '')}
                              />
                              <a
                                className="inline-flex text-[13px] text-[#2b7dbc] hover:text-sky-700"
                                href="https://redash.io/help/user-guide/alerts/custom-alert-notifications"
                                rel="noreferrer"
                                target="_blank"
                              >
                                Formatting guide
                              </a>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}
                </div>
                </div>
                {mode === 'view' ? (
                  <div className="min-w-0 space-y-4 lg:pl-10">
                    {isMuted ? (
                      <div className="rounded-[2px] border border-[#faebcc] bg-[#fcf8e3] px-4 py-3 text-[14px] text-[#8a6d3b]">
                        Notifications for this alert will not be sent.
                      </div>
                    ) : null}

                    {alert.id ? (
                      <AlertDestinationsPanel
                        alertId={alert.id}
                        onError={setError}
                        onSubscriptionsChange={setSubscriptions}
                        session={session}
                        subscriptions={subscriptions}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                {mode === 'view' ? (
                  <>
                    {canEditCurrentAlert ? (
                      <>
                        <Link
                          className="inline-flex h-[32px] items-center rounded-[2px] border border-slate-300 bg-white px-4 text-[13px] text-slate-700 transition hover:bg-slate-50"
                          href={`/alerts/${alert.id}/edit`}
                        >
                          Edit
                        </Link>
                        <button
                          className="inline-flex h-[32px] items-center rounded-[2px] border border-slate-300 bg-white px-4 text-[13px] text-slate-700 transition hover:bg-slate-50"
                          onClick={() => void handleToggleMute()}
                          type="button"
                        >
                          {isMuted ? 'Unmute' : 'Mute'}
                        </button>
                        <button
                          className="inline-flex h-[32px] items-center rounded-[2px] border border-[#d9534f] bg-white px-4 text-[13px] text-[#d9534f] transition hover:bg-rose-50"
                          disabled={isDeleting}
                          onClick={() => void handleDelete()}
                          type="button"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    {mode === 'edit' ? (
                      <Link
                        className="inline-flex h-[32px] items-center rounded-[2px] border border-slate-300 bg-white px-4 text-[13px] text-slate-700 transition hover:bg-slate-50"
                        href={`/alerts/${alert.id}`}
                      >
                        Cancel
                      </Link>
                    ) : null}
                    <button
                      className="inline-flex h-[32px] items-center rounded-[2px] border border-[#2196F3] bg-[#2196F3] px-5 text-[13px] text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={createDisabled}
                      onClick={() => void handleSave()}
                      type="button"
                    >
                      {isSaving
                        ? mode === 'edit'
                          ? 'Saving...'
                          : 'Creating...'
                        : mode === 'edit'
                          ? 'Save Changes'
                          : 'Create Alert'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ApplicationLayout>
  );
}

'use client';

import {
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  FullscreenOutlined,
  LoadingOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { markdown } from 'markdown';
import * as XLSX from 'xlsx';
import {
  type CSSProperties,
  memo,
  startTransition,
  type RefObject,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Responsive,
  type Layout,
  type LayoutItem,
  type ResponsiveLayouts,
} from 'react-grid-layout';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  archiveDashboard,
  createDashboardWidget,
  deleteDashboardWidget,
  favoriteDashboard,
  getDashboardDetail,
  getDashboardRefreshStatus,
  refreshDashboard as refreshDashboardRequest,
  unfavoriteDashboard,
  updateDashboard,
  updateDashboardWidget,
} from '@/features/dashboards/api/dashboardsClientApi';
import type {
  DashboardDetail,
  DashboardOptions,
  DashboardRefreshSchedule,
  DashboardWidgetItem,
  DashboardWidgetPosition,
} from '@/features/dashboards/types';
import type { SessionResponse } from '@/features/home/types';
import {
  executeQuery as executeQueryRequest,
  getExecuteQueryJobStatus,
  getQueryDetail,
  getQueries,
} from '@/features/queries/api/queriesClientApi';
import {
  formatRelativeTime,
  getVisibleVisualizationColumns,
  normalizeChartOptions,
  normalizeTableOptions,
  renderChartVisualization,
  renderVisualizationCellContent,
} from '@/features/queries/components/querySourceEditorUtils';
import type { QueryDetail, QueryListItem, QueryVisualization } from '@/features/queries/types';
import { getApiErrorMessage } from '@/lib/api-error';
import { useToast } from '@/lib/toast';

const GRID_COLUMNS = 6;
const GRID_MARGIN = 15;
const GRID_ROW_HEIGHT = 35;
const MOBILE_BREAKPOINT = 800;
const WIDGET_TABLE_PAGE_SIZE = 20;
const INITIAL_WIDGET_RENDER_COUNT = 4;
const WIDGET_RENDER_ROOT_MARGIN = '900px 0px';
const EDITING_BOTTOM_TOOLBAR_SAFE_OFFSET = 136;
const DASHBOARD_REFRESH_OPTIONS = [
  60,
  5 * 60,
  10 * 60,
  30 * 60,
  60 * 60,
  12 * 60 * 60,
  24 * 60 * 60,
] as const;

const buttonBase =
  'inline-flex h-[28px] items-center justify-center rounded-[2px] border px-[14px] text-[13px] font-normal transition disabled:cursor-not-allowed disabled:opacity-60';
const primaryButton =
  `${buttonBase} border-[#2196f3] bg-[#2196f3] text-white hover:bg-[#1d83d8]`;
const secondaryButton =
  `${buttonBase} border-[#d9d9d9] bg-white text-[#595959] hover:border-[#bfbfbf] hover:text-[#323232]`;

const markdownHelpSections = [
  {
    title: 'Headings',
    syntax: ['# Heading 1', '## Heading 2', '### Heading 3'],
  },
  {
    title: 'Emphasis',
    syntax: ['**bold**', '*italic*', '***bold italic***'],
  },
  {
    title: 'Lists',
    syntax: ['- First item', '- Second item', '1. Ordered item', '2. Ordered item'],
  },
  {
    title: 'Links & Images',
    syntax: ['[Open Redash](https://redash.io)', '![Alt text](https://example.com/image.png)'],
  },
  {
    title: 'Blockquotes & Code',
    syntax: ['> Quoted text', '`inline code`', '```', 'code block', '```'],
  },
  {
    title: 'Horizontal Rule',
    syntax: ['---'],
  },
];

export default function DashboardDetailScreen({
  initialDashboard,
  session,
}: {
  initialDashboard: DashboardDetail;
  session: SessionResponse;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showError, showSuccess } = useToast();

  const [dashboard, setDashboard] = useState(initialDashboard);
  const [gridWidth, setGridWidth] = useState(1200);
  const [isDashboardRefreshing, setIsDashboardRefreshing] = useState(false);
  const [bottomToolbarStyle, setBottomToolbarStyle] = useState<{
    left?: string;
    width?: string;
  }>({});
  const [bottomToolbarOffset, setBottomToolbarOffset] = useState(
    EDITING_BOTTOM_TOOLBAR_SAFE_OFFSET,
  );
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isFavoritePending, setIsFavoritePending] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [activeWidgetMenuId, setActiveWidgetMenuId] = useState<number | null>(null);
  const [isHeaderActionMenuOpen, setIsHeaderActionMenuOpen] = useState(false);
  const [isRefreshMenuOpen, setIsRefreshMenuOpen] = useState(false);
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() => buildLayouts(initialDashboard.widgets));
  const [currentBreakpoint, setCurrentBreakpoint] = useState<'lg' | 'sm'>('lg');
  const [textboxDialog, setTextboxDialog] = useState<{
    mode: 'create' | 'edit';
    widgetId: number | null;
    text: string;
  } | null>(null);
  const [isMarkdownHelpOpen, setIsMarkdownHelpOpen] = useState(false);
  const [textboxDraft, setTextboxDraft] = useState('');
  const [isTextboxSubmitting, setIsTextboxSubmitting] = useState(false);
  const [deleteConfirmWidgetId, setDeleteConfirmWidgetId] = useState<number | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [isAddWidgetDialogOpen, setIsAddWidgetDialogOpen] = useState(false);
  const [querySearch, setQuerySearch] = useState('');
  const [queries, setQueries] = useState<QueryListItem[]>([]);
  const [queriesLoading, setQueriesLoading] = useState(false);
  const [selectedQueryId, setSelectedQueryId] = useState<number | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<QueryDetail | null>(null);
  const [queryDetailLoading, setQueryDetailLoading] = useState(false);
  const [selectedVisualizationId, setSelectedVisualizationId] = useState<number | null>(null);
  const [isVisualizationDropdownOpen, setIsVisualizationDropdownOpen] = useState(false);
  const [isWidgetSubmitting, setIsWidgetSubmitting] = useState(false);
  const [editingName, setEditingName] = useState(initialDashboard.name);
  const [gridHeight, setGridHeight] = useState<number | undefined>(undefined);

  const deferredQuerySearch = useDeferredValue(querySearch);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomToolbarRef = useRef<HTMLDivElement | null>(null);
  const refreshMenuRef = useRef<HTMLDivElement | null>(null);
  const headerActionMenuRef = useRef<HTMLDivElement | null>(null);
  const visualizationDropdownRef = useRef<HTMLDivElement | null>(null);
  const reloadDashboardRef = useRef<() => Promise<void>>(async () => undefined);
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedPositionsRef = useRef<Record<number, DashboardWidgetPosition>>(
    mapSavedPositions(initialDashboard.widgets),
  );

  const isOwnerOrAdmin =
    session.user.roles.includes('admin') || dashboard.user_id === session.user.id;
  const canEdit =
    session.user.permissions.includes('edit_dashboard') &&
    isOwnerOrAdmin;
  const canRefreshDashboard =
    session.user.permissions.includes('execute_query') && isOwnerOrAdmin;
  const canManagePublishState = canEdit && isOwnerOrAdmin;
  const isEditing = canEdit && searchParams.has('edit');

  useLayoutEffect(() => {
    const gridElement = document.querySelector<HTMLDivElement>('.react-grid-layout.layout');
    if (!gridElement) {
      return;
    }

    const styleHeight = gridElement.style.height;
    const baseHeight = styleHeight
      ? parseFloat(styleHeight)
      : gridElement.getBoundingClientRect().height;

    if (!Number.isNaN(baseHeight)) {
      setGridHeight(baseHeight * 1.09);
    }
  }, [layouts, gridWidth]);
  const isMobileLayout = currentBreakpoint === 'sm';
  const dashboardRefreshSchedule = useMemo(
    () => getDashboardRefreshSchedule(dashboard.options),
    [dashboard.options],
  );
  const dashboardRefreshInterval = dashboardRefreshSchedule?.interval ?? null;
  const prioritizedWidgetIds = useMemo(() => {
    return new Set(
      [...dashboard.widgets]
        .sort((left, right) => {
          const rowDifference =
            left.options.position.row - right.options.position.row;

          if (rowDifference !== 0) {
            return rowDifference;
          }

          return left.options.position.col - right.options.position.col;
        })
        .slice(0, INITIAL_WIDGET_RENDER_COUNT)
        .map((widget) => widget.id),
    );
  }, [dashboard.widgets]);
  const selectedQueryTableVisualization =
    selectedQuery?.visualizations.find((item) => item.type !== 'CHART') ?? null;
  const selectedQueryChartVisualizations =
    selectedQuery?.visualizations.filter((item) => item.type === 'CHART') ?? [];
  const selectedVisualization = useMemo(() => {
    if (!selectedQuery || selectedVisualizationId === null) {
      return null;
    }

    return (
      selectedQuery.visualizations.find((item) => item.id === selectedVisualizationId) ??
      null
    );
  }, [selectedQuery, selectedVisualizationId]);
  const textboxPreview = useMemo(() => markdown.toHTML(textboxDraft || ''), [textboxDraft]);
  const saveStatusLabel = useMemo(() => {
    if (saveState === 'saving') {
      return 'Saving';
    }

    if (saveState === 'error') {
      return 'Save failed';
    }

    return 'Saved';
  }, [saveState]);

  useEffect(() => {
    reloadDashboardRef.current = reloadDashboard;
  });

  useEffect(() => {
    setDashboard(initialDashboard);
    setEditingName(initialDashboard.name);
    setLayouts(buildLayouts(initialDashboard.widgets));
    lastSavedPositionsRef.current = mapSavedPositions(initialDashboard.widgets);
  }, [initialDashboard]);

  useEffect(() => {
    if (!isAddWidgetDialogOpen) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadQueries() {
      setQueriesLoading(true);

      try {
        const response = await getQueries('my', {
          page: 1,
          page_size: 50,
          q: deferredQuerySearch.trim() || undefined,
          tags: [],
        }, {
          signal: controller.signal,
        });

        if (!cancelled) {
          startTransition(() => {
            setQueries(response.results);
          });
        }
      } catch (error) {
        if (controller.signal.aborted || cancelled) {
          return;
        }

        if (!cancelled) {
          showError(getApiErrorMessage(error, '쿼리 목록을 불러오지 못했습니다.'));
        }
      } finally {
        if (!cancelled && !controller.signal.aborted) {
          setQueriesLoading(false);
        }
      }
    }

    void loadQueries();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [deferredQuerySearch, isAddWidgetDialogOpen, showError]);

  useEffect(() => {
    if (!textboxDialog) {
      setIsMarkdownHelpOpen(false);
      setTextboxDraft('');
      return;
    }

    setTextboxDraft(textboxDialog.text);
  }, [textboxDialog]);

  useEffect(() => {
    const gridNode = gridContainerRef.current;

    if (!gridNode) {
      return;
    }

    const updateMeasurements = () => {
      setGridWidth(Math.max(gridNode.clientWidth, 320));
      const bounds = gridNode.getBoundingClientRect();
      const toolbarHeight = bottomToolbarRef.current?.offsetHeight ?? 0;

      setBottomToolbarStyle({
        left: `${Math.round(bounds.left)}px`,
        width: `${Math.round(gridNode.clientWidth)}px`,
      });
      setBottomToolbarOffset(
        toolbarHeight > 0
          ? toolbarHeight + GRID_MARGIN + 24
          : EDITING_BOTTOM_TOOLBAR_SAFE_OFFSET,
      );
    };

    updateMeasurements();

    const observer = new ResizeObserver(() => {
      updateMeasurements();
    });

    observer.observe(gridNode);
    if (bottomToolbarRef.current) {
      observer.observe(bottomToolbarRef.current);
    }
    window.addEventListener('resize', updateMeasurements);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateMeasurements);
    };
  }, [isEditing]);

  useEffect(() => {
    if (!isVisualizationDropdownOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (visualizationDropdownRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsVisualizationDropdownOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsVisualizationDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisualizationDropdownOpen]);

  useEffect(() => {
    if (!isRefreshMenuOpen && !isHeaderActionMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (isRefreshMenuOpen && refreshMenuRef.current?.contains(target)) {
        return;
      }

      if (
        isHeaderActionMenuOpen &&
        headerActionMenuRef.current?.contains(target)
      ) {
        return;
      }

      setIsRefreshMenuOpen(false);
      setIsHeaderActionMenuOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsRefreshMenuOpen(false);
        setIsHeaderActionMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isHeaderActionMenuOpen, isRefreshMenuOpen]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--toast-bottom-offset', isEditing ? '96px' : '0px');

    return () => {
      root.style.setProperty('--toast-bottom-offset', '0px');
    };
  }, [isEditing]);

  useEffect(() => {
    if (isEditing || !dashboardRefreshInterval) {
      return;
    }

    const refreshTimer = window.setInterval(() => {
      void reloadDashboardRef.current();
    }, dashboardRefreshInterval * 1000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [dashboardRefreshInterval, isEditing]);

  async function reloadDashboard() {
    try {
      const detail = await getDashboardDetail(dashboard.id);
      startTransition(() => {
        setDashboard(detail);
        setEditingName(detail.name);
        setLayouts(buildLayouts(detail.widgets));
        lastSavedPositionsRef.current = mapSavedPositions(detail.widgets);
        setSaveState('saved');
      });
    } catch (error) {
      showError(getApiErrorMessage(error, '대시보드를 다시 불러오지 못했습니다.'));
    }
  }

  function toggleEditMode(nextEditing: boolean) {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (nextEditing) {
      nextParams.set('edit', 'true');
    } else {
      nextParams.delete('edit');
    }

    const nextSearch = nextParams.toString();
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
      scroll: false,
    });
  }

  async function handleFavoriteToggle() {
    if (isFavoritePending) {
      return;
    }

    setIsFavoritePending(true);

    try {
      const updated = dashboard.is_favorite
        ? await unfavoriteDashboard(dashboard.id)
        : await favoriteDashboard(dashboard.id);

      startTransition(() => {
        setDashboard((current) => ({
          ...current,
          is_favorite: updated.is_favorite,
        }));
      });
    } catch (error) {
      showError(getApiErrorMessage(error, '즐겨찾기 상태를 바꾸지 못했습니다.'));
    } finally {
      setIsFavoritePending(false);
    }
  }

  async function persistDashboard(
    payload: Parameters<typeof updateDashboard>[1],
    successMessage?: string,
  ) {
    try {
      const updated = await updateDashboard(dashboard.id, {
        ...payload,
        version: dashboard.version,
      });

      startTransition(() => {
        setDashboard((current) => ({
          ...current,
          ...updated,
          widgets: current.widgets,
        }));
        setEditingName(updated.name);
      });

      if (successMessage) {
        showSuccess(successMessage);
      }
    } catch (error) {
      showError(getApiErrorMessage(error, '대시보드를 저장하지 못했습니다.'));
      throw error;
    }
  }

  async function handleNameSubmit() {
    const trimmedName = editingName.trim();

    if (!trimmedName || trimmedName === dashboard.name) {
      setEditingName(dashboard.name);
      return;
    }

    await persistDashboard({ name: trimmedName }, '대시보드 이름을 저장했습니다.');
  }

  async function handleDashboardFilterToggle(nextValue: boolean) {
    startTransition(() => {
      setDashboard((current) => ({
        ...current,
        dashboard_filters_enabled: nextValue,
      }));
    });

    try {
      await persistDashboard({ dashboard_filters_enabled: nextValue });
    } catch {
      startTransition(() => {
        setDashboard((current) => ({
          ...current,
          dashboard_filters_enabled: !nextValue,
        }));
      });
    }
  }

  async function handleArchiveDashboard() {
    if (isArchiving) {
      return;
    }

    setIsArchiving(true);

    try {
      await archiveDashboard(dashboard.id);
      showSuccess('대시보드를 아카이브했습니다.');
      router.push('/dashboards');
    } catch (error) {
      showError(getApiErrorMessage(error, '대시보드를 아카이브하지 못했습니다.'));
    } finally {
      setIsArchiving(false);
    }
  }

  async function handlePublishDashboard() {
    if (!dashboard.is_draft) {
      return;
    }

    await persistDashboard(
      { is_draft: false },
      '대시보드를 publish 했습니다.',
    );
  }

  async function handleUnpublishDashboard() {
    if (dashboard.is_draft) {
      return;
    }

    setIsHeaderActionMenuOpen(false);
    await persistDashboard(
      { is_draft: true },
      '대시보드를 unpublish 했습니다.',
    );
  }

  async function handleRefreshScheduleChange(interval: number | null) {
    setIsRefreshMenuOpen(false);

    try {
      await persistDashboard(
        {
          options: {
            ...dashboard.options,
            refresh: interval ? { interval } : null,
          },
        },
        interval
          ? '대시보드 자동 새로고침 주기를 저장했습니다.'
          : '대시보드 자동 새로고침을 해제했습니다.',
      );
    } catch {
      return;
    }
  }

  async function waitForQueryJobs(jobIds: string[]) {
    const pendingJobIds = new Set(jobIds);

    for (let attempt = 0; attempt < 600; attempt += 1) {
      const pendingStatuses = await Promise.all(
        [...pendingJobIds].map(async (jobId) => ({
          jobId,
          status: await getExecuteQueryJobStatus(jobId),
        })),
      );

      pendingStatuses.forEach(({ jobId, status }) => {
        if (status.state === 'completed') {
          pendingJobIds.delete(jobId);
          return;
        }

        if (status.state === 'failed') {
          throw new Error(status.error ?? '대시보드 새로고침에 실패했습니다.');
        }
      });

      if (pendingJobIds.size === 0) {
        return;
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, 500);
      });
    }

    throw new Error('대시보드 새로고침 시간이 초과되었습니다.');
  }

  async function waitForDashboardRefresh(dashboardRefreshId: string) {
    for (let attempt = 0; attempt < 600; attempt += 1) {
      const status = await getDashboardRefreshStatus(dashboardRefreshId);

      if (status.state === 'completed') {
        return;
      }

      if (status.state === 'failed') {
        throw new Error(status.error ?? '대시보드 새로고침에 실패했습니다.');
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, 500);
      });
    }

    throw new Error('대시보드 새로고침 시간이 초과되었습니다.');
  }

  async function handleRefreshDashboard() {
    if (isDashboardRefreshing) {
      return;
    }

    setIsDashboardRefreshing(true);

    try {
      const response = await refreshDashboardRequest(dashboard.id);

      if (response.state !== 'completed') {
        await waitForDashboardRefresh(response.dashboard_refresh_id);
      }

      await reloadDashboard();
      showSuccess('대시보드를 새로고침했습니다.');
    } catch (error) {
      showError(getApiErrorMessage(error, '대시보드를 새로고침하지 못했습니다.'));
    } finally {
      setIsDashboardRefreshing(false);
    }
  }

  async function handleRefreshWidget(widget: DashboardWidgetItem) {
    if (!widget.visualization) {
      await reloadDashboard();
      return;
    }

    const queryDetail = await getQueryDetail(widget.visualization.query_id);
    const queryText = queryDetail.query || widget.query_result?.query;
    const dataSourceId =
      queryDetail.data_source_id ?? widget.query_result?.data_source_id ?? null;

    if (!queryText || !dataSourceId) {
      throw new Error('위젯 쿼리 정보를 찾을 수 없습니다.');
    }

    const queuedJob = await executeQueryRequest({
      data_source_id: dataSourceId,
      persist_latest_query_data: true,
      query: queryText,
      query_id: widget.visualization.query_id,
    });

    await waitForQueryJobs([queuedJob.job_id]);
    await reloadDashboard();
  }

  async function handleWidgetRefreshAction(widget: DashboardWidgetItem) {
    try {
      await handleRefreshWidget(widget);
      showSuccess('위젯을 새로고침했습니다.');
    } catch (error) {
      showError(getApiErrorMessage(error, '위젯을 새로고침하지 못했습니다.'));
    }
  }

  function queueLayoutSave(
    nextLayouts: ResponsiveLayouts,
    positionOverrides?: Map<number, DashboardWidgetPosition>,
  ) {
    if (!isEditing || isMobileLayout) {
      return;
    }

    const desktopLayouts = nextLayouts.lg ?? [];
    const currentWidgetPositions = new Map(
      dashboard.widgets.map((widget) => [widget.id, widget.options.position]),
    );
    positionOverrides?.forEach((position, widgetId) => {
      currentWidgetPositions.set(widgetId, position);
    });
    const changedLayouts = desktopLayouts.filter((layoutItem) => {
      const savedPosition = lastSavedPositionsRef.current[Number(layoutItem.i)];
      const currentPosition =
        currentWidgetPositions.get(Number(layoutItem.i)) ?? savedPosition;

      if (!savedPosition) {
        return true;
      }

      const nextPosition = layoutToPosition(layoutItem, currentPosition);

      return (
        savedPosition.col !== nextPosition.col ||
        savedPosition.row !== nextPosition.row ||
        savedPosition.sizeX !== nextPosition.sizeX ||
        savedPosition.sizeY !== nextPosition.sizeY
      );
    });

    if (changedLayouts.length === 0) {
      setSaveState('saved');
      return;
    }

    setSaveState('saving');

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(async () => {
      try {
        await Promise.all(
          changedLayouts.map((layoutItem) =>
            updateDashboardWidget(Number(layoutItem.i), {
              options: {
                position: layoutToPosition(
                  layoutItem,
                  currentWidgetPositions.get(Number(layoutItem.i)) ??
                    lastSavedPositionsRef.current[Number(layoutItem.i)],
                ),
              },
            }),
          ),
        );

        changedLayouts.forEach((layoutItem) => {
          const widgetId = Number(layoutItem.i);
          lastSavedPositionsRef.current[widgetId] = layoutToPosition(
            layoutItem,
            lastSavedPositionsRef.current[widgetId],
          );
        });

        setSaveState('saved');
      } catch (error) {
        setSaveState('error');
        showError(getApiErrorMessage(error, '위젯 위치를 저장하지 못했습니다.'));
      }
    }, 500);
  }

  function handleLayoutChange(currentLayout: Layout) {
    const nextLayouts = {
      ...layouts,
      [currentBreakpoint]: currentLayout,
    };

    setLayouts(nextLayouts);

    if (!isEditing) {
      return;
    }

    const desktopLayouts = currentBreakpoint === 'lg' ? currentLayout : nextLayouts.lg ?? [];
    const widgetPositions = new Map(
      dashboard.widgets.map((widget) => [widget.id, widget.options.position]),
    );
    const nextPositions = new Map(
      desktopLayouts.map((layoutItem) => [
        Number(layoutItem.i),
        layoutToPosition(layoutItem, widgetPositions.get(Number(layoutItem.i))),
      ]),
    );

    startTransition(() => {
      setDashboard((current) => ({
        ...current,
        widgets: current.widgets.map((widget) => {
          const nextPosition = nextPositions.get(widget.id);

          if (!nextPosition) {
            return widget;
          }

          return {
            ...widget,
            options: {
              ...widget.options,
              position: nextPosition,
            },
          };
        }),
      }));
    });

    queueLayoutSave(nextLayouts);
  }

  function handleWidgetAutoHeight(widgetId: number, contentHeight: number) {
    const targetWidget = dashboard.widgets.find((widget) => widget.id === widgetId);

    if (!targetWidget?.options.position.autoHeight || contentHeight <= 0) {
      return;
    }

    const nextHeight = Math.max(
      targetWidget.options.position.minSizeY,
      getAutoHeightGridRows(contentHeight),
    );

    if (targetWidget.options.position.sizeY === nextHeight) {
      return;
    }

    const nextLayouts = {
      lg: (layouts.lg ?? []).map((layoutItem) =>
        Number(layoutItem.i) === widgetId ? { ...layoutItem, h: nextHeight } : layoutItem,
      ),
      sm: (layouts.sm ?? []).map((layoutItem) =>
        Number(layoutItem.i) === widgetId ? { ...layoutItem, h: nextHeight } : layoutItem,
      ),
    } satisfies ResponsiveLayouts;

    setLayouts(nextLayouts);

    startTransition(() => {
      setDashboard((current) => ({
        ...current,
        widgets: current.widgets.map((widget) => {
          if (widget.id !== widgetId) {
            return widget;
          }

          return {
            ...widget,
            options: {
              ...widget.options,
              position: {
                ...widget.options.position,
                sizeY: nextHeight,
              },
            },
          };
        }),
      }));
    });

    if (isEditing) {
      queueLayoutSave(nextLayouts);
    }
  }

  function handleWidgetResizeStop(
    currentLayout: Layout,
    previousItem: LayoutItem | null,
    resizedItem: LayoutItem | null,
  ) {
    if (!isEditing || isMobileLayout || !previousItem || !resizedItem) {
      return;
    }

    if (previousItem.h === resizedItem.h) {
      return;
    }

    const widgetId = Number(resizedItem.i);
    const targetWidget = dashboard.widgets.find((widget) => widget.id === widgetId);

    if (
      !targetWidget?.visualization ||
      targetWidget.visualization.type === 'CHART' ||
      !targetWidget.options.position.autoHeight
    ) {
      return;
    }

    const nextLayouts = {
      ...layouts,
      [currentBreakpoint]: currentLayout,
    } satisfies ResponsiveLayouts;
    const nextPosition = layoutToPosition(resizedItem, {
      ...targetWidget.options.position,
      autoHeight: false,
    });

    setLayouts(nextLayouts);

    startTransition(() => {
      setDashboard((current) => ({
        ...current,
        widgets: current.widgets.map((widget) => {
          if (widget.id !== widgetId) {
            return widget;
          }

          return {
            ...widget,
            options: {
              ...widget.options,
              position: nextPosition,
            },
          };
        }),
      }));
    });

    queueLayoutSave(nextLayouts, new Map([[widgetId, nextPosition]]));
  }

  function openTextboxDialog(widget: DashboardWidgetItem | null) {
    setTextboxDialog({
      mode: widget ? 'edit' : 'create',
      widgetId: widget?.id ?? null,
      text: widget?.text ?? '',
    });
  }

  async function handleTextboxSubmit() {
    const trimmedValue = textboxDraft.trim();

    if (!trimmedValue) {
      showError('텍스트박스 내용을 입력하세요.');
      return;
    }

    setIsTextboxSubmitting(true);

    try {
      if (textboxDialog?.mode === 'edit' && textboxDialog.widgetId) {
        await updateDashboardWidget(textboxDialog.widgetId, {
          text: textboxDraft,
        });
        showSuccess('텍스트박스를 저장했습니다.');
      } else {
        const position = getDefaultTextboxWidgetPosition(dashboard.widgets);
        await createDashboardWidget({
          dashboard_id: dashboard.id,
          options: {
            position,
          },
          text: textboxDraft,
        });
        showSuccess('텍스트박스를 추가했습니다.');
      }

      setTextboxDialog(null);
      await reloadDashboard();
    } catch (error) {
      showError(getApiErrorMessage(error, '텍스트박스를 저장하지 못했습니다.'));
    } finally {
      setIsTextboxSubmitting(false);
    }
  }

  async function handleDeleteWidget(widgetId: number) {
    setIsDeleteSubmitting(true);

    try {
      await deleteDashboardWidget(widgetId);
      showSuccess('위젯을 삭제했습니다.');
      setDeleteConfirmWidgetId(null);
      await reloadDashboard();
    } catch (error) {
      showError(getApiErrorMessage(error, '위젯을 삭제하지 못했습니다.'));
    } finally {
      setIsDeleteSubmitting(false);
    }
  }

  async function handleSelectQuery(queryId: number) {
    setSelectedQueryId(queryId);
    setSelectedVisualizationId(null);
    setSelectedQuery(null);
    setQueryDetailLoading(true);

    try {
      const detail = await getQueryDetail(queryId);
      const tableVisualization =
        detail.visualizations.find((item) => item.type !== 'CHART') ?? null;
      const chartVisualizations = detail.visualizations.filter(
        (item) => item.type === 'CHART',
      );
      const defaultVisualization =
        tableVisualization ?? chartVisualizations[0] ?? null;
      startTransition(() => {
        setSelectedQuery(detail);
        setSelectedVisualizationId(defaultVisualization?.id ?? null);
      });
    } catch (error) {
      showError(getApiErrorMessage(error, '쿼리 상세를 불러오지 못했습니다.'));
    } finally {
      setQueryDetailLoading(false);
    }
  }

  async function handleAddWidgetSubmit() {
    if (!selectedVisualization) {
      return;
    }

    setIsWidgetSubmitting(true);

    try {
      const position = getDefaultVisualizationWidgetPosition(
        dashboard.widgets,
        selectedVisualization,
      );
      await createDashboardWidget({
        dashboard_id: dashboard.id,
        options: {
          position,
        },
        visualization_id: selectedVisualization.id,
      });
      showSuccess('위젯을 추가했습니다.');
      setIsAddWidgetDialogOpen(false);
      setQuerySearch('');
      setSelectedQueryId(null);
      setSelectedQuery(null);
      setSelectedVisualizationId(null);
      await reloadDashboard();
    } catch (error) {
      showError(getApiErrorMessage(error, '위젯을 추가하지 못했습니다.'));
    } finally {
      setIsWidgetSubmitting(false);
    }
  }

  return (
    <>
      <div className="dashboard-page relative flex min-h-full flex-1 w-full flex-col">
        <div className="dashboard-page-container flex min-h-full flex-1 flex-col">
          <div className="sticky top-0 z-30 w-full bg-[#f6f7f9] px-[15px] pt-[10px] max-md:static">
            <div className="mb-[10px] flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[6px]">
                <button
                  aria-label={dashboard.is_favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                  className="text-[18px] text-[#c9cdd2] transition hover:text-[#f0b400]"
                  disabled={isFavoritePending}
                  onClick={handleFavoriteToggle}
                  type="button"
                >
                  {dashboard.is_favorite ? (
                    <StarFilled className="text-[#ffbf00]" />
                  ) : (
                    <StarOutlined />
                  )}
                </button>
                {isEditing ? (
                  <input
                    className="h-[34px] min-w-[6ch] max-w-[420px] rounded-[2px] border border-transparent bg-transparent px-1 text-[18px] font-semibold text-[#333333] outline-none transition focus:border-[#40a9ff] focus:bg-white"
                    onBlur={() => {
                      void handleNameSubmit();
                    }}
                    onChange={(event) => setEditingName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void handleNameSubmit();
                      }
                      if (event.key === 'Escape') {
                        setEditingName(dashboard.name);
                      }
                    }}
                    style={{
                      width: `${Math.max(editingName.trim().length + 1, 6)}ch`,
                    }}
                    value={editingName}
                  />
                ) : (
                  <h3 className="m-0 text-[22px] font-medium text-[#333333]">
                    {dashboard.name}
                  </h3>
                )}
                {dashboard.user ? (
                  <img
                    alt={dashboard.user.name}
                    className="h-4 w-4 rounded-full"
                    height={16}
                    src={dashboard.user.profile_image_url}
                    width={16}
                  />
                ) : null}
                {dashboard.is_draft ? (
                  <span className="rounded-[2px] bg-[#8aa1ad] px-[8px] py-[3px] text-[12px] leading-none text-white">
                    Unpublished
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[12px] ${saveState === 'error' ? 'text-[#f44336]' : 'text-[#7f8c8d]'}`}
                >
                  {saveStatusLabel}
                  {saveState === 'saving' ? '...' : ''}
                </span>
                {isEditing ? (
                  <button
                    className={`${primaryButton} h-[36px] gap-1.5 px-4`}
                    disabled={saveState === 'saving'}
                    onClick={() => toggleEditMode(false)}
                    type="button"
                  >
                    <CheckOutlined />
                    Done Editing
                  </button>
                ) : canEdit || canRefreshDashboard ? (
                  <div className="flex items-center gap-[6px]">
                    {dashboard.is_draft ? (
                      <button
                        className={`${secondaryButton} h-[34px] gap-1.5 px-4`}
                        onClick={() => {
                          void handlePublishDashboard();
                        }}
                        type="button"
                      >
                        <SendOutlined />
                        Publish
                      </button>
                    ) : null}

                    {canRefreshDashboard ? (
                      <div className="relative flex items-stretch" ref={refreshMenuRef}>
                        <button
                          className={`${secondaryButton} h-[34px] rounded-r-none border-r-0 gap-1.5 px-4`}
                          disabled={isDashboardRefreshing}
                          onClick={() => {
                            void handleRefreshDashboard();
                          }}
                          type="button"
                        >
                          {isDashboardRefreshing ? (
                            <LoadingOutlined />
                          ) : (
                            <ReloadOutlined />
                          )}
                          {dashboardRefreshInterval
                            ? formatDashboardRefreshInterval(
                                dashboardRefreshInterval,
                              )
                            : 'Refresh'}
                        </button>
                        <button
                          aria-expanded={isRefreshMenuOpen}
                          aria-haspopup="menu"
                          className={`${secondaryButton} h-[34px] w-[34px] rounded-l-none px-0`}
                          onClick={() =>
                            setIsRefreshMenuOpen((current) => !current)
                          }
                          type="button"
                        >
                          <DownOutlined className="text-[11px]" />
                        </button>

                        {isRefreshMenuOpen ? (
                          <div className="absolute right-0 top-[38px] z-20 min-w-[132px] overflow-hidden rounded-[2px] border border-[#f0f0f0] bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)]">
                            {DASHBOARD_REFRESH_OPTIONS.map((interval) => (
                              <button
                                className={`block w-full whitespace-nowrap px-4 py-[10px] text-left text-[14px] transition ${
                                  dashboardRefreshInterval === interval
                                    ? 'bg-[#eaf7ff] text-[#555555]'
                                    : 'bg-white text-[#555555] hover:bg-[#f9fafb]'
                                }`}
                                key={interval}
                                onClick={() => {
                                  void handleRefreshScheduleChange(interval);
                                }}
                                type="button"
                              >
                                {formatDashboardRefreshInterval(interval)}
                              </button>
                            ))}
                            {dashboardRefreshInterval ? (
                              <button
                                className="block w-full whitespace-nowrap border-t border-[#f0f0f0] px-4 py-[10px] text-left text-[14px] text-[#555555] transition hover:bg-[#f9fafb]"
                                onClick={() => {
                                  void handleRefreshScheduleChange(null);
                                }}
                                type="button"
                              >
                                Disable auto refresh
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="relative" ref={headerActionMenuRef}>
                      <button
                        aria-expanded={isHeaderActionMenuOpen}
                        aria-haspopup="menu"
                        className={`${secondaryButton} h-[34px] w-[34px] px-0`}
                        onClick={() =>
                          setIsHeaderActionMenuOpen((current) => !current)
                        }
                        type="button"
                      >
                        <MoreOutlined className="rotate-90 text-[16px]" />
                      </button>

                      {isHeaderActionMenuOpen ? (
                        <div className="absolute right-0 top-[38px] z-20 min-w-[156px] overflow-hidden rounded-[2px] border border-[#f0f0f0] bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)]">
                          <button
                            className="block w-full whitespace-nowrap border-b border-[#f0f0f0] px-4 py-[10px] text-left text-[14px] text-[#555555] transition hover:bg-[#eaf7ff]"
                            onClick={() => {
                              setIsHeaderActionMenuOpen(false);
                              toggleEditMode(true);
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          {!dashboard.is_draft && canManagePublishState ? (
                            <button
                              className="block w-full whitespace-nowrap border-b border-[#f0f0f0] px-4 py-[10px] text-left text-[14px] text-[#555555] transition hover:bg-[#eaf7ff]"
                              onClick={() => {
                                void handleUnpublishDashboard();
                              }}
                              type="button"
                            >
                              Unpublish
                            </button>
                          ) : null}
                          <button
                            className="block w-full whitespace-nowrap px-4 py-[10px] text-left text-[14px] text-[#555555] transition hover:bg-[#fafafa]"
                            onClick={() => {
                              setIsHeaderActionMenuOpen(false);
                              setIsArchiveConfirmOpen(true);
                            }}
                            type="button"
                          >
                            Archive
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mb-[10px] rounded-[3px] bg-white px-[15px] py-[14px] shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
              <label className="inline-flex items-center gap-2 text-[14px] text-[#555555]">
                <input
                  checked={dashboard.dashboard_filters_enabled}
                  className="h-4 w-4 rounded-[2px] border border-[#d9d9d9]"
                  disabled={!canEdit}
                  onChange={(event) => {
                    void handleDashboardFilterToggle(event.target.checked);
                  }}
                  type="checkbox"
                />
                Use Dashboard Level Filters
              </label>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-[15px]">
            <div
              id="dashboard-container"
              className={`relative flex min-h-0 flex-1 ${
                isEditing ? 'dashboard-container-editing' : ''
              }`}
            >
              <div
                className={`dashboard-grid-wrapper relative flex-1 w-full flex-col ${
                  isEditing ? 'editing-mode' : 'preview-mode'
                }`}
                ref={gridContainerRef}
                style={
                  {
                    ...(isEditing
                      ? {
                          ['--dashboard-bottom-toolbar-offset' as string]: `${bottomToolbarOffset}px`,
                        }
                      : null),
                    height: gridHeight,
                  } as CSSProperties
                }
              >
                <Responsive
                  breakpoints={{ lg: MOBILE_BREAKPOINT, sm: 0 }}
                  className="layout"
                  cols={{ lg: GRID_COLUMNS, sm: 1 }}
                  containerPadding={[0, 0]}
                  dragConfig={{
                    cancel: 'input,textarea,select,button,a',
                    enabled: isEditing && !isMobileLayout,
                  }}
                  layouts={layouts}
                  margin={[GRID_MARGIN, GRID_MARGIN]}
                  onBreakpointChange={(breakpoint) => {
                    setCurrentBreakpoint(breakpoint as 'lg' | 'sm');
                  }}
                  onLayoutChange={handleLayoutChange}
                  onResizeStop={handleWidgetResizeStop}
                  resizeConfig={{
                    enabled: isEditing && !isMobileLayout,
                    handles: ['se'],
                  }}
                  rowHeight={GRID_ROW_HEIGHT}
                  width={gridWidth}
                >
                  {dashboard.widgets.map((widget) => (
                    <div
                      className={`dashboard-widget-wrapper ${
                        activeWidgetMenuId === widget.id ? 'z-[45]' : 'z-0'
                      }`}
                      data-widgetid={widget.id}
                      key={String(widget.id)}
                    >
                      <DashboardWidgetCard
                        isEditing={isEditing}
                        isMenuPriority={activeWidgetMenuId === widget.id}
                        onMenuOpenChange={(isOpen) => {
                          setActiveWidgetMenuId((current) => {
                            if (isOpen) {
                              return widget.id;
                            }

                            return current === widget.id ? null : current;
                          });
                        }}
                        onAutoHeightChange={handleWidgetAutoHeight}
                        onDelete={() => setDeleteConfirmWidgetId(widget.id)}
                        onEditTextbox={
                          widget.visualization ? undefined : () => openTextboxDialog(widget)
                        }
                        onRefresh={() => handleWidgetRefreshAction(widget)}
                        renderPriority={prioritizedWidgetIds.has(widget.id)}
                        widget={widget}
                      />
                    </div>
                  ))}
                </Responsive>
                {!isEditing && dashboard.widgets.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center text-[14px] text-[#8c8c8c]">
                    No widgets yet.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {isEditing ? (
          <div
            className="fixed bottom-5 z-20 rounded-[3px] bg-white px-[15px] py-[15px] shadow-[0_7px_29px_-3px_rgba(102,136,153,0.45)]"
            ref={bottomToolbarRef}
            style={bottomToolbarStyle}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative pl-8 text-[14px] text-[#555555]">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[22px] text-[#323232]">
                  ▣
                </span>
                Widgets are individual query visualizations or text boxes you can place on your dashboard in various arrangements.
              </div>
              <div className="flex items-center justify-end gap-[15px]">
                <button
                  className={secondaryButton}
                  onClick={() => openTextboxDialog(null)}
                  type="button"
                >
                  Add Textbox
                </button>
                <button
                  className={primaryButton}
                  onClick={() => setIsAddWidgetDialogOpen(true)}
                  type="button"
                >
                  Add Widget
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {textboxDialog ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-[rgba(0,0,0,0.45)] px-4 pt-10">
          <div className="flex w-full max-w-[1040px] items-start justify-center gap-4 max-lg:flex-col max-lg:items-center">
            <div className="w-full max-w-[500px] overflow-hidden rounded-[2px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
              <div className="flex items-center justify-between border-b border-[#e8e8e8] px-6 py-5">
                <h3 className="m-0 text-[18px] font-normal text-[#323232]">
                  {textboxDialog.mode === 'edit' ? 'Edit Textbox' : 'Add Textbox'}
                </h3>
                <button
                  className="text-[18px] text-[#8c8c8c] transition hover:text-[#323232]"
                  onClick={() => setTextboxDialog(null)}
                  type="button"
                >
                  <CloseOutlined />
                </button>
              </div>
              <div className="px-6 py-5">
                <textarea
                  className="h-[118px] w-full resize-y rounded-[2px] border border-[#40a9ff] px-3 py-3 text-[14px] text-[#595959] outline-none"
                  onChange={(event) => setTextboxDraft(event.target.value)}
                  placeholder="This is where you write some text"
                  value={textboxDraft}
                />
                <div className="mt-2 text-[13px] text-[#777777]">
                  Supports basic{' '}
                  <button
                    className="text-[#1890ff] hover:underline"
                    onClick={() => setIsMarkdownHelpOpen((current) => !current)}
                    type="button"
                  >
                    Markdown
                  </button>
                  .
                </div>
                {textboxDraft.trim() ? (
                  <div className="mt-4 border-t border-dashed border-[#d9d9d9] pt-4">
                    <strong className="block text-[13px] text-[#323232]">Preview:</strong>
                    <div
                      className="markdown-body mt-3 text-[14px] leading-7 text-[#444444]"
                      dangerouslySetInnerHTML={{ __html: textboxPreview }}
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-[#e8e8e8] px-6 py-4">
                <button
                  className={secondaryButton}
                  onClick={() => setTextboxDialog(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={primaryButton}
                  disabled={isTextboxSubmitting}
                  onClick={() => {
                    void handleTextboxSubmit();
                  }}
                  type="button"
                >
                  {textboxDialog.mode === 'edit' ? 'Save' : 'Add to Dashboard'}
                </button>
              </div>
            </div>

            {isMarkdownHelpOpen ? (
              <div className="w-full max-w-[420px] overflow-hidden rounded-[2px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
                <div className="flex items-center justify-between border-b border-[#e8e8e8] px-6 py-5">
                  <h3 className="m-0 text-[18px] font-normal text-[#323232]">
                    Basic Markdown
                  </h3>
                  <button
                    className="text-[18px] text-[#8c8c8c] transition hover:text-[#323232]"
                    onClick={() => setIsMarkdownHelpOpen(false)}
                    type="button"
                  >
                    <CloseOutlined />
                  </button>
                </div>
                <div className="max-h-[520px] overflow-auto px-6 py-5">
                  <p className="mb-4 text-[13px] leading-6 text-[#666666]">
                    Markdown Guide Basic Syntax를 기준으로 자주 쓰는 문법만 정리했습니다.
                  </p>
                  <div className="space-y-4">
                    {markdownHelpSections.map((section) => (
                      <div key={section.title}>
                        <h4 className="mb-2 text-[14px] font-semibold text-[#323232]">
                          {section.title}
                        </h4>
                        <pre className="overflow-auto rounded-[2px] bg-[#f7f8fa] px-3 py-3 text-[12px] leading-6 text-[#4a4a4a]">
                          {section.syntax.join('\n')}
                        </pre>
                      </div>
                    ))}
                  </div>
                  <a
                    className="mt-5 inline-block text-[13px] text-[#1890ff] hover:underline"
                    href="https://www.markdownguide.org/cheat-sheet/#basic-syntax"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Markdown Guide 열기
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isAddWidgetDialogOpen ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-[rgba(0,0,0,0.45)] px-4 pt-10">
          <div className="flex w-full max-w-[700px] flex-col overflow-visible rounded-[2px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between border-b border-[#e8e8e8] px-6 py-5">
              <h3 className="m-0 text-[18px] font-normal text-[#323232]">Add Widget</h3>
              <button
                className="text-[18px] text-[#8c8c8c] transition hover:text-[#323232]"
                onClick={() => setIsAddWidgetDialogOpen(false)}
                type="button"
              >
                <CloseOutlined />
              </button>
            </div>
            <div className="px-6 py-5">
              <input
                className="h-[34px] w-full rounded-[2px] border border-[#d9d9d9] px-3 text-[14px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
                onChange={(event) => setQuerySearch(event.target.value)}
                placeholder="Search a query by name"
                value={querySearch}
              />

              {selectedQuery ? (
                <div className="mt-4 rounded-[2px] border border-[#d9d9d9] bg-[#fafafa] px-3 py-2 text-[14px] text-[#595959]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">{selectedQuery.name}</span>
                    <button
                      className="text-[13px] text-[#777777] transition hover:text-[#323232]"
                      onClick={() => {
                        setSelectedQueryId(null);
                        setSelectedQuery(null);
                        setSelectedVisualizationId(null);
                        setIsVisualizationDropdownOpen(false);
                      }}
                      type="button"
                    >
                      <CloseOutlined />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 max-h-[290px] overflow-auto border border-[#f0f0f0]">
                  {queriesLoading ? (
                    <div className="flex h-[180px] items-center justify-center text-[13px] text-[#888888]">
                      <LoadingOutlined className="mr-2" />
                      Loading queries...
                    </div>
                  ) : queries.length > 0 ? (
                    queries.map((query) => (
                      <button
                        className={`flex w-full items-center justify-between gap-3 border-b border-[#f0f0f0] px-4 py-3 text-left text-[14px] text-[#555555] transition hover:bg-[#f9fafb] ${
                          selectedQueryId === query.id ? 'bg-[#f5fbff]' : 'bg-white'
                        }`}
                        key={query.id}
                        onClick={() => {
                          void handleSelectQuery(query.id);
                        }}
                        type="button"
                      >
                        <div className="min-w-0">
                          <div className="truncate">{query.name}</div>
                          {query.tags.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {query.tags.slice(0, 3).map((tag) => (
                                <span
                                  className="rounded-[2px] bg-[#dfe7eb] px-1.5 py-[1px] text-[11px] text-[#586c79]"
                                  key={tag}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <PlusOutlined className="shrink-0 text-[#b0b0b0]" />
                      </button>
                    ))
                  ) : (
                    <div className="flex h-[180px] items-center justify-center px-6 text-center text-[13px] text-[#888888]">
                      표시할 내 쿼리가 없습니다.
                    </div>
                  )}
                </div>
              )}

              {selectedQuery ? (
                <div className="mt-5">
                  <label className="mb-2 block text-[14px] text-[#555555]">
                    Choose Visualization
                  </label>
                  {queryDetailLoading ? (
                    <div className="flex h-[80px] items-center text-[13px] text-[#888888]">
                      <LoadingOutlined className="mr-2" />
                      시각화 목록을 불러오는 중입니다.
                    </div>
                  ) : (
                    <div className="relative" ref={visualizationDropdownRef}>
                      <button
                        aria-expanded={isVisualizationDropdownOpen}
                        aria-haspopup="listbox"
                        className={`flex h-[36px] w-full items-center justify-between rounded-[2px] border px-3 text-left text-[14px] outline-none transition ${
                          isVisualizationDropdownOpen
                            ? 'border-[#40a9ff] text-[#595959]'
                            : 'border-[#d9d9d9] text-[#595959]'
                        }`}
                        onClick={() =>
                          setIsVisualizationDropdownOpen((current) => !current)
                        }
                        type="button"
                      >
                        <span className={selectedVisualization ? 'text-[#595959]' : 'text-[#bfbfbf]'}>
                          {selectedVisualization?.name ?? 'Select visualization'}
                        </span>
                        <DownOutlined className="text-[12px] text-[#bfbfbf]" />
                      </button>

                      {isVisualizationDropdownOpen ? (
                        <div className="absolute left-0 right-0 top-[40px] z-20 overflow-hidden rounded-[2px] border border-[#f0f0f0] bg-white shadow-[0_6px_20px_rgba(0,0,0,0.15)]">
                          <div className="max-h-[220px] overflow-y-auto overscroll-contain">
                            {selectedQueryTableVisualization ? (
                              <div>
                                <div className="border-b border-[#f5f5f5] bg-white px-3 py-2 text-[12px] uppercase tracking-[0.04em] text-[#8c8c8c]">
                                  TABLE
                                </div>
                                <button
                                  aria-selected={
                                    selectedVisualizationId ===
                                    selectedQueryTableVisualization.id
                                  }
                                  className={`block w-full px-3 py-[10px] text-left text-[14px] transition ${
                                    selectedVisualizationId ===
                                    selectedQueryTableVisualization.id
                                      ? 'bg-[#eaf7ff] text-[#555555]'
                                      : 'bg-white text-[#555555] hover:bg-[#f9fafb]'
                                  }`}
                                  key={selectedQueryTableVisualization.id}
                                  onClick={() => {
                                    setSelectedVisualizationId(
                                      selectedQueryTableVisualization.id,
                                    );
                                    setIsVisualizationDropdownOpen(false);
                                  }}
                                  role="option"
                                  type="button"
                                >
                                  {selectedQueryTableVisualization.name}
                                </button>
                              </div>
                            ) : null}
                            {selectedQueryChartVisualizations.length > 0 ? (
                              <div>
                                <div className="border-b border-[#f5f5f5] bg-white px-3 py-2 text-[12px] uppercase tracking-[0.04em] text-[#8c8c8c]">
                                  CHART
                                </div>
                                {selectedQueryChartVisualizations.map((item) => (
                                  <button
                                    aria-selected={selectedVisualizationId === item.id}
                                    className={`block w-full px-3 py-[10px] text-left text-[14px] transition ${
                                      selectedVisualizationId === item.id
                                        ? 'bg-[#eaf7ff] text-[#555555]'
                                        : 'bg-white text-[#555555] hover:bg-[#f9fafb]'
                                    }`}
                                    key={item.id}
                                    onClick={() => {
                                      setSelectedVisualizationId(item.id);
                                      setIsVisualizationDropdownOpen(false);
                                    }}
                                    role="option"
                                    type="button"
                                  >
                                    {item.name}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[#e8e8e8] px-6 py-4">
              <button
                className={secondaryButton}
                onClick={() => setIsAddWidgetDialogOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={primaryButton}
                disabled={!selectedVisualization || isWidgetSubmitting}
                onClick={() => {
                  void handleAddWidgetSubmit();
                }}
                type="button"
              >
                Add to Dashboard
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirmWidgetId !== null ? (
        <div className="fixed inset-0 z-[85] flex items-start justify-center bg-[rgba(0,0,0,0.45)] px-4 pt-12">
          <div className="w-full max-w-[416px] overflow-hidden rounded-[2px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
            <div className="flex items-start gap-4 px-8 py-7">
              <ExclamationCircleOutlined className="mt-0.5 text-[22px] text-[#fa8c16]" />
              <div className="min-w-0 flex-1">
                <h3 className="m-0 text-[18px] font-normal text-[#323232]">Delete Widget</h3>
                <p className="mb-0 mt-3 text-[15px] leading-7 text-[#555555]">
                  Are you sure you want to remove this widget from the dashboard?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-8 pb-6">
              <button
                className={secondaryButton}
                disabled={isDeleteSubmitting}
                onClick={() => setDeleteConfirmWidgetId(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={`${buttonBase} border-[#ff4d4f] bg-white text-[#ff4d4f] hover:border-[#ff7875] hover:text-[#ff7875]`}
                disabled={isDeleteSubmitting}
                onClick={() => {
                  void handleDeleteWidget(deleteConfirmWidgetId);
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isArchiveConfirmOpen ? (
        <div className="fixed inset-0 z-[85] flex items-start justify-center bg-[rgba(0,0,0,0.45)] px-4 pt-12">
          <div className="w-full max-w-[416px] overflow-hidden rounded-[2px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
            <div className="flex items-start gap-4 px-8 py-7">
              <ExclamationCircleOutlined className="mt-0.5 text-[22px] text-[#fa8c16]" />
              <div className="min-w-0 flex-1">
                <h3 className="m-0 text-[18px] font-normal text-[#323232]">
                  Archive Dashboard
                </h3>
                <p className="mb-0 mt-3 text-[15px] leading-7 text-[#555555]">
                  {`Are you sure you want to archive the "${dashboard.name}" dashboard?`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-8 pb-6">
              <button
                className={secondaryButton}
                disabled={isArchiving}
                onClick={() => setIsArchiveConfirmOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className={`${buttonBase} border-[#ff4d4f] bg-white text-[#ff4d4f] hover:border-[#ff7875] hover:text-[#ff7875]`}
                disabled={isArchiving}
                onClick={() => {
                  setIsArchiveConfirmOpen(false);
                  void handleArchiveDashboard();
                }}
                type="button"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .dashboard-page,
        .dashboard-page-container {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          width: 100%;
          min-height: 100%;
        }

        .dashboard-page-container {
          background-color: #f6f7f9;
        }

        #dashboard-container {
          position: relative;
          display: flex;
          flex-grow: 1;
          background-color: #f6f7f9;
        }

        .dashboard-grid-wrapper {
          display: flex;
          flex-grow: 1;
          min-height: max(420px, calc(100vh - 255px));
        }

        #dashboard-container.dashboard-container-editing {
          padding-bottom: 112px;
          background:
            linear-gradient(to right, transparent, transparent 1px, #f6f8f9 1px, #f6f8f9),
            linear-gradient(to bottom, #b3babf, #b3babf 1px, transparent 1px, transparent);
          background-size: 8px 50px;
          background-position-y: -8px;
        }

        #dashboard-container.dashboard-container-editing::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            linear-gradient(to bottom, transparent, transparent 2px, #f6f8f9 2px, #f6f8f9 5px),
            linear-gradient(to left, #b3babf, #b3babf 1px, transparent 1px, transparent);
          background-size: calc((100% + 15px) / 6) 8px;
          background-position: -7px 1px;
          pointer-events: none;
        }

        .dashboard-grid-wrapper.editing-mode .layout {
          padding-bottom: var(--dashboard-bottom-toolbar-offset, 0px);
        }

        @media (max-width: 768px) {
          .dashboard-grid-wrapper {
            min-height: 420px;
          }

          #dashboard-container.dashboard-container-editing {
            padding-bottom: 124px;
          }
        }

        .react-grid-item.react-grid-placeholder {
          border-radius: 3px;
          background-color: #e0e6eb;
          opacity: 0.5;
        }

        .react-grid-item > .react-resizable-handle {
          bottom: 5px;
          height: 12px;
          right: 5px;
          width: 12px;
        }

        .react-grid-item > .react-resizable-handle::after {
          border-bottom: 2px solid #8c8c8c;
          border-right: 2px solid #8c8c8c;
          bottom: 0;
          content: '';
          height: 10px;
          position: absolute;
          right: 0;
          width: 10px;
        }

        .markdown-body :first-child {
          margin-top: 0;
        }

        .markdown-body :last-child {
          margin-bottom: 0;
        }

        .markdown-body h1,
        .markdown-body h2,
        .markdown-body h3,
        .markdown-body h4 {
          color: #333333;
          font-weight: 600;
          margin-bottom: 12px;
          margin-top: 20px;
        }

        .markdown-body p,
        .markdown-body ul,
        .markdown-body ol,
        .markdown-body blockquote,
        .markdown-body pre {
          margin-bottom: 12px;
        }

        .markdown-body ul,
        .markdown-body ol {
          padding-left: 20px;
        }

        .markdown-body pre,
        .markdown-body code {
          background: #f6f8fa;
          border-radius: 2px;
          font-family: Menlo, Monaco, Consolas, monospace;
        }

        .markdown-body pre {
          overflow: auto;
          padding: 12px;
        }

        .markdown-body code {
          padding: 1px 4px;
        }

        .markdown-body blockquote {
          border-left: 3px solid #d9d9d9;
          color: #666666;
          padding-left: 12px;
        }
      `}</style>
    </>
  );
}

type DashboardWidgetCardProps = {
  widget: DashboardWidgetItem;
  isEditing: boolean;
  isMenuPriority?: boolean;
  renderPriority?: boolean;
  onMenuOpenChange?: (isOpen: boolean) => void;
  onAutoHeightChange?: (widgetId: number, contentHeight: number) => void;
  onDelete: () => void;
  onEditTextbox?: () => void;
  onRefresh?: () => Promise<void>;
};

const DashboardWidgetCard = memo(function DashboardWidgetCard({
  widget,
  isEditing,
  isMenuPriority,
  renderPriority,
  onMenuOpenChange,
  onAutoHeightChange,
  onDelete,
  onEditTextbox,
  onRefresh,
}: DashboardWidgetCardProps) {
  const router = useRouter();
  const isVisualization = Boolean(widget.visualization);
  const queryResult = widget.query_result;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const tableContentRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const shouldRenderContent = useDeferredWidgetContent(
    cardRef,
    isEditing || renderPriority || !isVisualization,
  );
  const isAutoHeightTable =
    isVisualization &&
    widget.visualization?.type !== 'CHART' &&
    widget.options.position.autoHeight &&
    Boolean(queryResult) &&
    shouldRenderContent;
  const lastUpdatedAt =
    widget.query_result?.retrieved_at ?? widget.updated_at ?? widget.created_at;
  const lastUpdatedLabel = useMemo(
    () => formatRelativeTime(lastUpdatedAt),
    [lastUpdatedAt],
  );

  useEffect(() => {
    onMenuOpenChange?.(isMenuOpen);

    return () => {
      onMenuOpenChange?.(false);
    };
  }, [isMenuOpen, onMenuOpenChange]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsMenuOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isAutoHeightTable || !onAutoHeightChange) {
      return;
    }

    let frameId: number | null = null;

    const reportHeight = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
        const tableHeight = tableContentRef.current?.scrollHeight ?? 0;
        const footerHeight = footerRef.current?.getBoundingClientRect().height ?? 0;
        const contentHeight = Math.ceil(headerHeight + tableHeight + footerHeight + 28);

        if (contentHeight > 0) {
          onAutoHeightChange(widget.id, contentHeight);
        }
      });
    };

    reportHeight();

    const observer = new ResizeObserver(() => {
      reportHeight();
    });

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    if (tableContentRef.current) {
      observer.observe(tableContentRef.current);
    }

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    window.addEventListener('resize', reportHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', reportHeight);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [
    isAutoHeightTable,
    onAutoHeightChange,
    queryResult,
    widget.id,
  ]);

  async function handleRefreshClick() {
    if (!onRefresh || isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleFullscreenClick() {
    const target = cardRef.current;

    if (!target) {
      return;
    }

    try {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen();
        return;
      }

      await target.requestFullscreen();
    } catch {
      return;
    }
  }

  return (
    <div
      className={`group relative flex h-full min-h-0 w-full rounded-[3px] bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)] ${
        isMenuPriority ? 'z-[45]' : ''
      }`}
      ref={cardRef}
    >
      {isEditing ? (
        <div
          className={`absolute right-[8px] top-[12px] z-10 flex items-start transition-opacity duration-200 ${
            isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}
          ref={menuRef}
        >
          {isVisualization || onEditTextbox ? (
            <div className="relative">
              <button
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
                className="px-[8px] py-[6px] text-[20px] leading-none text-[#888888] transition hover:text-[#2196f3]"
                onClick={() => setIsMenuOpen((current) => !current)}
                type="button"
              >
                <MoreOutlined className="inline-block" />
              </button>

              {isMenuOpen ? (
                <div className="absolute right-[6px] top-[34px] min-w-[196px] overflow-hidden rounded-[2px] bg-white shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
                  {isVisualization ? (
                    <>
                      <button
                        className="block w-full whitespace-nowrap border-b border-[#f0f0f0] px-4 py-3 text-left text-[14px] text-[#555555] transition hover:bg-[#eaf7ff]"
                        onClick={() => {
                          setIsMenuOpen(false);
                          downloadWidgetResults(widget, 'csv');
                        }}
                        type="button"
                      >
                        Download as CSV File
                      </button>
                      <button
                        className="block w-full whitespace-nowrap border-b border-[#f0f0f0] px-4 py-3 text-left text-[14px] text-[#555555] transition hover:bg-[#eaf7ff]"
                        onClick={() => {
                          setIsMenuOpen(false);
                          downloadWidgetResults(widget, 'tsv');
                        }}
                        type="button"
                      >
                        Download as TSV File
                      </button>
                      <button
                        className="block w-full whitespace-nowrap border-b border-[#f0f0f0] px-4 py-3 text-left text-[14px] text-[#555555] transition hover:bg-[#eaf7ff]"
                        onClick={() => {
                          setIsMenuOpen(false);
                          downloadWidgetResults(widget, 'xlsx');
                        }}
                        type="button"
                      >
                        Download as Excel File
                      </button>
                      <button
                        className="block w-full whitespace-nowrap border-b border-[#f0f0f0] px-4 py-3 text-left text-[14px] text-[#555555] transition hover:bg-[#eaf7ff]"
                        onClick={() => {
                          setIsMenuOpen(false);
                          if (widget.visualization) {
                            router.push(
                              `/queries/${widget.visualization.query_id}/source`,
                            );
                          }
                        }}
                        type="button"
                      >
                        View Query
                      </button>
                      <button
                        className="block w-full whitespace-nowrap px-4 py-3 text-left text-[14px] text-[#555555] transition hover:bg-[#fafafa]"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onDelete();
                        }}
                        type="button"
                      >
                        Remove from Dashboard
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="block w-full whitespace-nowrap border-b border-[#f0f0f0] px-4 py-3 text-left text-[14px] text-[#555555] transition hover:bg-[#fafafa]"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onEditTextbox?.();
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="block w-full whitespace-nowrap px-4 py-3 text-left text-[14px] text-[#555555] transition hover:bg-[#fafafa]"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onDelete();
                        }}
                        type="button"
                      >
                        Remove from Dashboard
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
          <button
            className="px-[8px] py-[6px] text-[20px] leading-none text-[#888888] transition hover:text-[#2196f3]"
            onClick={() => {
              setIsMenuOpen(false);
              onDelete();
            }}
            type="button"
          >
            <CloseOutlined />
          </button>
        </div>
      ) : null}

      {isVisualization ? (
        <div className="flex min-h-0 w-full flex-col">
          {shouldRenderContent ? (
            <VisualizationWidgetContent
              contentRef={tableContentRef}
              headerRef={headerRef}
              widget={widget}
            />
          ) : (
            <DeferredVisualizationWidgetContent
              headerRef={headerRef}
              widget={widget}
            />
          )}
          <div
            className="flex items-center justify-between border-t border-[#eef1f4] px-[16px] py-[10px]"
            ref={footerRef}
          >
            <div className="flex items-center gap-2 text-[12px] text-[#7f8c8d]">
              <button
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#7f8c8d] transition hover:bg-[#f5f7fa] hover:text-[#4d4d4d] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isRefreshing}
                onClick={() => {
                  void handleRefreshClick();
                }}
                type="button"
              >
                {isRefreshing ? <LoadingOutlined /> : <ReloadOutlined />}
              </button>
              <span>{lastUpdatedLabel}</span>
            </div>
            <div
              className={`flex items-center gap-1 transition-opacity duration-200 ${
                isMenuOpen
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
              }`}
            >
              <button
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#7f8c8d] transition hover:bg-[#f5f7fa] hover:text-[#4d4d4d] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isRefreshing}
                onClick={() => {
                  void handleRefreshClick();
                }}
                type="button"
              >
                {isRefreshing ? <LoadingOutlined /> : <ReloadOutlined />}
              </button>
              <button
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#7f8c8d] transition hover:bg-[#f5f7fa] hover:text-[#4d4d4d]"
                onClick={() => {
                  void handleFullscreenClick();
                }}
                type="button"
              >
                <FullscreenOutlined />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full flex-col">
          <TextboxWidgetContent text={widget.text} />
          <div className="flex items-center justify-between border-t border-[#eef1f4] px-[16px] py-[10px]">
            <div className="flex items-center gap-2 text-[12px] text-[#7f8c8d]">
              <button
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#7f8c8d] transition hover:bg-[#f5f7fa] hover:text-[#4d4d4d] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isRefreshing}
                onClick={() => {
                  void handleRefreshClick();
                }}
                type="button"
              >
                {isRefreshing ? <LoadingOutlined /> : <ReloadOutlined />}
              </button>
              <span>{lastUpdatedLabel}</span>
            </div>
            <div
              className={`flex items-center gap-1 transition-opacity duration-200 ${
                isMenuOpen
                  ? 'opacity-100'
                  : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
              }`}
            >
              <button
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#7f8c8d] transition hover:bg-[#f5f7fa] hover:text-[#4d4d4d] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isRefreshing}
                onClick={() => {
                  void handleRefreshClick();
                }}
                type="button"
              >
                {isRefreshing ? <LoadingOutlined /> : <ReloadOutlined />}
              </button>
              <button
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#7f8c8d] transition hover:bg-[#f5f7fa] hover:text-[#4d4d4d]"
                onClick={() => {
                  void handleFullscreenClick();
                }}
                type="button"
              >
                <FullscreenOutlined />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, areDashboardWidgetCardPropsEqual);

function areDashboardWidgetCardPropsEqual(
  prevProps: Readonly<DashboardWidgetCardProps>,
  nextProps: Readonly<DashboardWidgetCardProps>,
) {
  return (
    prevProps.widget === nextProps.widget &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.isMenuPriority === nextProps.isMenuPriority &&
    prevProps.renderPriority === nextProps.renderPriority
  );
}

function useDeferredWidgetContent(
  cardRef: RefObject<HTMLDivElement | null>,
  shouldRenderImmediately: boolean | undefined,
) {
  const [shouldRenderContent, setShouldRenderContent] = useState(
    Boolean(shouldRenderImmediately),
  );

  useEffect(() => {
    if (shouldRenderImmediately) {
      startTransition(() => {
        setShouldRenderContent(true);
      });
      return;
    }

    if (shouldRenderContent) {
      return;
    }

    const cardNode = cardRef.current;

    if (!cardNode || typeof IntersectionObserver === 'undefined') {
      startTransition(() => {
        setShouldRenderContent(true);
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        startTransition(() => {
          setShouldRenderContent(true);
        });
        observer.disconnect();
      },
      {
        rootMargin: WIDGET_RENDER_ROOT_MARGIN,
        threshold: 0.01,
      },
    );

    observer.observe(cardNode);

    return () => {
      observer.disconnect();
    };
  }, [cardRef, shouldRenderContent, shouldRenderImmediately]);

  return shouldRenderContent;
}

const VisualizationWidgetHeader = memo(function VisualizationWidgetHeader({
  widget,
  headerRef,
}: {
  widget: DashboardWidgetItem;
  headerRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="px-[16px] pt-[14px]" ref={headerRef}>
      <div className="text-[15px] font-medium text-[#444444]">
        {widget.visualization?.query_name || widget.visualization?.name || 'Visualization'}
      </div>
      {widget.visualization?.description ? (
        <div className="mt-[8px] text-[14px] italic text-[#666666]">
          {widget.visualization.description}
        </div>
      ) : null}
    </div>
  );
});

const VisualizationWidgetContent = memo(function VisualizationWidgetContent({
  widget,
  headerRef,
  contentRef,
}: {
  widget: DashboardWidgetItem;
  headerRef: RefObject<HTMLDivElement | null>;
  contentRef?: RefObject<HTMLDivElement | null>;
}) {
  const queryResult = widget.query_result;
  const chartContent = useMemo(() => {
    if (!queryResult || widget.visualization?.type !== 'CHART') {
      return null;
    }

    return renderChartVisualization(
      queryResult.data,
      normalizeChartOptions(queryResult.data, widget.visualization?.options),
    );
  }, [queryResult, widget.visualization?.options, widget.visualization?.type]);

  return (
    <>
      <VisualizationWidgetHeader headerRef={headerRef} widget={widget} />
      <div className="min-h-0 flex-1 px-[16px] pb-[16px] pt-[12px]">
        {queryResult ? (
          widget.visualization?.type === 'CHART' ? (
            <div className="h-full min-h-[180px]">{chartContent}</div>
          ) : (
            <WidgetTable
              contentRef={contentRef}
              key={`${widget.id}-${queryResult.id}`}
              widget={widget}
            />
          )
        ) : (
          <div className="flex h-full min-h-[180px] items-center justify-center text-[13px] text-[#8c8c8c]">
            No results yet.
          </div>
        )}
      </div>
    </>
  );
}, (prevProps, nextProps) => prevProps.widget === nextProps.widget);

const DeferredVisualizationWidgetContent = memo(function DeferredVisualizationWidgetContent({
  widget,
  headerRef,
}: {
  widget: DashboardWidgetItem;
  headerRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <VisualizationWidgetHeader headerRef={headerRef} widget={widget} />
      <div className="min-h-0 flex-1 px-[16px] pb-[16px] pt-[12px]">
        <div className="flex h-full min-h-[180px] flex-col justify-center gap-3 rounded-[2px] border border-dashed border-[#dfe6eb] bg-[#fafbfd] px-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-[#e7edf2]" />
          <div className="h-4 w-full animate-pulse rounded bg-[#eef3f7]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-[#eef3f7]" />
          <div className="h-[96px] animate-pulse rounded bg-[#eef3f7]" />
        </div>
      </div>
    </>
  );
}, (prevProps, nextProps) => prevProps.widget === nextProps.widget);

const TextboxWidgetContent = memo(function TextboxWidgetContent({
  text,
}: {
  text: string | null;
}) {
  const html = useMemo(() => markdown.toHTML(text ?? ''), [text]);

  return (
    <div className="markdown-body min-h-0 flex-1 overflow-auto px-[16px] py-[14px] text-left text-[14px] leading-7 text-[#444444]">
      <span dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
});

const WidgetTable = memo(function WidgetTable({
  widget,
  contentRef,
}: {
  widget: DashboardWidgetItem;
  contentRef?: RefObject<HTMLDivElement | null>;
}) {
  const queryResult = widget.query_result;
  const [page, setPage] = useState(1);
  const rows = useMemo(() => queryResult?.data.rows ?? [], [queryResult]);
  const tableOptions = useMemo(
    () => normalizeTableOptions(queryResult?.data ?? null, widget.visualization?.options),
    [queryResult?.data, widget.visualization?.options],
  );
  const columns = useMemo(
    () =>
      queryResult ? getVisibleVisualizationColumns(queryResult.data, tableOptions) : [],
    [queryResult, tableOptions],
  );
  const totalPages = Math.max(1, Math.ceil(rows.length / WIDGET_TABLE_PAGE_SIZE));
  const visibleRows = useMemo(() => {
    const startIndex = (page - 1) * WIDGET_TABLE_PAGE_SIZE;
    return rows.slice(startIndex, startIndex + WIDGET_TABLE_PAGE_SIZE);
  }, [page, rows]);
  const paginationItems = useMemo(
    () => buildWidgetPaginationItems(page, totalPages),
    [page, totalPages],
  );

  if (!queryResult) {
    return null;
  }

  return (
    <div className="h-full overflow-auto">
      <div ref={contentRef}>
        <table className="min-w-full border-collapse text-[13px] text-[#595959]">
          <thead>
            <tr className="border-b border-[#e8e8e8]">
              {columns.map((column) => (
                <th
                  className="whitespace-nowrap px-3 py-2 text-left font-medium text-[#333333]"
                  key={column.name}
                >
                  {column.title || column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr
                className="border-b border-[#f0f0f0]"
                key={`widget-${widget.id}-row-${(page - 1) * WIDGET_TABLE_PAGE_SIZE + rowIndex}`}
              >
                {columns.map((column) => (
                  <td
                    className="whitespace-nowrap px-3 py-2 align-top"
                    key={`${widget.id}-${page}-${rowIndex}-${column.name}`}
                  >
                    {renderVisualizationCellContent(row[column.name], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-1 px-3 py-4 text-[13px] text-[#7f8c8d]">
            <button
              className="px-2 py-1 transition hover:text-[#323232] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              &lt;
            </button>
            {paginationItems.map((item, index) =>
              item === 'ellipsis' ? (
                <span className="px-2 py-1" key={`ellipsis-${index}`}>
                  …
                </span>
              ) : (
                <button
                  className={`min-w-[28px] rounded-[2px] px-2 py-1 transition ${
                    item === page
                      ? 'bg-[#2196f3] text-white'
                      : 'text-[#7f8c8d] hover:text-[#323232]'
                  }`}
                  key={item}
                  onClick={() => setPage(item)}
                  type="button"
                >
                  {item}
                </button>
              ),
            )}
            <button
              className="px-2 py-1 transition hover:text-[#323232] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page === totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              type="button"
            >
              &gt;
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}, (prevProps, nextProps) => prevProps.widget === nextProps.widget);

function buildLayouts(widgets: DashboardWidgetItem[]): ResponsiveLayouts {
  return {
    lg: widgets.map((widget) => {
      const position = widget.options.position;

      return {
        h: Math.max(1, position.sizeY),
        i: String(widget.id),
        maxH: Math.max(1, position.maxSizeY),
        maxW: Math.min(GRID_COLUMNS, Math.max(1, position.maxSizeX)),
        minH: Math.max(1, position.minSizeY),
        minW: Math.max(1, position.minSizeX),
        w: Math.min(GRID_COLUMNS, Math.max(1, position.sizeX)),
        x: Math.min(Math.max(0, position.col), GRID_COLUMNS - 1),
        y: Math.max(0, position.row),
      } satisfies LayoutItem;
    }),
    sm: widgets.map((widget) => ({
      h: Math.max(1, widget.options.position.sizeY),
      i: String(widget.id),
      maxH: Math.max(1, widget.options.position.maxSizeY),
      maxW: 1,
      minH: Math.max(1, widget.options.position.minSizeY),
      minW: 1,
      w: 1,
      x: 0,
      y: Math.max(0, widget.options.position.row),
    })),
  };
}

function layoutToPosition(
  layout: LayoutItem,
  previousPosition?: DashboardWidgetPosition,
): DashboardWidgetPosition {
  return {
    autoHeight: previousPosition?.autoHeight ?? false,
    col: Math.max(0, layout.x),
    maxSizeX: Math.max(Math.max(1, layout.w), layout.maxW ?? GRID_COLUMNS),
    maxSizeY: Math.max(Math.max(1, layout.h), layout.maxH ?? 1000),
    minSizeX: Math.max(1, layout.minW ?? 1),
    minSizeY: Math.max(1, layout.minH ?? 1),
    row: Math.max(0, layout.y),
    sizeX: Math.max(1, layout.w),
    sizeY: Math.max(1, layout.h),
  };
}

function mapSavedPositions(widgets: DashboardWidgetItem[]) {
  return Object.fromEntries(
    widgets.map((widget) => [widget.id, widget.options.position]),
  ) as Record<number, DashboardWidgetPosition>;
}

function getDefaultVisualizationWidgetPosition(
  widgets: DashboardWidgetItem[],
  visualization: QueryVisualization,
): DashboardWidgetPosition {
  const isChart = visualization.type === 'CHART';
  const sizeX = 3;
  const sizeY = isChart ? 8 : 3;
  const placement = findNextWidgetPlacement(widgets, sizeX);

  return {
    autoHeight: !isChart,
    col: placement.col,
    maxSizeX: 6,
    maxSizeY: 1000,
    minSizeX: 1,
    minSizeY: 1,
    row: placement.row,
    sizeX,
    sizeY,
  };
}

function getDefaultTextboxWidgetPosition(
  widgets: DashboardWidgetItem[],
): DashboardWidgetPosition {
  const sizeX = 3;
  const sizeY = 3;
  const placement = findNextWidgetPlacement(widgets, sizeX);

  return {
    autoHeight: false,
    col: placement.col,
    maxSizeX: 3,
    maxSizeY: 1000,
    minSizeX: 3,
    minSizeY: 1,
    row: placement.row,
    sizeX,
    sizeY,
  };
}

function buildWidgetPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', totalPages] as const;
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ] as const;
  }

  return [
    1,
    'ellipsis',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis',
    totalPages,
  ] as const;
}

function findNextWidgetPlacement(
  widgets: DashboardWidgetItem[],
  sizeX: number,
) {
  const width = Math.min(GRID_COLUMNS, Math.max(1, Math.trunc(sizeX)));
  const bottomLine = new Array<number>(GRID_COLUMNS).fill(0);

  widgets.forEach((widget) => {
    const position = widget.options.position;
    const from = Math.max(0, position.col);
    const to = Math.min(position.col + position.sizeX, GRID_COLUMNS);
    const bottom = Math.max(0, position.row) + Math.max(1, position.sizeY);

    for (let index = from; index < to; index += 1) {
      bottomLine[index] = Math.max(bottomLine[index], bottom);
    }
  });

  let bestCol = 0;
  let bestRow = Number.MAX_SAFE_INTEGER;

  for (let col = 0; col <= GRID_COLUMNS - width; col += 1) {
    const row = Math.max(...bottomLine.slice(col, col + width));

    if (row < bestRow) {
      bestCol = col;
      bestRow = row;
    }
  }

  return {
    col: bestCol,
    row: bestRow === Number.MAX_SAFE_INTEGER ? 0 : bestRow,
  };
}

function getAutoHeightGridRows(contentHeight: number) {
  return Math.max(
    3,
    Math.ceil((contentHeight + GRID_MARGIN) / (GRID_ROW_HEIGHT + GRID_MARGIN)),
  );
}

function getDashboardRefreshSchedule(options: DashboardOptions | null | undefined) {
  const refreshOption = options?.refresh;

  if (
    !refreshOption ||
    typeof refreshOption !== 'object' ||
    Array.isArray(refreshOption)
  ) {
    return null;
  }

  const interval =
    typeof refreshOption.interval === 'number'
      ? refreshOption.interval
      : typeof refreshOption.interval === 'string'
        ? Number(refreshOption.interval)
        : null;

  if (!interval || Number.isNaN(interval) || interval <= 0) {
    return null;
  }

  return {
    ...(refreshOption as DashboardRefreshSchedule),
    interval,
  };
}

function formatDashboardRefreshInterval(interval: number) {
  const labels: Record<number, string> = {
    60: '1 minute',
    300: '5 minutes',
    600: '10 minutes',
    1800: '30 minutes',
    3600: '1 hour',
    43200: '12 hours',
    86400: '1 day',
  };

  return labels[interval] ?? `${interval} sec`;
}

function downloadWidgetResults(
  widget: DashboardWidgetItem,
  fileType: 'csv' | 'tsv' | 'xlsx',
) {
  if (!widget.query_result) {
    return;
  }

  const columns = widget.query_result.data.columns;
  const rows = widget.query_result.data.rows;

  if (columns.length === 0) {
    return;
  }

  const fileBaseName =
    (widget.visualization?.query_name || widget.visualization?.name || 'query-results')
      .trim()
      .replaceAll(/[^a-zA-Z0-9-_]+/g, '-')
      .replaceAll(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'query-results';

  if (fileType === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(
      rows.map((row) =>
        Object.fromEntries(
          columns.map((column) => [
            column.friendly_name || column.name,
            row[column.name],
          ]),
        ),
      ),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, `${fileBaseName}.xlsx`);
    return;
  }

  const separator = fileType === 'csv' ? ',' : '\t';
  const header = columns.map((column) => escapeSeparatedValue(column.friendly_name || column.name, separator)).join(separator);
  const lines = rows.map((row) =>
    columns
      .map((column) => escapeSeparatedValue(row[column.name], separator))
      .join(separator),
  );

  downloadBlob(
    new Blob([[header, ...lines].join('\n')], {
      type:
        fileType === 'csv'
          ? 'text/csv;charset=utf-8'
          : 'text/tab-separated-values;charset=utf-8',
    }),
    `${fileBaseName}.${fileType}`,
  );
}

function escapeSeparatedValue(value: unknown, separator: string) {
  const normalized = value === null || value === undefined ? '' : String(value);
  const escaped = normalized.replaceAll('"', '""');

  if (
    escaped.includes('\n') ||
    escaped.includes('\r') ||
    escaped.includes('"') ||
    escaped.includes(separator)
  ) {
    return `"${escaped}"`;
  }

  return escaped;
}

function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(href);
  }, 0);
}

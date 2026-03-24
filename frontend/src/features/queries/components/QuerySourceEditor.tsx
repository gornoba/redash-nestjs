"use client";

import {
  CalendarOutlined,
  CloseOutlined,
  CodeOutlined,
  CopyOutlined,
  DownOutlined,
  EllipsisOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  HolderOutlined,
  LoadingOutlined,
  ReloadOutlined,
  RightOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { OnMount } from "@monaco-editor/react";
import { format as formatDate } from "date-fns";
import { useRouter } from "next/navigation";
import {
  memo,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  DayPicker,
  type DateRange as CalendarDateRange,
} from "react-day-picker";
import { format as formatSql } from "sql-formatter";
import * as XLSX from "xlsx";
import {
  addWidgetToDashboard,
  searchDashboards,
} from "@/features/dashboards/api/dashboardsClientApi";
import {
  getDataSourceSchema,
  getDataSources,
} from "@/features/data-sources/api/dataSourcesClientApi";
import type { SessionResponse } from "@/features/home/types";
import { getQuerySnippets } from "@/features/query-snippets/api/querySnippetsClientApi";
import type { SettingsQuerySnippetItem } from "@/features/settings/types";
import type {
  DataSourceSchemaResponse,
  DataSourceSummary,
} from "@/features/data-sources/types";
import {
  archiveQuery as archiveQueryRequest,
  createQuery,
  executeQuery as executeQueryRequest,
  favoriteQuery as favoriteQueryRequest,
  forkQuery as forkQueryRequest,
  getExecuteQueryJobStatus,
  getQueryExecutionResult,
  getQueryDetail,
  regenerateQueryApiKey as regenerateQueryApiKeyRequest,
  unfavoriteQuery as unfavoriteQueryRequest,
  updateQuery,
  updateQuerySchedule,
} from "../api/queriesClientApi";
import type {
  DashboardSearchItem,
  QueryDetail,
  QueryExecutionResult,
  QueryVisualization,
  SaveVisualizationPayload,
} from "../types";
import {
  createVisualization,
  updateVisualization,
} from "@/features/visualizations/api/visualizationsClientApi";
import { getApiErrorMessage } from "@/lib/api-error";
import { useToast, useToastMessage } from "@/lib/toast";
import {
  ExecutingDurationLabel,
  OverlayDialog,
  ParameterEditorDialog,
  QueryTagChip,
} from "./QuerySourceEditorCommon";
import QueryEditorShell from "./QueryEditorShell";
import QueryParametersPanel from "./QueryParametersPanel";
import QueryResultPane from "./QueryResultPane";
import QueryRefreshScheduleDialog from "./QueryRefreshScheduleDialog";
import QuerySchemaSidebar from "./QuerySchemaSidebar";
import QuerySchemaDiagramDialog from "./QuerySchemaDiagramDialog";
import {
  getScheduledExecutionTime,
  normalizeRefreshSchedule,
  type RefreshSchedule,
} from "../utils/querySchedule";
import type {
  ActiveVisualizationTab,
  ChartVisualizationOptions,
  ChartVisualizationType,
  EditableQueryState,
  PendingQueryParameterRangeSelection,
  QueryParameterEditorDraft,
  QueryParameterRangeValue,
  QueryParameterState,
  QueryParameterValue,
  ResultSortDirection,
  TableColumnDisplay,
  TableVisualizationColumnOption,
  VisualizationEditorDraft,
} from "./querySourceEditorTypes";
import {
  DATE_PRESETS,
  DATE_RANGE_PRESETS,
  NEW_QUERY_STATE,
  SHARED_DAY_PICKER_CLASS_NAMES,
} from "./querySourceEditorTypes";
import {
  applyQueryParametersToText,
  applySchemaFilter,
  buildDatePresetValue,
  buildDefaultChartOptions,
  buildPaginationItems,
  buildParameterToken,
  buildSavePayload,
  clamp,
  compareResultValues,
  filterSchemaResponseForTable,
  getChartSelectableColumns,
  getCurrentParameterValue,
  getEnumOptions,
  getPaginationJumpPage,
  getReferencedParameterNames,
  getStoredParameters,
  getVisualizationKind,
  getVisibleVisualizationColumns,
  isDateParameterType,
  isDateRangeParameterType,
  isDropdownParameterType,
  isRangeValue,
  mapQueryDetail,
  normalizeChartOptions,
  normalizeParameterValue,
  normalizeTableOptions,
  parameterHasPendingValue,
  parseFilterExpression,
  parseStoredDateValue,
  formatVisualizationCellValue,
  renderChartVisualization,
  renderVisualizationCellContent,
  serializeChartOptions,
  serializeQueryParameters,
  serializeTableOptions,
  splitQueryVisualizations,
  toSeparatedValues,
} from "./querySourceEditorUtils";

interface QuerySourceEditorProps {
  initialSearchParams?: Record<string, string | string[] | undefined>;
  mode?: "source" | "view";
  queryId: string;
  session: SessionResponse;
}

type FormatterLanguage =
  | "mysql"
  | "plsql"
  | "postgresql"
  | "sql"
  | "sqlite"
  | "transactsql";

interface CompletionModelLike {
  getLineContent(lineNumber: number): string;
  getWordUntilPosition(position: CompletionPositionLike): {
    endColumn: number;
    startColumn: number;
  };
}

interface CompletionPositionLike {
  column: number;
  lineNumber: number;
}

const SQL_AUTOCOMPLETE_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "GROUP BY",
  "ORDER BY",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "DISTINCT",
  "AS",
  "AND",
  "OR",
  "NOT",
  "IN",
  "IS",
  "NULL",
  "LIKE",
  "BETWEEN",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "INNER JOIN",
  "OUTER JOIN",
  "ON",
  "UNION",
  "ALL",
  "INSERT",
  "UPDATE",
  "DELETE",
  "WITH",
  "VALUES",
  "CREATE",
  "ALTER",
  "DROP",
];

function formatCompletionMetaLabel(value: string) {
  if (!value) {
    return "Column";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function dedupeCompletionSuggestions<
  T extends {
    insertText: string;
    kind: number;
    label: string;
  },
>(suggestions: T[]) {
  const uniqueSuggestions = new Map<string, T>();

  suggestions.forEach((suggestion) => {
    const dedupeKey = [
      suggestion.kind,
      suggestion.label.toLowerCase(),
      suggestion.insertText.toLowerCase(),
    ].join(":");

    if (!uniqueSuggestions.has(dedupeKey)) {
      uniqueSuggestions.set(dedupeKey, suggestion);
    }
  });

  return [...uniqueSuggestions.values()];
}

const AUTOCOMPLETE_INDEX_PREFIX_LENGTH = 2;
const MIN_AUTOCOMPLETE_TOKEN_LENGTH = 2;
const MIN_BROAD_SCHEMA_TOKEN_LENGTH = 3;
const MAX_TABLE_SUGGESTIONS = 30;
const MAX_KEYWORD_SUGGESTIONS = 20;
const MAX_COLUMN_SUGGESTIONS = 60;
const MAX_BROAD_COLUMN_SUGGESTIONS = 30;
const MAX_SNIPPET_SUGGESTIONS = 20;
const MAX_GENERAL_SUGGESTIONS = 80;

type IndexedCompletionEntry = {
  normalizedSearchText: string;
  suggestion: {
    detail: string;
    documentation?: string | { value: string };
    insertText: string;
    insertTextRules?: number;
    kindKey: "class" | "field" | "keyword" | "snippet";
    label: string;
    sortText: string;
  };
};

function addCompletionEntryToIndex(
  index: Map<string, IndexedCompletionEntry[]>,
  entry: IndexedCompletionEntry,
) {
  const bucketKey = entry.normalizedSearchText.slice(
    0,
    Math.min(AUTOCOMPLETE_INDEX_PREFIX_LENGTH, entry.normalizedSearchText.length),
  );

  const bucket = index.get(bucketKey);

  if (bucket) {
    bucket.push(entry);
    return;
  }

  index.set(bucketKey, [entry]);
}

function getIndexedCompletionEntries(
  index: Map<string, IndexedCompletionEntry[]>,
  normalizedToken: string,
) {
  const bucketKey = normalizedToken.slice(
    0,
    Math.min(AUTOCOMPLETE_INDEX_PREFIX_LENGTH, normalizedToken.length),
  );

  return index.get(bucketKey) ?? [];
}

const EDITOR_DERIVED_STATE_SYNC_DELAY_MS = 180;

function getSingleSearchParamValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === "string" ? value : null;
}

function parseIsoTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsedValue = Date.parse(value);
  return Number.isNaN(parsedValue) ? null : parsedValue;
}

function isTimestampNewerOrEqual(
  nextValue: string | null | undefined,
  currentValue: string | null | undefined,
) {
  const nextTimestamp = parseIsoTimestamp(nextValue);

  if (nextTimestamp === null) {
    return false;
  }

  const currentTimestamp = parseIsoTimestamp(currentValue);
  return currentTimestamp === null || nextTimestamp >= currentTimestamp;
}

function normalizeQueryDraftSchedule(
  schedule: Record<string, unknown> | null | undefined,
) {
  const normalizedSchedule = normalizeRefreshSchedule(schedule);

  if (!normalizedSchedule) {
    return null;
  }

  return {
    day_of_week: normalizedSchedule.day_of_week ?? null,
    disabled: Boolean(normalizedSchedule.disabled),
    interval: normalizedSchedule.interval,
    time: normalizedSchedule.time ?? null,
    until: normalizedSchedule.until ?? null,
  };
}

function buildUnsavedQuerySnapshot(
  query: EditableQueryState,
  parameters: QueryParameterState[],
) {
  const payload = buildSavePayload(
    {
      ...query,
      schedule: normalizeQueryDraftSchedule(query.schedule),
    },
    parameters,
  );

  return JSON.stringify({
    data_source_id: payload.data_source_id,
    description: payload.description ?? null,
    is_draft: payload.is_draft,
    name: payload.name,
    options: payload.options,
    query: payload.query,
    schedule: payload.schedule,
    tags: [...payload.tags].sort((left, right) => left.localeCompare(right)),
  });
}

function resolveStableExecutionResult(
  nextQuery: Pick<QueryDetail, "latest_query_data">,
  currentResult: QueryExecutionResult | null,
) {
  const nextResult = nextQuery.latest_query_data ?? null;

  if (!nextResult) {
    return currentResult;
  }

  if (
    currentResult &&
    currentResult.id === nextResult.id &&
    currentResult.retrieved_at === nextResult.retrieved_at
  ) {
    return currentResult;
  }

  return nextResult;
}

function mergeQueryDetailWithStableResult(
  nextQuery: QueryDetail,
  currentResult: QueryExecutionResult | null,
) {
  const stableResult = resolveStableExecutionResult(nextQuery, currentResult);

  if (stableResult === nextQuery.latest_query_data) {
    return nextQuery;
  }

  return {
    ...nextQuery,
    latest_query_data: stableResult,
  };
}

function getParametersFromSearchParams(
  parameters: QueryParameterState[],
  searchParams: Record<string, string | string[] | undefined> | undefined,
) {
  if (!searchParams) {
    return parameters;
  }

  return parameters.map((parameter) => {
    const parameterKey = `p_${parameter.name}`;
    const directValue = searchParams[parameterKey];

    if (isDateRangeParameterType(parameter.type)) {
      const directRangeValue = getSingleSearchParamValue(directValue);
      const startValue =
        getSingleSearchParamValue(searchParams[`${parameterKey}.start`]) ??
        (directRangeValue?.includes("--")
          ? (directRangeValue.split("--")[0] ?? "")
          : "");
      const endValue =
        getSingleSearchParamValue(searchParams[`${parameterKey}.end`]) ??
        (directRangeValue?.includes("--")
          ? directRangeValue.split("--").slice(1).join("--")
          : "");

      if (!startValue && !endValue) {
        return parameter;
      }

      return {
        ...parameter,
        pendingValue: undefined,
        value: normalizeParameterValue(parameter, {
          end: endValue,
          start: startValue,
        }),
      };
    }

    if (directValue === undefined) {
      return parameter;
    }

    return {
      ...parameter,
      pendingValue: undefined,
      value: normalizeParameterValue(parameter, directValue),
    };
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

const QueryTitleEditor = memo(function QueryTitleEditor({
  canEdit,
  value,
  onCommit,
}: {
  canEdit: boolean;
  onCommit: (nextName: string) => void;
  value: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value || "New Query");

  function startEditing() {
    if (!canEdit) {
      return;
    }

    setDraft(value || "New Query");
    setIsEditing(true);
  }

  function commit(nextName: string) {
    const trimmedName = nextName.trim();

    if (trimmedName && trimmedName !== value) {
      onCommit(trimmedName);
    }

    setDraft(trimmedName || value || "New Query");
    setIsEditing(false);
  }

  function cancel() {
    setDraft(value || "New Query");
    setIsEditing(false);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      commit(draft);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  }

  if (isEditing) {
    return (
      <input
        autoFocus
        className="h-[40px] min-w-[160px] rounded-[2px] border border-[#40a9ff] bg-white px-3 text-[18px] font-normal text-[#323232] outline-none shadow-[0_0_0_2px_rgba(24,144,255,0.18)]"
        onBlur={(event) => commit(event.target.value)}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        value={draft}
      />
    );
  }

  return (
    <button
      className={`rounded-[2px] px-[2px] py-0 text-left text-[20px] font-normal leading-[1.4] text-[#323232] outline-none transition ${
        canEdit
          ? "group-hover/query-title:bg-[#f7f4bd] group-focus-within/query-title:bg-[#f7f4bd]"
          : ""
      }`}
      onClick={startEditing}
      type="button"
    >
      {value || "New Query"}
    </button>
  );
});

const VisualizationNameField = memo(function VisualizationNameField({
  value,
  onCommit,
  onDraftChange,
}: {
  onCommit: (nextValue: string) => void;
  onDraftChange: (nextValue: string) => void;
  value: string;
}) {
  const [draftValue, setDraftValue] = useState(value);

  function handleChange(nextValue: string) {
    setDraftValue(nextValue);
    onDraftChange(nextValue);
  }

  return (
    <input
      className="h-[38px] w-full rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
      onBlur={(event) => onCommit(event.target.value)}
      onChange={(event) => handleChange(event.target.value)}
      onCompositionEnd={(event) => handleChange(event.currentTarget.value)}
      value={draftValue}
    />
  );
});

export default function QuerySourceEditor({
  initialSearchParams,
  mode = "source",
  queryId,
  session,
}: QuerySourceEditorProps) {
  const router = useRouter();
  const isViewMode = mode === "view";
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const completionProviderRef = useRef<{ dispose: () => void } | null>(null);
  const queryTextRef = useRef(NEW_QUERY_STATE.query);
  const sourceEditorHasTextStateRef = useRef<((nextValue: boolean) => void) | null>(
    null,
  );
  const queryParametersRef = useRef<QueryParameterState[]>([]);
  const editableQueryRef = useRef<EditableQueryState>(NEW_QUERY_STATE);
  const descriptionDraftRef = useRef("");
  const isDescriptionEditingRef = useRef(false);
  const queryDetailDataRef = useRef<QueryDetail | null>(null);
  const executionResultRef = useRef<QueryExecutionResult | null>(null);
  const savedQuerySnapshotRef = useRef(
    buildUnsavedQuerySnapshot(NEW_QUERY_STATE, []),
  );
  const hasUnsavedChangesRef = useRef(false);
  const editorDerivedStateSyncTimeoutRef = useRef<number | null>(null);
  const skipNextPopStateRef = useRef(false);
  const executeQueryRef = useRef<
    ((appliedParameters?: QueryParameterState[]) => Promise<void>) | null
  >(null);
  const saveQueryRef = useRef<(() => Promise<void>) | null>(null);
  const openEditParameterDialogRef = useRef<
    ((parameter: QueryParameterState) => void) | null
  >(null);
  const applyParameterChangesRef = useRef<(() => Promise<void>) | null>(null);
  const persistQueryStateRef = useRef<
    | ((
        nextEditableQuery: EditableQueryState,
        options?: {
          successMessage?: string;
        },
      ) => Promise<unknown>)
    | null
  >(null);
  const isExecutingRef = useRef(false);
  const executionStartedAtRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const hasQueryTextRef = useRef(false);
  const visualizationNameInputRef = useRef("");
  const dataSourceDropdownRef = useRef<HTMLDivElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const headerActionMenuRef = useRef<HTMLDivElement | null>(null);
  const resizeModeRef = useRef<"schema" | null>(null);
  const [dataSources, setDataSources] = useState<DataSourceSummary[]>([]);
  const [querySnippets, setQuerySnippets] = useState<SettingsQuerySnippetItem[]>(
    [],
  );
  const [currentQueryId, setCurrentQueryId] = useState(queryId);
  const [editableQuery, setEditableQuery] =
    useState<EditableQueryState>(NEW_QUERY_STATE);
  const [queryDetailData, setQueryDetailData] = useState<QueryDetail | null>(
    null,
  );
  const [queryParameters, setQueryParameters] = useState<QueryParameterState[]>(
    [],
  );
  const [schemaFilter, setSchemaFilter] = useState("");
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>(
    {},
  );
  const [dataSourceSearch, setDataSourceSearch] = useState("");
  const [isDataSourceMenuOpen, setIsDataSourceMenuOpen] = useState(false);
  const [isDiagramOpen, setIsDiagramOpen] = useState(false);
  const [diagramTableName, setDiagramTableName] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSchemaLoading, setIsSchemaLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaveToastVisible, setIsSaveToastVisible] = useState(false);
  const [isSaveToastFading, setIsSaveToastFading] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [parameterEditorDraft, setParameterEditorDraft] =
    useState<QueryParameterEditorDraft | null>(null);
  const [openParameterPresetMenu, setOpenParameterPresetMenu] = useState<
    string | null
  >(null);
  const [openParameterCalendarMenu, setOpenParameterCalendarMenu] = useState<
    string | null
  >(null);
  const [pendingCalendarRanges, setPendingCalendarRanges] = useState<
    Record<string, PendingQueryParameterRangeSelection>
  >({});
  const [executionResult, setExecutionResult] =
    useState<QueryExecutionResult | null>(null);
  const [tableVisualization, setTableVisualization] =
    useState<QueryVisualization | null>(null);
  const [chartVisualizations, setChartVisualizations] = useState<
    QueryVisualization[]
  >([]);
  const [activeVisualizationTab, setActiveVisualizationTab] =
    useState<ActiveVisualizationTab>("table");
  const [resultPage, setResultPage] = useState(1);
  const [resultPageSize, setResultPageSize] = useState(isViewMode ? 50 : 10);
  const [schemaResponse, setSchemaResponse] =
    useState<DataSourceSchemaResponse | null>(null);
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [tagInputValue, setTagInputValue] = useState("");
  const [isFavoriteSaving, setIsFavoriteSaving] = useState(false);
  const [viewModeHasQueryText, setViewModeHasQueryText] = useState(false);
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    const storedValue = window.localStorage.getItem(
      "query-editor-live-autocomplete",
    );
    return storedValue === null ? true : storedValue === "true";
  });
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isHeaderActionMenuOpen, setIsHeaderActionMenuOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [isApiKeyRegenerating, setIsApiKeyRegenerating] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isVisualizationEditorOpen, setIsVisualizationEditorOpen] =
    useState(false);
  const [isVisualizationSaving, setIsVisualizationSaving] = useState(false);
  const [isAddToDashboardOpen, setIsAddToDashboardOpen] = useState(false);
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [dashboardSearchTerm, setDashboardSearchTerm] = useState("");
  const [dashboardSearchResults, setDashboardSearchResults] = useState<
    DashboardSearchItem[]
  >([]);
  const [selectedDashboard, setSelectedDashboard] =
    useState<DashboardSearchItem | null>(null);
  const [isDashboardSearching, setIsDashboardSearching] = useState(false);
  const [isWidgetSaving, setIsWidgetSaving] = useState(false);
  const [visualizationDraft, setVisualizationDraft] =
    useState<VisualizationEditorDraft | null>(null);
  const [expandedVisualizationColumn, setExpandedVisualizationColumn] =
    useState<string | null>(null);
  const [draggedVisualizationColumn, setDraggedVisualizationColumn] = useState<
    string | null
  >(null);
  const [schemaPanelWidth, setSchemaPanelWidth] = useState(430);
  const [isSchemaPanelCollapsed, setIsSchemaPanelCollapsed] = useState(false);
  const [resultPageInput, setResultPageInput] = useState("1");
  const [resultFilter, setResultFilter] = useState("");
  const [isResultFullscreen, setIsResultFullscreen] = useState(false);
  const [resultSort, setResultSort] = useState<{
    column: string | null;
    direction: ResultSortDirection;
  }>({
    column: null,
    direction: "asc",
  });

  useEffect(() => {
    setCurrentQueryId(queryId);
  }, [queryId]);

  useToastMessage(pageError, "error");
  useToastMessage(schemaError, "error");
  useToastMessage(executionError, "error");
  const { showWarning } = useToast();

  const isMacLikePlatform = useMemo(() => {
    if (typeof navigator === "undefined") {
      return false;
    }

    return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  }, []);
  const parameterShortcutLabel = isMacLikePlatform ? "Cmd + P" : "Ctrl + P";
  const fullscreenShortcutLabel = isMacLikePlatform ? "Option + F" : "Alt + F";
  const dirtyParameterCount = useMemo(
    () => queryParameters.filter(parameterHasPendingValue).length,
    [queryParameters],
  );
  const hasDirtyParameters = dirtyParameterCount > 0;

  const selectedDataSource = useMemo(
    () =>
      dataSources.find((item) => item.id === editableQuery.data_source_id) ??
      null,
    [dataSources, editableQuery.data_source_id],
  );
  const completionIndex = useMemo(() => {
    if (!schemaResponse) {
      return null;
    }

    const tableIndex = new Map<string, IndexedCompletionEntry[]>();
    const columnIndex = new Map<string, IndexedCompletionEntry[]>();
    const snippetIndex = new Map<string, IndexedCompletionEntry[]>();
    const tableMap = new Map<
      string,
      {
        columns: IndexedCompletionEntry[];
      }
    >();

    schemaResponse.schema.forEach((table) => {
      const normalizedTableName = table.name.toLowerCase();
      const tableEntry: IndexedCompletionEntry = {
        normalizedSearchText: normalizedTableName,
        suggestion: {
          detail: table.comment ?? "table",
          insertText: table.name,
          kindKey: "class",
          label: table.name,
          sortText: `2-${normalizedTableName}`,
        },
      };

      addCompletionEntryToIndex(tableIndex, tableEntry);

      const columnEntries = table.columns.map((column) => {
        const normalizedColumnName = column.name.toLowerCase();

        const entry: IndexedCompletionEntry = {
          normalizedSearchText: normalizedColumnName,
          suggestion: {
            detail: formatCompletionMetaLabel(column.type ?? "column"),
            documentation:
              column.comment ??
              `${table.name}.${column.name}${column.type ? ` • ${column.type}` : ""}`,
            insertText: column.name,
            kindKey: "field",
            label: column.name,
            sortText: `3-${normalizedColumnName}`,
          },
        };

        addCompletionEntryToIndex(columnIndex, entry);
        return entry;
      });

      tableMap.set(table.name, { columns: columnEntries });
      const simplifiedTableName = table.name.split(".").pop() ?? table.name;

      if (!tableMap.has(simplifiedTableName)) {
        tableMap.set(simplifiedTableName, { columns: columnEntries });
      }
    });

    querySnippets.forEach((snippet) => {
      addCompletionEntryToIndex(snippetIndex, {
        normalizedSearchText: snippet.trigger.toLowerCase(),
        suggestion: {
          detail: snippet.description || "query snippet",
          documentation: {
            value: ["```sql", snippet.snippet, "```"].join("\n"),
          },
          insertText: snippet.snippet,
          insertTextRules: 1,
          kindKey: "snippet",
          label: snippet.trigger,
          sortText: `0-${snippet.trigger.toLowerCase()}`,
        },
      });
    });

    return {
      columnIndex,
      snippetIndex,
      tableIndex,
      tableMap,
    };
  }, [querySnippets, schemaResponse]);
  const canCreateQuery =
    session.user.roles.includes("admin") ||
    session.user.permissions.includes("create_query");
  const queryOwnerId = queryDetailData?.user?.id ?? null;
  const isOwner = queryOwnerId !== null && queryOwnerId === session.user.id;
  const canEditQuery =
    session.user.roles.includes("admin") ||
    (session.user.permissions.includes("edit_query") && isOwner);
  const canForkQuery =
    editableQuery.id !== null &&
    (session.user.roles.includes("admin") ||
      session.user.permissions.includes("create_query"));
  const canScheduleQuery =
    session.user.roles.includes("admin") ||
    (session.user.permissions.includes("schedule_query") && isOwner);
  const canManageQuery =
    editableQuery.id === null ? canCreateQuery : canEditQuery;
  const scheduleEditable =
    canScheduleQuery && editableQuery.id !== null && !editableQuery.is_archived;
  const scheduleTimezone = session.client_config.timezone || "UTC";
  const refreshIntervals = session.client_config.queryRefreshIntervals ?? [];
  const shouldShowSourceMetadataPanel = Boolean(
    queryDetailData ||
      editableQuery.description ||
      isDescriptionEditing ||
      canManageQuery,
  );

  const filteredDataSources = useMemo(() => {
    const keyword = dataSourceSearch.trim().toLowerCase();

    if (!keyword) {
      return dataSources;
    }

    return dataSources.filter((item) =>
      `${item.name} ${item.type}`.toLowerCase().includes(keyword),
    );
  }, [dataSourceSearch, dataSources]);

  const deferredSchemaFilter = useDeferredValue(schemaFilter);
  const filteredSchema = useMemo(
    () => applySchemaFilter(schemaResponse?.schema ?? [], deferredSchemaFilter),
    [deferredSchemaFilter, schemaResponse],
  );
  const autocompleteTokenCount = useMemo(
    () =>
      (schemaResponse?.schema ?? []).reduce(
        (total, table) => total + table.columns.length,
        0,
      ),
    [schemaResponse],
  );
  const autocompleteAvailable = autocompleteTokenCount <= 5000;
  const liveAutocompleteEnabled = autocompleteAvailable && autocompleteEnabled;
  const visibleDiagramSchema = useMemo(
    () => filterSchemaResponseForTable(schemaResponse, diagramTableName),
    [diagramTableName, schemaResponse],
  );
  const resultRows = useMemo(
    () => executionResult?.data.rows ?? [],
    [executionResult],
  );
  const hydratedTableVisualization = useMemo<QueryVisualization | null>(() => {
    if (!executionResult) {
      return tableVisualization;
    }

    const baseVisualization =
      tableVisualization ??
      ({
        id: 0,
        type: "TABLE",
        query_id: editableQuery.id ?? 0,
        name: "Table",
        description: "",
        options: {},
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      } satisfies QueryVisualization);

    return {
      ...baseVisualization,
      query_id: editableQuery.id ?? baseVisualization.query_id,
      options: serializeTableOptions(
        normalizeTableOptions(executionResult.data, baseVisualization.options),
      ),
    };
  }, [editableQuery.id, executionResult, tableVisualization]);
  const tableVisualizationOptions = useMemo(
    () =>
      normalizeTableOptions(
        executionResult?.data ?? null,
        hydratedTableVisualization?.options,
      ),
    [executionResult, hydratedTableVisualization],
  );
  const activeVisualization = useMemo(() => {
    if (activeVisualizationTab === "table") {
      return hydratedTableVisualization;
    }

    return (
      chartVisualizations.find((item) => item.id === activeVisualizationTab) ??
      hydratedTableVisualization
    );
  }, [activeVisualizationTab, chartVisualizations, hydratedTableVisualization]);
  const activeChartOptions = useMemo(
    () =>
      getVisualizationKind(activeVisualization) === "CHART"
        ? normalizeChartOptions(
            executionResult?.data ?? null,
            activeVisualization?.options,
          )
        : null,
    [activeVisualization, executionResult],
  );
  const visibleResultColumns = useMemo(
    () =>
      getVisibleVisualizationColumns(
        executionResult?.data ?? null,
        tableVisualizationOptions,
      ),
    [executionResult, tableVisualizationOptions],
  );

  useEffect(() => {
    visualizationNameInputRef.current = visualizationDraft?.name ?? "";
  }, [visualizationDraft?.name]);

  const filteredResultRows = useMemo(() => {
    const groups = parseFilterExpression(resultFilter);

    if (!groups.length) {
      return resultRows;
    }

    return resultRows.filter((row) =>
      groups.some((group) =>
        group.every((token) => {
          if (token.type === "column") {
            const matchingColumn = visibleResultColumns.find(
              (column) => column.name.toLowerCase() === token.column,
            );

            if (!matchingColumn) {
              return false;
            }

            return String(row[matchingColumn.name] ?? "")
              .toLowerCase()
              .includes(token.value);
          }

          return visibleResultColumns.some((column) =>
            String(row[column.name] ?? "")
              .toLowerCase()
              .includes(token.value),
          );
        }),
      ),
    );
  }, [resultFilter, resultRows, visibleResultColumns]);
  const sortedResultRows = useMemo(() => {
    if (!resultSort.column) {
      return filteredResultRows;
    }

    return [...filteredResultRows].sort((leftRow, rightRow) =>
      compareResultValues(
        leftRow[resultSort.column as string],
        rightRow[resultSort.column as string],
        resultSort.direction,
      ),
    );
  }, [filteredResultRows, resultSort]);
  const totalResultPages = Math.max(
    1,
    Math.ceil(sortedResultRows.length / resultPageSize),
  );
  const paginatedRows = useMemo(() => {
    const start = (resultPage - 1) * resultPageSize;
    return sortedResultRows.slice(start, start + resultPageSize);
  }, [resultPage, resultPageSize, sortedResultRows]);
  const paginationItems = useMemo(
    () => buildPaginationItems(resultPage, totalResultPages),
    [resultPage, totalResultPages],
  );
  const previousJumpPage = useMemo(
    () => getPaginationJumpPage(resultPage, totalResultPages, "previous"),
    [resultPage, totalResultPages],
  );
  const nextJumpPage = useMemo(
    () => getPaginationJumpPage(resultPage, totalResultPages, "next"),
    [resultPage, totalResultPages],
  );

  const buildCurrentUnsavedQuerySnapshot = useCallback(
    (
      queryText = queryTextRef.current,
      parameters = queryParametersRef.current,
      stateOverride?: {
        descriptionDraft: string;
        editableQuery: EditableQueryState;
        isDescriptionEditing: boolean;
      },
    ) =>
      buildUnsavedQuerySnapshot(
        {
          ...(stateOverride?.editableQuery ?? editableQueryRef.current),
          description: stateOverride
            ? stateOverride.isDescriptionEditing
              ? stateOverride.descriptionDraft
              : stateOverride.editableQuery.description
            : isDescriptionEditingRef.current
              ? descriptionDraftRef.current
              : editableQueryRef.current.description,
          query: queryText,
        },
        parameters,
      ),
    [],
  );

  const syncUnsavedChangesState = useCallback(
    (
      queryText?: string,
      parameters?: QueryParameterState[],
      stateOverride?: {
        descriptionDraft: string;
        editableQuery: EditableQueryState;
        isDescriptionEditing: boolean;
      },
    ) => {
      const nextHasUnsavedChanges =
        buildCurrentUnsavedQuerySnapshot(
          queryText,
          parameters,
          stateOverride,
        ) !==
        savedQuerySnapshotRef.current;

      if (hasUnsavedChangesRef.current === nextHasUnsavedChanges) {
        return nextHasUnsavedChanges;
      }

      hasUnsavedChangesRef.current = nextHasUnsavedChanges;
      startTransition(() => {
        setHasUnsavedChanges(nextHasUnsavedChanges);
      });

      return nextHasUnsavedChanges;
    },
    [buildCurrentUnsavedQuerySnapshot],
  );

  const confirmNavigationAway = useCallback(() => {
    if (isViewMode) {
      return true;
    }

    if (!hasUnsavedChanges) {
      return true;
    }

    return window.confirm(
      "변경사항이 저장되지 않을 수 있습니다. 페이지를 이동하시겠습니까?",
    );
  }, [hasUnsavedChanges, isViewMode]);

  const navigateWithUnsavedChangesCheck = useCallback(
    (href: string) => {
      if (!confirmNavigationAway()) {
        return;
      }

      router.push(href);
    },
    [confirmNavigationAway, router],
  );

  function applyQueryVisualizations(
    nextVisualizations: QueryVisualization[],
    nextActiveVisualizationTab?: ActiveVisualizationTab,
  ) {
    const { chartVisualizations: nextCharts, tableVisualization: nextTable } =
      splitQueryVisualizations(nextVisualizations);
    setChartVisualizations(nextCharts);
    setTableVisualization(nextTable);
    setActiveVisualizationTab((currentValue) => {
      const targetValue = nextActiveVisualizationTab ?? currentValue;

      if (targetValue === "table") {
        return "table";
      }

      return nextCharts.some((item) => item.id === targetValue)
        ? targetValue
        : "table";
    });
  }

  function updateQueryParameters(nextParameters: QueryParameterState[]) {
    queryParametersRef.current = nextParameters;
    setQueryParameters(nextParameters);
    setEditableQuery((currentValue) => ({
      ...currentValue,
      options: {
        ...currentValue.options,
        parameters: serializeQueryParameters(nextParameters, true),
      },
    }));
  }

  const updateHasQueryTextState = useCallback((nextQueryText: string) => {
    const nextHasQueryText = Boolean(nextQueryText.trim());

    if (hasQueryTextRef.current === nextHasQueryText) {
      return;
    }

    hasQueryTextRef.current = nextHasQueryText;

    if (isViewMode) {
      setViewModeHasQueryText(nextHasQueryText);
      return;
    }

    sourceEditorHasTextStateRef.current?.(nextHasQueryText);
  }, [isViewMode]);

  const syncParametersWithQueryText = useCallback(
    (queryText: string, parameters = queryParametersRef.current) => {
      const referencedNames = getReferencedParameterNames(queryText);
      const nextParameters = parameters.filter((parameter) =>
        referencedNames.has(parameter.name),
      );

      if (nextParameters.length !== parameters.length) {
        updateQueryParameters(nextParameters);
      }

      return nextParameters;
    },
    [],
  );

  const flushEditorDerivedState = useCallback(
    (queryText = queryTextRef.current) => {
      if (editorDerivedStateSyncTimeoutRef.current !== null) {
        window.clearTimeout(editorDerivedStateSyncTimeoutRef.current);
        editorDerivedStateSyncTimeoutRef.current = null;
      }

      const nextParameters =
        queryParametersRef.current.length > 0 || queryText.includes("{{")
          ? syncParametersWithQueryText(queryText, queryParametersRef.current)
          : queryParametersRef.current;

      syncUnsavedChangesState(queryText, nextParameters);

      return nextParameters;
    },
    [syncParametersWithQueryText, syncUnsavedChangesState],
  );

  const scheduleEditorDerivedStateSync = useCallback(
    (queryText: string) => {
      if (editorDerivedStateSyncTimeoutRef.current !== null) {
        window.clearTimeout(editorDerivedStateSyncTimeoutRef.current);
      }

      // Typing should only update the editor model synchronously. Expensive
      // parameter scans and snapshot comparisons can lag slightly behind.
      editorDerivedStateSyncTimeoutRef.current = window.setTimeout(() => {
        editorDerivedStateSyncTimeoutRef.current = null;
        flushEditorDerivedState(queryText);
      }, EDITOR_DERIVED_STATE_SYNC_DELAY_MS);
    },
    [flushEditorDerivedState],
  );

  const openAddParameterDialog = useCallback(() => {
    setOpenParameterPresetMenu(null);
    setOpenParameterCalendarMenu(null);
    setParameterEditorDraft({
      enumOptions: "",
      isNew: true,
      isTitleEdited: false,
      multiValuesOptions: null,
      name: "",
      originalName: null,
      title: "",
      type: "text",
    });
  }, []);

  const openEditParameterDialog = useCallback((parameter: QueryParameterState) => {
    setOpenParameterPresetMenu(null);
    setOpenParameterCalendarMenu(null);
    setParameterEditorDraft({
      enumOptions: parameter.enumOptions ?? "",
      isNew: false,
      isTitleEdited: true,
      multiValuesOptions: parameter.multiValuesOptions ?? null,
      name: parameter.name,
      originalName: parameter.name,
      title: parameter.title ?? "",
      type: parameter.type,
    });
  }, []);

  function closeParameterDialog() {
    setParameterEditorDraft(null);
  }

  function handleSaveParameterDefinition(
    nextDraft: QueryParameterEditorDraft,
  ): string | null {
    if (!nextDraft) {
      return "Parameter definition is invalid.";
    }

    const nextName = nextDraft.name.trim();
    const nextTitle = nextDraft.title.trim();

    if (!nextName) {
      return "Keyword is required.";
    }

    if (
      queryParameters.some(
        (parameter) =>
          parameter.name === nextName &&
          parameter.name !== nextDraft.originalName,
      )
    ) {
      return "Parameter with this name already exists.";
    }

    if (!nextTitle) {
      return "Title is required.";
    }

    const previousParameter =
      queryParameters.find(
        (parameter) => parameter.name === nextDraft.originalName,
      ) ?? null;

    const nextParameter: QueryParameterState = {
      enumOptions: nextDraft.enumOptions,
      multiValuesOptions: isDropdownParameterType(nextDraft.type)
        ? nextDraft.multiValuesOptions
        : null,
      name: nextName,
      title: nextTitle,
      type: nextDraft.type,
      useCurrentDateTime: false,
      value: normalizeParameterValue(
        {
          enumOptions: nextDraft.enumOptions,
          multiValuesOptions: isDropdownParameterType(nextDraft.type)
            ? nextDraft.multiValuesOptions
            : null,
          type: nextDraft.type,
        },
        previousParameter ? getCurrentParameterValue(previousParameter) : null,
      ),
    };

    const nextParameters = nextDraft.isNew
      ? [...queryParameters, nextParameter]
      : queryParameters.map((parameter) =>
          parameter.name === nextDraft.originalName ? nextParameter : parameter,
        );

    updateQueryParameters(nextParameters);
    closeParameterDialog();

    if (nextDraft.isNew) {
      insertTextIntoEditor(buildParameterToken(nextName, nextParameter.type));
    }

    return null;
  }

  const updateParameterPendingValue = useCallback((
    parameterName: string,
    nextValue: QueryParameterValue,
  ) => {
    setQueryParameters((currentValue) =>
      currentValue.map((parameter) =>
        parameter.name === parameterName
          ? {
              ...parameter,
              pendingValue: normalizeParameterValue(parameter, nextValue),
            }
          : parameter,
      ),
    );
  }, []);

  const applyParameterChanges = useCallback((parameters = queryParameters) => {
    const nextParameters = parameters.map((parameter) => ({
      ...parameter,
      value:
        parameter.pendingValue !== undefined
          ? normalizeParameterValue(parameter, parameter.pendingValue)
          : parameter.value,
      pendingValue: undefined,
    }));

    updateQueryParameters(nextParameters);

    return nextParameters;
  }, [queryParameters]);

  const syncParametersToUrl = useCallback((parameters: QueryParameterState[]) => {
    if (typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);

    parameters.forEach((parameter) => {
      const parameterKey = `p_${parameter.name}`;
      searchParams.delete(parameterKey);
      searchParams.delete(`${parameterKey}.start`);
      searchParams.delete(`${parameterKey}.end`);

      const nextValue = getCurrentParameterValue(parameter);

      if (isDateRangeParameterType(parameter.type)) {
        if (!isRangeValue(nextValue) || !nextValue.start || !nextValue.end) {
          return;
        }

        searchParams.set(parameterKey, `${nextValue.start}--${nextValue.end}`);
        return;
      }

      if (Array.isArray(nextValue)) {
        if (!nextValue.length) {
          return;
        }

        searchParams.set(
          parameterKey,
          parameter.multiValuesOptions
            ? nextValue.join(parameter.multiValuesOptions.separator)
            : nextValue.join(","),
        );
        return;
      }

      if (nextValue === null || nextValue === undefined || nextValue === "") {
        return;
      }

      searchParams.set(parameterKey, String(nextValue));
    });

    const nextSearch = searchParams.toString();
    const nextUrl = nextSearch
      ? `${window.location.pathname}?${nextSearch}`
      : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, []);

  const handleApplyParameterChanges = useCallback(async () => {
    setOpenParameterPresetMenu(null);
    setOpenParameterCalendarMenu(null);
    const nextParameters = applyParameterChanges();
    if (isViewMode) {
      syncParametersToUrl(nextParameters);
    }
    await executeQueryRef.current?.(nextParameters);
  }, [applyParameterChanges, isViewMode, syncParametersToUrl]);

  function getTemporalParts(
    value: string | null | undefined,
    type: QueryParameterState["type"],
  ) {
    const parsedDate = value ? parseStoredDateValue(value) : null;

    return {
      date: parsedDate ? formatDate(parsedDate, "yyyy-MM-dd") : "",
      hour: parsedDate ? String(parsedDate.getHours()).padStart(2, "0") : "00",
      minute: parsedDate
        ? String(parsedDate.getMinutes()).padStart(2, "0")
        : "00",
      second:
        parsedDate && type === "datetime-with-seconds"
          ? String(parsedDate.getSeconds()).padStart(2, "0")
          : "00",
    };
  }

  function getRangeTemporalParts(
    value: QueryParameterRangeValue,
    type: QueryParameterState["type"],
    field: "start" | "end",
  ) {
    const rawValue = field === "start" ? value.start : value.end;
    const parsedDate = rawValue ? parseStoredDateValue(rawValue) : null;

    return {
      date: parsedDate ? formatDate(parsedDate, "yyyy-MM-dd") : "",
      hour: parsedDate ? String(parsedDate.getHours()).padStart(2, "0") : "00",
      minute: parsedDate
        ? String(parsedDate.getMinutes()).padStart(2, "0")
        : "00",
      second:
        parsedDate && type === "datetime-range-with-seconds"
          ? String(parsedDate.getSeconds()).padStart(2, "0")
          : "00",
    };
  }

  function buildDateTimeString(
    dateValue: string,
    timeValue: { hour: string; minute: string; second?: string },
    type: QueryParameterState["type"],
  ) {
    if (!dateValue) {
      return "";
    }

    if (type === "date" || type === "date-range") {
      return dateValue;
    }

    const second =
      type === "datetime-with-seconds" || type === "datetime-range-with-seconds"
        ? `:${timeValue.second ?? "00"}`
        : "";

    return `${dateValue} ${timeValue.hour}:${timeValue.minute}${second}`;
  }

  const updateSingleTemporalValue = useCallback((
    parameter: QueryParameterState,
    updates: Partial<{
      date: string;
      hour: string;
      minute: string;
      second: string;
    }>,
  ) => {
    const currentRawValue =
      typeof getCurrentParameterValue(parameter) === "string"
        ? (getCurrentParameterValue(parameter) as string)
        : "";
    const currentParts = getTemporalParts(currentRawValue, parameter.type);
    const nextDate = updates.date ?? currentParts.date;

    updateParameterPendingValue(
      parameter.name,
      buildDateTimeString(
        nextDate,
        {
          hour: updates.hour ?? currentParts.hour,
          minute: updates.minute ?? currentParts.minute,
          second: updates.second ?? currentParts.second,
        },
        parameter.type,
      ),
    );
  }, [updateParameterPendingValue]);

  const updateRangeTemporalValue = useCallback((
    parameter: QueryParameterState,
    field: "start" | "end",
    updates: Partial<{
      date: string;
      hour: string;
      minute: string;
      second: string;
    }>,
  ) => {
    const currentValue = getCurrentParameterValue(parameter);
    const currentRangeValue = isRangeValue(currentValue)
      ? currentValue
      : { start: "", end: "" };
    const currentParts = getRangeTemporalParts(
      currentRangeValue,
      parameter.type,
      field,
    );
    const nextDate = updates.date ?? currentParts.date;
    const nextFieldValue = buildDateTimeString(
      nextDate,
      {
        hour: updates.hour ?? currentParts.hour,
        minute: updates.minute ?? currentParts.minute,
        second: updates.second ?? currentParts.second,
      },
      parameter.type,
    );
    const nextRangeValue = {
      ...currentRangeValue,
      [field]: nextFieldValue,
    };

    setPendingCalendarRanges((currentValueMap) => ({
      ...currentValueMap,
      [parameter.name]: nextRangeValue,
    }));
    updateParameterPendingValue(parameter.name, nextRangeValue);
  }, [updateParameterPendingValue]);

  const renderTimeSelectors = useCallback(({
    type,
    value,
    onChange,
  }: {
    onChange: (updates: {
      hour?: string;
      minute?: string;
      second?: string;
    }) => void;
    type: QueryParameterState["type"];
    value: string | null | undefined;
  }) => {
    const parts = getTemporalParts(value, type);
    const showSeconds =
      type === "datetime-with-seconds" ||
      type === "datetime-range-with-seconds";
    const hourOptions = Array.from({ length: 24 }, (_, index) =>
      String(index).padStart(2, "0"),
    );
    const minuteOptions = Array.from({ length: 60 }, (_, index) =>
      String(index).padStart(2, "0"),
    );

    return (
      <div className="mt-4 flex items-center gap-2 border-t border-[#f0f0f0] pt-4">
        <select
          className="h-[36px] rounded-[2px] border border-[#d9d9d9] bg-white px-2 text-[13px] text-[#595959] outline-none"
          onChange={(event) => onChange({ hour: event.target.value })}
          value={parts.hour}
        >
          {hourOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="text-[#8c8c8c]">:</span>
        <select
          className="h-[36px] rounded-[2px] border border-[#d9d9d9] bg-white px-2 text-[13px] text-[#595959] outline-none"
          onChange={(event) => onChange({ minute: event.target.value })}
          value={parts.minute}
        >
          {minuteOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {showSeconds ? (
          <>
            <span className="text-[#8c8c8c]">:</span>
            <select
              className="h-[36px] rounded-[2px] border border-[#d9d9d9] bg-white px-2 text-[13px] text-[#595959] outline-none"
              onChange={(event) => onChange({ second: event.target.value })}
              value={parts.second}
            >
              {minuteOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>
    );
  }, []);

  const openParameterCalendar = useCallback((parameter: QueryParameterState) => {
    const currentValue = getCurrentParameterValue(parameter);
    const nextDraft = isRangeValue(currentValue)
      ? { start: currentValue.start, end: currentValue.end }
      : { start: undefined, end: undefined };

    setOpenParameterPresetMenu(null);
    setPendingCalendarRanges((currentValueMap) => ({
      ...currentValueMap,
      [parameter.name]: nextDraft,
    }));
    setOpenParameterCalendarMenu((currentMenu) =>
      currentMenu === parameter.name ? null : parameter.name,
    );
  }, []);

  const handleParameterRangeDaySelect = useCallback((
    parameter: QueryParameterState,
    selectedDate: Date,
  ) => {
    const formattedDate = formatDate(selectedDate, "yyyy-MM-dd");
    const currentDraft = pendingCalendarRanges[parameter.name] ?? {};
    const currentParameterValue = getCurrentParameterValue(parameter);
    const currentRangeValue = isRangeValue(currentParameterValue)
      ? currentParameterValue
      : { start: "", end: "" };
    const currentStartDate =
      currentDraft.start?.slice(0, 10) ?? currentRangeValue.start.slice(0, 10);

    const buildRangeValue = (field: "start" | "end", dateValue: string) =>
      parameter.type === "date-range"
        ? dateValue
        : buildDateTimeString(
            dateValue,
            getRangeTemporalParts(currentRangeValue, parameter.type, field),
            parameter.type,
          );

    if (!currentDraft.start || currentDraft.end) {
      setPendingCalendarRanges((currentValueMap) => ({
        ...currentValueMap,
        [parameter.name]: {
          start: buildRangeValue("start", formattedDate),
          end: undefined,
        },
      }));
      return;
    }

    if (formattedDate < currentStartDate) {
      setPendingCalendarRanges((currentValueMap) => ({
        ...currentValueMap,
        [parameter.name]: {
          start: buildRangeValue("start", formattedDate),
          end: undefined,
        },
      }));
      return;
    }

    const completedRange = {
      start: currentDraft.start,
      end: buildRangeValue("end", formattedDate),
    };

    setPendingCalendarRanges((currentValueMap) => ({
      ...currentValueMap,
      [parameter.name]: completedRange,
    }));
    updateParameterPendingValue(parameter.name, completedRange);

    if (parameter.type === "date-range") {
      setOpenParameterCalendarMenu(null);
    }
  }, [pendingCalendarRanges, updateParameterPendingValue]);

  useEffect(() => {
    document.title = editableQuery.name || "New Query";
  }, [editableQuery.name]);

  useEffect(() => {
    if (!isDescriptionEditing) {
      setDescriptionDraft(editableQuery.description ?? "");
    }
  }, [editableQuery.description, isDescriptionEditing]);

  useEffect(() => {
    queryTextRef.current = editableQuery.query;
    updateHasQueryTextState(editableQuery.query);

    if (
      editorRef.current &&
      editorRef.current.getValue() !== editableQuery.query
    ) {
      editorRef.current.setValue(editableQuery.query);
    }
  }, [editableQuery.query, updateHasQueryTextState]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        isDataSourceMenuOpen &&
        dataSourceDropdownRef.current &&
        !dataSourceDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDataSourceMenuOpen(false);
      }

      if (
        isActionMenuOpen &&
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node)
      ) {
        setIsActionMenuOpen(false);
      }

      if (
        isHeaderActionMenuOpen &&
        headerActionMenuRef.current &&
        !headerActionMenuRef.current.contains(event.target as Node)
      ) {
        setIsHeaderActionMenuOpen(false);
      }

      if (
        (openParameterPresetMenu || openParameterCalendarMenu) &&
        event.target instanceof Element &&
        !event.target.closest("[data-parameter-popover-root]")
      ) {
        setOpenParameterPresetMenu(null);
        setOpenParameterCalendarMenu(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [
    isActionMenuOpen,
    isDataSourceMenuOpen,
    isHeaderActionMenuOpen,
    openParameterCalendarMenu,
    openParameterPresetMenu,
  ]);

  useEffect(() => {
    function handlePointerMove(event: MouseEvent) {
      if (resizeModeRef.current === "schema") {
        const nextWidth = clamp(event.clientX, 46, 620);
        setSchemaPanelWidth(nextWidth);
        setIsSchemaPanelCollapsed(nextWidth <= 90);
      }

    }

    function handlePointerUp() {
      resizeModeRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, []);

  useEffect(() => {
    syncUnsavedChangesState(editableQuery.query, queryParameters, {
      descriptionDraft,
      editableQuery,
      isDescriptionEditing,
    });
  }, [
    descriptionDraft,
    editableQuery,
    isDescriptionEditing,
    queryParameters,
    syncUnsavedChangesState,
  ]);

  useEffect(() => {
    if (isViewMode || !hasUnsavedChanges) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      if (!(event.target instanceof Element)) {
        return;
      }

      const anchor = event.target.closest("a[href]");

      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) {
        return;
      }

      const target = anchor.getAttribute("target");

      if (target && target !== "_self") {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.href === currentUrl.href) {
        return;
      }

      if (!confirmNavigationAway()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handlePopState = () => {
      if (skipNextPopStateRef.current) {
        skipNextPopStateRef.current = false;
        return;
      }

      if (confirmNavigationAway()) {
        return;
      }

      skipNextPopStateRef.current = true;
      window.history.go(1);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [confirmNavigationAway, hasUnsavedChanges, isViewMode]);

  useEffect(() => {
    let isCancelled = false;

    async function loadInitial() {
      setIsInitialLoading(true);
      setPageError(null);

      try {
        const [nextDataSources, nextQuerySnippets, nextQuery] = await Promise.all([
          getDataSources(),
          getQuerySnippets().catch(() => []),
          queryId === "new"
            ? Promise.resolve<QueryDetail | null>(null)
            : getQueryDetail(Number(queryId)),
        ]);

        if (isCancelled) {
          return;
        }

        setDataSources(nextDataSources);
        setQuerySnippets(nextQuerySnippets);

        if (nextQuery) {
          const storedParameters = getStoredParameters(nextQuery.options);
          const nextParameters = isViewMode
            ? getParametersFromSearchParams(
                storedParameters,
                initialSearchParams,
              )
            : storedParameters;
          const referencedParameters = nextParameters.filter((parameter) =>
            getReferencedParameterNames(nextQuery.query).has(parameter.name),
          );
          const nextEditableQuery = mapQueryDetail(nextQuery);

          queryTextRef.current = nextQuery.query;
          setQueryDetailData(nextQuery);
          setExecutionResult(nextQuery.latest_query_data ?? null);
          applyQueryVisualizations(nextQuery.visualizations);
          setQueryParameters(referencedParameters);
          setEditableQuery(nextEditableQuery);
          savedQuerySnapshotRef.current = buildUnsavedQuerySnapshot(
            nextEditableQuery,
            referencedParameters,
          );
          hasUnsavedChangesRef.current = false;
          setHasUnsavedChanges(false);
          return;
        }

        const nextEditableQuery = {
          ...NEW_QUERY_STATE,
          data_source_id: nextDataSources[0]?.id ?? null,
        };

        queryTextRef.current = nextEditableQuery.query;
        setQueryDetailData(null);
        setExecutionResult(null);
        applyQueryVisualizations([]);
        setQueryParameters([]);
        setEditableQuery(nextEditableQuery);
        savedQuerySnapshotRef.current = buildUnsavedQuerySnapshot(
          nextEditableQuery,
          [],
        );
        hasUnsavedChangesRef.current = false;
        setHasUnsavedChanges(false);
      } catch (error) {
        if (!isCancelled) {
          setPageError(
            getApiErrorMessage(error, "Failed to load query editor."),
          );
        }
      } finally {
        if (!isCancelled) {
          setIsInitialLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      isCancelled = true;
    };
  }, [initialSearchParams, isViewMode, queryId]);

  useEffect(() => {
    queryDetailDataRef.current = queryDetailData;
  }, [queryDetailData]);

  useEffect(() => {
    executionResultRef.current = executionResult;
  }, [executionResult]);

  useEffect(() => {
    editableQueryRef.current = editableQuery;
  }, [editableQuery]);

  useEffect(() => {
    queryParametersRef.current = queryParameters;
  }, [queryParameters]);

  useEffect(() => {
    descriptionDraftRef.current = descriptionDraft;
  }, [descriptionDraft]);

  useEffect(() => {
    isDescriptionEditingRef.current = isDescriptionEditing;
  }, [isDescriptionEditing]);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(
    () => () => {
      if (editorDerivedStateSyncTimeoutRef.current !== null) {
        window.clearTimeout(editorDerivedStateSyncTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const queryDetailId = editableQuery.id;
    const normalizedSchedule = normalizeRefreshSchedule(queryDetailData?.schedule);

    if (
      currentQueryId === "new" ||
      queryDetailId === null ||
      normalizedSchedule === null ||
      normalizedSchedule.disabled
    ) {
      return undefined;
    }

    let isCancelled = false;
    let intervalId: number | null = null;
    let isRefreshing = false;

    const refreshServerDrivenQueryState = async () => {
      if (isRefreshing) {
        return;
      }

      isRefreshing = true;

      try {
        const refreshedQuery = await getQueryDetail(queryDetailId);

        if (isCancelled) {
          return;
        }

        const currentQueryDetail = queryDetailDataRef.current;
        const currentResult = executionResultRef.current;
        const shouldUpdateSchedule =
          refreshedQuery.schedule === null ||
          isTimestampNewerOrEqual(
            getScheduledExecutionTime(refreshedQuery.schedule),
            getScheduledExecutionTime(currentQueryDetail?.schedule),
          );
        const shouldUpdateResult =
          refreshedQuery.latest_query_data !== null &&
          refreshedQuery.latest_query_data !== undefined &&
          isTimestampNewerOrEqual(
            refreshedQuery.latest_query_data.retrieved_at,
            currentResult?.retrieved_at ??
              currentQueryDetail?.latest_query_data?.retrieved_at,
          );

        if (!shouldUpdateSchedule && !shouldUpdateResult) {
          return;
        }

        startTransition(() => {
          setEditableQuery((currentValue) => {
            if (currentValue.id !== refreshedQuery.id) {
              return currentValue;
            }

            return {
              ...currentValue,
              latest_query_data_id: shouldUpdateResult
                ? refreshedQuery.latest_query_data_id
                : currentValue.latest_query_data_id,
              schedule: shouldUpdateSchedule
                ? refreshedQuery.schedule
                : currentValue.schedule,
            };
          });

          setQueryDetailData((currentValue) => {
            if (!currentValue || currentValue.id !== refreshedQuery.id) {
              return currentValue;
            }

            return {
              ...currentValue,
              latest_query_data: shouldUpdateResult
                ? refreshedQuery.latest_query_data
                : currentValue.latest_query_data,
              latest_query_data_id: shouldUpdateResult
                ? refreshedQuery.latest_query_data_id
                : currentValue.latest_query_data_id,
              retrieved_at: shouldUpdateResult
                ? refreshedQuery.retrieved_at
                : currentValue.retrieved_at,
              runtime: shouldUpdateResult
                ? refreshedQuery.runtime
                : currentValue.runtime,
              schedule: shouldUpdateSchedule
                ? refreshedQuery.schedule
                : currentValue.schedule,
            };
          });

          if (shouldUpdateResult && refreshedQuery.latest_query_data) {
            setExecutionResult(refreshedQuery.latest_query_data);
          }
        });
      } catch {
        // Ignore transient polling failures and keep the current UI state.
      } finally {
        isRefreshing = false;
      }
    };

    const timeoutId = window.setTimeout(() => {
      void refreshServerDrivenQueryState();
      intervalId = window.setInterval(() => {
        void refreshServerDrivenQueryState();
      }, 60_000);
    }, 60_000 - (Date.now() % 60_000));

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);

      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [currentQueryId, editableQuery.id, queryDetailData?.schedule]);

  useEffect(() => {
    setResultPage(1);
  }, [executionResult, resultPageSize]);

  useEffect(() => {
    setResultFilter("");
  }, [executionResult]);

  useEffect(() => {
    setResultPage(1);
  }, [resultFilter]);

  useEffect(() => {
    setResultPage((currentValue) => Math.min(currentValue, totalResultPages));
  }, [totalResultPages]);

  useEffect(() => {
    setResultPageInput(String(resultPage));
  }, [resultPage]);

  useEffect(() => {
    if (!saveMessage) {
      setIsSaveToastVisible(false);
      setIsSaveToastFading(false);
      return;
    }

    setIsSaveToastVisible(true);
    setIsSaveToastFading(false);

    const fadeTimeout = window.setTimeout(() => {
      setIsSaveToastFading(true);
    }, 10);
    const clearTimeoutId = window.setTimeout(() => {
      setIsSaveToastVisible(false);
      setIsSaveToastFading(false);
      setSaveMessage(null);
    }, 4010);

    return () => {
      window.clearTimeout(fadeTimeout);
      window.clearTimeout(clearTimeoutId);
    };
  }, [saveMessage]);

  useEffect(() => {
    if (
      activeVisualizationTab !== "table" &&
      !chartVisualizations.some((item) => item.id === activeVisualizationTab)
    ) {
      setActiveVisualizationTab("table");
    }
  }, [activeVisualizationTab, chartVisualizations]);

  useEffect(() => {
    if (!isAddToDashboardOpen) {
      return;
    }

    if (!dashboardSearchTerm.trim()) {
      setDashboardSearchResults([]);
      return;
    }

    let isCancelled = false;
    setIsDashboardSearching(true);

    const timeoutId = window.setTimeout(() => {
      searchDashboards(dashboardSearchTerm)
        .then((response) => {
          if (!isCancelled) {
            setDashboardSearchResults(response.results);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setDashboardSearchResults([]);
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setIsDashboardSearching(false);
          }
        });
    }, 250);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [dashboardSearchTerm, isAddToDashboardOpen]);

  useEffect(() => {
    if (!editableQuery.data_source_id) {
      setExpandedTables({});
      setSchemaResponse(null);
      return;
    }

    let isCancelled = false;

    async function loadSchema(refresh = false) {
      setExpandedTables({});
      setIsSchemaLoading(true);
      setSchemaError(null);

      try {
        const nextSchema = await getDataSourceSchema(
          editableQuery.data_source_id as number,
          refresh,
        );

        if (isCancelled) {
          return;
        }

        setSchemaResponse(nextSchema);
      } catch (error) {
        if (!isCancelled) {
          setSchemaError(getApiErrorMessage(error, "Failed to load schema."));
        }
      } finally {
        if (!isCancelled) {
          setIsSchemaLoading(false);
        }
      }
    }

    loadSchema(false);

    return () => {
      isCancelled = true;
    };
  }, [editableQuery.data_source_id]);

  useEffect(() => {
    const monaco = monacoRef.current;

    completionProviderRef.current?.dispose();
    completionProviderRef.current = null;

    if (!monaco || !completionIndex) {
      return;
    }

    const resolveCompletionItemKind = (
      kindKey: IndexedCompletionEntry["suggestion"]["kindKey"],
    ) => {
      switch (kindKey) {
        case "class":
          return monaco.languages.CompletionItemKind.Class;
        case "field":
          return monaco.languages.CompletionItemKind.Field;
        case "snippet":
          return monaco.languages.CompletionItemKind.Snippet;
        case "keyword":
        default:
          return monaco.languages.CompletionItemKind.Keyword;
      }
    };

    completionProviderRef.current =
      monaco.languages.registerCompletionItemProvider("sql", {
        triggerCharacters: [".", '"'],
        provideCompletionItems: (
          model: CompletionModelLike,
          position: CompletionPositionLike,
        ) => {
          const word = model.getWordUntilPosition(position);
          const lineContent = model.getLineContent(position.lineNumber);
          const currentToken = lineContent.slice(
            word.startColumn - 1,
            position.column - 1,
          );
          const range = {
            startColumn: word.startColumn,
            endColumn: word.endColumn,
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
          };
          const linePrefix = lineContent.slice(0, position.column - 1);
          const normalizedToken = currentToken.trim().toLowerCase();
          const tableMatch = linePrefix.match(
            /([A-Za-z_][\w.]*)\.\s*([A-Za-z_]*)?$/,
          );
          const isRelationContext =
            /\b(from|join|into|update|table)\s+[A-Za-z_][\w.]*$/i.test(
              linePrefix,
            );

          const buildSuggestions = (
            entries: IndexedCompletionEntry[],
            token: string,
            limit: number,
          ) =>
            entries
              .filter((entry) => entry.normalizedSearchText.startsWith(token))
              .slice(0, limit)
              .map((entry) => ({
                ...entry.suggestion,
                insertTextRules:
                  entry.suggestion.kindKey === "snippet"
                    ? monaco.languages.CompletionItemInsertTextRule.KeepWhitespace
                    : entry.suggestion.insertTextRules,
                kind: resolveCompletionItemKind(entry.suggestion.kindKey),
                range,
              }));

          if (tableMatch) {
            const rawTableName = tableMatch[1];
            const tableName = rawTableName.split(".").pop() ?? rawTableName;
            const table =
              completionIndex.tableMap.get(rawTableName) ??
              completionIndex.tableMap.get(tableName);

            if (table) {
              const columnToken = (tableMatch[2] ?? "").trim().toLowerCase();
              return {
                suggestions: buildSuggestions(
                  table.columns,
                  columnToken,
                  MAX_COLUMN_SUGGESTIONS,
                ),
              };
            }
          }

          // Avoid stalling the first keystroke in a new editor by skipping
          // broad schema/snippet scans until the user has typed a meaningful prefix.
          if (
            !currentToken.trim() ||
            normalizedToken.length < MIN_AUTOCOMPLETE_TOKEN_LENGTH
          ) {
            return { suggestions: [] };
          }

          const keywordSuggestions = SQL_AUTOCOMPLETE_KEYWORDS.filter(
            (keyword) => keyword.toLowerCase().startsWith(normalizedToken),
          )
            .slice(0, MAX_KEYWORD_SUGGESTIONS)
            .map((keyword) => ({
              detail: "keyword",
              insertText: keyword,
              kindKey: "keyword" as const,
              kind: monaco.languages.CompletionItemKind.Keyword,
              label: keyword.toLowerCase(),
              range,
              sortText: `1-${keyword.toLowerCase()}`,
            }));

          const snippetSuggestions = buildSuggestions(
            getIndexedCompletionEntries(completionIndex.snippetIndex, normalizedToken),
            normalizedToken,
            MAX_SNIPPET_SUGGESTIONS,
          );
          const tableSuggestions =
            isRelationContext ||
            normalizedToken.length >= MIN_BROAD_SCHEMA_TOKEN_LENGTH
              ? buildSuggestions(
                  getIndexedCompletionEntries(
                    completionIndex.tableIndex,
                    normalizedToken,
                  ),
                  normalizedToken,
                  MAX_TABLE_SUGGESTIONS,
                )
              : [];
          const columnSuggestions =
            normalizedToken.length >= MIN_BROAD_SCHEMA_TOKEN_LENGTH
              ? buildSuggestions(
                  getIndexedCompletionEntries(
                    completionIndex.columnIndex,
                    normalizedToken,
                  ),
                  normalizedToken,
                  MAX_BROAD_COLUMN_SUGGESTIONS,
                )
              : [];

          return {
            suggestions: dedupeCompletionSuggestions([
              ...snippetSuggestions,
              ...keywordSuggestions,
              ...tableSuggestions,
              ...columnSuggestions,
            ]).slice(0, MAX_GENERAL_SUGGESTIONS),
          };
        },
      });

    return () => {
      completionProviderRef.current?.dispose();
      completionProviderRef.current = null;
    };
  }, [completionIndex]);

  const handleRefreshSchema = useCallback(() => {
    if (!editableQuery.data_source_id) {
      return;
    }

    setExpandedTables({});
    setIsSchemaLoading(true);
    setSchemaError(null);

    getDataSourceSchema(editableQuery.data_source_id, true)
      .then((nextSchema) => {
        setSchemaResponse(nextSchema);
      })
      .catch((error) => {
        setSchemaError(getApiErrorMessage(error, "Failed to refresh schema."));
      })
      .finally(() => {
        setIsSchemaLoading(false);
      });
  }, [editableQuery.data_source_id]);

  const getFormatterLanguage = useCallback((): FormatterLanguage => {
    const type = selectedDataSource?.type?.toLowerCase() ?? "";

    if (type.includes("mysql")) {
      return "mysql";
    }

    if (
      type.includes("pg") ||
      type.includes("postgres") ||
      type.includes("redshift")
    ) {
      return "postgresql";
    }

    if (type.includes("mssql") || type.includes("sqlserver")) {
      return "transactsql";
    }

    if (type.includes("oracle")) {
      return "plsql";
    }

    if (type.includes("sqlite")) {
      return "sqlite";
    }

    return "sql";
  }, [selectedDataSource?.type]);

  const handleFormatQuery = useCallback(() => {
    const editor = editorRef.current;
    const rawValue = queryTextRef.current;
    const syntax = selectedDataSource?.syntax?.toLowerCase() ?? "sql";

    if (!editor || !rawValue.trim()) {
      return;
    }

    try {
      const nextValue =
        syntax === "json"
          ? JSON.stringify(JSON.parse(rawValue), null, 2)
          : formatSql(rawValue.trim(), { language: getFormatterLanguage() });

      editor.setValue(nextValue);
      queryTextRef.current = nextValue;
      updateHasQueryTextState(nextValue);
      flushEditorDerivedState(nextValue);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to format query.",
      );
    }
  }, [
    flushEditorDerivedState,
    getFormatterLanguage,
    selectedDataSource?.syntax,
    updateHasQueryTextState,
  ]);

  const handleToggleAutocomplete = useCallback(() => {
    if (!autocompleteAvailable) {
      return;
    }

    setAutocompleteEnabled((currentValue) => {
      const nextValue = !currentValue;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "query-editor-live-autocomplete",
          String(nextValue),
        );
      }
      return nextValue;
    });
  }, [autocompleteAvailable]);

  const handleEditorMount = useCallback((
    editor: Parameters<OnMount>[0],
    monaco: Parameters<OnMount>[1],
  ) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.setValue(queryTextRef.current);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      void executeQueryRef.current?.();
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      void saveQueryRef.current?.();
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      openAddParameterDialog();
    });
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      () => {
        handleFormatQuery();
      },
    );
  }, [handleFormatQuery, openAddParameterDialog]);

  const insertTextIntoEditor = useCallback((text: string) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (!editor || !monaco) {
      return;
    }

    const selection = editor.getSelection();
    const position = editor.getPosition();

    if (!position) {
      return;
    }

    editor.executeEdits("schema-browser", [
      {
        range:
          selection ??
          new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column,
          ),
        text,
        forceMoveMarkers: true,
      },
    ]);

    const nextValue = editor.getValue();
    queryTextRef.current = nextValue;
    updateHasQueryTextState(nextValue);
    scheduleEditorDerivedStateSync(nextValue);
    editor.focus();
  }, [scheduleEditorDerivedStateSync, updateHasQueryTextState]);

  const toggleTable = useCallback((tableName: string) => {
    setExpandedTables((currentValue) => ({
      ...currentValue,
      [tableName]: !currentValue[tableName],
    }));
  }, []);

  async function persistQueryState(
    nextEditableQuery: EditableQueryState,
    options?: {
      successMessage?: string;
    },
  ) {
    if (isSavingRef.current) {
      return null;
    }

    const nextParameters = flushEditorDerivedState(queryTextRef.current);
    const payload = buildSavePayload(
      {
        ...nextEditableQuery,
        query: queryTextRef.current,
      },
      nextParameters,
    );

    if (!payload) {
      setPageError("Please choose a data source first.");
      return null;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setPageError(null);
    setSaveMessage(null);

    try {
      const savedQuery =
        nextEditableQuery.id === null
          ? await createQuery(payload)
          : await updateQuery(nextEditableQuery.id, payload);
      const stableExecutionResult = resolveStableExecutionResult(
        savedQuery,
        executionResultRef.current,
      );
      const nextQueryDetail = mergeQueryDetailWithStableResult(
        savedQuery,
        executionResultRef.current,
      );

      setEditableQuery(mapQueryDetail(savedQuery));
      setQueryDetailData(nextQueryDetail);
      const savedParameters = getStoredParameters(savedQuery.options).filter(
        (parameter) =>
          getReferencedParameterNames(savedQuery.query).has(parameter.name),
      );
      setQueryParameters(savedParameters);
      setExecutionResult(stableExecutionResult);
      queryTextRef.current = savedQuery.query;
      updateHasQueryTextState(savedQuery.query);
      applyQueryVisualizations(savedQuery.visualizations);
      savedQuerySnapshotRef.current = buildUnsavedQuerySnapshot(
        mapQueryDetail(savedQuery),
        savedParameters,
      );
      hasUnsavedChangesRef.current = false;
      setHasUnsavedChanges(false);

      const { tableVisualization: persistedTableVisualization } =
        splitQueryVisualizations(savedQuery.visualizations);

      if (executionResult && tableVisualizationOptions.columns.length > 0) {
        await persistVisualizationForQuery(savedQuery.id, {
          type: "TABLE",
          visualizationId: persistedTableVisualization?.id ?? null,
          name: hydratedTableVisualization?.name ?? "Table",
          description: hydratedTableVisualization?.description ?? "",
          tableOptions: tableVisualizationOptions,
        });

        if (options?.successMessage) {
          setSaveMessage(options.successMessage);
        }
      } else {
        setSaveMessage(options?.successMessage ?? "Query saved.");
      }

      if (nextEditableQuery.id === null) {
        const nextQueryId = String(savedQuery.id);
        setCurrentQueryId(nextQueryId);
        window.history.replaceState(
          window.history.state,
          "",
          `/queries/${nextQueryId}/source`,
        );
      }

      return savedQuery;
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Failed to save query."));
      return null;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  useEffect(() => {
    persistQueryStateRef.current = persistQueryState;
  });

  async function updateQueryTags(nextTags: string[]) {
    const nextEditableQuery = {
      ...editableQuery,
      tags: nextTags,
    };

    setEditableQuery(nextEditableQuery);

    if (isViewMode && editableQuery.id !== null) {
      await persistQueryState(nextEditableQuery, {
        successMessage: "Tags saved.",
      });
    }
  }

  async function addTag() {
    const nextTag = tagInputValue.trim();

    if (!nextTag) {
      setTagInputOpen(false);
      setTagInputValue("");
      return;
    }

    const nextTags = editableQuery.tags.includes(nextTag)
      ? editableQuery.tags
      : [...editableQuery.tags, nextTag];

    setTagInputValue("");
    setTagInputOpen(false);

    await updateQueryTags(nextTags);
  }

  function handleTagInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void addTag();
    }

    if (event.key === "Escape") {
      setTagInputOpen(false);
      setTagInputValue("");
    }
  }

  const startDescriptionEditing = useCallback(() => {
    setDescriptionDraft(editableQuery.description ?? "");
    setIsDescriptionEditing(true);
  }, [editableQuery.description]);

  const cancelDescriptionEditing = useCallback(() => {
    setDescriptionDraft(editableQuery.description ?? "");
    setIsDescriptionEditing(false);
  }, [editableQuery.description]);

  const commitDescription = useCallback(
    async (nextDescription: string) => {
      const normalizedDescription = nextDescription.trim();
      const nextEditableQuery = {
        ...editableQuery,
        description:
          normalizedDescription.length > 0 ? normalizedDescription : null,
      };

      setIsDescriptionEditing(false);
      setEditableQuery(nextEditableQuery);

      if (isViewMode && editableQuery.id !== null) {
        await persistQueryStateRef.current?.(nextEditableQuery, {
          successMessage:
            normalizedDescription.length > 0
              ? "Description saved."
              : "Description removed.",
        });
      }
    },
    [editableQuery, isViewMode],
  );

  async function handleSaveSchedule(nextSchedule: RefreshSchedule | null) {
    setIsScheduleDialogOpen(false);
    const schedulePayload = nextSchedule as Record<string, unknown> | null;

    const nextEditableQuery = {
      ...editableQuery,
      schedule: schedulePayload,
    };

    if (editableQuery.id === null) {
      setEditableQuery(nextEditableQuery);
      setSaveMessage(
        nextSchedule
          ? "Refresh schedule will be saved with the query."
          : "Refresh schedule removed.",
      );
      return;
    }

    setIsSaving(true);
    setPageError(null);
    setSaveMessage(null);

    try {
      const savedQuery = await updateQuerySchedule(
        editableQuery.id,
        schedulePayload,
      );
      const stableExecutionResult = resolveStableExecutionResult(
        savedQuery,
        executionResultRef.current,
      );
      const nextQueryDetail = mergeQueryDetailWithStableResult(
        savedQuery,
        executionResultRef.current,
      );

      setEditableQuery(mapQueryDetail(savedQuery));
      setQueryDetailData(nextQueryDetail);
      setExecutionResult(stableExecutionResult);
      setSaveMessage(
        nextSchedule
          ? "Refresh schedule updated."
          : "Refresh schedule removed.",
      );
    } catch (error) {
      setPageError(
        getApiErrorMessage(error, "Failed to update refresh schedule."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  const handleDescriptionInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelDescriptionEditing();
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void commitDescription(descriptionDraft);
      }
    },
    [cancelDescriptionEditing, commitDescription, descriptionDraft],
  );

  function buildVisualizationPayload(
    queryIdValue: number,
    draft: VisualizationEditorDraft,
  ): SaveVisualizationPayload {
    return {
      query_id: queryIdValue,
      type: draft.type,
      name: draft.name.trim() || (draft.type === "TABLE" ? "Table" : "Chart"),
      description: draft.description,
      options:
        draft.type === "TABLE"
          ? serializeTableOptions(draft.tableOptions)
          : serializeChartOptions(draft.chartOptions),
    };
  }

  async function persistVisualizationForQuery(
    queryIdValue: number,
    draft: VisualizationEditorDraft,
  ) {
    setIsVisualizationSaving(true);

    try {
      const payload = buildVisualizationPayload(queryIdValue, draft);
      const savedVisualization =
        draft.visualizationId && draft.visualizationId > 0
          ? await updateVisualization(draft.visualizationId, payload)
          : await createVisualization(payload);

      if (draft.type === "TABLE") {
        setTableVisualization(savedVisualization);
        setActiveVisualizationTab("table");
      } else {
        setChartVisualizations((currentValue) => {
          const nextValue = currentValue.filter(
            (item) =>
              item.id !== savedVisualization.id &&
              item.id !== (draft.visualizationId ?? -1),
          );
          return [...nextValue, savedVisualization];
        });
        window.setTimeout(() => {
          setActiveVisualizationTab(savedVisualization.id);
        }, 0);
      }
      setSaveMessage("Visualization saved.");
      return savedVisualization;
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Failed to save visualization."));
      return null;
    } finally {
      setIsVisualizationSaving(false);
    }
  }

  async function handleSaveVisualization() {
    if (!visualizationDraft) {
      return;
    }

    const latestVisualizationName = visualizationNameInputRef.current;
    const normalizedDraft: VisualizationEditorDraft =
      visualizationDraft.type === "TABLE"
        ? {
            ...visualizationDraft,
            name: latestVisualizationName.trim() || "Table",
            tableOptions: normalizeTableOptions(
              executionResult?.data ?? null,
              serializeTableOptions(visualizationDraft.tableOptions),
            ),
          }
        : {
            ...visualizationDraft,
            name: latestVisualizationName.trim() || "Chart",
            chartOptions: normalizeChartOptions(
              executionResult?.data ?? null,
              serializeChartOptions(visualizationDraft.chartOptions),
            ),
          };

    if (normalizedDraft.type === "TABLE") {
      setTableVisualization((currentValue) => ({
        ...(currentValue ?? {
          id: 0,
          type: "TABLE",
          query_id: editableQuery.id ?? 0,
          name: "Table",
          description: "",
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          options: {},
        }),
        name: normalizedDraft.name,
        description: normalizedDraft.description,
        options: serializeTableOptions(normalizedDraft.tableOptions),
      }));
      setActiveVisualizationTab("table");
    }

    if (editableQuery.id) {
      await persistVisualizationForQuery(editableQuery.id, normalizedDraft);
    } else if (normalizedDraft.type === "TABLE") {
      setSaveMessage(
        "Visualization options saved locally. Save query to persist.",
      );
    } else {
      setPageError("차트 시각화는 쿼리를 먼저 저장한 뒤 추가할 수 있습니다.");
      return;
    }

    setIsVisualizationEditorOpen(false);
  }

  async function handleAddVisualizationToDashboard() {
    if (
      !selectedDashboard ||
      !activeVisualization?.id ||
      activeVisualization.id <= 0
    ) {
      return;
    }

    setIsWidgetSaving(true);

    try {
      await addWidgetToDashboard(selectedDashboard.id, activeVisualization.id);
      setIsAddToDashboardOpen(false);
      setSelectedDashboard(null);
      setDashboardSearchTerm("");
      setDashboardSearchResults([]);
      setSaveMessage("Widget added to dashboard.");
    } catch (error) {
      setPageError(
        getApiErrorMessage(error, "Failed to add dashboard widget."),
      );
    } finally {
      setIsWidgetSaving(false);
    }
  }

  async function copyToClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setSaveMessage("Copied to clipboard.");
    } catch {
      setPageError("Failed to copy to clipboard.");
    }
  }

  const handleDownloadResults = useCallback(
    (fileType: "csv" | "tsv" | "xlsx") => {
      if (!executionResult || visibleResultColumns.length === 0) {
        return;
      }

      const fileBaseName =
        (editableQuery.name || "query-results")
          .trim()
          .replaceAll(/[^a-zA-Z0-9-_]+/g, "-")
          .replaceAll(/-+/g, "-")
          .replace(/^-|-$/g, "") || "query-results";

      if (fileType === "xlsx") {
        const worksheet = XLSX.utils.json_to_sheet(
          executionResult.data.rows.map((row) =>
            Object.fromEntries(
              visibleResultColumns.map((column) => [
                column.title || column.name,
                formatVisualizationCellValue(row[column.name], column),
              ]),
            ),
          ),
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
        XLSX.writeFile(workbook, `${fileBaseName}.xlsx`);
        return;
      }

      const content = toSeparatedValues(
        visibleResultColumns,
        executionResult.data.rows,
        fileType === "csv" ? "," : "\t",
      );

      downloadBlob(
        new Blob([content], {
          type:
            fileType === "csv"
              ? "text/csv;charset=utf-8"
              : "text/tab-separated-values;charset=utf-8",
        }),
        `${fileBaseName}.${fileType}`,
      );
    },
    [editableQuery.name, executionResult, visibleResultColumns],
  );

  async function handleExecuteQuery(appliedParameters = queryParameters) {
    const currentQueryText = queryTextRef.current;
    const nextParameters =
      appliedParameters === queryParameters
        ? flushEditorDerivedState(currentQueryText)
        : appliedParameters;
    const queryText = currentQueryText.trim();

    if (!editableQuery.data_source_id || !queryText || isExecutingRef.current) {
      return;
    }

    const { missingParameters, queryText: parameterizedQueryText } =
      applyQueryParametersToText(queryText, nextParameters);

    if (missingParameters.length > 0) {
      setExecutionError(
        `Missing parameter value for: ${missingParameters.join(", ")}.`,
      );
      return;
    }

    isExecutingRef.current = true;
    executionStartedAtRef.current = Date.now();
    setIsExecuting(true);
    setExecutionError(null);

    try {
      const queuedJob = await executeQueryRequest({
        data_source_id: editableQuery.data_source_id,
        persist_latest_query_data: false,
        query: parameterizedQueryText,
        query_id: editableQuery.id,
      });

      const queryResultId = await waitForQueryExecutionResult(queuedJob.job_id);
      const queryResult = await getQueryExecutionResult(queryResultId);

      if (queryResult.data.limit?.did_cap_limit) {
        showWarning(
          "리소스 관리를 위해 LIMIT는 최대 10000건까지만 실행됩니다. 요청한 결과는 10000건으로 제한됩니다.",
        );
      }

      setExecutionResult(queryResult);
      setEditableQuery((currentValue) => ({
        ...currentValue,
        latest_query_data_id: queryResult.id,
      }));
    } catch (error) {
      setExecutionError(getApiErrorMessage(error, "Failed to execute query."));
    } finally {
      isExecutingRef.current = false;
      setIsExecuting(false);
      executionStartedAtRef.current = null;
    }
  }

  async function waitForQueryExecutionResult(jobId: string) {
    for (let attempt = 0; attempt < 600; attempt += 1) {
      const status = await getExecuteQueryJobStatus(jobId);

      if (status.state === "completed" && status.query_result_id) {
        return status.query_result_id;
      }

      if (status.state === "completed") {
        throw new Error("쿼리 결과 식별자를 찾을 수 없습니다.");
      }

      if (status.state === "failed") {
        throw new Error(status.error ?? "Failed to execute query.");
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, 500);
      });
    }

    throw new Error("쿼리 실행 시간이 초과되었습니다.");
  }

  async function handleSaveQuery() {
    await persistQueryState(editableQuery);
  }

  async function handlePublishQuery() {
    if (editableQuery.id === null || !editableQuery.is_draft) {
      return;
    }

    await persistQueryState(
      {
        ...editableQuery,
        is_draft: false,
      },
      {
        successMessage: "Query published.",
      },
    );
  }

  async function handleUnpublishQuery() {
    if (editableQuery.id === null || editableQuery.is_draft) {
      return;
    }

    await persistQueryState(
      {
        ...editableQuery,
        is_draft: true,
      },
      {
        successMessage: "Query unpublished.",
      },
    );
  }

  async function handleForkQuery() {
    if (editableQuery.id === null) {
      return;
    }

    setIsHeaderActionMenuOpen(false);
    setPageError(null);

    try {
      const forkedQuery = await forkQueryRequest(editableQuery.id);
      window.open(
        `/queries/${forkedQuery.id}/source`,
        "_blank",
        "noopener,noreferrer",
      );
      setSaveMessage("Query forked.");
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Failed to fork query."));
    }
  }

  async function handleArchiveQuery() {
    if (editableQuery.id === null) {
      return;
    }

    setIsHeaderActionMenuOpen(false);
    setIsArchiveDialogOpen(false);
    setPageError(null);

    try {
      await archiveQueryRequest(editableQuery.id);
      router.push("/queries");
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Failed to archive query."));
    }
  }

  async function handleRegenerateApiKey() {
    if (editableQuery.id === null || isApiKeyRegenerating) {
      return;
    }

    setIsApiKeyRegenerating(true);
    setPageError(null);

    try {
      const savedQuery = await regenerateQueryApiKeyRequest(editableQuery.id);
      setEditableQuery(mapQueryDetail(savedQuery));
      setQueryDetailData(savedQuery);
      setSaveMessage("API key regenerated.");
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Failed to regenerate API key."));
    } finally {
      setIsApiKeyRegenerating(false);
    }
  }

  const openApiKeyDialog = useCallback(() => {
    setIsHeaderActionMenuOpen(false);
    window.setTimeout(() => {
      setIsApiKeyDialogOpen(true);
    }, 0);
  }, []);

  const openArchiveDialog = useCallback(() => {
    setIsHeaderActionMenuOpen(false);
    window.setTimeout(() => {
      setIsArchiveDialogOpen(true);
    }, 0);
  }, []);

  async function toggleFavorite() {
    if (editableQuery.id === null || isFavoriteSaving) {
      return;
    }

    setIsFavoriteSaving(true);
    setPageError(null);

    try {
      const savedQuery = editableQuery.is_favorite
        ? await unfavoriteQueryRequest(editableQuery.id)
        : await favoriteQueryRequest(editableQuery.id);

      setEditableQuery(mapQueryDetail(savedQuery));
      setQueryDetailData(savedQuery);
      setSaveMessage(
        savedQuery.is_favorite
          ? "Added to favorites."
          : "Removed from favorites.",
      );
    } catch (error) {
      setPageError(getApiErrorMessage(error, "Failed to update favorite."));
    } finally {
      setIsFavoriteSaving(false);
    }
  }

  useEffect(() => {
    executeQueryRef.current = handleExecuteQuery;
    saveQueryRef.current = handleSaveQuery;
  });

  const commitResultPageInput = useCallback(() => {
    const parsedPage = Number(resultPageInput);

    if (!Number.isFinite(parsedPage)) {
      setResultPageInput(String(resultPage));
      return;
    }

    const nextPage = clamp(Math.floor(parsedPage), 1, totalResultPages);
    setResultPage(nextPage);
  }, [resultPage, resultPageInput, totalResultPages]);

  const handleResultPageInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitResultPageInput();
      }
    },
    [commitResultPageInput],
  );

  const handleResultSort = useCallback((columnName: string) => {
    setResultSort((currentValue) => {
      if (currentValue.column === columnName) {
        return {
          column: columnName,
          direction: currentValue.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        column: columnName,
        direction: "asc",
      };
    });
  }, []);

  useEffect(() => {
    function handleGlobalShortcuts(event: KeyboardEvent) {
      const isMetaShortcut = event.metaKey || event.ctrlKey;

      if (!isMetaShortcut) {
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;

      if (activeElement?.closest(".monaco-editor")) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void executeQueryRef.current?.();
      }

      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        openAddParameterDialog();
      }

      if (event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        handleFormatQuery();
      }

      if (event.altKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setIsResultFullscreen((currentValue) => !currentValue);
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveQueryRef.current?.();
      }
    }

    window.addEventListener("keydown", handleGlobalShortcuts, true);

    return () => {
      window.removeEventListener("keydown", handleGlobalShortcuts, true);
    };
  }, [handleFormatQuery, openAddParameterDialog]);

  const shouldShowTagAction =
    tagInputOpen || isViewMode || editableQuery.tags.length > 0;
  const canExecuteInViewMode = Boolean(
    editableQuery.data_source_id &&
      viewModeHasQueryText &&
      !hasDirtyParameters &&
      selectedDataSource?.can_execute_query,
  );
  const canUseSavedVisualization = Boolean(
    editableQuery.id && activeVisualization?.id && activeVisualization.id > 0,
  );
  const handleToggleDataSourceMenu = useCallback(() => {
    if (!canManageQuery) {
      return;
    }

    setIsDataSourceMenuOpen((currentValue) => !currentValue);
  }, [canManageQuery]);
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const nextValue = value ?? "";
      queryTextRef.current = nextValue;
      updateHasQueryTextState(nextValue);
      scheduleEditorDerivedStateSync(nextValue);
    },
    [scheduleEditorDerivedStateSync, updateHasQueryTextState],
  );
  const handleExecuteFromEditorShell = useCallback(() => {
    void executeQueryRef.current?.();
  }, []);
  const handleSaveFromEditorShell = useCallback(() => {
    void saveQueryRef.current?.();
  }, []);
  const handleDataSourceSearchChange = useCallback((nextValue: string) => {
    setDataSourceSearch(nextValue);
  }, []);
  const handleSchemaFilterChange = useCallback((nextValue: string) => {
    setSchemaFilter(nextValue);
  }, []);
  const handleOpenSchemaDiagram = useCallback(() => {
    setDiagramTableName(null);
    setIsDiagramOpen(true);
  }, []);
  const handleOpenTableSchemaDiagram = useCallback((tableName: string) => {
    setDiagramTableName(tableName);
    setIsDiagramOpen(true);
  }, []);
  const handleSelectDataSource = useCallback((dataSource: DataSourceSummary) => {
    if (!canManageQuery) {
      return;
    }

    setEditableQuery((currentValue) => {
      const didChange = currentValue.data_source_id !== dataSource.id;

      if (didChange) {
        setExecutionResult(null);
      }

      return {
        ...currentValue,
        data_source_id: dataSource.id,
        latest_query_data_id: didChange
          ? null
          : currentValue.latest_query_data_id,
      };
    });
    setIsDataSourceMenuOpen(false);
  }, [canManageQuery]);
  const handleDescriptionDraftChange = useCallback((nextValue: string) => {
    setDescriptionDraft(nextValue);
  }, []);
  const openScheduleDialog = useCallback(() => {
    setIsScheduleDialogOpen(true);
  }, []);
  const handleToggleActionMenu = useCallback(() => {
    setIsActionMenuOpen((currentValue) => !currentValue);
  }, []);
  const handleOpenAddToDashboard = useCallback(() => {
    setIsActionMenuOpen(false);
    setIsAddToDashboardOpen(true);
  }, []);
  const handleOpenEmbed = useCallback(() => {
    setIsActionMenuOpen(false);
    setIsEmbedOpen(true);
  }, []);
  const handleToggleResultFullscreen = useCallback(() => {
    setIsResultFullscreen((currentValue) => !currentValue);
  }, []);
  const handleVisualizationTabChange = useCallback(
    (nextTab: ActiveVisualizationTab) => {
      setActiveVisualizationTab(nextTab);
    },
    [],
  );
  const handleResultPageChange = useCallback((nextPage: number) => {
    setResultPage(nextPage);
  }, []);
  const handleResultPageInputChange = useCallback((nextValue: string) => {
    setResultPageInput(nextValue);
  }, []);
  const handleResultPageSizeChange = useCallback((nextSize: number) => {
    setResultPageSize(nextSize);
  }, []);

  const openVisualizationEditor = useCallback(
    (mode: "edit" | "create-chart" = "edit") => {
      if (!executionResult) {
        return;
      }

      setExpandedVisualizationColumn(null);
      setDraggedVisualizationColumn(null);

      if (mode === "create-chart") {
        if (!editableQuery.id) {
          setPageError(
            "차트 시각화는 쿼리를 먼저 저장한 뒤 추가할 수 있습니다.",
          );
          return;
        }

        setVisualizationDraft({
          type: "CHART",
          visualizationId: null,
          name: "Chart",
          description: "",
          chartOptions: buildDefaultChartOptions(executionResult.data),
        });
        setIsVisualizationEditorOpen(true);
        return;
      }

      if (getVisualizationKind(activeVisualization) === "CHART") {
        setVisualizationDraft({
          type: "CHART",
          visualizationId: activeVisualization?.id ?? null,
          name: activeVisualization?.name ?? "Chart",
          description: activeVisualization?.description ?? "",
          chartOptions: normalizeChartOptions(
            executionResult.data,
            activeVisualization?.options,
          ),
        });
        setIsVisualizationEditorOpen(true);
        return;
      }

      setVisualizationDraft({
        type: "TABLE",
        visualizationId: tableVisualization?.id ?? null,
        name: hydratedTableVisualization?.name ?? "Table",
        description: hydratedTableVisualization?.description ?? "",
        tableOptions: tableVisualizationOptions,
      });
      setIsVisualizationEditorOpen(true);
    },
    [
      activeVisualization,
      editableQuery.id,
      executionResult,
      hydratedTableVisualization,
      tableVisualization,
      tableVisualizationOptions,
    ],
  );

  function updateVisualizationDraftColumn(
    columnName: string,
    updater: (
      column: TableVisualizationColumnOption,
    ) => TableVisualizationColumnOption,
  ) {
    setVisualizationDraft((currentValue) => {
      if (!currentValue || currentValue.type !== "TABLE") {
        return currentValue;
      }

      return {
        ...currentValue,
        tableOptions: {
          columns: currentValue.tableOptions.columns.map((column) =>
            column.name === columnName ? updater(column) : column,
          ),
        },
      };
    });
  }

  function moveVisualizationDraftColumn(columnName: string, direction: -1 | 1) {
    setVisualizationDraft((currentValue) => {
      if (!currentValue || currentValue.type !== "TABLE") {
        return currentValue;
      }

      const index = currentValue.tableOptions.columns.findIndex(
        (column) => column.name === columnName,
      );

      if (index < 0) {
        return currentValue;
      }

      const nextIndex = index + direction;

      if (
        nextIndex < 0 ||
        nextIndex >= currentValue.tableOptions.columns.length
      ) {
        return currentValue;
      }

      const nextColumns = [...currentValue.tableOptions.columns];
      const [selectedColumn] = nextColumns.splice(index, 1);
      nextColumns.splice(nextIndex, 0, selectedColumn);

      return {
        ...currentValue,
        tableOptions: { columns: nextColumns },
      };
    });
  }

  function moveVisualizationDraftColumnToIndex(
    columnName: string,
    targetColumnName: string,
  ) {
    if (columnName === targetColumnName) {
      return;
    }

    setVisualizationDraft((currentValue) => {
      if (!currentValue || currentValue.type !== "TABLE") {
        return currentValue;
      }

      const fromIndex = currentValue.tableOptions.columns.findIndex(
        (column) => column.name === columnName,
      );
      const targetIndex = currentValue.tableOptions.columns.findIndex(
        (column) => column.name === targetColumnName,
      );

      if (fromIndex < 0 || targetIndex < 0) {
        return currentValue;
      }

      const nextColumns = [...currentValue.tableOptions.columns];
      const [selectedColumn] = nextColumns.splice(fromIndex, 1);
      nextColumns.splice(targetIndex, 0, selectedColumn);

      return {
        ...currentValue,
        tableOptions: { columns: nextColumns },
      };
    });
  }

  function updateChartVisualizationDraft(
    updater: (options: ChartVisualizationOptions) => ChartVisualizationOptions,
  ) {
    setVisualizationDraft((currentValue) => {
      if (!currentValue || currentValue.type !== "CHART") {
        return currentValue;
      }

      return {
        ...currentValue,
        chartOptions: updater(currentValue.chartOptions),
      };
    });
  }

  const updateVisualizationNameDraftRef = useCallback((nextValue: string) => {
    visualizationNameInputRef.current = nextValue;
  }, []);

  const commitVisualizationName = useCallback((nextValue: string) => {
    visualizationNameInputRef.current = nextValue;
    setVisualizationDraft((currentValue) =>
      currentValue ? { ...currentValue, name: nextValue } : currentValue,
    );
  }, []);

  function startSchemaResize() {
    resizeModeRef.current = "schema";
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  const renderParameterInput = useCallback((parameter: QueryParameterState) => {
    const currentValue = getCurrentParameterValue(parameter);
    const isDirty = parameterHasPendingValue(parameter);
    const inputClassName = `h-[38px] w-full rounded-[2px] border px-3 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff] ${
      isDirty ? "border-[#e6d88d] bg-[#f7f4bd]" : "border-[#d9d9d9] bg-white"
    }`;

    if (parameter.type === "text") {
      return (
        <input
          className={inputClassName}
          onChange={(event) =>
            updateParameterPendingValue(parameter.name, event.target.value)
          }
          value={typeof currentValue === "string" ? currentValue : ""}
        />
      );
    }

    if (parameter.type === "number") {
      return (
        <input
          className={inputClassName}
          onChange={(event) =>
            updateParameterPendingValue(parameter.name, event.target.value)
          }
          type="number"
          value={
            typeof currentValue === "number" || typeof currentValue === "string"
              ? currentValue
              : ""
          }
        />
      );
    }

    if (parameter.type === "enum") {
      const enumOptions = getEnumOptions(parameter);

      if (parameter.multiValuesOptions) {
        return (
          <select
            className={`${inputClassName} h-[78px]`}
            multiple
            onChange={(event) =>
              updateParameterPendingValue(
                parameter.name,
                Array.from(event.target.selectedOptions).map(
                  (option) => option.value,
                ),
              )
            }
            value={Array.isArray(currentValue) ? currentValue : []}
          >
            {enumOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      }

      return (
        <select
          className={inputClassName}
          onChange={(event) =>
            updateParameterPendingValue(parameter.name, event.target.value)
          }
          value={typeof currentValue === "string" ? currentValue : ""}
        >
          {enumOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    if (isDateRangeParameterType(parameter.type)) {
      const currentRangeValue = isRangeValue(currentValue)
        ? currentValue
        : { start: "", end: "" };
      const presetItems = DATE_RANGE_PRESETS;
      const pendingRange = pendingCalendarRanges[parameter.name];
      const displayRangeValue = pendingRange?.start
        ? {
            start: pendingRange.start,
            end: pendingRange.end ?? "",
          }
        : currentRangeValue;
      const selectedRange: CalendarDateRange | undefined = pendingRange?.start
        ? {
            from: parseStoredDateValue(pendingRange.start) ?? undefined,
            to: pendingRange.end
              ? (parseStoredDateValue(pendingRange.end) ?? undefined)
              : undefined,
          }
        : currentRangeValue.start && currentRangeValue.end
          ? {
              from: parseStoredDateValue(currentRangeValue.start) ?? undefined,
              to: parseStoredDateValue(currentRangeValue.end) ?? undefined,
            }
          : undefined;
      const showTimeSelectors = parameter.type !== "date-range";

      return (
        <div className="relative" data-parameter-popover-root>
          <div
            className={`flex items-center overflow-hidden rounded-[2px] border ${
              isDirty
                ? "border-[#e6d88d] bg-[#f7f4bd]"
                : "border-[#d9d9d9] bg-white"
            }`}
          >
            <button
              className="flex h-[38px] min-w-0 flex-1 items-center px-3 text-left text-[13px] text-[#595959] outline-none"
              onClick={() => openParameterCalendar(parameter)}
              type="button"
            >
              <span className="truncate">
                {displayRangeValue.start || "Start date"}
              </span>
              <span className="px-3 text-[#bfbfbf]">→</span>
              <span className="truncate">
                {displayRangeValue.end || "End date"}
              </span>
            </button>
            {parameter.type !== "date-range" ? (
              <button
                className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center border-l border-[#e8e8e8] text-[#7d7d7d] transition hover:text-[#1890ff]"
                onClick={() => openParameterCalendar(parameter)}
                type="button"
              >
                <CalendarOutlined />
              </button>
            ) : null}
            <button
              className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center border-l border-[#e8e8e8] text-[#7d7d7d] transition hover:text-[#1890ff]"
              onClick={() => {
                setOpenParameterCalendarMenu(null);
                setOpenParameterPresetMenu((currentMenu) =>
                  currentMenu === parameter.name ? null : parameter.name,
                );
              }}
              type="button"
            >
              <ThunderboltOutlined />
            </button>
          </div>
          {openParameterPresetMenu === parameter.name ? (
            <div className="absolute left-0 top-[calc(100%+4px)] z-30 min-w-[220px] rounded-[2px] border border-[#d9d9d9] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
              {presetItems.map((item) => (
                <button
                  key={item.key}
                  className="block w-full px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9]"
                  onClick={() => {
                    updateParameterPendingValue(
                      parameter.name,
                      buildDatePresetValue(parameter.type, item.key),
                    );
                    setOpenParameterPresetMenu(null);
                  }}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
          {openParameterCalendarMenu === parameter.name ? (
            <div className="absolute left-0 top-[calc(100%+8px)] z-30 rounded-[2px] border border-[#d9d9d9] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
              <DayPicker
                classNames={SHARED_DAY_PICKER_CLASS_NAMES}
                defaultMonth={
                  parseStoredDateValue(displayRangeValue.start) ?? new Date()
                }
                mode="range"
                numberOfMonths={2}
                onDayClick={(day) =>
                  handleParameterRangeDaySelect(parameter, day)
                }
                selected={selectedRange}
                showOutsideDays
              />
              {showTimeSelectors ? (
                <div className="mt-4 grid gap-4 border-t border-[#f0f0f0] pt-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-[12px] font-medium text-[#7d7d7d]">
                      Start time
                    </div>
                    {renderTimeSelectors({
                      onChange: (updates) =>
                        updateRangeTemporalValue(parameter, "start", updates),
                      type: parameter.type,
                      value: displayRangeValue.start,
                    })}
                  </div>
                  <div>
                    <div className="mb-2 text-[12px] font-medium text-[#7d7d7d]">
                      End time
                    </div>
                    {renderTimeSelectors({
                      onChange: (updates) =>
                        updateRangeTemporalValue(parameter, "end", updates),
                      type: parameter.type,
                      value: displayRangeValue.end,
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      );
    }

    if (isDateParameterType(parameter.type)) {
      const presetItems = DATE_PRESETS;
      const selectedDate =
        typeof currentValue === "string"
          ? parseStoredDateValue(currentValue)
          : undefined;
      const showTimeSelectors = parameter.type !== "date";

      return (
        <div className="relative" data-parameter-popover-root>
          <div
            className={`flex items-center overflow-hidden rounded-[2px] border ${
              isDirty
                ? "border-[#e6d88d] bg-[#f7f4bd]"
                : "border-[#d9d9d9] bg-white"
            }`}
          >
            <button
              className="flex h-[38px] min-w-0 flex-1 items-center px-3 text-left text-[13px] text-[#595959] outline-none"
              onClick={() => {
                setOpenParameterPresetMenu(null);
                setOpenParameterCalendarMenu((currentMenu) =>
                  currentMenu === parameter.name ? null : parameter.name,
                );
              }}
              type="button"
            >
              {typeof currentValue === "string" && currentValue
                ? currentValue
                : "Select date"}
            </button>
            {showTimeSelectors ? (
              <button
                className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center border-l border-[#e8e8e8] text-[#7d7d7d] transition hover:text-[#1890ff]"
                onClick={() => {
                  setOpenParameterPresetMenu(null);
                  setOpenParameterCalendarMenu((currentMenu) =>
                    currentMenu === parameter.name ? null : parameter.name,
                  );
                }}
                type="button"
              >
                <CalendarOutlined />
              </button>
            ) : null}
            <button
              className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center border-l border-[#e8e8e8] text-[#7d7d7d] transition hover:text-[#1890ff]"
              onClick={() => {
                setOpenParameterCalendarMenu(null);
                setOpenParameterPresetMenu((currentMenu) =>
                  currentMenu === parameter.name ? null : parameter.name,
                );
              }}
              type="button"
            >
              <ThunderboltOutlined />
            </button>
          </div>
          {openParameterPresetMenu === parameter.name ? (
            <div className="absolute left-0 top-[calc(100%+4px)] z-30 min-w-[180px] rounded-[2px] border border-[#d9d9d9] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
              {presetItems.map((item) => (
                <button
                  key={item.key}
                  className="block w-full px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9]"
                  onClick={() => {
                    updateParameterPendingValue(
                      parameter.name,
                      buildDatePresetValue(parameter.type, item.key),
                    );
                    setOpenParameterPresetMenu(null);
                  }}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
          {openParameterCalendarMenu === parameter.name ? (
            <div className="absolute left-0 top-[calc(100%+8px)] z-30 rounded-[2px] border border-[#d9d9d9] bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
              <DayPicker
                classNames={SHARED_DAY_PICKER_CLASS_NAMES}
                defaultMonth={selectedDate ?? new Date()}
                mode="single"
                numberOfMonths={2}
                onSelect={(date) => {
                  if (!date) {
                    updateParameterPendingValue(parameter.name, null);
                    return;
                  }

                  updateSingleTemporalValue(parameter, {
                    date: formatDate(date, "yyyy-MM-dd"),
                  });

                  if (parameter.type === "date") {
                    setOpenParameterCalendarMenu(null);
                  }
                }}
                selected={selectedDate ?? undefined}
                showOutsideDays
              />
              {showTimeSelectors
                ? renderTimeSelectors({
                    onChange: (updates) =>
                      updateSingleTemporalValue(parameter, updates),
                    type: parameter.type,
                    value:
                      typeof currentValue === "string" ? currentValue : null,
                  })
                : null}
            </div>
          ) : null}
        </div>
      );
    }

    return null;
  }, [
    handleParameterRangeDaySelect,
    openParameterCalendar,
    openParameterCalendarMenu,
    openParameterPresetMenu,
    pendingCalendarRanges,
    renderTimeSelectors,
    updateParameterPendingValue,
    updateRangeTemporalValue,
    updateSingleTemporalValue,
  ]);

  useEffect(() => {
    openEditParameterDialogRef.current = openEditParameterDialog;
    applyParameterChangesRef.current = async () => {
      await handleApplyParameterChanges();
    };
  });

  const visualizationEditorDialog =
    isVisualizationEditorOpen && executionResult && visualizationDraft ? (
      <OverlayDialog
        dialogClassName="max-w-none"
        dialogStyle={{
          width: "95vw",
          maxWidth: "95vw",
          height: "95vh",
        }}
        onClose={() => setIsVisualizationEditorOpen(false)}
        title="Visualization Editor"
        footer={
          <>
            <button
              className="inline-flex h-[32px] items-center rounded-[2px] border border-[#d9d9d9] bg-white px-4 text-[13px] text-[#595959]"
              onClick={() => setIsVisualizationEditorOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-[32px] items-center rounded-[2px] bg-[#1890ff] px-4 text-[13px] text-white"
              onClick={() => void handleSaveVisualization()}
              type="button"
            >
              {isVisualizationSaving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="grid h-full min-h-0 gap-6 xl:grid-cols-[38%_1fr]">
          <div className="min-h-0">
            <div className="mb-4">
              <label className="mb-2 block text-[14px] text-[#595959]">
                Visualization Type
              </label>
              <input
                className="h-[38px] w-full rounded-[2px] border border-[#d9d9d9] bg-[#f5f5f5] px-3 text-[13px] text-[#9a9a9a]"
                disabled
                value={visualizationDraft.type === "TABLE" ? "Table" : "Chart"}
              />
            </div>
            <div className="mb-5">
              <label className="mb-2 block text-[14px] text-[#595959]">
                Visualization Name
              </label>
              <VisualizationNameField
                onCommit={commitVisualizationName}
                onDraftChange={updateVisualizationNameDraftRef}
                value={visualizationDraft.name}
              />
            </div>

            <div className="max-h-[calc(95vh-220px)] overflow-y-auto pr-2">
              {visualizationDraft.type === "TABLE" ? (
                visualizationDraft.tableOptions.columns.map((column, index) => {
                  const isExpanded =
                    expandedVisualizationColumn === column.name;

                  return (
                    <div
                      key={column.name}
                      className={`border-b border-[#efefef] py-3 ${
                        draggedVisualizationColumn === column.name
                          ? "bg-[#f5f7f9]"
                          : ""
                      }`}
                      onDragOver={(event) => {
                        if (!draggedVisualizationColumn) {
                          return;
                        }

                        event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();

                        if (!draggedVisualizationColumn) {
                          return;
                        }

                        moveVisualizationDraftColumnToIndex(
                          draggedVisualizationColumn,
                          column.name,
                        );
                        setDraggedVisualizationColumn(null);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          className="cursor-grab text-[#bfbfbf] active:cursor-grabbing"
                          draggable
                          onDragEnd={() => setDraggedVisualizationColumn(null)}
                          onDragStart={() =>
                            setDraggedVisualizationColumn(column.name)
                          }
                          type="button"
                        >
                          <HolderOutlined />
                        </button>
                        <button
                          className="flex-1 text-left text-[14px] text-[#323232]"
                          onClick={() =>
                            setExpandedVisualizationColumn((currentValue) =>
                              currentValue === column.name ? null : column.name,
                            )
                          }
                          type="button"
                        >
                          {column.title || column.name}
                        </button>
                        <button
                          className="text-[#595959] transition hover:text-[#1890ff]"
                          onClick={() =>
                            updateVisualizationDraftColumn(
                              column.name,
                              (currentColumn) => ({
                                ...currentColumn,
                                visible: !currentColumn.visible,
                              }),
                            )
                          }
                          type="button"
                        >
                          {column.visible ? (
                            <EyeOutlined />
                          ) : (
                            <EyeInvisibleOutlined />
                          )}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            className="text-[#8c8c8c] transition hover:text-[#1890ff] disabled:text-[#d9d9d9]"
                            disabled={index === 0}
                            onClick={() =>
                              moveVisualizationDraftColumn(column.name, -1)
                            }
                            type="button"
                          >
                            ↑
                          </button>
                          <button
                            className="text-[#8c8c8c] transition hover:text-[#1890ff] disabled:text-[#d9d9d9]"
                            disabled={
                              index ===
                              visualizationDraft.tableOptions.columns.length - 1
                            }
                            onClick={() =>
                              moveVisualizationDraftColumn(column.name, 1)
                            }
                            type="button"
                          >
                            ↓
                          </button>
                        </div>
                        <button
                          className="text-[#595959] transition hover:text-[#1890ff]"
                          onClick={() =>
                            setExpandedVisualizationColumn((currentValue) =>
                              currentValue === column.name ? null : column.name,
                            )
                          }
                          type="button"
                        >
                          {isExpanded ? <DownOutlined /> : <RightOutlined />}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="mt-4 space-y-4 pl-8">
                          <input
                            className="h-[38px] w-full rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
                            onChange={(event) =>
                              updateVisualizationDraftColumn(
                                column.name,
                                (currentColumn) => ({
                                  ...currentColumn,
                                  title: event.target.value,
                                }),
                              )
                            }
                            value={column.title}
                          />
                          <div className="flex overflow-hidden rounded-[2px] border border-[#d9d9d9]">
                            {(["left", "center", "right"] as const).map(
                              (align) => (
                                <button
                                  key={align}
                                  className={`flex flex-1 items-center justify-center px-4 py-2 text-[13px] ${
                                    column.align === align
                                      ? "bg-[#e6f7ff] text-[#1890ff]"
                                      : "bg-white text-[#595959]"
                                  }`}
                                  onClick={() =>
                                    updateVisualizationDraftColumn(
                                      column.name,
                                      (currentColumn) => ({
                                        ...currentColumn,
                                        align,
                                      }),
                                    )
                                  }
                                  type="button"
                                >
                                  <span
                                    className={`flex h-[16px] w-[18px] flex-col justify-center gap-[2px] ${
                                      align === "center"
                                        ? "items-center"
                                        : align === "right"
                                          ? "items-end"
                                          : "items-start"
                                    }`}
                                  >
                                    <span className="block h-[2px] w-[14px] bg-current" />
                                    <span className="block h-[2px] w-[10px] bg-current" />
                                    <span className="block h-[2px] w-[14px] bg-current" />
                                  </span>
                                </button>
                              ),
                            )}
                          </div>
                          <label className="flex items-center gap-2 text-[13px] text-[#595959]">
                            <input
                              checked={column.useForSearch}
                              onChange={(event) =>
                                updateVisualizationDraftColumn(
                                  column.name,
                                  (currentColumn) => ({
                                    ...currentColumn,
                                    useForSearch: event.target.checked,
                                  }),
                                )
                              }
                              type="checkbox"
                            />
                            Use for search
                          </label>
                          <div>
                            <label className="mb-2 block text-[14px] text-[#595959]">
                              Description
                            </label>
                            <input
                              className="h-[38px] w-full rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
                              onChange={(event) =>
                                updateVisualizationDraftColumn(
                                  column.name,
                                  (currentColumn) => ({
                                    ...currentColumn,
                                    description: event.target.value,
                                  }),
                                )
                              }
                              value={column.description}
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-[14px] text-[#595959]">
                              Display as:
                            </label>
                            <select
                              className="h-[38px] w-full rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
                              onChange={(event) =>
                                updateVisualizationDraftColumn(
                                  column.name,
                                  (currentColumn) => ({
                                    ...currentColumn,
                                    displayAs: event.target
                                      .value as TableColumnDisplay,
                                  }),
                                )
                              }
                              value={column.displayAs}
                            >
                              <option value="text">Text</option>
                              <option value="number">Number</option>
                              <option value="date">Date</option>
                              <option value="datetime">Date/Time</option>
                              <option value="boolean">Boolean</option>
                              <option value="link">Link</option>
                              <option value="image">Image</option>
                              <option value="json">JSON</option>
                            </select>
                          </div>
                          <label className="flex items-center gap-2 text-[13px] text-[#595959]">
                            <input
                              checked={column.allowHtml}
                              onChange={(event) =>
                                updateVisualizationDraftColumn(
                                  column.name,
                                  (currentColumn) => ({
                                    ...currentColumn,
                                    allowHtml: event.target.checked,
                                  }),
                                )
                              }
                              type="checkbox"
                            />
                            Allow HTML content
                          </label>
                          <label className="flex items-center gap-2 text-[13px] text-[#595959]">
                            <input
                              checked={column.highlightLinks}
                              onChange={(event) =>
                                updateVisualizationDraftColumn(
                                  column.name,
                                  (currentColumn) => ({
                                    ...currentColumn,
                                    highlightLinks: event.target.checked,
                                  }),
                                )
                              }
                              type="checkbox"
                            />
                            Highlight links
                          </label>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-[14px] text-[#595959]">
                      Chart Type
                    </label>
                    <select
                      className="h-[38px] w-full rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
                      onChange={(event) =>
                        updateChartVisualizationDraft((currentValue) => ({
                          ...currentValue,
                          chartType: event.target
                            .value as ChartVisualizationType,
                        }))
                      }
                      value={visualizationDraft.chartOptions.chartType}
                    >
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                      <option value="pie">Pie</option>
                      <option value="stackedBar">Stacked Bar</option>
                      <option value="stackedArea">Stacked Area</option>
                      <option value="composed">Composed</option>
                      <option value="scatter">Scatter</option>
                      <option value="radar">Radar</option>
                      <option value="radialBar">Radial Bar</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[14px] text-[#595959]">
                      X Column
                    </label>
                    <select
                      className="h-[38px] w-full rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
                      onChange={(event) =>
                        updateChartVisualizationDraft((currentValue) => ({
                          ...currentValue,
                          xColumn: event.target.value,
                          yColumns: currentValue.yColumns.filter(
                            (column) => column !== event.target.value,
                          ),
                        }))
                      }
                      value={visualizationDraft.chartOptions.xColumn}
                    >
                      {executionResult.data.columns.map((column) => (
                        <option key={column.name} value={column.name}>
                          {column.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-[14px] text-[#595959]">
                      Y Columns
                    </label>
                    <div className="mb-2 text-[12px] text-[#8c8c8c]">
                      You can select multiple. Numeric columns are best suited,
                      but other columns can also be selected.
                    </div>
                    <div className="max-h-[220px] space-y-2 overflow-y-auto rounded-[2px] border border-[#e8e8e8] bg-white p-3">
                      {getChartSelectableColumns(executionResult.data)
                        .filter(
                          (column) =>
                            column.name !==
                            visualizationDraft.chartOptions.xColumn,
                        )
                        .map((column) => {
                          const checked =
                            visualizationDraft.chartOptions.yColumns.includes(
                              column.name,
                            );

                          return (
                            <label
                              key={column.name}
                              className="flex items-center gap-2 text-[13px] text-[#595959]"
                            >
                              <input
                                checked={checked}
                                onChange={(event) =>
                                  updateChartVisualizationDraft(
                                    (currentValue) => ({
                                      ...currentValue,
                                      yColumns: event.target.checked
                                        ? Array.from(
                                            new Set([
                                              ...currentValue.yColumns,
                                              column.name,
                                            ]),
                                          )
                                        : currentValue.yColumns.filter(
                                            (item) => item !== column.name,
                                          ),
                                    }),
                                  )
                                }
                                type="checkbox"
                              />
                              <span className="flex items-center gap-2">
                                <span>{column.name}</span>
                                <span className="text-[11px] text-[#b0b0b0]">
                                  {column.type ?? "unknown"}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-[13px] text-[#595959]">
                    <input
                      checked={visualizationDraft.chartOptions.showLegend}
                      onChange={(event) =>
                        updateChartVisualizationDraft((currentValue) => ({
                          ...currentValue,
                          showLegend: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    Show legend
                  </label>

                  {visualizationDraft.chartOptions.chartType === "bar" ? (
                    <label className="flex items-center gap-2 text-[13px] text-[#595959]">
                      <input
                        checked={visualizationDraft.chartOptions.horizontal}
                        onChange={(event) =>
                          updateChartVisualizationDraft((currentValue) => ({
                            ...currentValue,
                            horizontal: event.target.checked,
                          }))
                        }
                        type="checkbox"
                      />
                      Horizontal chart
                    </label>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0">
            <div className="h-full min-h-0 overflow-auto rounded-[2px] border border-[#e8e8e8] bg-white">
              {visualizationDraft.type === "TABLE" ? (
                <table className="min-w-full w-max border-collapse text-[13px] text-[#595959]">
                  <thead>
                    <tr className="border-b border-[#e8e8e8] bg-[#fafafa]">
                      {getVisibleVisualizationColumns(
                        executionResult.data,
                        visualizationDraft.tableOptions,
                      ).map((column) => (
                        <th
                          key={column.name}
                          className={`whitespace-nowrap px-3 py-2 font-medium text-[#333] ${
                            column.align === "right"
                              ? "text-right"
                              : column.align === "center"
                                ? "text-center"
                                : "text-left"
                          }`}
                          title={column.description || undefined}
                        >
                          {column.title || column.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {executionResult.data.rows.slice(0, 10).map((row, rowIndex) => (
                      <tr
                        key={`preview-${rowIndex}`}
                        className="border-b border-[#f0f0f0]"
                      >
                        {getVisibleVisualizationColumns(
                          executionResult.data,
                          visualizationDraft.tableOptions,
                        ).map((column) => (
                          <td
                            key={`${rowIndex}-${column.name}`}
                            className={`whitespace-nowrap px-3 py-2 ${
                              column.align === "right"
                                ? "text-right"
                                : column.align === "center"
                                  ? "text-center"
                                  : "text-left"
                            }`}
                          >
                            {renderVisualizationCellContent(
                              row[column.name],
                              column,
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full min-h-[720px] p-6">
                  {renderChartVisualization(
                    executionResult.data,
                    visualizationDraft.chartOptions,
                    620,
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </OverlayDialog>
    ) : null;

  if (isInitialLoading) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] items-center justify-center bg-[#f6f8f9] text-[14px] text-[#767676]">
        Loading query editor...
      </div>
    );
  }

  if (isViewMode) {
    return (
      <div className="relative flex min-h-[calc(100vh-50px)] w-full flex-col bg-[#f6f8f9]">
        <div className="px-[15px] pt-[15px] pb-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[8px]">
              <button
                aria-label={
                  editableQuery.is_favorite
                    ? "Remove from favorites"
                    : "Add to favorites"
                }
                className={`text-[18px] transition hover:text-[#f5c342] ${
                  editableQuery.is_favorite
                    ? "text-[#f5c342]"
                    : "text-[#d2d2d2]"
                } ${isFavoriteSaving ? "cursor-wait opacity-60" : ""}`}
                disabled={isFavoriteSaving || editableQuery.id === null}
                onClick={() => void toggleFavorite()}
                type="button"
              >
                {editableQuery.is_favorite ? "★" : "☆"}
              </button>
              <h1 className="truncate text-[24px] font-normal leading-[32px] text-[#323232]">
                {editableQuery.name || "New Query"}
              </h1>
              {editableQuery.is_draft ? (
                <span className="inline-flex items-center rounded-[3px] bg-[#eef2f4] px-[7px] py-[2px] text-[12px] leading-[16px] text-[#8aa1b2]">
                  Unpublished
                </span>
              ) : null}
              {editableQuery.is_archived ? (
                <span className="inline-flex items-center rounded-[3px] bg-[#fa8c16] px-[7px] py-[2px] text-[12px] leading-[16px] text-white">
                  Archived
                </span>
              ) : null}
              {editableQuery.tags.map((tag) => (
                <QueryTagChip
                  key={tag}
                  onRemove={
                    canManageQuery
                      ? () =>
                          void updateQueryTags(
                            editableQuery.tags.filter(
                              (currentTag) => currentTag !== tag,
                            ),
                          )
                      : undefined
                  }
                  tag={tag}
                />
              ))}
              {canManageQuery && tagInputOpen ? (
                <input
                  autoFocus
                  className="h-[32px] w-[140px] rounded-[2px] border border-[#d9d9d9] bg-white px-2 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
                  onBlur={() => void addTag()}
                  onChange={(event) => setTagInputValue(event.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Add tag"
                  value={tagInputValue}
                />
              ) : canManageQuery && shouldShowTagAction ? (
                <button
                  className="inline-flex h-[24px] items-center rounded-[2px] bg-[#dfe7eb] px-[9px] text-[12px] text-[#5f6f7a] transition hover:bg-[#d1dade]"
                  onClick={() => setTagInputOpen(true)}
                  type="button"
                >
                  + Add tag
                </button>
              ) : null}
              {!editableQuery.description && !isDescriptionEditing ? (
                <button
                  className="inline-flex h-[24px] items-center rounded-[2px] bg-[#dfe7eb] px-[9px] text-[12px] text-[#5f6f7a] transition hover:bg-[#d1dade]"
                  onClick={startDescriptionEditing}
                  type="button"
                >
                  + Add description
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {editableQuery.id !== null &&
              editableQuery.is_draft &&
              !editableQuery.is_archived &&
              canManageQuery ? (
                <button
                  className={`inline-flex h-[32px] items-center gap-1 rounded-[2px] px-3 text-[13px] transition ${
                    isSaving
                      ? "cursor-not-allowed border border-[#d9d9d9] bg-[#f5f5f5] text-[#bfbfbf]"
                      : "border border-transparent bg-[#1890ff] text-white shadow-[0_2px_0_rgba(0,0,0,0.045)] hover:bg-[#40a9ff]"
                  }`}
                  disabled={isSaving}
                  onClick={() => void handlePublishQuery()}
                  type="button"
                >
                  Publish
                </button>
              ) : null}
              <button
                className={`inline-flex h-[32px] items-center gap-1 rounded-[2px] px-3 text-[13px] transition ${
                  !canExecuteInViewMode || isExecuting
                    ? "cursor-not-allowed border border-[#d9d9d9] bg-[#f5f5f5] text-[#bfbfbf]"
                    : "border border-transparent bg-[#1890ff] text-white shadow-[0_2px_0_rgba(0,0,0,0.045)] hover:bg-[#40a9ff]"
                }`}
                disabled={!canExecuteInViewMode || isExecuting}
                onClick={() => void handleExecuteQuery()}
                type="button"
              >
                {isExecuting ? <LoadingOutlined /> : <ReloadOutlined />}
                {isExecuting ? (
                  executionStartedAtRef.current !== null ? (
                    <ExecutingDurationLabel
                      startedAt={executionStartedAtRef.current}
                    />
                  ) : (
                    "실행 중"
                  )
                ) : (
                  "Refresh"
                )}
              </button>
              {editableQuery.id !== null ? (
                <button
                  className="inline-flex h-[32px] items-center gap-1 rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-[13px] text-[#595959] transition hover:border-[#40a9ff] hover:text-[#1890ff]"
                  onClick={() =>
                    navigateWithUnsavedChangesCheck(
                      `/queries/${currentQueryId}/source`,
                    )
                  }
                  type="button"
                >
                  <CodeOutlined />
                  {canEditQuery ? "Edit Source" : "View Source"}
                </button>
              ) : null}
              {editableQuery.id !== null && (canEditQuery || canForkQuery) ? (
                <div className="relative" ref={headerActionMenuRef}>
                  <button
                    aria-label="More actions"
                    className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#595959] transition hover:border-[#40a9ff] hover:text-[#1890ff]"
                    onClick={() =>
                      setIsHeaderActionMenuOpen((currentValue) => !currentValue)
                    }
                    type="button"
                  >
                    <EllipsisOutlined />
                  </button>

                  {isHeaderActionMenuOpen ? (
                    <div className="absolute top-[calc(100%+6px)] right-0 z-30 min-w-[180px] rounded-[2px] border border-[#d9d9d9] bg-white py-1 shadow-[0_8px_18px_rgba(0,0,0,0.14)]">
                      {canForkQuery ? (
                        <button
                          className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9]"
                          onClick={() => void handleForkQuery()}
                          type="button"
                        >
                          <span>Fork</span>
                          <span className="text-[12px] text-[#8c8c8c]">↗</span>
                        </button>
                      ) : null}
                      {canEditQuery && !queryDetailData?.is_archived ? (
                        <button
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9]"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openArchiveDialog();
                          }}
                          type="button"
                        >
                          Archive
                        </button>
                      ) : null}
                      {canEditQuery &&
                      !editableQuery.is_draft &&
                      !editableQuery.is_archived ? (
                        <button
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9]"
                          onClick={() => {
                            setIsHeaderActionMenuOpen(false);
                            void handleUnpublishQuery();
                          }}
                          type="button"
                        >
                          Unpublish
                        </button>
                      ) : null}
                      {canEditQuery ? (
                        <button
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9]"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            openApiKeyDialog();
                          }}
                          type="button"
                        >
                          Show API Key
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {editableQuery.description || isDescriptionEditing ? (
            <div className="mt-2">
              {isDescriptionEditing ? (
                <textarea
                  autoFocus
                  className="min-h-[72px] w-full rounded-[2px] border border-[#d9d9d9] bg-white px-3 py-2 text-[14px] leading-[1.6] text-[#666] outline-none transition focus:border-[#40a9ff]"
                  onBlur={() => void commitDescription(descriptionDraft)}
                  onChange={(event) => setDescriptionDraft(event.target.value)}
                  onKeyDown={handleDescriptionInputKeyDown}
                  placeholder="Add description"
                  rows={3}
                  value={descriptionDraft}
                />
              ) : (
                <button
                  className="w-full rounded-[2px] text-left text-[14px] leading-[1.6] text-[#666] outline-none transition hover:text-[#323232]"
                  onClick={startDescriptionEditing}
                  type="button"
                >
                  {editableQuery.description}
                </button>
              )}
            </div>
          ) : null}
        </div>

        <QueryParametersPanel
          canManageQuery={canManageQuery}
          dirtyParameterCount={dirtyParameterCount}
          hasDirtyParameters={hasDirtyParameters}
          mode="view"
          onApplyChangesRef={applyParameterChangesRef}
          onOpenEditParameterRef={openEditParameterDialogRef}
          queryParameters={queryParameters}
          renderParameterInput={renderParameterInput}
        />

        <div
          className={
            isResultFullscreen
              ? "fixed inset-0 z-50 flex flex-col bg-[#f6f8f9] p-[15px]"
              : "flex min-h-0 flex-1 flex-col px-[15px] pb-[15px]"
          }
        >
          <QueryResultPane
            actionMenuRef={actionMenuRef}
            activeChartOptions={activeChartOptions}
            activeVisualizationTab={activeVisualizationTab}
            canManageVisualizations={canManageQuery}
            canUseSavedVisualization={canUseSavedVisualization}
            chartVisualizations={chartVisualizations}
            emptyMessage="저장된 결과가 없습니다. Refresh를 눌러 최신 데이터를 불러오세요."
            executionError={executionError}
            executionResult={executionResult}
            filteredResultRowCount={filteredResultRows.length}
            fullscreenShortcutLabel={fullscreenShortcutLabel}
            hydratedTableVisualization={hydratedTableVisualization}
            isActionMenuOpen={isActionMenuOpen}
            isResultFullscreen={isResultFullscreen}
            mode="view"
            nextJumpPage={nextJumpPage}
            onDownloadResults={handleDownloadResults}
            onEditSchedule={openScheduleDialog}
            onOpenAddToDashboard={handleOpenAddToDashboard}
            onOpenEmbed={handleOpenEmbed}
            onOpenVisualizationEditor={openVisualizationEditor}
            onResultFilterChange={setResultFilter}
            onResultPageChange={handleResultPageChange}
            onResultPageInputBlur={commitResultPageInput}
            onResultPageInputChange={handleResultPageInputChange}
            onResultPageInputKeyDown={handleResultPageInputKeyDown}
            onResultPageSizeChange={handleResultPageSizeChange}
            onResultSort={handleResultSort}
            onToggleActionMenu={handleToggleActionMenu}
            onToggleFullscreen={handleToggleResultFullscreen}
            onVisualizationTabChange={handleVisualizationTabChange}
            paginatedRows={paginatedRows}
            paginationItems={paginationItems}
            previousJumpPage={previousJumpPage}
            queryDetailData={queryDetailData}
            resultFilter={resultFilter}
            resultPage={resultPage}
            resultPageInput={resultPageInput}
            resultPageSize={resultPageSize}
            resultSort={resultSort}
            scheduleEditable={scheduleEditable}
            scheduleTimezone={scheduleTimezone}
            selectedDataSourceName={selectedDataSource?.name ?? null}
            totalResultRowCount={resultRows.length}
            visibleResultColumns={visibleResultColumns}
          />
        </div>

        {saveMessage && isSaveToastVisible ? (
          <div className="pointer-events-none absolute bottom-5 left-6 z-50">
            <div
              className="rounded-[2px] border border-emerald-200 bg-emerald-50 px-4 py-2 text-[12px] text-emerald-700 shadow-[0_8px_20px_rgba(0,0,0,0.16)]"
              style={{
                opacity: isSaveToastFading ? 0 : 1,
                transform: isSaveToastFading
                  ? "translateY(8px)"
                  : "translateY(0)",
                transition:
                  "opacity 4000ms ease-out, transform 4000ms ease-out",
              }}
            >
              {saveMessage}
            </div>
          </div>
        ) : null}

        {isScheduleDialogOpen ? (
          <QueryRefreshScheduleDialog
            initialSchedule={editableQuery.schedule}
            onClose={() => setIsScheduleDialogOpen(false)}
            onSave={(schedule) => void handleSaveSchedule(schedule)}
            refreshIntervals={refreshIntervals}
            timezone={scheduleTimezone}
          />
        ) : null}

        {isArchiveDialogOpen ? (
          <OverlayDialog
            onClose={() => setIsArchiveDialogOpen(false)}
            title="Archive Query"
            footer={
              <>
                <button
                  className="inline-flex h-[32px] items-center rounded-[2px] border border-[#d9d9d9] bg-white px-4 text-[13px] text-[#595959]"
                  onClick={() => setIsArchiveDialogOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-[32px] items-center rounded-[2px] border border-[#ff4d4f] bg-white px-4 text-[13px] text-[#ff4d4f] transition hover:bg-[#fff1f0]"
                  onClick={() => void handleArchiveQuery()}
                  type="button"
                >
                  Archive
                </button>
              </>
            }
          >
            <div className="flex gap-4 px-1 py-2">
              <div className="pt-[2px] text-[24px] text-[#faad14]">
                <ExclamationCircleOutlined />
              </div>
              <div className="space-y-3 text-[16px] text-[#323232]">
                <div>Are you sure you want to archive this query?</div>
                <div className="text-[14px] leading-[1.6] text-[#595959]">
                  All alerts and dashboard widgets created with its
                  visualizations will be deleted.
                </div>
              </div>
            </div>
          </OverlayDialog>
        ) : null}

        {isApiKeyDialogOpen && editableQuery.id !== null ? (
          <OverlayDialog
            onClose={() => setIsApiKeyDialogOpen(false)}
            title="API Key"
            footer={
              <button
                className="inline-flex h-[32px] items-center rounded-[2px] border border-[#d9d9d9] bg-white px-4 text-[13px] text-[#595959]"
                onClick={() => setIsApiKeyDialogOpen(false)}
                type="button"
              >
                Close
              </button>
            }
          >
            {(() => {
              const apiKey = editableQuery.api_key ?? "";
              const csvUrl = `${window.location.origin}/api/queries/${editableQuery.id}/results.csv?api_key=${apiKey}`;
              const jsonUrl = `${window.location.origin}/api/queries/${editableQuery.id}/results.json?api_key=${apiKey}`;

              return (
                <div className="space-y-6">
                  <div>
                    <div className="mb-2 text-[14px] font-medium text-[#323232]">
                      API Key
                    </div>
                    <div className="flex items-stretch">
                      <input
                        className="h-[38px] min-w-0 flex-1 rounded-l-[2px] border border-[#d9d9d9] bg-[#fafafa] px-3 text-[13px] text-[#595959] outline-none"
                        readOnly
                        value={apiKey}
                      />
                      <button
                        className="inline-flex h-[38px] items-center justify-center border-t border-r border-b border-[#d9d9d9] bg-white px-4 text-[13px] text-[#595959] transition hover:border-[#40a9ff] hover:text-[#1890ff] disabled:cursor-not-allowed disabled:text-[#bfbfbf]"
                        disabled={isApiKeyRegenerating}
                        onClick={() => void handleRegenerateApiKey()}
                        type="button"
                      >
                        {isApiKeyRegenerating
                          ? "Regenerating..."
                          : "Regenerate"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-[14px] font-medium text-[#323232]">
                      Example API Calls:
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 text-[14px] text-[#595959]">
                          Results in CSV format:
                        </div>
                        <div className="flex items-start gap-2">
                          <textarea
                            className="min-h-[82px] flex-1 rounded-[2px] border border-[#d9d9d9] bg-[#fafafa] px-3 py-2 text-[13px] text-[#cf1322] outline-none"
                            readOnly
                            value={csvUrl}
                          />
                          <button
                            className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#595959]"
                            onClick={() => void copyToClipboard(csvUrl)}
                            type="button"
                          >
                            <CopyOutlined />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 text-[14px] text-[#595959]">
                          Results in JSON format:
                        </div>
                        <div className="flex items-start gap-2">
                          <textarea
                            className="min-h-[82px] flex-1 rounded-[2px] border border-[#d9d9d9] bg-[#fafafa] px-3 py-2 text-[13px] text-[#cf1322] outline-none"
                            readOnly
                            value={jsonUrl}
                          />
                          <button
                            className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#595959]"
                            onClick={() => void copyToClipboard(jsonUrl)}
                            type="button"
                          >
                            <CopyOutlined />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </OverlayDialog>
        ) : null}

        <QuerySchemaDiagramDialog
          dataSourceName={
            diagramTableName && selectedDataSource?.name
              ? `${selectedDataSource.name} · ${diagramTableName}`
              : (selectedDataSource?.name ?? "Schema")
          }
          onClose={() => {
            setIsDiagramOpen(false);
            setDiagramTableName(null);
          }}
          open={isDiagramOpen}
          schemaResponse={visibleDiagramSchema}
        />

        {isAddToDashboardOpen ? (
          <OverlayDialog
            onClose={() => {
              setIsAddToDashboardOpen(false);
              setSelectedDashboard(null);
            }}
            title="Add to Dashboard"
            footer={
              <>
                <button
                  className="inline-flex h-[32px] items-center rounded-[2px] border border-[#d9d9d9] bg-white px-4 text-[13px] text-[#595959]"
                  onClick={() => {
                    setIsAddToDashboardOpen(false);
                    setSelectedDashboard(null);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-[32px] items-center rounded-[2px] border border-[#d9d9d9] bg-[#1890ff] px-4 text-[13px] text-white disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:text-[#bfbfbf]"
                  disabled={!selectedDashboard || isWidgetSaving}
                  onClick={() => void handleAddVisualizationToDashboard()}
                  type="button"
                >
                  {isWidgetSaving ? "Adding..." : "OK"}
                </button>
              </>
            }
          >
            <label className="mb-3 block text-[14px] text-[#595959]">
              Choose the dashboard to add this query to:
            </label>
            {!selectedDashboard ? (
              <>
                <input
                  autoFocus
                  className="h-[40px] w-full rounded-[2px] border border-[#40a9ff] bg-white px-3 text-[13px] text-[#595959] outline-none shadow-[0_0_0_2px_rgba(24,144,255,0.12)]"
                  onChange={(event) =>
                    setDashboardSearchTerm(event.target.value)
                  }
                  placeholder="Search a dashboard by name"
                  value={dashboardSearchTerm}
                />
                <div className="mt-3 max-h-[260px] overflow-y-auto rounded-[2px] border border-[#e8e8e8] bg-white">
                  {isDashboardSearching ? (
                    <div className="px-4 py-3 text-[13px] text-[#767676]">
                      Searching...
                    </div>
                  ) : dashboardSearchResults.length > 0 ? (
                    dashboardSearchResults.map((dashboard) => (
                      <button
                        key={dashboard.id}
                        className="flex w-full items-center justify-between border-b border-[#f0f0f0] px-4 py-3 text-left text-[13px] text-[#595959] transition last:border-b-0 hover:bg-[#f5f7f9]"
                        onClick={() => setSelectedDashboard(dashboard)}
                        type="button"
                      >
                        <span>{dashboard.name}</span>
                        <span className="text-[12px] text-[#b0b0b0]">
                          {dashboard.tags.join(", ")}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-[13px] text-[#9a9a9a]">
                      No dashboards found.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-[2px] border border-[#e8e8e8] bg-[#fafafa] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] text-[#323232]">
                      {selectedDashboard.name}
                    </div>
                    <div className="text-[12px] text-[#8c8c8c]">
                      {selectedDashboard.tags.join(", ")}
                    </div>
                  </div>
                  <button
                    className="text-[#8c8c8c] transition hover:text-[#323232]"
                    onClick={() => setSelectedDashboard(null)}
                    type="button"
                  >
                    <CloseOutlined />
                  </button>
                </div>
              </div>
            )}
          </OverlayDialog>
        ) : null}

        {isEmbedOpen &&
        editableQuery.id &&
        activeVisualization?.id &&
        activeVisualization.id > 0 ? (
          <OverlayDialog
            onClose={() => setIsEmbedOpen(false)}
            title="Embed Query"
            footer={
              <button
                className="inline-flex h-[32px] items-center rounded-[2px] border border-[#d9d9d9] bg-white px-4 text-[13px] text-[#595959]"
                onClick={() => setIsEmbedOpen(false)}
                type="button"
              >
                Close
              </button>
            }
          >
            {(() => {
              const publicUrl = `${window.location.origin}/embed/query/${editableQuery.id}/visualization/${activeVisualization.id}?api_key=${editableQuery.api_key ?? ""}`;
              const iframeCode = `<iframe src="${publicUrl}" width="720" height="391"></iframe>`;

              return (
                <div className="space-y-6">
                  <div>
                    <div className="mb-2 text-[14px] font-medium text-[#323232]">
                      Public URL
                    </div>
                    <div className="flex items-start gap-2">
                      <textarea
                        className="min-h-[64px] flex-1 rounded-[2px] border border-[#d9d9d9] bg-[#fafafa] px-3 py-2 text-[13px] text-[#cf1322] outline-none"
                        readOnly
                        value={publicUrl}
                      />
                      <button
                        className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#595959]"
                        onClick={() => void copyToClipboard(publicUrl)}
                        type="button"
                      >
                        <CopyOutlined />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-[14px] font-medium text-[#323232]">
                      IFrame Embed
                    </div>
                    <div className="flex items-start gap-2">
                      <textarea
                        className="min-h-[120px] flex-1 rounded-[2px] border border-[#d9d9d9] bg-[#fafafa] px-3 py-2 text-[13px] text-[#cf1322] outline-none"
                        readOnly
                        value={iframeCode}
                      />
                      <button
                        className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#595959]"
                        onClick={() => void copyToClipboard(iframeCode)}
                        type="button"
                      >
                        <CopyOutlined />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </OverlayDialog>
        ) : null}

        {parameterEditorDraft ? (
          <ParameterEditorDialog
            draft={parameterEditorDraft}
            key={`view-parameter-${parameterEditorDraft.originalName ?? parameterEditorDraft.name ?? "new"}-${parameterEditorDraft.isNew ? "new" : "edit"}`}
            onClose={closeParameterDialog}
            onSave={handleSaveParameterDefinition}
          />
        ) : null}

        {visualizationEditorDialog}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-50px)] w-full flex-col bg-[#f6f8f9]">
      <div className="px-[15px] pt-[15px] pb-[10px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="group/query-title flex min-w-0 flex-1 flex-wrap items-center gap-[8px]">
            <button
              aria-label={
                editableQuery.is_favorite
                  ? "Remove from favorites"
                  : "Add to favorites"
              }
              className={`text-[18px] transition hover:text-[#f5c342] ${
                editableQuery.is_favorite ? "text-[#f5c342]" : "text-[#d2d2d2]"
              } ${isFavoriteSaving || editableQuery.id === null ? "opacity-60" : ""}`}
              disabled={isFavoriteSaving || editableQuery.id === null}
              onClick={() => void toggleFavorite()}
              type="button"
            >
              {editableQuery.is_favorite ? "★" : "☆"}
            </button>

            <QueryTitleEditor
              canEdit={canManageQuery}
              onCommit={(nextName) =>
                setEditableQuery((currentValue) => ({
                  ...currentValue,
                  name: nextName,
                }))
              }
              value={editableQuery.name || "New Query"}
            />

            {editableQuery.is_draft ? (
              <span className="inline-flex items-center rounded-[3px] bg-[#eef2f4] px-[7px] py-[2px] text-[12px] leading-[16px] text-[#8aa1b2]">
                Unpublished
              </span>
            ) : null}
            {editableQuery.is_archived ? (
              <span className="inline-flex items-center rounded-[3px] bg-[#fa8c16] px-[7px] py-[2px] text-[12px] leading-[16px] text-white">
                Archived
              </span>
            ) : null}

            {editableQuery.tags.map((tag) => (
              <QueryTagChip
                key={tag}
                onRemove={
                  canManageQuery
                    ? () =>
                        setEditableQuery((currentValue) => ({
                          ...currentValue,
                          tags: currentValue.tags.filter(
                            (currentTag) => currentTag !== tag,
                          ),
                        }))
                    : undefined
                }
                tag={tag}
              />
            ))}

            {canManageQuery && tagInputOpen ? (
              <input
                autoFocus
                className="h-[32px] w-[140px] rounded-[2px] border border-[#d9d9d9] bg-white px-2 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
                onBlur={() => void addTag()}
                onChange={(event) => setTagInputValue(event.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Add tag"
                value={tagInputValue}
              />
            ) : canManageQuery && shouldShowTagAction ? (
              <button
                className="inline-flex h-[24px] items-center rounded-[2px] bg-[#dfe7eb] px-[9px] text-[12px] text-[#5f6f7a] transition hover:bg-[#d1dade]"
                onClick={() => setTagInputOpen(true)}
                type="button"
              >
                + Add tag
              </button>
            ) : canManageQuery ? (
              <button
                className="hidden h-[24px] items-center rounded-[2px] bg-[#dfe7eb] px-[9px] text-[12px] text-[#5f6f7a] transition hover:bg-[#d1dade] group-hover/query-title:inline-flex group-focus-within/query-title:inline-flex"
                onClick={() => setTagInputOpen(true)}
                type="button"
              >
                + Add tag
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {editableQuery.id !== null &&
            editableQuery.is_draft &&
            !editableQuery.is_archived &&
            canManageQuery ? (
              <button
                className={`inline-flex h-[32px] items-center gap-1 rounded-[2px] px-3 text-[13px] transition ${
                  isSaving
                    ? "cursor-not-allowed border border-[#d9d9d9] bg-[#f5f5f5] text-[#bfbfbf]"
                    : "border border-transparent bg-[#1890ff] text-white shadow-[0_2px_0_rgba(0,0,0,0.045)] hover:bg-[#40a9ff]"
                }`}
                disabled={isSaving}
                onClick={() => void handlePublishQuery()}
                type="button"
              >
                Publish
              </button>
            ) : null}

            {editableQuery.id !== null ? (
              <button
                className="inline-flex h-[32px] items-center gap-1 rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-[13px] text-[#595959] transition hover:border-[#40a9ff] hover:text-[#1890ff]"
                onClick={() =>
                  navigateWithUnsavedChangesCheck(`/queries/${editableQuery.id}`)
                }
                type="button"
              >
                Show Results Only
              </button>
            ) : null}

            {editableQuery.id !== null && (canEditQuery || canForkQuery) ? (
              <div className="relative" ref={headerActionMenuRef}>
                <button
                  aria-label="More actions"
                  className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#595959] transition hover:border-[#40a9ff] hover:text-[#1890ff]"
                  onClick={() =>
                    setIsHeaderActionMenuOpen((currentValue) => !currentValue)
                  }
                  type="button"
                >
                  <EllipsisOutlined />
                </button>

                {isHeaderActionMenuOpen ? (
                  <div className="absolute top-[calc(100%+6px)] right-0 z-30 min-w-[180px] rounded-[2px] border border-[#d9d9d9] bg-white py-1 shadow-[0_8px_18px_rgba(0,0,0,0.14)]">
                    {canForkQuery ? (
                      <button
                        className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9]"
                        onClick={() => void handleForkQuery()}
                        type="button"
                      >
                        <span>Fork</span>
                        <span className="text-[12px] text-[#8c8c8c]">↗</span>
                      </button>
                    ) : null}
                    {canEditQuery && !queryDetailData?.is_archived ? (
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9]"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openArchiveDialog();
                        }}
                        type="button"
                      >
                        Archive
                      </button>
                    ) : null}
                    {canEditQuery &&
                    !editableQuery.is_draft &&
                    !editableQuery.is_archived ? (
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9]"
                        onClick={() => {
                          setIsHeaderActionMenuOpen(false);
                          void handleUnpublishQuery();
                        }}
                        type="button"
                      >
                        Unpublish
                      </button>
                    ) : null}
                    {canEditQuery ? (
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9]"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openApiKeyDialog();
                        }}
                        type="button"
                      >
                        Show API Key
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)] md:flex-row">
        <QuerySchemaSidebar
          canManageQuery={canManageQuery}
          dataSourceDropdownRef={dataSourceDropdownRef}
          dataSourceSearch={dataSourceSearch}
          descriptionDraft={descriptionDraft}
          expandedTables={expandedTables}
          filteredDataSources={filteredDataSources}
          filteredSchema={filteredSchema}
          isDataSourceMenuOpen={isDataSourceMenuOpen}
          isDescriptionEditing={isDescriptionEditing}
          isSchemaLoading={isSchemaLoading}
          isSchemaPanelCollapsed={isSchemaPanelCollapsed}
          onCommitDescription={commitDescription}
          onDataSourceSearchChange={handleDataSourceSearchChange}
          onDescriptionDraftChange={handleDescriptionDraftChange}
          onDescriptionInputKeyDown={handleDescriptionInputKeyDown}
          onInsertText={insertTextIntoEditor}
          onOpenScheduleDialog={openScheduleDialog}
          onOpenSchemaDiagram={handleOpenSchemaDiagram}
          onOpenTableSchemaDiagram={handleOpenTableSchemaDiagram}
          onRefreshSchema={handleRefreshSchema}
          onSchemaFilterChange={handleSchemaFilterChange}
          onSelectDataSource={handleSelectDataSource}
          onStartDescriptionEditing={startDescriptionEditing}
          onToggleDataSourceMenu={handleToggleDataSourceMenu}
          onToggleTable={toggleTable}
          queryDescription={editableQuery.description}
          queryDetailData={queryDetailData}
          scheduleEditable={scheduleEditable}
          scheduleTimezone={scheduleTimezone}
          schemaFilter={schemaFilter}
          schemaPanelWidth={schemaPanelWidth}
          schemaResponse={schemaResponse}
          selectedDataSource={selectedDataSource}
          shouldShowSourceMetadataPanel={shouldShowSourceMetadataPanel}
        />

        <div className="hidden w-[14px] shrink-0 items-stretch justify-center bg-white md:flex">
          <button
            aria-label="Resize schema panel"
            className="group flex w-full cursor-col-resize items-center justify-center"
            onDoubleClick={() => {
              setIsSchemaPanelCollapsed((currentValue) => !currentValue);
              setSchemaPanelWidth((currentValue) =>
                currentValue <= 90 ? 430 : currentValue,
              );
            }}
            onMouseDown={startSchemaResize}
            type="button"
          >
            <span className="h-[72px] w-[2px] rounded bg-[#d9d9d9] transition group-hover:bg-[#1890ff]" />
          </button>
        </div>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <QueryEditorShell
            autocompleteAvailable={autocompleteAvailable}
            canExecuteQuery={Boolean(selectedDataSource?.can_execute_query)}
            canManageQuery={canManageQuery}
            executionStartedAt={executionStartedAtRef.current}
            hasDataSource={Boolean(editableQuery.data_source_id)}
            hasDirtyParameters={hasDirtyParameters}
            initialHasQueryText={hasQueryTextRef.current}
            isExecuting={isExecuting}
            isMacLikePlatform={isMacLikePlatform}
            isSaving={isSaving}
            liveAutocompleteEnabled={liveAutocompleteEnabled}
            onEditorChange={handleEditorChange}
            onEditorMount={handleEditorMount}
            onExecute={handleExecuteFromEditorShell}
            onFormat={handleFormatQuery}
            onOpenAddParameter={openAddParameterDialog}
            onSave={handleSaveFromEditorShell}
            onToggleAutocomplete={handleToggleAutocomplete}
            parameterShortcutLabel={parameterShortcutLabel}
            queryText={editableQuery.query}
            setHasQueryTextStateRef={sourceEditorHasTextStateRef}
          />

          <QueryParametersPanel
            canManageQuery={canManageQuery}
            dirtyParameterCount={dirtyParameterCount}
            hasDirtyParameters={hasDirtyParameters}
            mode="source"
            onApplyChangesRef={applyParameterChangesRef}
            onOpenEditParameterRef={openEditParameterDialogRef}
            queryParameters={queryParameters}
            renderParameterInput={renderParameterInput}
          />

          <div className="flex min-h-0 flex-1 flex-col border-t border-[#efefef] bg-[#fafafa]">
            <QueryResultPane
              actionMenuRef={actionMenuRef}
              activeChartOptions={activeChartOptions}
              activeVisualizationTab={activeVisualizationTab}
              canManageVisualizations={canManageQuery}
              canUseSavedVisualization={canUseSavedVisualization}
              chartVisualizations={chartVisualizations}
              emptyMessage="Execute query to show results."
              executionError={executionError}
              executionResult={executionResult}
              filteredResultRowCount={filteredResultRows.length}
              fullscreenShortcutLabel={fullscreenShortcutLabel}
              hydratedTableVisualization={hydratedTableVisualization}
              isActionMenuOpen={isActionMenuOpen}
              isResultFullscreen={isResultFullscreen}
              mode="source"
              nextJumpPage={nextJumpPage}
              onDownloadResults={handleDownloadResults}
              onOpenAddToDashboard={handleOpenAddToDashboard}
              onOpenEmbed={handleOpenEmbed}
              onOpenVisualizationEditor={openVisualizationEditor}
              onResultFilterChange={setResultFilter}
              onResultPageChange={handleResultPageChange}
              onResultPageInputBlur={commitResultPageInput}
              onResultPageInputChange={handleResultPageInputChange}
              onResultPageInputKeyDown={handleResultPageInputKeyDown}
              onResultPageSizeChange={handleResultPageSizeChange}
              onResultSort={handleResultSort}
              onToggleActionMenu={handleToggleActionMenu}
              onToggleFullscreen={handleToggleResultFullscreen}
              onVisualizationTabChange={handleVisualizationTabChange}
              paginatedRows={paginatedRows}
              paginationItems={paginationItems}
              previousJumpPage={previousJumpPage}
              queryDetailData={queryDetailData}
              resultFilter={resultFilter}
              resultPage={resultPage}
              resultPageInput={resultPageInput}
              resultPageSize={resultPageSize}
              resultSort={resultSort}
              scheduleEditable={scheduleEditable}
              scheduleTimezone={scheduleTimezone}
              selectedDataSourceName={selectedDataSource?.name ?? null}
              totalResultRowCount={resultRows.length}
              visibleResultColumns={visibleResultColumns}
            />
          </div>
        </section>
      </div>

      {saveMessage && isSaveToastVisible ? (
        <div
          className="pointer-events-none absolute bottom-5 z-50"
          style={{
            left: isSchemaPanelCollapsed ? 86 : schemaPanelWidth + 42,
          }}
        >
          <div
            className="rounded-[2px] border border-emerald-200 bg-emerald-50 px-4 py-2 text-[12px] text-emerald-700 shadow-[0_8px_20px_rgba(0,0,0,0.16)]"
            style={{
              opacity: isSaveToastFading ? 0 : 1,
              transform: isSaveToastFading
                ? "translateY(8px)"
                : "translateY(0)",
              transition: "opacity 4000ms ease-out, transform 4000ms ease-out",
            }}
          >
            {saveMessage}
          </div>
        </div>
      ) : null}

      {isScheduleDialogOpen ? (
        <QueryRefreshScheduleDialog
          initialSchedule={editableQuery.schedule}
          onClose={() => setIsScheduleDialogOpen(false)}
          onSave={(schedule) => void handleSaveSchedule(schedule)}
          refreshIntervals={refreshIntervals}
          timezone={scheduleTimezone}
        />
      ) : null}

      {isApiKeyDialogOpen && editableQuery.id !== null ? (
        <OverlayDialog
          onClose={() => setIsApiKeyDialogOpen(false)}
          title="API Key"
          footer={
            <button
              className="inline-flex h-[32px] items-center rounded-[2px] border border-[#d9d9d9] bg-white px-4 text-[13px] text-[#595959]"
              onClick={() => setIsApiKeyDialogOpen(false)}
              type="button"
            >
              Close
            </button>
          }
        >
          {(() => {
            const apiKey = editableQuery.api_key ?? "";
            const csvUrl = `${window.location.origin}/api/queries/${editableQuery.id}/results.csv?api_key=${apiKey}`;
            const jsonUrl = `${window.location.origin}/api/queries/${editableQuery.id}/results.json?api_key=${apiKey}`;

            return (
              <div className="space-y-6">
                <div>
                  <div className="mb-2 text-[14px] font-medium text-[#323232]">
                    API Key
                  </div>
                  <div className="flex items-stretch">
                    <input
                      className="h-[38px] min-w-0 flex-1 rounded-l-[2px] border border-[#d9d9d9] bg-[#fafafa] px-3 text-[13px] text-[#595959] outline-none"
                      readOnly
                      value={apiKey}
                    />
                    <button
                      className="inline-flex h-[38px] items-center justify-center border-t border-r border-b border-[#d9d9d9] bg-white px-4 text-[13px] text-[#595959] transition hover:border-[#40a9ff] hover:text-[#1890ff] disabled:cursor-not-allowed disabled:text-[#bfbfbf]"
                      disabled={isApiKeyRegenerating}
                      onClick={() => void handleRegenerateApiKey()}
                      type="button"
                    >
                      {isApiKeyRegenerating ? "Regenerating..." : "Regenerate"}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-[14px] font-medium text-[#323232]">
                    Example API Calls:
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 text-[14px] text-[#595959]">
                        Results in CSV format:
                      </div>
                      <div className="flex items-start gap-2">
                        <textarea
                          className="min-h-[82px] flex-1 rounded-[2px] border border-[#d9d9d9] bg-[#fafafa] px-3 py-2 text-[13px] text-[#cf1322] outline-none"
                          readOnly
                          value={csvUrl}
                        />
                        <button
                          className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#595959]"
                          onClick={() => void copyToClipboard(csvUrl)}
                          type="button"
                        >
                          <CopyOutlined />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-[14px] text-[#595959]">
                        Results in JSON format:
                      </div>
                      <div className="flex items-start gap-2">
                        <textarea
                          className="min-h-[82px] flex-1 rounded-[2px] border border-[#d9d9d9] bg-[#fafafa] px-3 py-2 text-[13px] text-[#cf1322] outline-none"
                          readOnly
                          value={jsonUrl}
                        />
                        <button
                          className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#595959]"
                          onClick={() => void copyToClipboard(jsonUrl)}
                          type="button"
                        >
                          <CopyOutlined />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </OverlayDialog>
      ) : null}

      <QuerySchemaDiagramDialog
        dataSourceName={
          diagramTableName && selectedDataSource?.name
            ? `${selectedDataSource.name} · ${diagramTableName}`
            : (selectedDataSource?.name ?? "Schema")
        }
        onClose={() => {
          setIsDiagramOpen(false);
          setDiagramTableName(null);
        }}
        open={isDiagramOpen}
        schemaResponse={visibleDiagramSchema}
      />

      {isAddToDashboardOpen ? (
        <OverlayDialog
          onClose={() => {
            setIsAddToDashboardOpen(false);
            setSelectedDashboard(null);
          }}
          title="Add to Dashboard"
          footer={
            <>
              <button
                className="inline-flex h-[32px] items-center rounded-[2px] border border-[#d9d9d9] bg-white px-4 text-[13px] text-[#595959]"
                onClick={() => {
                  setIsAddToDashboardOpen(false);
                  setSelectedDashboard(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex h-[32px] items-center rounded-[2px] border border-[#d9d9d9] bg-[#1890ff] px-4 text-[13px] text-white disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:text-[#bfbfbf]"
                disabled={!selectedDashboard || isWidgetSaving}
                onClick={() => void handleAddVisualizationToDashboard()}
                type="button"
              >
                {isWidgetSaving ? "Adding..." : "OK"}
              </button>
            </>
          }
        >
          <label className="mb-3 block text-[14px] text-[#595959]">
            Choose the dashboard to add this query to:
          </label>
          {!selectedDashboard ? (
            <>
              <input
                autoFocus
                className="h-[40px] w-full rounded-[2px] border border-[#40a9ff] bg-white px-3 text-[13px] text-[#595959] outline-none shadow-[0_0_0_2px_rgba(24,144,255,0.12)]"
                onChange={(event) => setDashboardSearchTerm(event.target.value)}
                placeholder="Search a dashboard by name"
                value={dashboardSearchTerm}
              />
              <div className="mt-3 max-h-[260px] overflow-y-auto rounded-[2px] border border-[#e8e8e8] bg-white">
                {isDashboardSearching ? (
                  <div className="px-4 py-3 text-[13px] text-[#767676]">
                    Searching...
                  </div>
                ) : dashboardSearchResults.length > 0 ? (
                  dashboardSearchResults.map((dashboard) => (
                    <button
                      key={dashboard.id}
                      className="flex w-full items-center justify-between border-b border-[#f0f0f0] px-4 py-3 text-left text-[13px] text-[#595959] transition last:border-b-0 hover:bg-[#f5f7f9]"
                      onClick={() => setSelectedDashboard(dashboard)}
                      type="button"
                    >
                      <span>{dashboard.name}</span>
                      <span className="text-[12px] text-[#b0b0b0]">
                        {dashboard.tags.join(", ")}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-[13px] text-[#9a9a9a]">
                    No dashboards found.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-[2px] border border-[#e8e8e8] bg-[#fafafa] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[14px] text-[#323232]">
                    {selectedDashboard.name}
                  </div>
                  <div className="text-[12px] text-[#8c8c8c]">
                    {selectedDashboard.tags.join(", ")}
                  </div>
                </div>
                <button
                  className="text-[#8c8c8c] transition hover:text-[#323232]"
                  onClick={() => setSelectedDashboard(null)}
                  type="button"
                >
                  <CloseOutlined />
                </button>
              </div>
            </div>
          )}
        </OverlayDialog>
      ) : null}

      {isEmbedOpen &&
      editableQuery.id &&
      activeVisualization?.id &&
      activeVisualization.id > 0 ? (
        <OverlayDialog
          onClose={() => setIsEmbedOpen(false)}
          title="Embed Query"
          footer={
            <button
              className="inline-flex h-[32px] items-center rounded-[2px] border border-[#d9d9d9] bg-white px-4 text-[13px] text-[#595959]"
              onClick={() => setIsEmbedOpen(false)}
              type="button"
            >
              Close
            </button>
          }
        >
          {(() => {
            const publicUrl = `${window.location.origin}/embed/query/${editableQuery.id}/visualization/${activeVisualization.id}?api_key=${editableQuery.api_key ?? ""}`;
            const iframeCode = `<iframe src="${publicUrl}" width="720" height="391"></iframe>`;

            return (
              <div className="space-y-6">
                <div>
                  <div className="mb-2 text-[14px] font-medium text-[#323232]">
                    Public URL
                  </div>
                  <div className="flex items-start gap-2">
                    <textarea
                      className="min-h-[64px] flex-1 rounded-[2px] border border-[#d9d9d9] bg-[#fafafa] px-3 py-2 text-[13px] text-[#cf1322] outline-none"
                      readOnly
                      value={publicUrl}
                    />
                    <button
                      className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#595959]"
                      onClick={() => void copyToClipboard(publicUrl)}
                      type="button"
                    >
                      <CopyOutlined />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[14px] font-medium text-[#323232]">
                    IFrame Embed
                  </div>
                  <div className="flex items-start gap-2">
                    <textarea
                      className="min-h-[120px] flex-1 rounded-[2px] border border-[#d9d9d9] bg-[#fafafa] px-3 py-2 text-[13px] text-[#cf1322] outline-none"
                      readOnly
                      value={iframeCode}
                    />
                    <button
                      className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#595959]"
                      onClick={() => void copyToClipboard(iframeCode)}
                      type="button"
                    >
                      <CopyOutlined />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </OverlayDialog>
      ) : null}

      {parameterEditorDraft ? (
        <ParameterEditorDialog
          draft={parameterEditorDraft}
          key={`source-parameter-${parameterEditorDraft.originalName ?? parameterEditorDraft.name ?? "new"}-${parameterEditorDraft.isNew ? "new" : "edit"}`}
          onClose={closeParameterDialog}
          onSave={handleSaveParameterDefinition}
        />
      ) : null}

      {visualizationEditorDialog}
    </div>
  );
}

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  DataSourceSchemaRelation,
  DataSourceSchemaResponse,
  DataSourceSchemaTable,
} from "@/features/data-sources/types";

import type {
  QueryDetail,
  QueryExecutionData,
  QueryVisualization,
  SaveQueryPayload,
} from "../types";
import {
  DATE_PRESETS,
  DATE_RANGE_PRESETS,
  NEW_QUERY_STATE,
  PARAMETER_TYPE_OPTIONS,
  type ChartVisualizationOptions,
  type PaginationItem,
  type QueryParameterMultiValueOptions,
  type QueryParameterRangeValue,
  type QueryParameterState,
  type QueryParameterType,
  type QueryParameterValue,
  type ResultSortDirection,
  type TableVisualizationColumnOption,
  type TableVisualizationOptions,
  type EditableQueryState,
  type FilterToken,
} from "./querySourceEditorTypes";

const CHART_COLORS = [
  "#1890ff",
  "#2fc25b",
  "#facc14",
  "#f04864",
  "#8543e0",
  "#13c2c2",
];

export function humanizeParameterName(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isDateRangeParameterType(type: QueryParameterType) {
  return (
    type === "date-range" ||
    type === "datetime-range" ||
    type === "datetime-range-with-seconds"
  );
}

export function isDateParameterType(type: QueryParameterType) {
  return (
    type === "date" ||
    type === "datetime-local" ||
    type === "datetime-with-seconds" ||
    isDateRangeParameterType(type)
  );
}

export function isDropdownParameterType(type: QueryParameterType) {
  return type === "enum";
}

export function isRangeValue(
  value: unknown,
): value is QueryParameterRangeValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "start" in value &&
    "end" in value
  );
}

function padNumber(value: number) {
  return String(value).padStart(2, "0");
}

export function formatDateForStorage(date: Date, type: QueryParameterType) {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const hours = padNumber(date.getHours());
  const minutes = padNumber(date.getMinutes());
  const seconds = padNumber(date.getSeconds());

  if (type === "date" || type === "date-range") {
    return `${year}-${month}-${day}`;
  }

  if (
    type === "datetime-with-seconds" ||
    type === "datetime-range-with-seconds"
  ) {
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatDateForInput(
  value: string | null,
  type: QueryParameterType,
) {
  if (!value) {
    return "";
  }

  if (type === "date" || type === "date-range") {
    return value;
  }

  const normalizedValue = value.replace(" ", "T");
  return normalizedValue.length === 16
    ? normalizedValue
    : normalizedValue.slice(0, 19);
}

export function normalizeDateInputValue(
  value: string,
  type: QueryParameterType,
) {
  if (!value) {
    return "";
  }

  if (type === "date" || type === "date-range") {
    return value;
  }

  return value.replace("T", " ");
}

export function parseStoredDateValue(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function createDateAt(date: Date, hours = 0, minutes = 0, seconds = 0) {
  const nextDate = new Date(date);
  nextDate.setHours(hours, minutes, seconds, 0);
  return nextDate;
}

function startOfDay(date: Date) {
  return createDateAt(date, 0, 0, 0);
}

function endOfDay(date: Date) {
  return createDateAt(date, 23, 59, 59);
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function addMonths(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + amount);
  return nextDate;
}

function addYears(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setFullYear(nextDate.getFullYear() + amount);
  return nextDate;
}

function startOfWeek(date: Date) {
  const nextDate = startOfDay(date);
  nextDate.setDate(nextDate.getDate() - nextDate.getDay());
  return nextDate;
}

function endOfWeek(date: Date) {
  return endOfDay(addDays(startOfWeek(date), 6));
}

function startOfMonth(date: Date) {
  return createDateAt(
    new Date(date.getFullYear(), date.getMonth(), 1),
    0,
    0,
    0,
  );
}

function endOfMonth(date: Date) {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function startOfYear(date: Date) {
  return createDateAt(new Date(date.getFullYear(), 0, 1), 0, 0, 0);
}

function endOfYear(date: Date) {
  return endOfDay(new Date(date.getFullYear(), 11, 31));
}

export function buildDatePresetValue(
  type: QueryParameterType,
  preset: string,
): QueryParameterValue {
  const today = new Date();

  if (type === "date") {
    if (preset === "yesterday") {
      return formatDateForStorage(addDays(today, -1), type);
    }

    return formatDateForStorage(today, type);
  }

  if (type === "datetime-local" || type === "datetime-with-seconds") {
    if (preset === "yesterday") {
      return formatDateForStorage(addDays(today, -1), type);
    }

    return formatDateForStorage(today, type);
  }

  if (!isDateRangeParameterType(type)) {
    return null;
  }

  let startDate = startOfDay(today);
  let endDate = endOfDay(today);

  switch (preset) {
    case "this_week":
      startDate = startOfWeek(today);
      endDate = endOfWeek(today);
      break;
    case "this_month":
      startDate = startOfMonth(today);
      endDate = endOfMonth(today);
      break;
    case "this_year":
      startDate = startOfYear(today);
      endDate = endOfYear(today);
      break;
    case "last_week": {
      const lastWeek = addDays(today, -7);
      startDate = startOfWeek(lastWeek);
      endDate = endOfWeek(lastWeek);
      break;
    }
    case "last_month": {
      const lastMonth = addMonths(today, -1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
      break;
    }
    case "last_year": {
      const lastYear = addYears(today, -1);
      startDate = startOfYear(lastYear);
      endDate = endOfYear(lastYear);
      break;
    }
    case "last_7_days":
      startDate = startOfDay(addDays(today, -7));
      endDate = endOfDay(today);
      break;
    case "last_14_days":
      startDate = startOfDay(addDays(today, -14));
      endDate = endOfDay(today);
      break;
    case "last_30_days":
      startDate = startOfDay(addDays(today, -30));
      endDate = endOfDay(today);
      break;
    case "last_60_days":
      startDate = startOfDay(addDays(today, -60));
      endDate = endOfDay(today);
      break;
    case "last_90_days":
      startDate = startOfDay(addDays(today, -90));
      endDate = endOfDay(today);
      break;
    case "last_12_months":
      startDate = startOfDay(addMonths(today, -12));
      endDate = endOfDay(today);
      break;
    default:
      break;
  }

  return {
    end: formatDateForStorage(endDate, type),
    start: formatDateForStorage(startDate, type),
  };
}

export function getEnumOptions(
  parameter: Pick<QueryParameterState, "enumOptions">,
) {
  return (parameter.enumOptions ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getParameterTypeLabel(type: QueryParameterType) {
  return (
    PARAMETER_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? "Text"
  );
}

export function valuesEqual(
  left: QueryParameterValue,
  right: QueryParameterValue,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function getCurrentParameterValue(parameter: QueryParameterState) {
  return parameter.pendingValue !== undefined
    ? parameter.pendingValue
    : parameter.value;
}

export function parameterHasPendingValue(parameter: QueryParameterState) {
  return (
    parameter.pendingValue !== undefined &&
    !valuesEqual(parameter.pendingValue, parameter.value)
  );
}

export function normalizeParameterValue(
  parameter: Pick<
    QueryParameterState,
    "enumOptions" | "multiValuesOptions" | "type"
  >,
  rawValue: unknown,
): QueryParameterValue {
  switch (parameter.type) {
    case "number": {
      if (rawValue === null || rawValue === undefined || rawValue === "") {
        return null;
      }

      const nextValue = Number(rawValue);
      return Number.isFinite(nextValue) ? nextValue : null;
    }
    case "enum": {
      const enumOptions = getEnumOptions(parameter);
      if (parameter.multiValuesOptions) {
        const values = Array.isArray(rawValue)
          ? rawValue.map((item) => String(item))
          : typeof rawValue === "string"
            ? rawValue
                .split(parameter.multiValuesOptions.separator)
                .map((item) => item.trim())
            : [];
        return values.filter((item) => enumOptions.includes(item));
      }

      const nextValue =
        rawValue === null || rawValue === undefined ? "" : String(rawValue);
      return enumOptions.includes(nextValue)
        ? nextValue
        : (enumOptions[0] ?? "");
    }
    case "date":
    case "datetime-local":
    case "datetime-with-seconds":
      return typeof rawValue === "string" ? rawValue : "";
    case "date-range":
    case "datetime-range":
    case "datetime-range-with-seconds":
      return isRangeValue(rawValue)
        ? {
            end: typeof rawValue.end === "string" ? rawValue.end : "",
            start: typeof rawValue.start === "string" ? rawValue.start : "",
          }
        : { end: "", start: "" };
    default:
      return rawValue === null || rawValue === undefined
        ? ""
        : String(rawValue);
  }
}

export function normalizeStoredParameter(
  rawParameter: unknown,
): QueryParameterState | null {
  if (
    typeof rawParameter !== "object" ||
    rawParameter === null ||
    !("name" in rawParameter) ||
    !("type" in rawParameter)
  ) {
    return null;
  }

  const parameter = rawParameter as Record<string, unknown>;
  const type = parameter.type as QueryParameterType;
  const multiValuesOptions =
    parameter.multiValuesOptions &&
    typeof parameter.multiValuesOptions === "object"
      ? (parameter.multiValuesOptions as QueryParameterMultiValueOptions)
      : null;

  return {
    enumOptions:
      typeof parameter.enumOptions === "string"
        ? parameter.enumOptions
        : undefined,
    multiValuesOptions,
    name: String(parameter.name),
    title:
      typeof parameter.title === "string"
        ? parameter.title
        : humanizeParameterName(String(parameter.name)),
    type,
    useCurrentDateTime: Boolean(parameter.useCurrentDateTime),
    value: normalizeParameterValue(
      {
        enumOptions:
          typeof parameter.enumOptions === "string"
            ? parameter.enumOptions
            : undefined,
        multiValuesOptions,
        type,
      },
      parameter.value ?? null,
    ),
  };
}

export function getStoredParameters(options: Record<string, unknown>) {
  const rawParameters = options.parameters;

  if (!Array.isArray(rawParameters)) {
    return [];
  }

  return rawParameters
    .map((parameter) => normalizeStoredParameter(parameter))
    .filter(
      (parameter): parameter is QueryParameterState => parameter !== null,
    );
}

export function serializeParameterValue(value: QueryParameterValue): unknown {
  if (Array.isArray(value)) {
    return value;
  }

  if (isRangeValue(value)) {
    return {
      end: value.end,
      start: value.start,
    };
  }

  return value;
}

export function serializeQueryParameters(
  parameters: QueryParameterState[],
  includePendingValues = false,
) {
  return parameters.map((parameter) => ({
    enumOptions: parameter.enumOptions,
    multiValuesOptions: parameter.multiValuesOptions,
    name: parameter.name,
    title: parameter.title,
    type: parameter.type,
    useCurrentDateTime: parameter.useCurrentDateTime ?? false,
    value: serializeParameterValue(
      includePendingValues
        ? getCurrentParameterValue(parameter)
        : parameter.value,
    ),
  }));
}

export function buildParameterToken(name: string, type: QueryParameterType) {
  if (isDateRangeParameterType(type)) {
    return `{{ ${name}.start }} → {{ ${name}.end }}`;
  }

  return `{{ ${name} }}`;
}

export function getReferencedParameterNames(queryText: string) {
  const referencedNames = new Set<string>();
  const matcher = /{{\s*([a-zA-Z0-9_]+)(?:\.(?:start|end))?\s*}}/g;

  for (const match of queryText.matchAll(matcher)) {
    const parameterName = match[1]?.trim();

    if (parameterName) {
      referencedNames.add(parameterName);
    }
  }

  return referencedNames;
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getParameterExecutionValue(parameter: QueryParameterState) {
  const value = getCurrentParameterValue(parameter);

  if (isDateRangeParameterType(parameter.type)) {
    if (!isRangeValue(value) || !value.start || !value.end) {
      return null;
    }

    return {
      end: quoteSqlString(value.end),
      start: quoteSqlString(value.start),
    };
  }

  if (isDateParameterType(parameter.type)) {
    if (typeof value !== "string" || !value) {
      return null;
    }

    return quoteSqlString(value);
  }

  if (parameter.type === "enum" && parameter.multiValuesOptions) {
    if (!Array.isArray(value) || value.length === 0) {
      return null;
    }

    return value
      .map((item) => quoteSqlString(item))
      .join(parameter.multiValuesOptions.separator);
  }

  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

export function quoteSqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

export function applyQueryParametersToText(
  queryText: string,
  parameters: QueryParameterState[],
) {
  const missingParameters: string[] = [];
  let nextQueryText = queryText;

  for (const parameter of parameters) {
    const executionValue = getParameterExecutionValue(parameter);

    if (executionValue === null) {
      missingParameters.push(parameter.name);
      continue;
    }

    if (isDateRangeParameterType(parameter.type)) {
      const rangeValue = executionValue as { end: string; start: string };
      nextQueryText = nextQueryText.replaceAll(
        new RegExp(`{{\\s*${escapeRegExp(parameter.name)}\\.start\\s*}}`, "g"),
        rangeValue.start,
      );
      nextQueryText = nextQueryText.replaceAll(
        new RegExp(`{{\\s*${escapeRegExp(parameter.name)}\\.end\\s*}}`, "g"),
        rangeValue.end,
      );
      continue;
    }

    nextQueryText = nextQueryText.replaceAll(
      new RegExp(`{{\\s*${escapeRegExp(parameter.name)}\\s*}}`, "g"),
      String(executionValue),
    );
  }

  return {
    missingParameters,
    queryText: nextQueryText,
  };
}

export function normalizeDataSourceLogo(type: string) {
  const normalizedType = type.toLowerCase();

  if (normalizedType.includes("postgres")) {
    return "pg";
  }

  if (
    normalizedType.includes("microsoft") ||
    normalizedType.includes("sqlserver")
  ) {
    return "mssql";
  }

  if (normalizedType.includes("mariadb")) {
    return "mysql";
  }

  return normalizedType;
}

export function applySchemaFilter(
  schema: DataSourceSchemaTable[],
  rawFilter: string,
) {
  const query = rawFilter.trim().toLowerCase();

  if (!query) {
    return schema;
  }

  return schema
    .map((table) => {
      const tableMatches =
        table.name.toLowerCase().includes(query) ||
        (table.comment ?? "").toLowerCase().includes(query);

      const matchingColumns = table.columns.filter((column) => {
        const sourceText = `${column.name} ${column.type ?? ""} ${
          column.comment ?? ""
        }`.toLowerCase();

        return sourceText.includes(query);
      });

      if (tableMatches) {
        return table;
      }

      if (matchingColumns.length > 0) {
        return {
          ...table,
          columns: matchingColumns,
        };
      }

      return null;
    })
    .filter((table): table is DataSourceSchemaTable => table !== null);
}

export function filterSchemaResponseForTable(
  schemaResponse: DataSourceSchemaResponse | null,
  tableName: string | null,
): DataSourceSchemaResponse {
  const schema = schemaResponse?.schema ?? [];
  const relations = schemaResponse?.relations ?? [];

  if (!tableName) {
    return {
      has_columns: schemaResponse?.has_columns ?? false,
      relations,
      schema,
    };
  }

  const targetNames = new Set<string>([tableName]);

  relations.forEach((relation: DataSourceSchemaRelation) => {
    if (
      relation.source_table === tableName ||
      relation.target_table === tableName
    ) {
      targetNames.add(relation.source_table);
      targetNames.add(relation.target_table);
    }
  });

  return {
    has_columns: schemaResponse?.has_columns ?? false,
    relations: relations.filter(
      (relation) =>
        targetNames.has(relation.source_table) &&
        targetNames.has(relation.target_table),
    ),
    schema: schema.filter((table) => targetNames.has(table.name)),
  };
}

export function buildSavePayload(
  query: EditableQueryState,
  parameters: QueryParameterState[],
): SaveQueryPayload {
  return {
    data_source_id: query.data_source_id ?? 0,
    description: query.description,
    is_draft: query.is_draft,
    latest_query_data_id: query.latest_query_data_id,
    name: query.name,
    options: {
      ...query.options,
      parameters: serializeQueryParameters(parameters, true),
    },
    query: query.query,
    schedule: query.schedule,
    tags: query.tags,
    version: query.version,
  };
}

export function queryHasTrailingLimit(query: string) {
  return /\blimit\s+\d+(\s+offset\s+\d+)?\s*;?\s*$/i.test(query.trim());
}

export function formatRelativeTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export function formatRuntime(runtime: number | null | undefined) {
  if (runtime === null || runtime === undefined || runtime <= 0) {
    return "0 seconds";
  }

  const formattedRuntime =
    runtime >= 1
      ? runtime.toFixed(Number.isInteger(runtime) ? 0 : 1)
      : runtime.toFixed(1).replace(/0+$/, "").replace(/\.$/, "");

  return `${formattedRuntime} seconds`;
}

export function buildDefaultTableOptions(
  data: QueryExecutionData | null,
): TableVisualizationOptions {
  return {
    columns: (data?.columns ?? []).map((column) => ({
      align:
        inferDisplayType(column.type, column.name) === "number"
          ? "right"
          : "left",
      allowHtml: false,
      description: "",
      displayAs: inferDisplayType(column.type, column.name),
      highlightLinks: false,
      name: column.name,
      title: column.friendly_name || column.name,
      useForSearch: false,
      visible: true,
    })),
  };
}

export function getVisualizationKind(
  visualization: QueryVisualization | null | undefined,
) {
  return visualization?.type === "CHART" ? "CHART" : "TABLE";
}

export function splitQueryVisualizations(visualizations: QueryVisualization[]) {
  const tableVisualization =
    visualizations.find((item) => getVisualizationKind(item) === "TABLE") ??
    null;
  const chartVisualizations = visualizations.filter(
    (item) => getVisualizationKind(item) === "CHART",
  );

  return {
    chartVisualizations,
    tableVisualization,
  };
}

export function getNumericExecutionColumns(data: QueryExecutionData | null) {
  return (data?.columns ?? []).filter(
    (column) => inferDisplayType(column.type, column.name) === "number",
  );
}

export function getChartSelectableColumns(data: QueryExecutionData | null) {
  return (data?.columns ?? []).filter(
    (column) => inferDisplayType(column.type, column.name) !== "number",
  );
}

export function buildDefaultChartOptions(
  data: QueryExecutionData | null,
): ChartVisualizationOptions {
  const xColumn = getChartSelectableColumns(data)[0]?.name ?? "";
  const yColumn = getNumericExecutionColumns(data)[0]?.name ?? "";

  return {
    chartType: "bar",
    colors: CHART_COLORS,
    horizontal: false,
    showLegend: true,
    xColumn,
    yColumns: yColumn ? [yColumn] : [],
  };
}

export function normalizeChartOptions(
  data: QueryExecutionData | null,
  rawOptions: Record<string, unknown> | undefined,
): ChartVisualizationOptions {
  const defaultOptions = buildDefaultChartOptions(data);

  return {
    chartType:
      rawOptions?.chartType === "line" ||
      rawOptions?.chartType === "area" ||
      rawOptions?.chartType === "pie" ||
      rawOptions?.chartType === "composed" ||
      rawOptions?.chartType === "scatter" ||
      rawOptions?.chartType === "radar" ||
      rawOptions?.chartType === "radialBar" ||
      rawOptions?.chartType === "stackedBar" ||
      rawOptions?.chartType === "stackedArea"
        ? rawOptions.chartType
        : defaultOptions.chartType,
    colors:
      Array.isArray(rawOptions?.colors) && rawOptions.colors.length > 0
        ? rawOptions.colors.filter(
            (item): item is string => typeof item === "string",
          )
        : defaultOptions.colors,
    horizontal:
      typeof rawOptions?.horizontal === "boolean"
        ? rawOptions.horizontal
        : defaultOptions.horizontal,
    showLegend:
      typeof rawOptions?.showLegend === "boolean"
        ? rawOptions.showLegend
        : defaultOptions.showLegend,
    xColumn:
      typeof rawOptions?.xColumn === "string"
        ? rawOptions.xColumn
        : defaultOptions.xColumn,
    yColumns:
      Array.isArray(rawOptions?.yColumns) && rawOptions.yColumns.length > 0
        ? rawOptions.yColumns.filter(
            (item): item is string => typeof item === "string",
          )
        : defaultOptions.yColumns,
  };
}

export function serializeChartOptions(
  options: ChartVisualizationOptions,
): Record<string, unknown> {
  return {
    chartType: options.chartType,
    colors: options.colors,
    horizontal: options.horizontal,
    showLegend: options.showLegend,
    xColumn: options.xColumn,
    yColumns: options.yColumns,
  };
}

export function inferDisplayType(
  rawType: string | null,
  columnName: string,
): TableVisualizationColumnOption["displayAs"] {
  const normalizedType = (rawType ?? "").toLowerCase();
  const normalizedName = columnName.toLowerCase();
  const hasDateKeyword = normalizedType.includes("date");
  const hasDateTimeKeyword =
    normalizedType.includes("timestamp") ||
    normalizedType.includes("datetime") ||
    normalizedType.includes("time");

  if (normalizedType.includes("bool")) {
    return "boolean";
  }

  if (hasDateTimeKeyword || normalizedName.endsWith("_at")) {
    return "datetime";
  }

  if (hasDateKeyword || normalizedName.endsWith("_date")) {
    return "date";
  }

  if (
    normalizedType.includes("int") ||
    normalizedType.includes("float") ||
    normalizedType.includes("double") ||
    normalizedType.includes("decimal") ||
    normalizedType.includes("number")
  ) {
    return "number";
  }

  if (normalizedType.includes("json")) {
    return "json";
  }

  return "text";
}

export function normalizeTableOptions(
  data: QueryExecutionData | null,
  rawOptions: Record<string, unknown> | undefined,
): TableVisualizationOptions {
  const defaultColumns = buildDefaultTableOptions(data).columns;
  const rawColumns = Array.isArray(rawOptions?.columns)
    ? rawOptions.columns
    : [];

  const orderedColumns = rawColumns
    .map((rawColumn) => {
      if (typeof rawColumn !== "object" || rawColumn === null) {
        return null;
      }

      const column = rawColumn as Record<string, unknown>;
      const source = defaultColumns.find((item) => item.name === column.name);

      if (!source) {
        return null;
      }

      return {
        ...source,
        align:
          column.align === "center" || column.align === "right"
            ? column.align
            : source.align,
        allowHtml:
          typeof column.allowHtml === "boolean"
            ? column.allowHtml
            : source.allowHtml,
        description:
          typeof column.description === "string"
            ? column.description
            : source.description,
        displayAs:
          resolveTableColumnDisplay(column.displayAs, source),
        highlightLinks:
          typeof column.highlightLinks === "boolean"
            ? column.highlightLinks
            : source.highlightLinks,
        title: typeof column.title === "string" ? column.title : source.title,
        useForSearch:
          typeof column.useForSearch === "boolean"
            ? column.useForSearch
            : source.useForSearch,
        visible:
          typeof column.visible === "boolean" ? column.visible : source.visible,
      };
    })
    .filter(
      (column): column is TableVisualizationColumnOption => column !== null,
    );

  const orderedNames = new Set(orderedColumns.map((column) => column.name));
  const missingColumns = defaultColumns
    .filter((column) => !orderedNames.has(column.name))
    .map((column) => ({
      ...column,
      name: column.name,
    }));

  return {
    columns: [...orderedColumns, ...missingColumns],
  };
}

function resolveTableColumnDisplay(
  rawDisplayAs: unknown,
  source: TableVisualizationColumnOption,
): TableVisualizationColumnOption["displayAs"] {
  if (!isTableColumnDisplay(rawDisplayAs)) {
    return source.displayAs;
  }

  const legacyDefaultDisplayAs = inferDisplayType(null, source.name);

  // Legacy table visualizations persisted auto-inferred "text" for most DB
  // columns because the worker did not include result-set column types.
  if (
    rawDisplayAs === legacyDefaultDisplayAs &&
    source.displayAs !== legacyDefaultDisplayAs
  ) {
    return source.displayAs;
  }

  return rawDisplayAs;
}

function isTableColumnDisplay(
  value: unknown,
): value is TableVisualizationColumnOption["displayAs"] {
  return (
    value === "text" ||
    value === "number" ||
    value === "date" ||
    value === "datetime" ||
    value === "boolean" ||
    value === "link" ||
    value === "image" ||
    value === "json"
  );
}

export function serializeTableOptions(
  options: TableVisualizationOptions,
): Record<string, unknown> {
  return {
    columns: options.columns,
  };
}

export function getVisibleVisualizationColumns(
  data: QueryExecutionData | null,
  options: TableVisualizationOptions,
) {
  const columnMap = new Map(
    (data?.columns ?? []).map((column) => [column.name, column]),
  );

  return options.columns
    .filter((column) => column.visible && columnMap.has(column.name))
    .map((column) => ({
      ...column,
      source: columnMap.get(column.name)!,
    }));
}

export function formatVisualizationCellValue(
  value: unknown,
  column: TableVisualizationColumnOption,
) {
  if (value === null || value === undefined) {
    return "";
  }

  switch (column.displayAs) {
    case "number":
      return typeof value === "number"
        ? value.toLocaleString()
        : Number(value).toLocaleString();
    case "date":
      return formatVisualizationDateValue(value);
    case "datetime": {
      const date = new Date(String(value));
      return Number.isNaN(date.getTime())
        ? String(value)
        : date.toISOString().replace("T", " ").replace("Z", "");
    }
    case "boolean":
      return String(value);
    case "json":
      return JSON.stringify(value);
    default:
      return String(value);
  }
}

function formatVisualizationDateValue(value: unknown) {
  const normalizedValue = String(value).trim();
  const isoDateMatch = normalizedValue.match(/^(\d{4}-\d{2}-\d{2})/);

  if (isoDateMatch) {
    return isoDateMatch[1];
  }

  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime())
    ? normalizedValue
    : date.toISOString().slice(0, 10);
}

export function renderVisualizationCellContent(
  value: unknown,
  column: TableVisualizationColumnOption,
) {
  const formattedValue = formatVisualizationCellValue(value, column);

  if (!formattedValue) {
    return "";
  }

  if (column.displayAs === "link" && String(value ?? "").trim()) {
    return (
      <a
        className="text-[#1890ff] underline-offset-2 hover:underline"
        href={String(value)}
        rel="noreferrer"
        target="_blank"
      >
        {formattedValue}
      </a>
    );
  }

  if (column.allowHtml) {
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: String(formattedValue),
        }}
      />
    );
  }

  if (column.highlightLinks) {
    const text = String(formattedValue);
    const parts = text.split(/(https?:\/\/[^\s]+)/g);

    return parts.map((part, index) =>
      /^https?:\/\//.test(part) ? (
        <a
          key={`${column.name}-${index}`}
          className="text-[#1890ff] underline-offset-2 hover:underline"
          href={part}
          rel="noreferrer"
          target="_blank"
        >
          {part}
        </a>
      ) : (
        <span key={`${column.name}-${index}`}>{part}</span>
      ),
    );
  }

  return formattedValue;
}

export function getChartSeriesColumns(
  data: QueryExecutionData | null,
  options: ChartVisualizationOptions,
) {
  const availableNames = new Set(
    getChartSelectableColumns(data)
      .map((column) => column.name)
      .filter((name) => name !== options.xColumn),
  );

  return [...new Set(options.yColumns)].filter((column) =>
    availableNames.has(column),
  );
}

export function getChartNumericValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const numericValue = Number(String(value ?? "").replaceAll(",", ""));
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function buildChartDataset(
  data: QueryExecutionData | null,
  options: ChartVisualizationOptions,
) {
  const xColumn = options.xColumn;
  const yColumns = getChartSeriesColumns(data, options);

  return (data?.rows ?? []).map((row, index) => {
    const baseLabel = row[xColumn];
    return {
      __index: index,
      __label:
        baseLabel === null || baseLabel === undefined || baseLabel === ""
          ? `행 ${index + 1}`
          : String(baseLabel),
      __xNumeric: getChartNumericValue(baseLabel),
      ...Object.fromEntries(
        yColumns.map((column) => {
          return [column, getChartNumericValue(row[column])];
        }),
      ),
    };
  });
}

function buildCategoricalLegendPayload(
  dataset: Array<{
    __index: number;
    __label: string;
  }>,
  colorForIndex: (index: number) => string,
) {
  return dataset.map((item) => ({
    color: colorForIndex(item.__index),
    id: `${item.__label}-${item.__index}`,
    type: "square" as const,
    value: item.__label,
  }));
}

function renderCategoricalLegend(
  payload: Array<{
    color: string;
    id: string;
    value: string;
  }>,
) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-3 py-2 text-[12px] text-[#595959]">
      {payload.map((item) => (
        <div className="flex items-center gap-2" key={item.id}>
          <span
            className="inline-block h-[10px] w-[10px] rounded-[2px]"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function renderRadialBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      __label?: string;
      value?: number;
    };
    value?: number;
  }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const firstItem = payload[0];
  const label = firstItem?.payload?.__label ?? "";
  const value = firstItem?.value ?? firstItem?.payload?.value ?? 0;

  return (
    <div className="rounded border border-[#d9d9d9] bg-white px-3 py-2 text-[13px] text-[#262626] shadow-[0_6px_16px_rgba(0,0,0,0.12)]">
      <div className="font-medium">{label}</div>
      <div className="mt-1">{`value : ${value}`}</div>
    </div>
  );
}

function renderScatterTooltip({
  active,
  payload,
  yColumnLabel,
  xColumnLabel,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      __label?: string;
    } & Record<string, unknown>;
  }>;
  xColumnLabel: string;
  yColumnLabel: string;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const firstItem = payload[0];
  const row = firstItem?.payload;
  const xValue = row?.__label ?? "";
  const yValue = row?.[yColumnLabel] ?? 0;

  return (
    <div className="rounded border border-[#d9d9d9] bg-white px-3 py-2 text-[13px] text-[#262626] shadow-[0_6px_16px_rgba(0,0,0,0.12)]">
      <div>{`${xColumnLabel} : ${xValue}`}</div>
      <div className="mt-1">{`${yColumnLabel} : ${yValue}`}</div>
    </div>
  );
}

export function renderChartVisualization(
  data: QueryExecutionData | null,
  options: ChartVisualizationOptions,
  _height?: number,
) {
  void _height;
  const dataset = buildChartDataset(data, options);
  const yColumns = getChartSeriesColumns(data, options);

  if (!options.xColumn || yColumns.length === 0 || dataset.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[#8c8c8c]">
        X축과 Y축 컬럼을 고르면 바로 미리보기가 바뀝니다.
      </div>
    );
  }

  const colorForIndex = (index: number) =>
    options.colors[index % options.colors.length] ?? "#1890ff";
  const categoricalLegendPayload = buildCategoricalLegendPayload(
    dataset,
    colorForIndex,
  );

  return (
    <ResponsiveContainer height="100%" width="100%">
      {options.chartType === "line" ? (
        <LineChart data={dataset}>
          <CartesianGrid stroke="#f0f0f0" />
          <XAxis dataKey="__label" />
          <YAxis />
          <Tooltip />
          {options.showLegend ? <Legend /> : null}
          {yColumns.map((column, index) => (
            <Line
              dataKey={column}
              dot={false}
              key={column}
              name={column}
              stroke={colorForIndex(index)}
              strokeWidth={2}
              type="monotone"
            />
          ))}
        </LineChart>
      ) : options.chartType === "stackedBar" ? (
        <BarChart
          data={dataset}
          layout={options.horizontal ? "vertical" : "horizontal"}
        >
          <CartesianGrid stroke="#f0f0f0" />
          {options.horizontal ? (
            <>
              <XAxis type="number" />
              <YAxis dataKey="__label" type="category" width={120} />
            </>
          ) : (
            <>
              <XAxis dataKey="__label" />
              <YAxis />
            </>
          )}
          <Tooltip />
          {options.showLegend ? <Legend /> : null}
          {yColumns.map((column, index) => (
            <Bar
              dataKey={column}
              fill={colorForIndex(index)}
              key={column}
              name={column}
              stackId="stack"
            />
          ))}
        </BarChart>
      ) : options.chartType === "stackedArea" ? (
        <AreaChart data={dataset}>
          <CartesianGrid stroke="#f0f0f0" />
          <XAxis dataKey="__label" />
          <YAxis />
          <Tooltip />
          {options.showLegend ? <Legend /> : null}
          {yColumns.map((column, index) => (
            <Area
              dataKey={column}
              fill={colorForIndex(index)}
              key={column}
              name={column}
              stackId="stack"
              stroke={colorForIndex(index)}
              type="monotone"
            />
          ))}
        </AreaChart>
      ) : options.chartType === "composed" ? (
        <ComposedChart data={dataset}>
          <CartesianGrid stroke="#f0f0f0" />
          <XAxis dataKey="__label" />
          <YAxis />
          <Tooltip />
          {options.showLegend ? <Legend /> : null}
          {yColumns.map((column, index) =>
            index % 2 === 0 ? (
              <Bar
                dataKey={column}
                fill={colorForIndex(index)}
                key={column}
                name={column}
              />
            ) : (
              <Line
                dataKey={column}
                dot={false}
                key={column}
                name={column}
                stroke={colorForIndex(index)}
                strokeWidth={2}
                type="monotone"
              />
            ),
          )}
        </ComposedChart>
      ) : options.chartType === "scatter" ? (
        <ScatterChart>
          <CartesianGrid stroke="#f0f0f0" />
          <XAxis dataKey="__xNumeric" name={options.xColumn} type="number" />
          <YAxis dataKey={yColumns[0]} name={yColumns[0]} type="number" />
          <Tooltip
            content={({ active, payload }) =>
              renderScatterTooltip({
                active,
                payload: payload as Array<{
                  payload?: {
                    __label?: string;
                  } & Record<string, unknown>;
                }>,
                xColumnLabel: options.xColumn,
                yColumnLabel: yColumns[0],
              })
            }
            cursor={{ strokeDasharray: "3 3" }}
          />
          {options.showLegend ? (
            <Legend
              content={() => renderCategoricalLegend(categoricalLegendPayload)}
            />
          ) : null}
          <Scatter data={dataset} name={yColumns[0]}>
            {dataset.map((item) => (
              <Cell
                fill={colorForIndex(item.__index)}
                key={`${item.__label}-${item.__index}`}
              />
            ))}
          </Scatter>
        </ScatterChart>
      ) : options.chartType === "radar" ? (
        <RadarChart cx="50%" cy="50%" data={dataset} outerRadius="70%">
          <PolarGrid />
          <PolarAngleAxis dataKey="__label" />
          <PolarRadiusAxis />
          <Tooltip />
          {options.showLegend ? <Legend /> : null}
          {yColumns.map((column, index) => (
            <Radar
              dataKey={column}
              fill={colorForIndex(index)}
              fillOpacity={0.35}
              key={column}
              name={column}
              stroke={colorForIndex(index)}
            />
          ))}
        </RadarChart>
      ) : options.chartType === "radialBar" ? (
        <RadialBarChart
          cx="50%"
          cy="50%"
          data={dataset.map((item, index) => ({
            ...item,
            fill: colorForIndex(index),
            value: (item as Record<string, unknown>)[yColumns[0]],
          }))}
          innerRadius="25%"
          outerRadius="90%"
        >
          <PolarAngleAxis dataKey="value" type="number" />
          <Tooltip content={renderRadialBarTooltip} />
          {options.showLegend ? (
            <Legend
              content={() => renderCategoricalLegend(categoricalLegendPayload)}
            />
          ) : null}
          <RadialBar
            background
            dataKey="value"
            label={{ fill: "#595959", position: "insideStart" }}
          />
        </RadialBarChart>
      ) : options.chartType === "area" ? (
        <AreaChart data={dataset}>
          <CartesianGrid stroke="#f0f0f0" />
          <XAxis dataKey="__label" />
          <YAxis />
          <Tooltip />
          {options.showLegend ? <Legend /> : null}
          {yColumns.map((column, index) => (
            <Area
              dataKey={column}
              fill={colorForIndex(index)}
              key={column}
              name={column}
              stroke={colorForIndex(index)}
              type="monotone"
            />
          ))}
        </AreaChart>
      ) : options.chartType === "pie" ? (
        <PieChart>
          <Tooltip />
          {options.showLegend ? <Legend /> : null}
          <Pie
            data={dataset}
            dataKey={yColumns[0]}
            nameKey="__label"
            outerRadius="75%"
          >
            {dataset.map((item) => (
              <Cell
                fill={colorForIndex(item.__index)}
                key={`${item.__label}-${item.__index}`}
              />
            ))}
          </Pie>
        </PieChart>
      ) : (
        <BarChart
          data={dataset}
          layout={options.horizontal ? "vertical" : "horizontal"}
        >
          <CartesianGrid stroke="#f0f0f0" />
          {options.horizontal ? (
            <>
              <XAxis type="number" />
              <YAxis dataKey="__label" type="category" width={120} />
            </>
          ) : (
            <>
              <XAxis dataKey="__label" />
              <YAxis />
            </>
          )}
          <Tooltip />
          {options.showLegend ? <Legend /> : null}
          {yColumns.map((column, index) => (
            <Bar
              dataKey={column}
              fill={colorForIndex(index)}
              key={column}
              name={column}
            />
          ))}
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

export function toSeparatedValues(
  columns: TableVisualizationColumnOption[],
  rows: Array<Record<string, unknown>>,
  delimiter: "," | "\t",
) {
  const escapeCell = (value: string) => {
    if (delimiter === "\t") {
      return value.replaceAll("\t", " ");
    }

    if (value.includes('"') || value.includes(",") || value.includes("\n")) {
      return `"${value.replaceAll('"', '""')}"`;
    }

    return value;
  };

  const header = columns
    .map((column) => escapeCell(column.title || column.name))
    .join(delimiter);
  const body = rows.map((row) =>
    columns
      .map((column) =>
        escapeCell(formatVisualizationCellValue(row[column.name], column)),
      )
      .join(delimiter),
  );

  return [header, ...body].join("\n");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function buildPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}

export function compareResultValues(
  leftValue: unknown,
  rightValue: unknown,
  direction: ResultSortDirection,
) {
  const normalizeValue = (value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return { type: "empty" as const, value: "" };
    }

    if (typeof value === "number") {
      return { type: "number" as const, value };
    }

    if (typeof value === "boolean") {
      return { type: "number" as const, value: value ? 1 : 0 };
    }

    const rawString = String(value).trim();
    const numericValue = Number(rawString.replaceAll(",", ""));

    if (rawString !== "" && Number.isFinite(numericValue)) {
      return { type: "number" as const, value: numericValue };
    }

    const dateValue = Date.parse(rawString);

    if (!Number.isNaN(dateValue)) {
      return { type: "date" as const, value: dateValue };
    }

    return { type: "string" as const, value: rawString.toLowerCase() };
  };

  const normalizedLeft = normalizeValue(leftValue);
  const normalizedRight = normalizeValue(rightValue);

  if (normalizedLeft.type === "empty" && normalizedRight.type === "empty") {
    return 0;
  }

  if (normalizedLeft.type === "empty") {
    return 1;
  }

  if (normalizedRight.type === "empty") {
    return -1;
  }

  let result = 0;

  if (
    (normalizedLeft.type === "number" || normalizedLeft.type === "date") &&
    (normalizedRight.type === "number" || normalizedRight.type === "date")
  ) {
    result = normalizedLeft.value - normalizedRight.value;
  } else {
    result = String(normalizedLeft.value).localeCompare(
      String(normalizedRight.value),
      "ko",
      {
        numeric: true,
        sensitivity: "base",
      },
    );
  }

  return direction === "asc" ? result : result * -1;
}

export function parseFilterExpression(rawFilter: string) {
  return rawFilter
    .split("|")
    .map((group) =>
      (group.match(/"[^"]+"|\S+/g) ?? [])
        .map((token) => token.trim().replace(/^"(.*)"$/, "$1"))
        .filter(Boolean)
        .map<FilterToken>((token) => {
          const separatorIndex = token.indexOf(":");

          if (separatorIndex > 0) {
            return {
              type: "column",
              column: token.slice(0, separatorIndex).trim().toLowerCase(),
              value: token
                .slice(separatorIndex + 1)
                .trim()
                .toLowerCase(),
            };
          }

          return {
            type: "global",
            value: token.toLowerCase(),
          };
        }),
    )
    .filter((group) => group.length > 0);
}

export function getPaginationJumpPage(
  currentPage: number,
  totalPages: number,
  direction: "previous" | "next",
) {
  if (totalPages <= 7) {
    return null;
  }

  if (direction === "previous") {
    if (currentPage <= 4) {
      return null;
    }

    if (currentPage >= totalPages - 3) {
      return totalPages - 5;
    }

    return currentPage - 2;
  }

  if (currentPage >= totalPages - 3) {
    return null;
  }

  if (currentPage <= 4) {
    return 6;
  }

  return currentPage + 2;
}

export function mapQueryDetail(detail: QueryDetail): EditableQueryState {
  return {
    api_key: detail.api_key,
    id: detail.id,
    data_source_id: detail.data_source_id,
    description: detail.description,
    is_archived: detail.is_archived,
    is_draft: detail.is_draft,
    is_favorite: detail.is_favorite,
    latest_query_data_id: detail.latest_query_data_id,
    name: detail.name,
    options: detail.options,
    query: detail.query,
    schedule: detail.schedule,
    tags: detail.tags,
    version: detail.version,
  };
}

export {
  NEW_QUERY_STATE,
  DATE_PRESETS,
  DATE_RANGE_PRESETS,
  PARAMETER_TYPE_OPTIONS,
};

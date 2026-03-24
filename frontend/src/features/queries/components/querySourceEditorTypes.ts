export interface EditableQueryState {
  api_key?: string;
  data_source_id: number | null;
  description: string | null;
  id: number | null;
  is_archived: boolean;
  is_draft: boolean;
  is_favorite: boolean;
  latest_query_data_id: number | null;
  name: string;
  options: Record<string, unknown>;
  query: string;
  schedule: Record<string, unknown> | null;
  tags: string[];
  version?: number;
}

export type TableColumnAlign = "left" | "center" | "right";
export type TableColumnDisplay =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "boolean"
  | "link"
  | "image"
  | "json";

export interface TableVisualizationColumnOption {
  align: TableColumnAlign;
  allowHtml: boolean;
  description: string;
  displayAs: TableColumnDisplay;
  highlightLinks: boolean;
  name: string;
  title: string;
  useForSearch: boolean;
  visible: boolean;
}

export interface TableVisualizationOptions {
  columns: TableVisualizationColumnOption[];
}

export type ChartVisualizationType =
  | "bar"
  | "line"
  | "area"
  | "pie"
  | "composed"
  | "scatter"
  | "radar"
  | "radialBar"
  | "stackedBar"
  | "stackedArea";

export interface ChartVisualizationOptions {
  chartType: ChartVisualizationType;
  colors: string[];
  horizontal: boolean;
  showLegend: boolean;
  xColumn: string;
  yColumns: string[];
}

export type VisualizationEditorDraft =
  | {
      type: "TABLE";
      visualizationId: number | null;
      name: string;
      description: string;
      tableOptions: TableVisualizationOptions;
    }
  | {
      type: "CHART";
      visualizationId: number | null;
      name: string;
      description: string;
      chartOptions: ChartVisualizationOptions;
    };

export type ActiveVisualizationTab = "table" | number;
export type PaginationItem = number | "ellipsis";
export type ResultSortDirection = "asc" | "desc";
export type FilterToken =
  | {
      type: "global";
      value: string;
    }
  | {
      type: "column";
      column: string;
      value: string;
    };

export type QueryParameterType =
  | "text"
  | "number"
  | "enum"
  | "date"
  | "datetime-local"
  | "datetime-with-seconds"
  | "date-range"
  | "datetime-range"
  | "datetime-range-with-seconds";

export interface QueryParameterMultiValueOptions {
  prefix: string;
  separator: string;
  suffix: string;
}

export interface QueryParameterRangeValue {
  end: string;
  start: string;
}

export interface PendingQueryParameterRangeSelection {
  end?: string;
  start?: string;
}

export type QueryParameterValue =
  | QueryParameterRangeValue
  | number
  | string
  | string[]
  | null;

export interface QueryParameterState {
  enumOptions?: string;
  multiValuesOptions?: QueryParameterMultiValueOptions | null;
  name: string;
  pendingValue?: QueryParameterValue;
  title: string | null;
  type: QueryParameterType;
  useCurrentDateTime?: boolean;
  value: QueryParameterValue;
}

export interface QueryParameterEditorDraft {
  enumOptions: string;
  isNew: boolean;
  isTitleEdited: boolean;
  multiValuesOptions: QueryParameterMultiValueOptions | null;
  name: string;
  originalName: string | null;
  title: string;
  type: QueryParameterType;
}

export interface ParameterOptionItem {
  label: string;
  value: QueryParameterType;
}

export interface DatePresetItem {
  key: string;
  label: string;
}

export interface ParameterTypeGroup {
  items: ParameterOptionItem[];
  key: string;
}

export const NEW_QUERY_STATE: EditableQueryState = {
  api_key: undefined,
  id: null,
  data_source_id: null,
  description: null,
  is_archived: false,
  is_draft: true,
  is_favorite: false,
  latest_query_data_id: null,
  name: "New Query",
  options: {},
  query: "",
  schedule: null,
  tags: [],
};

export const PARAMETER_TYPE_OPTIONS: ParameterOptionItem[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "enum", label: "Dropdown List" },
  { value: "date", label: "Date" },
  { value: "datetime-local", label: "Date and Time" },
  { value: "datetime-with-seconds", label: "Date and Time (with seconds)" },
  { value: "date-range", label: "Date Range" },
  { value: "datetime-range", label: "Date and Time Range" },
  {
    value: "datetime-range-with-seconds",
    label: "Date and Time Range (with seconds)",
  },
];

export const DATE_PRESETS: DatePresetItem[] = [
  { key: "now", label: "Today/Now" },
  { key: "yesterday", label: "Yesterday" },
];

export const DATE_RANGE_PRESETS: DatePresetItem[] = [
  { key: "this_week", label: "This week" },
  { key: "this_month", label: "This month" },
  { key: "this_year", label: "This year" },
  { key: "last_week", label: "Last week" },
  { key: "last_month", label: "Last month" },
  { key: "last_year", label: "Last year" },
  { key: "last_7_days", label: "Last 7 days" },
  { key: "last_14_days", label: "Last 14 days" },
  { key: "last_30_days", label: "Last 30 days" },
  { key: "last_60_days", label: "Last 60 days" },
  { key: "last_90_days", label: "Last 90 days" },
  { key: "last_12_months", label: "Last 12 months" },
];

export const PARAMETER_TYPE_GROUPS: ParameterTypeGroup[] = [
  {
    key: "basic",
    items: [
      { value: "text", label: "Text" },
      { value: "number", label: "Number" },
      { value: "enum", label: "Dropdown List" },
    ],
  },
  {
    key: "date",
    items: [
      { value: "date", label: "Date" },
      { value: "datetime-local", label: "Date and Time" },
      {
        value: "datetime-with-seconds",
        label: "Date and Time (with seconds)",
      },
    ],
  },
  {
    key: "range",
    items: [
      { value: "date-range", label: "Date Range" },
      { value: "datetime-range", label: "Date and Time Range" },
      {
        value: "datetime-range-with-seconds",
        label: "Date and Time Range (with seconds)",
      },
    ],
  },
];

export const SHARED_DAY_PICKER_CLASS_NAMES = {
  button_next:
    "inline-flex h-7 w-7 items-center justify-center rounded text-[#7d7d7d] hover:bg-[#f5f7f9]",
  button_previous:
    "inline-flex h-7 w-7 items-center justify-center rounded text-[#7d7d7d] hover:bg-[#f5f7f9]",
  caption_label: "text-[14px] font-medium text-[#323232]",
  chevron: "fill-[#7d7d7d]",
  day: "h-9 w-9 text-[13px] text-[#595959]",
  day_button: "h-9 w-9 rounded-[2px] transition hover:bg-[#f0f7ff]",
  months: "flex flex-col gap-4 md:flex-row md:gap-8",
  month_caption:
    "mb-3 flex items-center justify-center text-[14px] font-medium text-[#323232]",
  month_grid: "border-collapse",
  nav: "absolute inset-x-0 top-0 flex items-center justify-between px-1",
  root: "relative",
  selected: "bg-[#1890ff] text-white hover:bg-[#1890ff]",
  today: "font-semibold text-[#1890ff]",
  range_middle: "bg-[#e6f4ff] text-[#323232]",
  range_start: "bg-[#1890ff] text-white rounded-l-[2px] hover:bg-[#1890ff]",
  range_end: "bg-[#1890ff] text-white rounded-r-[2px] hover:bg-[#1890ff]",
  weekday: "h-8 w-9 text-center text-[12px] font-normal text-[#8c8c8c]",
  week: "h-9",
} as const;

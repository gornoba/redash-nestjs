"use client";

import {
  BarChartOutlined,
  CodeOutlined,
  EllipsisOutlined,
  FileExcelOutlined,
  FileOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  PlusCircleOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { memo, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
import type {
  QueryDetail,
  QueryExecutionResult,
  QueryVisualization,
} from "../types";
import QueryMetadataDetails from "./QueryMetadataDetails";
import { ResultFilterInput } from "./QuerySourceEditorCommon";
import type {
  ActiveVisualizationTab,
  ChartVisualizationOptions,
  PaginationItem,
  ResultSortDirection,
  TableVisualizationColumnOption,
} from "./querySourceEditorTypes";
import {
  formatRelativeTime,
  formatRuntime,
  renderChartVisualization,
  renderVisualizationCellContent,
} from "./querySourceEditorUtils";

interface QueryResultPaneProps {
  actionMenuRef: RefObject<HTMLDivElement | null>;
  activeChartOptions: ChartVisualizationOptions | null;
  activeVisualizationTab: ActiveVisualizationTab;
  canManageVisualizations: boolean;
  canUseSavedVisualization: boolean;
  chartVisualizations: QueryVisualization[];
  emptyMessage: string;
  executionError: string | null;
  executionResult: QueryExecutionResult | null;
  filteredResultRowCount: number;
  fullscreenShortcutLabel: string;
  hydratedTableVisualization: QueryVisualization | null;
  isActionMenuOpen: boolean;
  isResultFullscreen: boolean;
  mode: "source" | "view";
  nextJumpPage: number | null;
  onDownloadResults: (fileType: "csv" | "tsv" | "xlsx") => void;
  onEditSchedule?: () => void;
  onOpenAddToDashboard: () => void;
  onOpenEmbed: () => void;
  onOpenVisualizationEditor: (mode?: "edit" | "create-chart") => void;
  onResultFilterChange: (nextValue: string) => void;
  onResultPageChange: (nextPage: number) => void;
  onResultPageInputBlur: () => void;
  onResultPageInputChange: (nextValue: string) => void;
  onResultPageInputKeyDown: (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => void;
  onResultPageSizeChange: (nextSize: number) => void;
  onResultSort: (columnName: string) => void;
  onToggleActionMenu: () => void;
  onToggleFullscreen: () => void;
  onVisualizationTabChange: (nextTab: ActiveVisualizationTab) => void;
  paginatedRows: Array<Record<string, unknown>>;
  paginationItems: PaginationItem[];
  previousJumpPage: number | null;
  queryDetailData: QueryDetail | null;
  resultFilter: string;
  resultPage: number;
  resultPageInput: string;
  resultPageSize: number;
  resultSort: {
    column: string | null;
    direction: ResultSortDirection;
  };
  scheduleEditable: boolean;
  scheduleTimezone: string;
  selectedDataSourceName: string | null;
  totalResultRowCount: number;
  visibleResultColumns: TableVisualizationColumnOption[];
}

export default memo(function QueryResultPane({
  actionMenuRef,
  activeChartOptions,
  activeVisualizationTab,
  canManageVisualizations,
  canUseSavedVisualization,
  chartVisualizations,
  emptyMessage,
  executionError,
  executionResult,
  filteredResultRowCount,
  fullscreenShortcutLabel,
  hydratedTableVisualization,
  isActionMenuOpen,
  isResultFullscreen,
  mode,
  nextJumpPage,
  onDownloadResults,
  onEditSchedule,
  onOpenAddToDashboard,
  onOpenEmbed,
  onOpenVisualizationEditor,
  onResultFilterChange,
  onResultPageChange,
  onResultPageInputBlur,
  onResultPageInputChange,
  onResultPageInputKeyDown,
  onResultPageSizeChange,
  onResultSort,
  onToggleActionMenu,
  onToggleFullscreen,
  onVisualizationTabChange,
  paginatedRows,
  paginationItems,
  previousJumpPage,
  queryDetailData,
  resultFilter,
  resultPage,
  resultPageInput,
  resultPageSize,
  resultSort,
  scheduleEditable,
  scheduleTimezone,
  selectedDataSourceName,
  totalResultRowCount,
  visibleResultColumns,
}: QueryResultPaneProps) {
  const isViewMode = mode === "view";

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[3px] bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
        <div className="border-b border-[#e8e8e8] px-[15px]">
          <div className="flex flex-wrap items-end gap-[2px]">
            <button
              className={`inline-flex h-[42px] items-center border-b-2 px-[10px] text-[14px] transition ${
                activeVisualizationTab === "table"
                  ? "border-[#1890ff] text-[#1890ff]"
                  : "border-transparent text-[#666] hover:text-[#1890ff]"
              }`}
              onClick={() => onVisualizationTabChange("table")}
              type="button"
            >
              {hydratedTableVisualization?.name?.trim() || "Table"}
            </button>
            {chartVisualizations.map((item) => (
              <button
                key={item.id}
                className={`inline-flex h-[42px] items-center border-b-2 px-[10px] text-[14px] transition ${
                  activeVisualizationTab === item.id
                    ? "border-[#1890ff] text-[#1890ff]"
                    : "border-transparent text-[#666] hover:text-[#1890ff]"
                }`}
                onClick={() => onVisualizationTabChange(item.id)}
                type="button"
              >
                {item.name.trim() || "Chart"}
              </button>
            ))}
            <button
              className="inline-flex h-[42px] items-center gap-2 px-[10px] text-[14px] text-[#7a7a7a] transition hover:text-[#1890ff] disabled:cursor-not-allowed disabled:text-[#bfbfbf]"
              disabled={!executionResult || !canManageVisualizations}
              onClick={() => onOpenVisualizationEditor("create-chart")}
              type="button"
            >
              <PlusCircleOutlined />
              Add Visualization
            </button>
          </div>
        </div>

        {!executionError && !executionResult ? (
          <div className="px-[15px] py-[18px] text-[13px] text-[#8c8c8c]">
            {emptyMessage}
          </div>
        ) : null}

        {executionResult ? (
          <div
            className={`flex min-h-0 flex-1 flex-col p-[15px] ${
              isViewMode ? "" : "h-full"
            }`}
          >
            {activeVisualizationTab === "table" ? (
              <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
                <table className="min-w-full w-max border-collapse text-[13px] text-[#595959]">
                  <thead>
                    <tr className="border-b border-[#e8e8e8] bg-[#fafafa]">
                      {visibleResultColumns.map((column) => (
                        <th
                          key={column.name}
                          className={`sticky top-0 z-10 whitespace-nowrap border-b border-[#e8e8e8] bg-[#fafafa] px-[12px] py-[10px] font-medium text-[#333] ${
                            column.align === "right"
                              ? "text-right"
                              : column.align === "center"
                                ? "text-center"
                                : "text-left"
                          }`}
                          title={column.description || undefined}
                        >
                          <button
                            className={`inline-flex items-center gap-2 ${
                              column.align === "right"
                                ? "ml-auto"
                                : column.align === "center"
                                  ? "mx-auto"
                                  : ""
                            }`}
                            onClick={() => onResultSort(column.name)}
                            type="button"
                          >
                            <span>{column.title || column.name}</span>
                            <span className="inline-flex flex-col text-[10px] leading-[8px] text-[#bfbfbf]">
                              <span
                                className={
                                  resultSort.column === column.name &&
                                  resultSort.direction === "asc"
                                    ? "text-[#1890ff]"
                                    : ""
                                }
                              >
                                ▲
                              </span>
                              <span
                                className={
                                  resultSort.column === column.name &&
                                  resultSort.direction === "desc"
                                    ? "text-[#1890ff]"
                                    : ""
                                }
                              >
                                ▼
                              </span>
                            </span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row, rowIndex) => (
                      <tr
                        key={`result-row-${mode}-${rowIndex + (resultPage - 1) * resultPageSize}`}
                        className="border-b border-[#f0f0f0] transition hover:bg-white"
                      >
                        {visibleResultColumns.map((column) => (
                          <td
                            key={`${rowIndex}:${column.name}`}
                            className={`whitespace-nowrap px-[12px] py-[10px] align-top ${
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
              </div>
            ) : activeChartOptions ? (
              <div className="min-h-0 flex-1 rounded-[2px] border border-[#e8e8e8] bg-white p-5">
                {renderChartVisualization(
                  executionResult.data,
                  activeChartOptions,
                  420,
                )}
              </div>
            ) : null}

            <div className="mt-[12px] flex flex-wrap items-center justify-between gap-3 border-t border-[#e8e8e8] pt-[12px] text-[13px] text-[#595959]">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative" ref={actionMenuRef}>
                  <button
                    className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#595959] transition hover:border-[#40a9ff] hover:text-[#1890ff]"
                    onClick={onToggleActionMenu}
                    type="button"
                  >
                    <EllipsisOutlined rotate={90} />
                  </button>

                  {isActionMenuOpen ? (
                    <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 min-w-[220px] rounded-[2px] border border-[#d9d9d9] bg-white py-1 shadow-[0_8px_18px_rgba(0,0,0,0.14)]">
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9] disabled:cursor-not-allowed disabled:text-[#bfbfbf]"
                        disabled={!canUseSavedVisualization}
                        onClick={onOpenAddToDashboard}
                        type="button"
                      >
                        <PlusCircleOutlined />
                        Add to Dashboard
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9] disabled:cursor-not-allowed disabled:text-[#bfbfbf]"
                        disabled={!canUseSavedVisualization}
                        onClick={onOpenEmbed}
                        type="button"
                      >
                        <ShareAltOutlined />
                        Embed Elsewhere
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9]"
                        onClick={() => onDownloadResults("csv")}
                        type="button"
                      >
                        <FileOutlined />
                        Download as CSV File
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9]"
                        onClick={() => onDownloadResults("tsv")}
                        type="button"
                      >
                        <FileOutlined />
                        Download as TSV File
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9]"
                        onClick={() => onDownloadResults("xlsx")}
                        type="button"
                      >
                        <FileExcelOutlined />
                        Download as Excel File
                      </button>
                    </div>
                  ) : null}
                </div>

                {isViewMode ? (
                  <button
                    className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#595959] transition hover:border-[#40a9ff] hover:text-[#1890ff]"
                    onClick={onToggleFullscreen}
                    title={`Toggle Fullscreen (${fullscreenShortcutLabel})`}
                    type="button"
                  >
                    {isResultFullscreen ? (
                      <FullscreenExitOutlined />
                    ) : (
                      <FullscreenOutlined />
                    )}
                  </button>
                ) : null}

                {canManageVisualizations ? (
                  <button
                    className="inline-flex h-[32px] items-center gap-2 rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-[13px] text-[#595959] transition hover:border-[#40a9ff] hover:text-[#1890ff]"
                    onClick={() => onOpenVisualizationEditor("edit")}
                    type="button"
                  >
                    {activeVisualizationTab === "table" ? (
                      <CodeOutlined />
                    ) : (
                      <BarChartOutlined />
                    )}
                    Edit Visualization
                  </button>
                ) : null}

                <span className="text-[#767676]">
                  {filteredResultRowCount.toLocaleString()}
                  {filteredResultRowCount !== totalResultRowCount
                    ? ` / ${totalResultRowCount.toLocaleString()} rows`
                    : " rows"}
                </span>
                <span className="text-[#767676]">
                  {formatRuntime(executionResult.runtime)}
                  {isViewMode ? "" : " runtime"}
                </span>
              </div>

              <div className="flex min-w-[260px] flex-1 justify-center">
                {activeVisualizationTab === "table" ? (
                  <ResultFilterInput
                    onChange={onResultFilterChange}
                    value={resultFilter}
                  />
                ) : (
                  <div className="text-[12px] text-[#8c8c8c]">
                    X축과 Y축 컬럼을 고르면 바로 미리보기가 바뀝니다.
                  </div>
                )}
              </div>

              <div className="text-[#767676]">
                <span className="hidden sm:inline">Refreshed </span>
                <strong className="font-medium">
                  {formatRelativeTime(executionResult.retrieved_at)}
                </strong>
              </div>
            </div>

            {activeVisualizationTab === "table" ? (
              <div className="mt-[12px] grid gap-3 border-t border-[#e8e8e8] pt-[12px] text-[13px] text-[#595959] md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="hidden md:block" />

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-[#f5f5f5] text-[13px] text-[#8c8c8c] transition hover:border-[#40a9ff] hover:bg-white hover:text-[#1890ff] disabled:cursor-not-allowed disabled:border-[#e8e8e8] disabled:bg-[#f5f5f5] disabled:text-[#d0d0d0]"
                    disabled={previousJumpPage === null}
                    onClick={() =>
                      previousJumpPage !== null &&
                      onResultPageChange(previousJumpPage)
                    }
                    type="button"
                  >
                    {"<"}
                  </button>

                  <input
                    className="h-[32px] w-[52px] rounded-[2px] border border-[#d9d9d9] bg-white px-2 text-center text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
                    inputMode="numeric"
                    onBlur={onResultPageInputBlur}
                    onChange={(event) =>
                      onResultPageInputChange(
                        event.target.value.replace(/[^0-9]/g, ""),
                      )
                    }
                    onKeyDown={onResultPageInputKeyDown}
                    value={resultPageInput}
                  />

                  {paginationItems.map((item, index) =>
                    item === "ellipsis" ? (
                      <span
                        key={`pagination-${mode}-ellipsis-${index}`}
                        className="inline-flex h-[32px] min-w-[32px] items-center justify-center px-1 text-[#8c8c8c]"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={`pagination-${mode}-page-${item}`}
                        className={`inline-flex h-[32px] min-w-[32px] items-center justify-center rounded-[2px] px-[10px] text-[13px] transition ${
                          item === resultPage
                            ? "bg-[#1890ff] text-white shadow-[0_2px_0_rgba(0,0,0,0.045)]"
                            : "border border-[#d9d9d9] bg-[#f5f5f5] text-[#595959] hover:border-[#40a9ff] hover:bg-white hover:text-[#1890ff]"
                        }`}
                        onClick={() => onResultPageChange(item)}
                        type="button"
                      >
                        {item}
                      </button>
                    ),
                  )}

                  <button
                    className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-[#f5f5f5] text-[13px] text-[#8c8c8c] transition hover:border-[#40a9ff] hover:bg-white hover:text-[#1890ff] disabled:cursor-not-allowed disabled:border-[#e8e8e8] disabled:bg-[#f5f5f5] disabled:text-[#d0d0d0]"
                    disabled={nextJumpPage === null}
                    onClick={() =>
                      nextJumpPage !== null && onResultPageChange(nextJumpPage)
                    }
                    type="button"
                  >
                    {">"}
                  </button>
                </div>

                <div className="flex items-center justify-start gap-2 md:justify-end">
                  <span className="text-[#8c8c8c]">
                    {filteredResultRowCount.toLocaleString()} rows
                  </span>
                  <span>Page Size:</span>
                  <select
                    className="h-[32px] rounded-[2px] border border-[#d9d9d9] bg-white px-2 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
                    onChange={(event) =>
                      onResultPageSizeChange(Number(event.target.value))
                    }
                    value={resultPageSize}
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {isViewMode && !isResultFullscreen && queryDetailData ? (
        <QueryMetadataDetails
          dataSourceName={selectedDataSourceName}
          layout="footer"
          onEditSchedule={scheduleEditable ? onEditSchedule : undefined}
          query={queryDetailData}
          scheduleEditable={scheduleEditable}
          timezone={scheduleTimezone}
        />
      ) : null}
    </>
  );
});

"use client";

import {
  ApartmentOutlined,
  DownOutlined,
  LoadingOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import Image from "next/image";
import { memo, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
import type {
  DataSourceSchemaResponse,
  DataSourceSchemaTable,
  DataSourceSummary,
} from "@/features/data-sources/types";
import type { QueryDetail } from "../types";
import { SchemaInsertButton } from "./QuerySourceEditorCommon";
import QueryMetadataDetails from "./QueryMetadataDetails";
import { normalizeDataSourceLogo } from "./querySourceEditorUtils";

interface QuerySchemaSidebarProps {
  canManageQuery: boolean;
  dataSourceDropdownRef: RefObject<HTMLDivElement | null>;
  dataSourceSearch: string;
  descriptionDraft: string;
  expandedTables: Record<string, boolean>;
  filteredDataSources: DataSourceSummary[];
  filteredSchema: DataSourceSchemaTable[];
  isDataSourceMenuOpen: boolean;
  isDescriptionEditing: boolean;
  isSchemaLoading: boolean;
  isSchemaPanelCollapsed: boolean;
  onCommitDescription: (nextDescription: string) => void | Promise<void>;
  onDataSourceSearchChange: (nextValue: string) => void;
  onDescriptionDraftChange: (nextValue: string) => void;
  onDescriptionInputKeyDown: (
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ) => void;
  onOpenSchemaDiagram: () => void;
  onOpenTableSchemaDiagram: (tableName: string) => void;
  onRefreshSchema: () => void;
  onSchemaFilterChange: (nextValue: string) => void;
  onSelectDataSource: (dataSource: DataSourceSummary) => void;
  onStartDescriptionEditing: () => void;
  onToggleDataSourceMenu: () => void;
  onToggleTable: (tableName: string) => void;
  onInsertText: (text: string) => void;
  onOpenScheduleDialog?: () => void;
  queryDescription: string | null;
  queryDetailData: QueryDetail | null;
  scheduleEditable: boolean;
  scheduleTimezone: string;
  schemaFilter: string;
  schemaPanelWidth: number;
  schemaResponse: DataSourceSchemaResponse | null;
  selectedDataSource: DataSourceSummary | null;
  shouldShowSourceMetadataPanel: boolean;
}

export default memo(function QuerySchemaSidebar({
  canManageQuery,
  dataSourceDropdownRef,
  dataSourceSearch,
  descriptionDraft,
  expandedTables,
  filteredDataSources,
  filteredSchema,
  isDataSourceMenuOpen,
  isDescriptionEditing,
  isSchemaLoading,
  isSchemaPanelCollapsed,
  onCommitDescription,
  onDataSourceSearchChange,
  onDescriptionDraftChange,
  onDescriptionInputKeyDown,
  onOpenSchemaDiagram,
  onOpenScheduleDialog,
  onOpenTableSchemaDiagram,
  onRefreshSchema,
  onSchemaFilterChange,
  onSelectDataSource,
  onStartDescriptionEditing,
  onToggleDataSourceMenu,
  onToggleTable,
  onInsertText,
  queryDescription,
  queryDetailData,
  scheduleEditable,
  scheduleTimezone,
  schemaFilter,
  schemaPanelWidth,
  schemaResponse,
  selectedDataSource,
  shouldShowSourceMetadataPanel,
}: QuerySchemaSidebarProps) {
  return (
    <aside
      className={`flex w-full shrink-0 flex-col overflow-hidden border-b border-[#efefef] md:border-r md:border-b-0 ${
        isSchemaPanelCollapsed ? "md:w-[46px]" : ""
      }`}
      style={
        isSchemaPanelCollapsed
          ? undefined
          : {
              width: `${schemaPanelWidth}px`,
              minWidth: `${schemaPanelWidth}px`,
            }
      }
    >
      <div className={`p-[15px] ${isSchemaPanelCollapsed ? "md:hidden" : ""}`}>
        <div className="relative" ref={dataSourceDropdownRef}>
          <button
            className="flex h-[40px] w-full items-center justify-between rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-left text-[13px] text-[#595959] outline-none transition hover:border-[#40a9ff] focus:border-[#40a9ff] disabled:cursor-not-allowed disabled:border-[#e8e8e8] disabled:bg-[#f5f5f5] disabled:text-[#bfbfbf]"
            disabled={!canManageQuery}
            onClick={onToggleDataSourceMenu}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-2">
              {selectedDataSource ? (
                <Image
                  alt={selectedDataSource.name}
                  className="h-4 w-4 object-contain"
                  height={16}
                  src={`/static/images/db-logos/${normalizeDataSourceLogo(selectedDataSource.type)}.png`}
                  unoptimized
                  width={16}
                />
              ) : null}
              <span className="truncate">
                {selectedDataSource?.name ?? "Choose data source..."}
              </span>
            </span>
            <DownOutlined className="text-[11px] text-[#bfbfbf]" />
          </button>

          {isDataSourceMenuOpen ? (
            <div className="absolute left-0 top-[calc(100%+4px)] z-30 w-full overflow-hidden rounded-[2px] border border-[#d9d9d9] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
              <div className="border-b border-[#efefef] p-2">
                <div className="relative">
                  <SearchOutlined className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[#bfbfbf]" />
                  <input
                    className="h-[34px] w-full rounded-[2px] border border-[#d9d9d9] bg-white pr-3 pl-8 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
                    onChange={(event) =>
                      onDataSourceSearchChange(event.target.value)
                    }
                    placeholder="Search data sources..."
                    value={dataSourceSearch}
                  />
                </div>
              </div>
              <div className="max-h-[320px] overflow-y-auto py-1">
                {filteredDataSources.map((dataSource) => (
                  <button
                    key={dataSource.id}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13px] text-[#595959] transition hover:bg-[#f5f7f9]"
                    disabled={!canManageQuery}
                    onClick={() => onSelectDataSource(dataSource)}
                    type="button"
                  >
                    <Image
                      alt={dataSource.name}
                      className="h-4 w-4 object-contain"
                      height={16}
                      src={`/static/images/db-logos/${normalizeDataSourceLogo(dataSource.type)}.png`}
                      unoptimized
                      width={16}
                    />
                    <span className="truncate">{dataSource.name}</span>
                  </button>
                ))}
                {filteredDataSources.length === 0 ? (
                  <div className="px-4 py-3 text-[13px] text-[#9a9a9a]">
                    No data sources found.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={`px-[15px] pb-[15px] ${
          isSchemaPanelCollapsed ? "md:hidden" : ""
        }`}
      >
        <div className="flex gap-[5px]">
          <input
            aria-label="Search schema"
            className="h-[38px] min-w-0 flex-1 rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
            onChange={(event) => onSchemaFilterChange(event.target.value)}
            placeholder="Search schema..."
            value={schemaFilter}
          />
          <button
            className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#7d7d7d] transition hover:border-[#40a9ff] hover:text-[#1890ff]"
            onClick={onOpenSchemaDiagram}
            title="Open schema diagram"
            type="button"
          >
            <ApartmentOutlined />
          </button>
          <button
            className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#7d7d7d] transition hover:border-[#40a9ff] hover:text-[#1890ff]"
            onClick={onRefreshSchema}
            title="Refresh schema"
            type="button"
          >
            {isSchemaLoading ? <LoadingOutlined /> : <ReloadOutlined />}
          </button>
        </div>
      </div>

      <div
        className={`min-h-0 flex-1 overflow-y-auto px-[10px] pb-[15px] ${
          isSchemaPanelCollapsed ? "md:hidden" : ""
        }`}
      >
        {isSchemaLoading && !schemaResponse ? (
          <div className="px-2 py-3 text-[13px] text-[#767676]">
            Loading schema...
          </div>
        ) : null}
        {!isSchemaLoading && filteredSchema.length === 0 ? (
          <div className="px-2 py-3 text-[13px] text-[#9a9a9a]">
            No tables found.
          </div>
        ) : null}
        {filteredSchema.map((table) => {
          const isExpanded = Boolean(expandedTables[table.name]);

          return (
            <div key={table.name} className="mb-[2px]">
              <div className="group flex h-[24px] rounded-[2px] hover:bg-[#eef2f4]">
                <button
                  className="inline-flex w-[26px] shrink-0 items-center justify-center text-[12px] text-[#6c6c6c] transition hover:text-[#1890ff]"
                  onClick={() => onOpenTableSchemaDiagram(table.name)}
                  title="Open related schema diagram"
                  type="button"
                >
                  <ApartmentOutlined className="text-[12px]" />
                </button>
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 pr-[8px] text-left text-[13px] text-[#6c6c6c]"
                  onClick={() => onToggleTable(table.name)}
                  type="button"
                >
                  <span className="truncate">{table.name}</span>
                </button>
                {canManageQuery ? (
                  <div className="flex items-center pr-1 opacity-0 transition group-hover:opacity-100">
                    <SchemaInsertButton
                      className="inline-flex h-5 w-5 items-center justify-center text-[12px] text-[#8e8e8e] transition hover:text-[#1890ff]"
                      label="Insert table name into query text"
                      onClick={() => onInsertText(table.name)}
                    />
                  </div>
                ) : null}
              </div>

              {isExpanded ? (
                <div className="pl-[22px]">
                  {table.columns.map((column) => (
                    <div
                      key={`${table.name}:${column.name}`}
                      className="group flex min-h-[20px] items-start rounded-[2px] pr-1 hover:bg-[#eef2f4]"
                    >
                      <button
                        className="min-w-0 flex-1 px-[8px] py-[1px] text-left text-[12px] leading-[18px] text-[#777]"
                        onClick={() => onInsertText(column.name)}
                        type="button"
                      >
                        <span>{column.name}</span>
                        {column.type ? (
                          <span className="ml-1 text-[10px] uppercase text-[#9a9a9a]">
                            {column.type}
                          </span>
                        ) : null}
                        {column.comment ? (
                          <span className="ml-1 text-[10px] text-[#b0b0b0]">
                            - {column.comment}
                          </span>
                        ) : null}
                      </button>
                      <div className="opacity-0 transition group-hover:opacity-100">
                            {canManageQuery ? (
                              <SchemaInsertButton
                                className="inline-flex h-5 w-5 items-center justify-center text-[12px] text-[#8e8e8e] transition hover:text-[#1890ff]"
                                label="Insert column name into query text"
                                onClick={() => onInsertText(column.name)}
                              />
                            ) : null}
                          </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!isSchemaPanelCollapsed && shouldShowSourceMetadataPanel ? (
        <div className="shrink-0 border-t border-[#e8e8e8] bg-white">
          <div className="px-[15px] py-[14px]">
            {isDescriptionEditing ? (
              <textarea
                autoFocus
                className="min-h-[72px] w-full rounded-[2px] border border-[#d9d9d9] bg-white px-3 py-2 text-[14px] leading-[1.6] text-[#666] outline-none transition focus:border-[#40a9ff]"
                onBlur={() => void onCommitDescription(descriptionDraft)}
                onChange={(event) => onDescriptionDraftChange(event.target.value)}
                onKeyDown={onDescriptionInputKeyDown}
                placeholder="Add description"
                rows={3}
                value={descriptionDraft}
              />
            ) : queryDescription ? (
              canManageQuery ? (
                <button
                  className="w-full rounded-[2px] text-left text-[14px] leading-[1.6] text-[#1890ff] outline-none transition hover:text-[#40a9ff]"
                  onClick={onStartDescriptionEditing}
                  type="button"
                >
                  {queryDescription}
                </button>
              ) : (
                <div className="text-[14px] leading-[1.6] text-[#666]">
                  {queryDescription}
                </div>
              )
            ) : canManageQuery ? (
              <button
                className="text-[14px] text-[#1890ff] transition hover:text-[#40a9ff]"
                onClick={onStartDescriptionEditing}
                type="button"
              >
                Add description
              </button>
            ) : null}
          </div>

          {queryDetailData ? (
            <QueryMetadataDetails
              layout="sidebar"
              onEditSchedule={scheduleEditable ? onOpenScheduleDialog : undefined}
              query={queryDetailData}
              scheduleEditable={scheduleEditable}
              timezone={scheduleTimezone}
            />
          ) : null}
        </div>
      ) : null}
    </aside>
  );
});

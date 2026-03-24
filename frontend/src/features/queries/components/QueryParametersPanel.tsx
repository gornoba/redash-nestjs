"use client";

import { CheckOutlined, HolderOutlined, SettingFilled } from "@ant-design/icons";
import { memo, type MutableRefObject, type ReactNode } from "react";
import type { QueryParameterState } from "./querySourceEditorTypes";
import {
  humanizeParameterName,
  isDateParameterType,
  isDateRangeParameterType,
} from "./querySourceEditorUtils";

interface QueryParametersPanelProps {
  canManageQuery: boolean;
  dirtyParameterCount: number;
  hasDirtyParameters: boolean;
  mode: "source" | "view";
  onApplyChangesRef: MutableRefObject<(() => Promise<void>) | null>;
  onOpenEditParameterRef: MutableRefObject<
    ((parameter: QueryParameterState) => void) | null
  >;
  renderParameterInput: (parameter: QueryParameterState) => ReactNode;
  queryParameters: QueryParameterState[];
}

export default memo(function QueryParametersPanel({
  canManageQuery,
  dirtyParameterCount,
  hasDirtyParameters,
  mode,
  onApplyChangesRef,
  onOpenEditParameterRef,
  renderParameterInput,
  queryParameters,
}: QueryParametersPanelProps) {
  if (queryParameters.length === 0) {
    return null;
  }

  const isSourceMode = mode === "source";

  return (
    <div
      className={
        isSourceMode
          ? "border-t border-[#efefef] bg-white px-[15px] py-[12px]"
          : "mx-[15px] mb-[15px] rounded-[3px] bg-white px-[15px] py-[12px] shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]"
      }
    >
      <div className="flex flex-wrap items-end gap-x-[18px] gap-y-[14px]">
        {queryParameters.map((parameter) => (
          <div
            key={parameter.name}
            className="w-full"
            style={{
              maxWidth: isDateRangeParameterType(parameter.type)
                ? 420
                : isDateParameterType(parameter.type)
                  ? 300
                  : parameter.type === "enum"
                    ? 280
                    : 240,
              minWidth: isDateRangeParameterType(parameter.type)
                ? 320
                : isDateParameterType(parameter.type)
                  ? 250
                  : parameter.type === "enum"
                    ? 240
                    : 220,
            }}
          >
            {isSourceMode ? (
              <>
                <div className="mb-[6px] flex items-center justify-between">
                  <span className="text-[13px] text-[#595959]">
                    {parameter.title || humanizeParameterName(parameter.name)}
                  </span>
                  {canManageQuery ? (
                    <button
                      className="inline-flex h-[24px] w-[24px] items-center justify-center rounded-[2px] bg-[#e9eef1] text-[12px] text-[#666] transition hover:text-[#1890ff]"
                      onClick={() => onOpenEditParameterRef.current?.(parameter)}
                      type="button"
                    >
                      <SettingFilled />
                    </button>
                  ) : null}
                </div>
                <div className="flex items-start gap-[8px]">
                  {canManageQuery ? (
                    <span className="pt-[10px] text-[#c4c4c4]">
                      <HolderOutlined />
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    {renderParameterInput(parameter)}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mb-[6px] text-[13px] text-[#595959]">
                  {parameter.title || humanizeParameterName(parameter.name)}
                </div>
                {renderParameterInput(parameter)}
              </>
            )}
          </div>
        ))}

        {hasDirtyParameters ? (
          <div className="flex min-h-[68px] items-end">
            <button
              className={`inline-flex h-[34px] items-center gap-2 rounded-[2px] border px-3 text-[13px] transition ${
                isSourceMode
                  ? hasDirtyParameters
                    ? "border-[#40a9ff] bg-white text-[#1890ff] hover:bg-[#f5faff]"
                    : "cursor-not-allowed border-[#e8e8e8] bg-[#f5f5f5] text-[#bfbfbf]"
                  : "border-[#40a9ff] bg-white text-[#1890ff] hover:bg-[#f5faff]"
              }`}
              disabled={!hasDirtyParameters}
              onClick={() => void onApplyChangesRef.current?.()}
              type="button"
            >
              <CheckOutlined />
              Apply Changes
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e85d5d] px-[5px] text-[11px] text-white">
                {dirtyParameterCount}
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
});

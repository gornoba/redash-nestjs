"use client";

import { CloseOutlined, DownOutlined, RightOutlined } from "@ant-design/icons";
import { memo, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import type { QueryParameterEditorDraft } from "./querySourceEditorTypes";
import { PARAMETER_TYPE_GROUPS } from "./querySourceEditorTypes";
import {
  getParameterTypeLabel,
  humanizeParameterName,
} from "./querySourceEditorUtils";

export function SchemaInsertButton({
  className,
  label,
  onClick,
}: {
  className?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="group/tooltip relative">
      <button className={className} onClick={onClick} type="button">
        <RightOutlined />
      </button>
      <div className="pointer-events-none absolute right-0 top-1/2 z-20 hidden -translate-y-1/2 translate-x-[calc(100%+10px)] whitespace-nowrap rounded bg-[#3a3a3a] px-3 py-2 text-[12px] text-white shadow-[0_8px_20px_rgba(0,0,0,0.28)] group-hover/tooltip:block">
        {label}
      </div>
    </div>
  );
}

export function QueryTagChip({
  tag,
  onRemove,
}: {
  tag: string;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-[#dfe7eb] px-[7px] py-[3px] text-[12px] text-[#5f6f7a]">
      {tag}
      {onRemove ? (
        <button
          className="text-[11px] text-[#7d8b95] transition hover:text-[#323232]"
          onClick={onRemove}
          type="button"
        >
          x
        </button>
      ) : null}
    </span>
  );
}

export function OverlayDialog({
  bodyClassName,
  children,
  dialogClassName,
  dialogStyle,
  footer,
  onClose,
  title,
}: {
  bodyClassName?: string;
  children: ReactNode;
  dialogClassName?: string;
  dialogStyle?: CSSProperties;
  footer?: ReactNode;
  onClose: () => void;
  title: string;
}) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(0,0,0,0.45)] p-4 pt-10">
      <div
        className={`flex max-h-[calc(100vh-32px)] w-full max-w-[760px] flex-col overflow-hidden rounded-[2px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.22)] ${dialogClassName ?? ""}`}
        style={dialogStyle}
      >
        <div className="flex items-center justify-between border-b border-[#e8e8e8] px-6 py-5">
          <h3 className="m-0 text-[18px] font-normal text-[#323232]">
            {title}
          </h3>
          <button
            className="text-[18px] text-[#8c8c8c] transition hover:text-[#323232]"
            onClick={onClose}
            type="button"
          >
            <CloseOutlined />
          </button>
        </div>
        <div
          className={`min-h-0 flex-1 px-6 py-5 ${bodyClassName ?? "overflow-auto"}`}
        >
          {children}
        </div>
        {footer ? (
          <div className="flex items-center justify-end gap-3 border-t border-[#e8e8e8] px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ResultFilterInput({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [draftValue, setDraftValue] = useState(value);
  const [isComposing, setIsComposing] = useState(false);
  const lastCommittedValueRef = useRef(value);

  useEffect(() => {
    if (isComposing) {
      return;
    }

    if (value !== lastCommittedValueRef.current && value !== draftValue) {
      const timeoutId = window.setTimeout(() => {
        setDraftValue(value);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [draftValue, isComposing, value]);

  useEffect(() => {
    if (isComposing) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      lastCommittedValueRef.current = draftValue;
      onChange(draftValue);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftValue, isComposing, onChange]);

  return (
    <div className="group relative w-full max-w-[400px]">
      <input
        className="h-[32px] flex-1 rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
        onChange={(event) => setDraftValue(event.target.value)}
        onCompositionEnd={(event) => {
          setIsComposing(false);
          setDraftValue(event.currentTarget.value);
        }}
        onCompositionStart={() => setIsComposing(true)}
        placeholder="Filter results..."
        value={draftValue}
      />
      <div className="pointer-events-none absolute right-0 bottom-[calc(100%+8px)] z-20 hidden w-[280px] rounded-[2px] bg-[#4a4a4a] px-3 py-2 text-[12px] leading-[1.6] text-white shadow-[0_6px_16px_rgba(0,0,0,0.2)] group-hover:block">
        <div>전체 검색: `홍길동 서울`</div>
        <div>컬럼 검색: `name:홍길동 status:active`</div>
        <div>OR 검색: `홍길동 | 김철수`</div>
        <div>문구 검색: `&quot;서울 강남&quot;`</div>
      </div>
    </div>
  );
}

export const ExecutingDurationLabel = memo(function ExecutingDurationLabel({
  startedAt,
}: {
  startedAt: number;
}) {
  const [elapsedLabel, setElapsedLabel] = useState(() =>
    formatExecutingDuration(Date.now() - startedAt),
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setElapsedLabel(formatExecutingDuration(Date.now() - startedAt));
    }, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [startedAt]);

  return <>{`실행 중 ${elapsedLabel}`}</>;
});

function formatExecutingDuration(milliseconds: number) {
  if (milliseconds < 1000) {
    return `${Math.max(0.1, milliseconds / 1000).toFixed(1)}s`;
  }

  if (milliseconds < 60_000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds}s`;
}

export function ParameterEditorDialog({
  draft,
  onClose,
  onSave,
}: {
  draft: QueryParameterEditorDraft;
  onClose: () => void;
  onSave: (draft: QueryParameterEditorDraft) => string | null;
}) {
  const [localDraft, setLocalDraft] = useState<QueryParameterEditorDraft>(draft);
  const [error, setError] = useState<string | null>(null);
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);

  function handleSave() {
    if (!localDraft.name.trim()) {
      setError("Keyword is required.");
      return;
    }

    if (!localDraft.title.trim()) {
      setError("Title is required.");
      return;
    }

    const nextError = onSave(localDraft);

    if (nextError) {
      setError(nextError);
    }
  }

  return (
    <OverlayDialog
      bodyClassName="overflow-visible"
      dialogClassName="overflow-visible"
      dialogStyle={{ width: "600px", maxWidth: "calc(100vw - 32px)" }}
      onClose={onClose}
      title={localDraft.isNew ? "Add Parameter" : localDraft.name}
      footer={
        <>
          <button
            className="inline-flex h-[32px] items-center rounded-[2px] border border-[#d9d9d9] bg-white px-4 text-[13px] text-[#595959]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-[32px] items-center rounded-[2px] bg-[#1890ff] px-4 text-[13px] text-white disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:text-[#bfbfbf]"
            disabled={!localDraft.name.trim() || !localDraft.title.trim()}
            onClick={handleSave}
            type="button"
          >
            {localDraft.isNew ? "Add Parameter" : "OK"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {localDraft.isNew ? (
          <div>
            <label className="mb-2 block text-[14px] text-[#595959]">
              <span className="mr-1 text-[#ff4d4f]">*</span>
              Keyword
            </label>
            <input
              autoFocus
              className="h-[40px] w-full rounded-[2px] border border-[#40a9ff] bg-white px-3 text-[13px] text-[#595959] outline-none shadow-[0_0_0_2px_rgba(24,144,255,0.12)]"
              onChange={(event) =>
                setLocalDraft((currentValue) => ({
                  ...currentValue,
                  name: event.target.value.replace(/\s+/g, "_"),
                  title: currentValue.isTitleEdited
                    ? currentValue.title
                    : humanizeParameterName(
                        event.target.value.replace(/\s+/g, "_"),
                      ),
                }))
              }
              value={localDraft.name}
            />
            <div className="mt-2 text-[12px] text-[#8c8c8c]">
              Choose a keyword for this parameter
            </div>
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-[14px] text-[#595959]">
            <span className="mr-1 text-[#ff4d4f]">*</span>
            Title
          </label>
          <input
            className="h-[40px] w-full rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
            onChange={(event) =>
              setLocalDraft((currentValue) => ({
                ...currentValue,
                isTitleEdited: true,
                title: event.target.value,
              }))
            }
            value={localDraft.title}
          />
        </div>

        <div className="relative">
          <label className="mb-2 block text-[14px] text-[#595959]">Type</label>
          <button
            className="flex h-[40px] w-full items-center justify-between rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-left text-[13px] text-[#595959] outline-none transition hover:border-[#40a9ff] focus:border-[#40a9ff]"
            onClick={() => setIsTypeMenuOpen((currentValue) => !currentValue)}
            type="button"
          >
            <span>{getParameterTypeLabel(localDraft.type)}</span>
            <DownOutlined className="text-[11px] text-[#bfbfbf]" />
          </button>

          {isTypeMenuOpen ? (
            <div className="absolute left-0 top-[calc(100%+4px)] z-30 max-h-[320px] w-full overflow-y-auto rounded-[2px] border border-[#d9d9d9] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
              {PARAMETER_TYPE_GROUPS.map((group, groupIndex) => (
                <div key={group.key}>
                  {group.items.map((item) => {
                    const isSelected = localDraft.type === item.value;

                    return (
                      <button
                        key={item.value}
                        className={`flex h-[36px] w-full items-center px-4 text-left text-[13px] transition ${
                          isSelected
                            ? "bg-[#e6f7ff] text-[#323232]"
                            : "text-[#595959] hover:bg-[#f5f7f9]"
                        }`}
                        onClick={() => {
                          setLocalDraft((currentValue) => ({
                            ...currentValue,
                            multiValuesOptions:
                              item.value === "enum"
                                ? currentValue.multiValuesOptions
                                : null,
                            type: item.value,
                          }));
                          setIsTypeMenuOpen(false);
                        }}
                        type="button"
                      >
                        {item.label}
                      </button>
                    );
                  })}

                  {groupIndex < PARAMETER_TYPE_GROUPS.length - 1 ? (
                    <div className="mx-3 my-1 border-t border-[#f0f0f0]" />
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {localDraft.type === "enum" ? (
          <>
            <div>
              <label className="mb-2 block text-[14px] text-[#595959]">
                Values
              </label>
              <textarea
                className="min-h-[110px] w-full rounded-[2px] border border-[#d9d9d9] bg-white px-3 py-2 text-[13px] text-[#595959] outline-none transition focus:border-[#40a9ff]"
                onChange={(event) =>
                  setLocalDraft((currentValue) => ({
                    ...currentValue,
                    enumOptions: event.target.value,
                  }))
                }
                value={localDraft.enumOptions}
              />
              <div className="mt-2 text-[12px] text-[#8c8c8c]">
                Dropdown list values (newline delimited)
              </div>
            </div>

            <label className="flex items-center gap-2 text-[13px] text-[#595959]">
              <input
                checked={Boolean(localDraft.multiValuesOptions)}
                onChange={(event) =>
                  setLocalDraft((currentValue) => ({
                    ...currentValue,
                    multiValuesOptions: event.target.checked
                      ? {
                          prefix: "",
                          separator: ",",
                          suffix: "",
                        }
                      : null,
                  }))
                }
                type="checkbox"
              />
              Allow multiple values
            </label>
          </>
        ) : null}

        {error ? (
          <div className="text-[13px] text-rose-600">{error}</div>
        ) : null}
      </div>
    </OverlayDialog>
  );
}

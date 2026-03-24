"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { DynamicField } from "../types";
import { getFieldLabel, normalizeSubmissionValues } from "../utils/dynamicForm";
import { useToast } from "@/lib/toast";

interface FormAction {
  danger?: boolean;
  disableWhenDirty?: boolean;
  label: string;
  onClick: () => Promise<void> | void;
  pullRight?: boolean;
  successMessage?: string;
}

interface DynamicDataSourceFormProps {
  actions?: FormAction[];
  defaultShowExtraFields?: boolean;
  fields: DynamicField[];
  formId: string;
  hideSubmitButton?: boolean;
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
  readOnly?: boolean;
  saveText?: string;
  submitDisabled?: boolean;
}

const inputClass =
  "h-10 w-full rounded border border-slate-300 bg-white px-3 text-[14px] text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200";
const tooltipGap = 10;
const tooltipMargin = 16;
const defaultTooltipWidth = 420;
const defaultTooltipHeight = 240;

type TooltipPlacement =
  | "left-bottom"
  | "left-top"
  | "right-bottom"
  | "right-top";

interface TooltipPosition {
  left: number;
  placement: TooltipPlacement;
  top: number;
}

function getInitialValues(fields: DynamicField[]) {
  return Object.fromEntries(
    fields.map((field) => [field.name, field.initialValue ?? ""]),
  );
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function DynamicDataSourceForm({
  actions = [],
  defaultShowExtraFields = false,
  fields,
  formId,
  hideSubmitButton = false,
  onSubmit,
  readOnly = false,
  saveText = "Save",
  submitDisabled = false,
}: DynamicDataSourceFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    getInitialValues(fields),
  );
  const [showExtraFields, setShowExtraFields] = useState(
    defaultShowExtraFields,
  );
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {},
  );
  const { showError, showSuccess } = useToast();

  const initialValues = useMemo(() => getInitialValues(fields), [fields]);
  const regularFields = fields.filter((field) => !field.extra);
  const extraFields = fields.filter((field) => field.extra);
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    setShowExtraFields(defaultShowExtraFields);
  }, [defaultShowExtraFields]);

  const setFieldValue = (name: string, nextValue: unknown) => {
    setValues((currentValues) => ({
      ...currentValues,
      [name]: nextValue,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await onSubmit(normalizeSubmissionValues(values));
      showSuccess("Saved.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed saving.");
    }
  };

  const handleAction = async (action: FormAction) => {
    setActionLoading((currentState) => ({
      ...currentState,
      [action.label]: true,
    }));

    try {
      await action.onClick();
      if (action.successMessage) {
        showSuccess(action.successMessage);
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setActionLoading((currentState) => ({
        ...currentState,
        [action.label]: false,
      }));
    }
  };

  return (
    <form className="space-y-5" id={formId} onSubmit={handleSubmit}>
      <FieldList
        fields={regularFields}
        readOnly={readOnly}
        values={values}
        onChange={setFieldValue}
      />
      {extraFields.length > 0 ? (
        <div className="rounded-sm border border-slate-200">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left text-[14px] font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={() => setShowExtraFields((currentValue) => !currentValue)}
            type="button"
          >
            Additional Settings
            <span aria-hidden="true" className="text-slate-400">
              {showExtraFields ? "▴" : "▾"}
            </span>
          </button>
          {showExtraFields ? (
            <div className="border-t border-slate-200 px-4 py-4">
              <FieldList
                fields={extraFields}
                readOnly={readOnly}
                values={values}
                onChange={setFieldValue}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      {!readOnly && (!hideSubmitButton || actions.length > 0) ? (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
          {actions.map((action) => (
            <button
              key={action.label}
              className={classNames(
                "inline-flex h-9 items-center justify-center rounded border px-4 text-[13px] transition disabled:cursor-not-allowed disabled:opacity-60",
                action.danger
                  ? "border-rose-500 bg-rose-500 text-white hover:bg-rose-600"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                action.pullRight && "ml-auto",
              )}
              disabled={Boolean(
                actionLoading[action.label] ||
                (isDirty && action.disableWhenDirty),
              )}
              onClick={() => void handleAction(action)}
              type="button"
            >
              {actionLoading[action.label]
                ? `${action.label}...`
                : action.label}
            </button>
          ))}
          {!hideSubmitButton ? (
            <button
              className="inline-flex h-9 items-center justify-center rounded border border-[#2196F3] bg-[#2196F3] px-4 text-[13px] text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitDisabled}
              type="submit"
            >
              {saveText}
            </button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

function FieldList({
  fields,
  onChange,
  readOnly,
  values,
}: {
  fields: DynamicField[];
  onChange: (name: string, value: unknown) => void;
  readOnly: boolean;
  values: Record<string, unknown>;
}) {
  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const label = getFieldLabel(field);
        const value = values[field.name];

        if (field.type === "checkbox") {
          return (
            <label
              key={field.name}
              className="flex items-center gap-3 text-[14px] text-slate-700"
            >
              <input
                checked={Boolean(value)}
                className="h-4 w-4 rounded border-slate-300 text-[#2196F3] focus:ring-sky-200"
                data-test={label}
                disabled={readOnly}
                onChange={(event) => onChange(field.name, event.target.checked)}
                type="checkbox"
              />
              <span>{label}</span>
            </label>
          );
        }

        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label
                className="block text-[14px] font-medium text-slate-800"
                htmlFor={field.name}
              >
                {label}
              </label>
              {field.description ? (
                <FieldHelpTooltip
                  description={field.description}
                  label={label}
                />
              ) : null}
            </div>
            <FieldControl
              field={field}
              label={label}
              onChange={onChange}
              readOnly={readOnly}
              value={value}
            />
          </div>
        );
      })}
    </div>
  );
}

function FieldHelpTooltip({
  description,
  label,
}: {
  description: string;
  label: string;
}) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({
    left: 0,
    placement: "left-top",
    top: 0,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;

      if (!anchor) {
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();

      setPosition(
        getTooltipPosition(
          anchorRect,
          tooltipRect
            ? {
                height: tooltipRect.height,
                width: tooltipRect.width,
              }
            : null,
        ),
      );
    };

    const frameId = window.requestAnimationFrame(updatePosition);

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  return (
    <div className="relative shrink-0" ref={anchorRef}>
      <span
        aria-label={`${label} 도움말`}
        className="group inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-slate-300 bg-white text-[12px] font-semibold text-slate-500 transition hover:border-sky-400 hover:text-sky-600 focus:border-sky-400 focus:text-sky-600 focus:outline-none"
        onBlur={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        tabIndex={0}
      >
        ?
      </span>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <span
              className="pointer-events-none fixed z-[1200] w-[min(420px,calc(100vw-2rem))] whitespace-pre-line rounded border border-slate-200 bg-slate-900 px-4 py-3 text-left text-[12px] font-normal leading-5 text-white shadow-lg"
              ref={tooltipRef}
              role="tooltip"
              style={{
                left: `${position.left}px`,
                top: `${position.top}px`,
              }}
            >
              {description}
            </span>,
            document.body,
          )
        : null}
    </div>
  );
}

function getTooltipPosition(
  anchorRect: DOMRect,
  tooltipSize: { height: number; width: number } | null,
): TooltipPosition {
  const tooltipWidth = tooltipSize?.width || defaultTooltipWidth;
  const tooltipHeight = tooltipSize?.height || defaultTooltipHeight;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const roomOnRight = viewportWidth - anchorRect.left - tooltipMargin;
  const roomOnLeft = anchorRect.right - tooltipMargin;
  const roomBelow = viewportHeight - anchorRect.bottom - tooltipMargin;
  const roomAbove = anchorRect.top - tooltipMargin;
  const horizontal =
    roomOnRight >= tooltipWidth || roomOnRight >= roomOnLeft ? "right" : "left";
  const vertical =
    roomBelow >= tooltipHeight || roomBelow >= roomAbove ? "bottom" : "top";

  const rawLeft =
    horizontal === "right" ? anchorRect.left : anchorRect.right - tooltipWidth;
  const rawTop =
    vertical === "bottom"
      ? anchorRect.bottom + tooltipGap
      : anchorRect.top - tooltipHeight - tooltipGap;

  return {
    left: clamp(
      rawLeft,
      tooltipMargin,
      viewportWidth - tooltipWidth - tooltipMargin,
    ),
    placement: `${horizontal}-${vertical}` as TooltipPlacement,
    top: clamp(
      rawTop,
      tooltipMargin,
      viewportHeight - tooltipHeight - tooltipMargin,
    ),
  };
}

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function FieldControl({
  field,
  label,
  onChange,
  readOnly,
  value,
}: {
  field: DynamicField;
  label: string;
  onChange: (name: string, value: unknown) => void;
  readOnly: boolean;
  value: unknown;
}) {
  if (field.type === "select") {
    return (
      <select
        className={inputClass}
        data-test={label}
        disabled={readOnly}
        id={field.name}
        onChange={(event) => onChange(field.name, event.target.value)}
        value={typeof value === "string" ? value : ""}
      >
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.name}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "file") {
    return (
      <input
        className="block w-full rounded border border-slate-300 bg-white px-3 py-2 text-[14px] text-slate-700 file:mr-4 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-[13px] file:text-slate-700"
        data-test={label}
        disabled={readOnly}
        id={field.name}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (!file) {
            onChange(field.name, "");
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;

            if (typeof result !== "string") {
              onChange(field.name, "");
              return;
            }

            const [, encodedValue = ""] = result.split(",", 2);
            onChange(field.name, encodedValue);
          };
          reader.readAsDataURL(file);
        }}
        type="file"
      />
    );
  }

  return (
    <input
      className={inputClass}
      data-test={label}
      id={field.name}
      onChange={(event) => {
        if (readOnly) {
          return;
        }

        if (field.type === "number") {
          const nextValue =
            event.target.value === "" ? "" : Number(event.target.value);
          onChange(field.name, nextValue);
          return;
        }

        onChange(field.name, event.target.value);
      }}
      placeholder={field.placeholder ?? undefined}
      readOnly={readOnly}
      type={field.type}
      value={
        typeof value === "string" || typeof value === "number" ? value : ""
      }
    />
  );
}

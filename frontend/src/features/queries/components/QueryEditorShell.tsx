"use client";

import {
  CaretRightFilled,
  CodeOutlined,
  LoadingOutlined,
  SaveOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import Editor, { type OnMount } from "@monaco-editor/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ExecutingDurationLabel } from "./QuerySourceEditorCommon";

const WRAP_DISABLE_LENGTH_THRESHOLD = 1800;
const WRAP_ENABLE_LENGTH_THRESHOLD = 1200;
const WRAP_DISABLE_LINE_COUNT_THRESHOLD = 80;
const WRAP_ENABLE_LINE_COUNT_THRESHOLD = 60;
const WRAP_DISABLE_LONGEST_LINE_THRESHOLD = 160;
const WRAP_ENABLE_LONGEST_LINE_THRESHOLD = 120;
const AUTOCOMPLETE_DISABLE_LENGTH_THRESHOLD = 2600;
const AUTOCOMPLETE_ENABLE_LENGTH_THRESHOLD = 1800;
const AUTOCOMPLETE_DISABLE_LINE_COUNT_THRESHOLD = 120;
const AUTOCOMPLETE_ENABLE_LINE_COUNT_THRESHOLD = 90;
const AUTOCOMPLETE_DISABLE_LONGEST_LINE_THRESHOLD = 220;
const AUTOCOMPLETE_ENABLE_LONGEST_LINE_THRESHOLD = 180;
const WORD_WRAP_SYNC_DELAY_MS = 180;

type EditorModelLike = {
  getLineCount: () => number;
  getLineMaxColumn: (lineNumber: number) => number;
  getValueLength: () => number;
} | null;

function exceedsLongestLineThreshold(
  model: EditorModelLike,
  threshold: number,
) {
  if (!model) {
    return false;
  }

  const lineCount = model.getLineCount();

  for (let lineNumber = 1; lineNumber <= lineCount; lineNumber += 1) {
    if (model.getLineMaxColumn(lineNumber) - 1 > threshold) {
      return true;
    }
  }

  return false;
}

function shouldDisableAdaptiveWordWrap(
  editor: Parameters<OnMount>[0],
  currentValue: boolean,
) {
  const model = editor.getModel() as EditorModelLike;

  if (!model) {
    return currentValue;
  }

  if (currentValue) {
    return !(
      model.getValueLength() < WRAP_ENABLE_LENGTH_THRESHOLD &&
      model.getLineCount() < WRAP_ENABLE_LINE_COUNT_THRESHOLD &&
      !exceedsLongestLineThreshold(model, WRAP_ENABLE_LONGEST_LINE_THRESHOLD)
    );
  }

  return (
    model.getValueLength() > WRAP_DISABLE_LENGTH_THRESHOLD ||
    model.getLineCount() > WRAP_DISABLE_LINE_COUNT_THRESHOLD ||
    exceedsLongestLineThreshold(model, WRAP_DISABLE_LONGEST_LINE_THRESHOLD)
  );
}

function shouldSuppressAdaptiveAutocomplete(
  editor: Parameters<OnMount>[0],
  currentValue: boolean,
) {
  const model = editor.getModel() as EditorModelLike;

  if (!model) {
    return currentValue;
  }

  if (currentValue) {
    return !(
      model.getValueLength() < AUTOCOMPLETE_ENABLE_LENGTH_THRESHOLD &&
      model.getLineCount() < AUTOCOMPLETE_ENABLE_LINE_COUNT_THRESHOLD &&
      !exceedsLongestLineThreshold(
        model,
        AUTOCOMPLETE_ENABLE_LONGEST_LINE_THRESHOLD,
      )
    );
  }

  return (
    model.getValueLength() > AUTOCOMPLETE_DISABLE_LENGTH_THRESHOLD ||
    model.getLineCount() > AUTOCOMPLETE_DISABLE_LINE_COUNT_THRESHOLD ||
    exceedsLongestLineThreshold(
      model,
      AUTOCOMPLETE_DISABLE_LONGEST_LINE_THRESHOLD,
    )
  );
}

const SourceEditorActionBar = memo(function SourceEditorActionBar({
  autocompleteAvailable,
  canExecuteQuery,
  canManageQuery,
  executionStartedAt,
  hasDataSource,
  hasDirtyParameters,
  initialHasQueryText,
  isExecuting,
  isMacLikePlatform,
  isSaving,
  isAdaptiveAutocompleteSuppressed,
  liveAutocompleteEnabled,
  onExecute,
  onFormat,
  onOpenAddParameter,
  onSave,
  onToggleAutocomplete,
  parameterShortcutLabel,
  setHasQueryTextStateRef,
}: {
  autocompleteAvailable: boolean;
  canExecuteQuery: boolean;
  canManageQuery: boolean;
  executionStartedAt: number | null;
  hasDataSource: boolean;
  hasDirtyParameters: boolean;
  initialHasQueryText: boolean;
  isExecuting: boolean;
  isMacLikePlatform: boolean;
  isSaving: boolean;
  isAdaptiveAutocompleteSuppressed: boolean;
  liveAutocompleteEnabled: boolean;
  onExecute: () => void;
  onFormat: () => void;
  onOpenAddParameter: () => void;
  onSave: () => void;
  onToggleAutocomplete: () => void;
  parameterShortcutLabel: string;
  setHasQueryTextStateRef: {
    current: ((nextValue: boolean) => void) | null;
  };
}) {
  const [hasQueryText, setHasQueryText] = useState(initialHasQueryText);

  useEffect(() => {
    setHasQueryText(initialHasQueryText);
  }, [initialHasQueryText]);

  useEffect(() => {
    setHasQueryTextStateRef.current = setHasQueryText;

    return () => {
      if (setHasQueryTextStateRef.current === setHasQueryText) {
        setHasQueryTextStateRef.current = null;
      }
    };
  }, [setHasQueryTextStateRef]);

  const canExecute = Boolean(
    hasDataSource && canExecuteQuery && hasQueryText && !hasDirtyParameters,
  );

  return (
    <div className="flex h-[58px] items-center justify-between border-t border-[#efefef] px-[15px]">
      <div className="flex items-center gap-[6px]">
        <div className="group/parameter relative">
          <button
            className="inline-flex h-[32px] w-[48px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#595959] transition hover:border-[#40a9ff] hover:text-[#1890ff] disabled:cursor-not-allowed disabled:border-[#e8e8e8] disabled:bg-[#f5f5f5] disabled:text-[#bfbfbf]"
            disabled={!canManageQuery}
            onClick={onOpenAddParameter}
            type="button"
          >
            {"{ }"}
          </button>
          <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#3a3a3a] px-3 py-2 text-[12px] text-white shadow-[0_8px_20px_rgba(0,0,0,0.28)] group-hover/parameter:block">
            Add New Parameter ({parameterShortcutLabel})
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-[#3a3a3a]" />
          </div>
        </div>
        <div className="group/format relative">
          <button
            className="inline-flex h-[32px] w-[42px] items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white text-[#595959] transition hover:border-[#40a9ff] hover:text-[#1890ff] disabled:cursor-not-allowed disabled:border-[#e8e8e8] disabled:bg-[#f5f5f5] disabled:text-[#bfbfbf]"
            disabled={!canManageQuery || !hasQueryText}
            onClick={onFormat}
            type="button"
          >
            <CodeOutlined />
          </button>
          <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#3a3a3a] px-3 py-2 text-[12px] text-white shadow-[0_8px_20px_rgba(0,0,0,0.28)] group-hover/format:block">
            Format Query ({isMacLikePlatform ? "Cmd + Shift + F" : "Ctrl + Shift + F"})
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-[#3a3a3a]" />
          </div>
        </div>
        <div className="group/autocomplete relative">
          <button
            className={`inline-flex h-[32px] w-[42px] items-center justify-center rounded-[2px] border transition ${
              liveAutocompleteEnabled
                ? "border-[#40a9ff] bg-white text-[#1890ff]"
                : "border-[#d9d9d9] bg-white text-[#595959] hover:border-[#40a9ff] hover:text-[#1890ff]"
            } ${!autocompleteAvailable ? "cursor-not-allowed border-[#e8e8e8] bg-[#f5f5f5] text-[#bfbfbf]" : ""}`}
            disabled={!autocompleteAvailable}
            onClick={onToggleAutocomplete}
            type="button"
          >
            <ThunderboltOutlined />
          </button>
          <div className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#3a3a3a] px-3 py-2 text-[12px] text-white shadow-[0_8px_20px_rgba(0,0,0,0.28)] group-hover/autocomplete:block">
            {autocompleteAvailable
              ? liveAutocompleteEnabled
                ? isAdaptiveAutocompleteSuppressed
                  ? "Live AutoComplete Limited for Large Queries (Use Ctrl + Space to Trigger)"
                  : "Live AutoComplete Enabled"
                : "Live AutoComplete Disabled"
              : "Live AutoComplete Not Available (Use Ctrl + Space to Trigger)"}
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-[#3a3a3a]" />
          </div>
        </div>
        <label className="ml-2 flex items-center gap-2 text-[13px] text-[#595959]">
          <input checked disabled readOnly type="checkbox" />
          LIMIT 1000
        </label>
      </div>

      <div className="flex items-center gap-[8px]">
        {canManageQuery ? (
          <button
            className="inline-flex h-[32px] items-center gap-1 rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-[13px] text-[#595959] transition hover:border-[#40a9ff] hover:text-[#1890ff] disabled:cursor-not-allowed disabled:border-[#e8e8e8] disabled:bg-[#f5f5f5] disabled:text-[#bfbfbf]"
            disabled={isSaving || !hasDataSource}
            onClick={onSave}
            type="button"
          >
            {isSaving ? <LoadingOutlined /> : <SaveOutlined />}
            Save
          </button>
        ) : null}
        <button
          className={`inline-flex h-[32px] items-center gap-1 rounded-[2px] px-3 text-[13px] transition ${
            !canExecute || isExecuting
              ? "cursor-not-allowed border border-[#d9d9d9] bg-[#f5f5f5] text-[#bfbfbf]"
              : "border border-transparent bg-[#1890ff] text-white shadow-[0_2px_0_rgba(0,0,0,0.045)] hover:bg-[#40a9ff]"
          }`}
          disabled={!canExecute || isExecuting}
          onClick={onExecute}
          type="button"
        >
          {isExecuting ? <LoadingOutlined /> : <CaretRightFilled />}
          {isExecuting ? (
            executionStartedAt !== null ? (
              <ExecutingDurationLabel startedAt={executionStartedAt} />
            ) : (
              "실행 중"
            )
          ) : (
            "Execute"
          )}
        </button>
      </div>
    </div>
  );
});

interface QueryEditorShellProps {
  autocompleteAvailable: boolean;
  canExecuteQuery: boolean;
  canManageQuery: boolean;
  executionStartedAt: number | null;
  hasDataSource: boolean;
  hasDirtyParameters: boolean;
  initialHasQueryText: boolean;
  isExecuting: boolean;
  isMacLikePlatform: boolean;
  isSaving: boolean;
  liveAutocompleteEnabled: boolean;
  onEditorChange: (value: string | undefined) => void;
  onEditorMount: OnMount;
  onExecute: () => void;
  onFormat: () => void;
  onOpenAddParameter: () => void;
  onSave: () => void;
  onToggleAutocomplete: () => void;
  parameterShortcutLabel: string;
  queryText: string;
  setHasQueryTextStateRef: {
    current: ((nextValue: boolean) => void) | null;
  };
}

export default memo(function QueryEditorShell({
  autocompleteAvailable,
  canExecuteQuery,
  canManageQuery,
  executionStartedAt,
  hasDataSource,
  hasDirtyParameters,
  initialHasQueryText,
  isExecuting,
  isMacLikePlatform,
  isSaving,
  liveAutocompleteEnabled,
  onEditorChange,
  onEditorMount,
  onExecute,
  onFormat,
  onOpenAddParameter,
  onSave,
  onToggleAutocomplete,
  parameterShortcutLabel,
  queryText,
  setHasQueryTextStateRef,
}: QueryEditorShellProps) {
  const [editorPanelHeight, setEditorPanelHeight] = useState(240);
  const [isAdaptiveWordWrapDisabled, setIsAdaptiveWordWrapDisabled] =
    useState(false);
  const [isAdaptiveAutocompleteSuppressed, setIsAdaptiveAutocompleteSuppressed] =
    useState(false);
  const isResizingEditorRef = useRef(false);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const wordWrapSyncTimeoutRef = useRef<number | null>(null);
  const modelChangeDisposableRef = useRef<{ dispose: () => void } | null>(null);

  const syncAdaptiveWordWrap = useCallback((editor: Parameters<OnMount>[0]) => {
    const nextValue = shouldDisableAdaptiveWordWrap(
      editor,
      isAdaptiveWordWrapDisabled,
    );

    if (nextValue === isAdaptiveWordWrapDisabled) {
      return;
    }

    setIsAdaptiveWordWrapDisabled(nextValue);
  }, [isAdaptiveWordWrapDisabled]);

  const syncAdaptiveAutocomplete = useCallback((editor: Parameters<OnMount>[0]) => {
    const nextValue = shouldSuppressAdaptiveAutocomplete(
      editor,
      isAdaptiveAutocompleteSuppressed,
    );

    if (nextValue === isAdaptiveAutocompleteSuppressed) {
      return;
    }

    setIsAdaptiveAutocompleteSuppressed(nextValue);
  }, [isAdaptiveAutocompleteSuppressed]);

  useEffect(() => {
    function handlePointerMove(event: MouseEvent) {
      if (!isResizingEditorRef.current) {
        return;
      }

      const nextHeight = Math.max(180, Math.min(520, event.clientY - 118));
      setEditorPanelHeight(nextHeight);
    }

    function handlePointerUp() {
      if (!isResizingEditorRef.current) {
        return;
      }

      isResizingEditorRef.current = false;
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
    return () => {
      if (wordWrapSyncTimeoutRef.current !== null) {
        window.clearTimeout(wordWrapSyncTimeoutRef.current);
      }

      modelChangeDisposableRef.current?.dispose();
      modelChangeDisposableRef.current = null;
    };
  }, []);

  function startEditorResize() {
    isResizingEditorRef.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }

  const handleEditorMount = useCallback<OnMount>((editor, monaco) => {
    editorRef.current = editor;
    syncAdaptiveWordWrap(editor);
    syncAdaptiveAutocomplete(editor);

    modelChangeDisposableRef.current?.dispose();
    modelChangeDisposableRef.current = editor.onDidChangeModelContent(() => {
      if (wordWrapSyncTimeoutRef.current !== null) {
        window.clearTimeout(wordWrapSyncTimeoutRef.current);
      }

      // Long queries become noticeably slower with wrapped layout updates on
      // every keystroke. We only flip wrap mode when size thresholds change.
      wordWrapSyncTimeoutRef.current = window.setTimeout(() => {
        wordWrapSyncTimeoutRef.current = null;
        syncAdaptiveWordWrap(editor);
        syncAdaptiveAutocomplete(editor);
      }, WORD_WRAP_SYNC_DELAY_MS);
    });

    onEditorMount(editor, monaco);
  }, [onEditorMount, syncAdaptiveAutocomplete, syncAdaptiveWordWrap]);

  const shouldEnableLiveQuickSuggestions =
    liveAutocompleteEnabled && !isAdaptiveAutocompleteSuppressed;

  return (
    <>
      <div className="shrink-0 p-[15px] pb-0">
        <div
          className="overflow-hidden border border-[#d9d9d9]"
          style={{ height: `${editorPanelHeight}px` }}
        >
          <Editor
            defaultLanguage="sql"
            defaultValue={queryText}
            onChange={onEditorChange}
            onMount={handleEditorMount}
            options={{
              automaticLayout: true,
              fixedOverflowWidgets: true,
              folding: false,
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              fontSize: 13,
              glyphMargin: false,
              lineNumbersMinChars: 3,
              minimap: { enabled: false },
              padding: { top: 8, bottom: 8 },
              quickSuggestions: shouldEnableLiveQuickSuggestions,
              readOnly: !canManageQuery,
              quickSuggestionsDelay: 120,
              scrollBeyondLastLine: false,
              suggestOnTriggerCharacters: shouldEnableLiveQuickSuggestions,
              wordBasedSuggestions: "off",
              wordWrap: isAdaptiveWordWrapDisabled ? "off" : "on",
            }}
            theme="light"
          />
        </div>
        <div className="hidden h-[22px] items-center justify-center md:flex">
          <button
            aria-label="Resize editor panel"
            className="group flex h-full w-full cursor-row-resize items-center justify-center"
            onDoubleClick={() => setEditorPanelHeight(240)}
            onMouseDown={startEditorResize}
            type="button"
          >
            <span className="h-[2px] w-[30px] rounded bg-[#cfcfcf] transition group-hover:bg-[#1890ff]" />
          </button>
        </div>
      </div>

      <SourceEditorActionBar
        autocompleteAvailable={autocompleteAvailable}
        canExecuteQuery={canExecuteQuery}
        canManageQuery={canManageQuery}
        executionStartedAt={executionStartedAt}
        hasDataSource={hasDataSource}
        hasDirtyParameters={hasDirtyParameters}
        initialHasQueryText={initialHasQueryText}
        isAdaptiveAutocompleteSuppressed={isAdaptiveAutocompleteSuppressed}
        isExecuting={isExecuting}
        isMacLikePlatform={isMacLikePlatform}
        isSaving={isSaving}
        liveAutocompleteEnabled={liveAutocompleteEnabled}
        onExecute={onExecute}
        onFormat={onFormat}
        onOpenAddParameter={onOpenAddParameter}
        onSave={onSave}
        onToggleAutocomplete={onToggleAutocomplete}
        parameterShortcutLabel={parameterShortcutLabel}
        setHasQueryTextStateRef={setHasQueryTextStateRef}
      />
    </>
  );
});

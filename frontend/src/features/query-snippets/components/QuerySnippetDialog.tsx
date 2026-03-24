'use client';

import { CloseOutlined } from '@ant-design/icons';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';

import type { SaveQuerySnippetPayload } from '../api/querySnippetsClientApi';

interface QuerySnippetDialogProps {
  initialValue: SaveQuerySnippetPayload;
  isSubmitting: boolean;
  readOnly?: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (payload: SaveQuerySnippetPayload) => Promise<void> | void;
}

interface FieldErrors {
  snippet?: string;
  trigger?: string;
}

const inputClass =
  'h-9 w-full rounded-[2px] border border-[#d9d9d9] bg-white px-3 text-[13px] text-[#323232] outline-none transition focus:border-[#40a9ff] focus:shadow-[0_0_0_2px_rgba(24,144,255,0.2)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

export default function QuerySnippetDialog({
  initialValue,
  isSubmitting,
  readOnly = false,
  title,
  onClose,
  onSubmit,
}: QuerySnippetDialogProps) {
  const [values, setValues] = useState<SaveQuerySnippetPayload>(initialValue);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const triggerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (readOnly) {
      return;
    }

    triggerInputRef.current?.focus();
  }, [readOnly]);

  function handleClose() {
    if (!isSubmitting) {
      onClose();
    }
  }

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (readOnly || isSubmitting) {
      return;
    }

    const nextFieldErrors: FieldErrors = {};

    if (!values.trigger.trim()) {
      nextFieldErrors.trigger = 'Trigger is required.';
    }

    if (!values.snippet.trim()) {
      nextFieldErrors.snippet = 'Snippet is required.';
    }

    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    await onSubmit({
      description: values.description,
      snippet: values.snippet,
      trigger: values.trigger.trim(),
    });
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8"
      role="dialog"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[2px] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e8e8e8] px-6 py-4">
          <h4 className="text-[16px] font-medium text-[#323232]">{title}</h4>
          <button
            className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            onClick={handleClose}
            type="button"
          >
            <CloseOutlined className="text-[13px]" />
          </button>
        </div>

        <form className="min-h-0 flex-1" onSubmit={(event) => void handleSubmit(event)}>
          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <FormField
              error={fieldErrors.trigger}
              label="Trigger"
              required
            >
              <input
                ref={triggerInputRef}
                className={inputClass}
                disabled={readOnly || isSubmitting}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    trigger: event.target.value,
                  }))
                }
                value={values.trigger}
              />
            </FormField>

            <FormField label="Description">
              <input
                className={inputClass}
                disabled={readOnly || isSubmitting}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                value={values.description}
              />
            </FormField>

            <FormField
              error={fieldErrors.snippet}
              label="Snippet"
              required
            >
              <div
                className="overflow-hidden rounded-[2px] border border-[#d9d9d9]"
                onClick={() => editorRef.current?.focus()}
              >
                <Editor
                  defaultLanguage="sql"
                  height="140px"
                  loading={
                    <div className="flex h-[140px] items-center justify-center text-[13px] text-slate-500">
                      Loading editor...
                    </div>
                  }
                  onMount={handleEditorMount}
                  onChange={(value) =>
                    setValues((current) => ({
                      ...current,
                      snippet: value ?? '',
                    }))
                  }
                  options={{
                    automaticLayout: true,
                    contextmenu: false,
                    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                    fontSize: 13,
                    folding: false,
                    glyphMargin: false,
                    lineNumbers: 'on',
                    lineDecorationsWidth: 8,
                    lineNumbersMinChars: 2,
                    minimap: { enabled: false },
                    overviewRulerBorder: false,
                    overviewRulerLanes: 0,
                    padding: { top: 8, bottom: 8 },
                    readOnly: readOnly || isSubmitting,
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                  theme="light"
                  value={values.snippet}
                />
              </div>
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#e8e8e8] px-6 py-4">
            <button
              className="inline-flex h-8 items-center justify-center rounded-[2px] border border-[#d9d9d9] bg-white px-4 text-[13px] text-[#595959] transition hover:border-[#40a9ff] hover:text-[#40a9ff]"
              onClick={handleClose}
              type="button"
            >
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly ? (
              <button
                className="inline-flex h-8 min-w-[72px] items-center justify-center rounded-[2px] border border-[#1890ff] bg-[#1890ff] px-4 text-[13px] text-white transition hover:bg-[#40a9ff] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                disabled={isSubmitting}
                type="submit"
              >
                {initialValue.trigger ? 'Save' : 'Create'}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({
  children,
  error,
  label,
  required = false,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="mb-4 block last:mb-0">
      <span className="mb-2 block text-[13px] text-[#323232]">
        {required ? <span className="mr-1 text-[#ff4d4f]">*</span> : null}
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] text-rose-600">{error}</span>
      ) : null}
    </div>
  );
}

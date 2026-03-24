'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

interface SelectItemsDialogProps<T> {
  dialogTitle: string;
  inputPlaceholder: string;
  items: T[];
  itemKey: (item: T) => number;
  onClose: () => void;
  onSave: (items: T[]) => Promise<void> | void;
  renderItem: (item: T, state: { isSelected: boolean }) => ReactNode;
  selectedItemsTitle: string;
}

export default function SelectItemsDialog<T>({
  dialogTitle,
  inputPlaceholder,
  items,
  itemKey,
  onClose,
  onSave,
  renderItem,
  selectedItemsTitle,
}: SelectItemsDialogProps<T>) {
  const [query, setQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(keyword),
    );
  }, [items, query]);

  function isSelected(item: T) {
    return selectedItems.some((candidate) => itemKey(candidate) === itemKey(item));
  }

  function toggleItem(item: T) {
    setSelectedItems((currentItems) =>
      currentItems.some((candidate) => itemKey(candidate) === itemKey(item))
        ? currentItems.filter((candidate) => itemKey(candidate) !== itemKey(item))
        : [...currentItems, item],
    );
  }

  const canSave = selectedItems.length > 0 && !isSaving;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="flex h-[78vh] w-full max-w-[1540px] flex-col overflow-hidden rounded-sm bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h4 className="text-[18px] font-medium text-slate-800">
            {dialogTitle}
          </h4>
          <button
            className="text-[26px] leading-none text-slate-400 transition hover:text-slate-600"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 px-6 py-5">
          <div className="mb-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,1fr)]">
            <div className="relative">
              <input
                aria-label={inputPlaceholder}
                autoFocus
                className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-[14px] text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={inputPlaceholder}
                value={query}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>
            </div>
            <h5 className="hidden text-[18px] font-medium text-slate-700 lg:block">
              {selectedItemsTitle}
            </h5>
          </div>

          <div className="grid min-h-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,1fr)]">
            <div className="min-h-0 overflow-y-auto rounded-sm border border-slate-200">
              {filteredItems.map((item) => {
                const active = isSelected(item);

                return (
                  <button
                    key={itemKey(item)}
                    className={[
                      'flex w-full items-center border-b border-slate-200 px-5 py-4 text-left transition last:border-b-0',
                      active ? 'bg-slate-50' : 'bg-white hover:bg-slate-50',
                    ].join(' ')}
                    onClick={() => toggleItem(item)}
                    type="button"
                  >
                    <div className="min-w-0 flex-1">
                      {renderItem(item, { isSelected: active })}
                    </div>
                    <span className="ml-4 shrink-0 text-[18px] text-slate-400">
                      {active ? '✓' : '»'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 overflow-y-auto rounded-sm border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3 text-[15px] font-medium text-slate-700 lg:hidden">
                {selectedItemsTitle}
              </div>
              {selectedItems.map((item) => (
                <button
                  key={itemKey(item)}
                  className="flex w-full items-center border-b border-slate-200 bg-white px-5 py-4 text-left transition last:border-b-0 hover:bg-slate-50"
                  onClick={() => toggleItem(item)}
                  type="button"
                >
                  <div className="min-w-0 flex-1">
                    {renderItem(item, { isSelected: true })}
                  </div>
                  <span className="ml-4 shrink-0 text-[18px] text-slate-400">×</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            className="inline-flex h-8 items-center rounded border border-slate-300 bg-white px-4 text-[13px] text-slate-700 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className={[
              'inline-flex h-8 items-center rounded border px-4 text-[13px] transition disabled:cursor-not-allowed',
              canSave
                ? 'border-[#2196F3] bg-[#2196F3] text-white hover:bg-sky-600'
                : 'border-slate-300 bg-slate-100 text-slate-400',
            ].join(' ')}
            disabled={!canSave}
            onClick={async () => {
              setIsSaving(true);

              try {
                await onSave(selectedItems);
              } finally {
                setIsSaving(false);
              }
            }}
            type="button"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

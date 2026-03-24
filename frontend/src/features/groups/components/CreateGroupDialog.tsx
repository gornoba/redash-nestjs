'use client';

import { useState } from 'react';

import { createGroup } from '../api/groupsClientApi';
import { useToastMessage } from '@/lib/toast';

interface CreateGroupDialogProps {
  onClose: () => void;
  onCreated: (groupId: number) => void;
}

export default function CreateGroupDialog({
  onClose,
  onCreated,
}: CreateGroupDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useToastMessage(error, 'error');

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="w-full max-w-[520px] rounded-sm bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h4 className="text-[18px] font-medium text-slate-800">
            Create a New Group
          </h4>
          <button
            className="text-[26px] leading-none text-slate-400 transition hover:text-slate-600"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">
          <input
            aria-label="Group name"
            autoFocus
            className="h-10 w-full rounded border border-slate-300 bg-white px-3 text-[14px] text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
            onChange={(event) => setName(event.target.value)}
            placeholder="Group Name"
            value={name}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            className="inline-flex h-8 items-center rounded border border-slate-300 bg-white px-4 text-[13px] text-slate-700 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-8 items-center rounded border border-[#2196F3] bg-[#2196F3] px-4 text-[13px] text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || name.trim().length === 0}
            onClick={async () => {
              setIsSubmitting(true);
              setError(null);

              try {
                const response = await createGroup({ name });
                onCreated(response.group.id);
              } catch (submitError) {
                setError(
                  submitError instanceof Error
                    ? submitError.message
                    : 'Failed saving.',
                );
                setIsSubmitting(false);
              }
            }}
            type="button"
          >
            {isSubmitting ? 'Create...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

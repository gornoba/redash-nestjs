'use client';

import { useId, useState } from 'react';

import { createUser } from '../api/usersClientApi';
import type { CreatedUserResponse } from '../types';
import { useToastMessage } from '@/lib/toast';

interface CreateUserDialogProps {
  onClose: () => void;
  onCreated: (user: CreatedUserResponse) => void;
}

const inputClass =
  'h-10 w-full rounded border border-slate-300 bg-white px-3 text-[14px] text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200';

export default function CreateUserDialog({
  onClose,
  onCreated,
}: CreateUserDialogProps) {
  const formId = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
        className="w-full max-w-[560px] rounded-sm bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]"
        data-test="CreateUserDialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-4">
          <h4 className="text-[22px] font-medium text-slate-800">
            Create a New User
          </h4>
        </div>
        <div className="px-6 py-5">
          <form
            className="flex flex-col gap-4"
            id={formId}
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);
              setIsSubmitting(true);

              try {
                const createdUser = await createUser({ name, email });
                onCreated(createdUser);
              } catch (submitError) {
                setError(
                  submitError instanceof Error
                    ? submitError.message
                    : 'Failed saving.',
                );
                setIsSubmitting(false);
              }
            }}
          >
            <label className="flex flex-col gap-2 text-[14px] text-slate-700">
              <span>Name</span>
              <input
                autoFocus
                className={inputClass}
                onChange={(event) => setName(event.target.value)}
                required
                type="text"
                value={name}
              />
            </label>
            <label className="flex flex-col gap-2 text-[14px] text-slate-700">
              <span>Email</span>
              <input
                className={inputClass}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
          </form>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            className="inline-flex h-9 items-center justify-center rounded border border-slate-300 bg-white px-4 text-[13px] text-slate-700 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-9 items-center justify-center rounded border border-[#2196F3] bg-[#2196F3] px-4 text-[13px] text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
            data-test="SaveUserButton"
            disabled={isSubmitting}
            form={formId}
            type="submit"
          >
            {isSubmitting ? 'Create...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

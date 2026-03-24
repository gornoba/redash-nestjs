'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { submitSetup } from '../api/setupApi';
import type { SetupStateResponse } from '../types';
import { useToastMessage } from '@/lib/toast';

interface SetupFormProps {
  defaults: SetupStateResponse["defaults"];
}

export default function SetupForm({ defaults }: SetupFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  useToastMessage(statusType === 'success' ? status : null, 'success');
  useToastMessage(statusType === 'error' ? status : null, 'error');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setStatusType(null);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await submitSetup({
        name: String(formData.get('name') ?? ''),
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        orgName: String(formData.get('orgName') ?? ''),
        securityNotifications:
          formData.get('securityNotifications') === 'on',
        newsletter: formData.get('newsletter') === 'on',
      });

      setStatus(
        `${result.message} Redirecting to login...`,
      );
      setStatusType('success');
      router.replace('/login');
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Setup failed. Please try again.',
      );
      setStatusType('error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-[25px] sm:gap-[22px]" onSubmit={onSubmit}>
      <section className="grid gap-[14px] sm:gap-3">
        <h2 className="m-0 text-lg font-normal text-slate-800 sm:text-[17px]">Admin User</h2>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">Name</span>
          <input className="h-[34px] w-full rounded border border-stone-300 bg-white px-3 text-sm text-slate-600 shadow-[inset_0_1px_1px_rgba(0,0,0,0.075)] outline-none transition hover:border-[#2196F3] focus:border-[#2196F3] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,0.075),0_0_0_4px_rgba(33,150,243,0.15)] sm:h-10 sm:text-base" name="name" required type="text" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">Email Address</span>
          <input className="h-[34px] w-full rounded border border-stone-300 bg-white px-3 text-sm text-slate-600 shadow-[inset_0_1px_1px_rgba(0,0,0,0.075)] outline-none transition hover:border-[#2196F3] focus:border-[#2196F3] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,0.075),0_0_0_4px_rgba(33,150,243,0.15)] sm:h-10 sm:text-base" name="email" required type="email" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">Password</span>
          <input className="h-[34px] w-full rounded border border-stone-300 bg-white px-3 text-sm text-slate-600 shadow-[inset_0_1px_1px_rgba(0,0,0,0.075)] outline-none transition hover:border-[#2196F3] focus:border-[#2196F3] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,0.075),0_0_0_4px_rgba(33,150,243,0.15)] sm:h-10 sm:text-base" name="password" required minLength={6} type="password" />
        </label>

        <label className="flex items-start gap-2 text-sm leading-6 text-slate-600">
          <input
            className="mt-[3px] shrink-0"
            defaultChecked={defaults.securityNotifications}
            name="securityNotifications"
            type="checkbox"
          />
          <span>Subscribe to Security Notifications</span>
        </label>

        <label className="flex items-start gap-2 text-sm leading-6 text-slate-600">
          <input
            className="mt-[3px] shrink-0"
            defaultChecked={defaults.newsletter}
            name="newsletter"
            type="checkbox"
          />
          <span>
            Subscribe to newsletter (version updates, no more than once a month)
          </span>
        </label>
      </section>

      <section className="grid gap-[14px] sm:gap-3">
        <h2 className="m-0 text-lg font-normal text-slate-800 sm:text-[17px]">General</h2>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">Organization Name</span>
          <input className="h-[34px] w-full rounded border border-stone-300 bg-white px-3 text-sm text-slate-600 shadow-[inset_0_1px_1px_rgba(0,0,0,0.075)] outline-none transition hover:border-[#2196F3] focus:border-[#2196F3] focus:shadow-[inset_0_1px_1px_rgba(0,0,0,0.075),0_0_0_4px_rgba(33,150,243,0.15)] sm:h-10 sm:text-base" name="orgName" required type="text" />
          <small className="text-[13px] leading-6 text-slate-400 sm:text-sm">
            Used in email notifications and the UI.
          </small>
        </label>
      </section>

      <button
        className="h-[34px] w-full rounded bg-[#2196F3] text-sm font-normal text-white transition hover:bg-sky-600 disabled:cursor-default disabled:opacity-70 sm:h-10"
        disabled={submitting}
        type="submit"
      >
        {submitting ? 'Setting up...' : 'Setup'}
      </button>
    </form>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { acceptLink, getLinkDetails } from '../api/usersClientApi';
import { useToastMessage } from '@/lib/toast';

interface InviteAcceptFormProps {
  mode: 'invite' | 'reset';
  token: string;
}

const cardClass =
  'w-full max-w-[920px] rounded-md bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.12)] sm:p-10';
const inputClass =
  'h-11 w-full rounded border border-slate-300 bg-white px-3 text-[14px] text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-200';

export default function InviteAcceptForm({
  mode,
  token,
}: InviteAcceptFormProps) {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useToastMessage(error, 'error');
  useToastMessage(message, 'success');

  useEffect(() => {
    let isMounted = true;

    void getLinkDetails(mode, token)
      .then((payload) => {
        if (!isMounted) {
          return;
        }

        setName(payload.user.name);
        setEmail(payload.user.email);
      })
      .catch((nextError) => {
        if (!isMounted) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Invalid invite link.',
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [mode, token]);

  return (
    <div className={cardClass}>
      <div className="text-[26px] leading-tight text-slate-700 sm:text-[28px]">
        {mode === 'invite'
          ? 'To create your account, please choose a password.'
          : 'Please choose a new password.'}
      </div>

      {isLoading ? (
        <div className="mt-6 rounded border border-slate-200 bg-slate-50 px-6 py-5 text-[14px] text-slate-500">
          Loading...
        </div>
      ) : null}

      {!isLoading && !error ? (
        <>
          <div className="mt-6 flex flex-col gap-1 text-[14px] text-slate-500">
            <strong className="text-[18px] font-medium text-slate-800">
              {name}
            </strong>
            <span>{email}</span>
          </div>

          <form
            className="mt-6 flex max-w-[520px] flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);
              setMessage(null);
              setIsSubmitting(true);

              try {
                const result = await acceptLink(mode, token, { password });
                setMessage(result.message);
                setTimeout(() => {
                  router.push('/login');
                }, 800);
              } catch (submitError) {
                setError(
                  submitError instanceof Error
                    ? submitError.message
                    : 'Failed to update password.',
                );
                setIsSubmitting(false);
              }
            }}
          >
            <label className="flex flex-col gap-2">
              <span className="text-[14px] font-medium text-slate-800">
                Password
              </span>
              <input
                className={inputClass}
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <button
              className="inline-flex h-11 w-full items-center justify-center rounded border border-[#2196F3] bg-[#2196F3] px-4 text-[14px] text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Setting Password...' : 'Set Password'}
            </button>
          </form>
        </>
      ) : null}
      <div className="mt-6 text-center text-[14px] text-slate-500">
        <Link className="text-[#2196F3] hover:text-sky-600" href="/login">
          Back to login
        </Link>
      </div>
    </div>
  );
}

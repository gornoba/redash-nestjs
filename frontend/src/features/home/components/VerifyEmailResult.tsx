'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { verifyEmailToken } from '../api/verificationApi';

const cardClass =
  'w-full max-w-[720px] rounded-md bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.12)] sm:p-10';

interface VerifyEmailResultProps {
  token: string;
}

interface VerifyResponse {
  message?: string | string[];
}

function readMessage(payload: VerifyResponse | null, fallback: string) {
  if (Array.isArray(payload?.message)) {
    return payload.message.join(', ');
  }

  if (typeof payload?.message === 'string') {
    return payload.message;
  }

  return fallback;
}

export default function VerifyEmailResult({
  token,
}: VerifyEmailResultProps) {
  const [message, setMessage] = useState('이메일 인증을 확인하는 중입니다.');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );

  useEffect(() => {
    let isMounted = true;

    void verifyEmailToken(token)
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setStatus('success');
        setMessage(readMessage(data, '이메일 인증이 완료되었습니다.'));
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setStatus('error');
        setMessage(
          error instanceof Error
            ? error.message
            : '이메일 인증 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        );
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className={cardClass}>
      <div className="text-[26px] leading-tight text-slate-800 sm:text-[28px]">
        이메일 인증
      </div>
      <div
        className={[
          'mt-6 rounded border px-5 py-4 text-[14px] leading-6',
          status === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : status === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-slate-200 bg-slate-50 text-slate-600',
        ].join(' ')}
      >
        {message}
      </div>
      <div className="mt-6 text-center text-[14px] text-slate-500">
        <Link className="text-[#2196F3] hover:text-sky-600" href="/login">
          로그인으로 이동
        </Link>
      </div>
    </div>
  );
}

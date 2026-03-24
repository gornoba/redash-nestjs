'use client';

export async function resendVerificationEmail() {
  const response = await fetch('/api/verification_email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  const data = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(', ')
      : data?.message;
    throw new Error(message ?? 'Failed to resend verification email.');
  }

  return data as { message: string };
}

export async function verifyEmailToken(token: string) {
  const response = await fetch(`/api/verify/${token}`, {
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(', ')
      : data?.message;
    throw new Error(message ?? '유효하지 않거나 만료된 이메일 인증 링크입니다.');
  }

  return data as { message: string };
}

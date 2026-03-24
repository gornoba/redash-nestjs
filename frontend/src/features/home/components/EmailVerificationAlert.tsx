'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { resendVerificationEmail } from '../api/verificationApi';
import { useToast } from '@/lib/toast';

export default function EmailVerificationAlert() {
  const [submitting, setSubmitting] = useState(false);
  const shownRef = useRef(false);
  const { showError, showSuccess, showWarning } = useToast();

  const handleResend = useCallback(async () => {
    setSubmitting(true);

    try {
      const data = await resendVerificationEmail();
      showSuccess(data.message);
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : 'Failed to resend verification email.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [showError, showSuccess]);

  useEffect(() => {
    if (shownRef.current) {
      return;
    }

    shownRef.current = true;
    showWarning(
      'We have sent an email with a confirmation link to your email address. Please follow the link to verify your email address.',
      {
        actionLabel: 'Resend email',
        onAction: () => void handleResend(),
      },
    );
  }, [handleResend, showWarning]);

  return submitting ? (
    <span className="sr-only" aria-live="polite">
      Sending verification email...
    </span>
  ) : null;
}

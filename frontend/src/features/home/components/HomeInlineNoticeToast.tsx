'use client';

import { useEffect, useRef } from 'react';

import { useToast } from '@/lib/toast';

interface HomeInlineNoticeToastProps {
  message: string;
  tone: 'info' | 'warning';
}

export default function HomeInlineNoticeToast({
  message,
  tone,
}: HomeInlineNoticeToastProps) {
  const shownMessageRef = useRef<string | null>(null);
  const { showInfo, showWarning } = useToast();

  useEffect(() => {
    if (shownMessageRef.current === message) {
      return;
    }

    shownMessageRef.current = message;

    if (tone === 'warning') {
      showWarning(message);
      return;
    }

    showInfo(message);
  }, [message, showInfo, showWarning, tone]);

  return null;
}

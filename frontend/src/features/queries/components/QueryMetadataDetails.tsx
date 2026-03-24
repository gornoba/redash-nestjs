'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';

import type { QueryDetail } from '../types';
import { formatRelativeTime } from './querySourceEditorUtils';
import {
  formatRefreshScheduleSummary,
  getScheduledExecutionTime,
  shouldShowScheduledExecutionLabel,
} from '../utils/querySchedule';

interface QueryMetadataDetailsProps {
  dataSourceName?: string | null;
  layout: 'footer' | 'sidebar';
  onEditSchedule?: () => void;
  query: QueryDetail;
  scheduleEditable: boolean;
  timezone: string;
}

export default function QueryMetadataDetails({
  dataSourceName,
  layout,
  onEditSchedule,
  query,
  scheduleEditable,
  timezone,
}: QueryMetadataDetailsProps) {
  useRelativeTimeTicker(shouldShowScheduledExecutionLabel(query.schedule));

  const createdBy = query.user;
  const updatedBy = query.last_modified_by ?? query.user;
  const scheduleLabel = formatRefreshScheduleSummary(query.schedule, timezone);
  const lastExecutedAt = getScheduledExecutionTime(query.schedule);
  const lastExecutedLabel = formatRelativeTime(lastExecutedAt);
  const showLastExecuted = shouldShowScheduledExecutionLabel(query.schedule);

  if (layout === 'sidebar') {
    return (
      <div className="border-t border-[#e8e8e8] bg-white">
        <MetadataUserRow
          name={createdBy?.name ?? '알 수 없음'}
          profileImageUrl={createdBy?.profile_image_url ?? null}
          text={`created ${formatRelativeTime(query.created_at)}`}
        />
        <MetadataUserRow
          name={updatedBy?.name ?? '알 수 없음'}
          profileImageUrl={updatedBy?.profile_image_url ?? null}
          text={`updated ${formatRelativeTime(query.updated_at)}`}
        />
        <div className="border-t border-[#f0f0f0] px-[15px] py-[12px] text-[13px] text-[#767676]">
          <MetadataLabel
            clickable={scheduleEditable}
            label="Refresh Schedule"
            layout="sidebar"
            onClick={onEditSchedule}
            value={scheduleLabel}
          />
          {showLastExecuted ? (
            <div className="mt-2 text-[12px] text-[#9a9a9a]">
              Last executed <strong className="font-medium">{lastExecutedLabel}</strong>
            </div>
          ) : null}
          {dataSourceName ? (
            <div className="mt-2 text-[12px] text-[#9a9a9a]">
              Data Source <strong className="font-medium text-[#595959]">{dataSourceName}</strong>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-[15px] flex flex-wrap items-center justify-between gap-3 px-[4px] text-[13px] text-[#767676]">
      <div className="flex flex-wrap items-center gap-4">
        <span>
          {createdBy?.name ?? '알 수 없음'} created{' '}
          {formatRelativeTime(query.created_at)}
        </span>
        <span>
          {updatedBy?.name ?? '알 수 없음'} updated{' '}
          {formatRelativeTime(query.updated_at)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {dataSourceName ? (
          <span>
            Data Source:{' '}
            <strong className="font-medium text-[#595959]">{dataSourceName}</strong>
          </span>
        ) : null}
        <MetadataLabel
          clickable={scheduleEditable}
          label="Refresh Schedule"
          layout="footer"
          onClick={onEditSchedule}
          value={scheduleLabel}
        />
        {showLastExecuted ? (
          <span>
            Last executed{' '}
            <strong className="font-medium text-[#595959]">{lastExecutedLabel}</strong>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function useRelativeTimeTicker(enabled: boolean) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let intervalId: number | null = null;
    const timeoutId = window.setTimeout(() => {
      setTick(Date.now());
      intervalId = window.setInterval(() => {
        setTick(Date.now());
      }, 60_000);
    }, 60_000 - (Date.now() % 60_000));

    return () => {
      window.clearTimeout(timeoutId);

      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [enabled]);
}

function MetadataLabel({
  clickable,
  label,
  layout,
  onClick,
  value,
}: {
  clickable: boolean;
  label: string;
  layout: 'footer' | 'sidebar';
  onClick?: () => void;
  value: string;
}) {
  const valueNode =
    clickable && onClick ? (
      <button
        className="font-medium text-[#1890ff] transition hover:text-[#40a9ff]"
        onClick={onClick}
        type="button"
      >
        {value}
      </button>
    ) : (
      <strong className="font-medium text-[#595959]">{value}</strong>
    );

  if (layout === 'sidebar') {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-[6px] text-[13px] text-[#6b7280]">
          <RefreshScheduleIcon />
          <span>{label}</span>
        </span>
        {valueNode}
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}:</span>
      {valueNode}
    </span>
  );
}

function RefreshScheduleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[14px] w-[14px] text-[#9ca3af]"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M20 4v6h-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M20 10a8 8 0 1 0 2 5.292"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MetadataUserRow({
  name,
  profileImageUrl,
  text,
}: {
  name: string;
  profileImageUrl: string | null;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[#f0f0f0] px-[15px] py-[12px] last:border-b-0">
      {profileImageUrl ? (
        <img
          alt={name}
          className="h-7 w-7 rounded-full"
          src={profileImageUrl}
        />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dfe7eb] text-[11px] text-[#5f6f7a]">
          {name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-[14px] text-[#595959]">{name}</div>
        <div className="truncate text-[12px] text-[#9a9a9a]">{text}</div>
      </div>
    </div>
  );
}

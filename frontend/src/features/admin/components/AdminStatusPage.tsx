'use client';

import { useEffect, useState } from 'react';

import { getAdminStatus } from '../api/adminClientApi';
import type { AdminStatusResponse } from '../types';
import { formatTimeAgo } from '@/features/users/utils/time';
import { useToastMessage } from '@/lib/toast';

function toHuman(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function toIsoFromEpochSeconds(value: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function formatStableTimestamp(value: string | null) {
  if (!value) {
    return 'n/a';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().replace('T', ' ').replace('Z', ' UTC');
}

function formatRelativeTimestamp(value: string | null, isHydrated: boolean) {
  if (!isHydrated) {
    return formatStableTimestamp(value);
  }

  return formatTimeAgo(value) || 'n/a';
}

export default function AdminStatusPage({
  initialData,
  initialError = null,
}: {
  initialData: AdminStatusResponse | null;
  initialError?: string | null;
}) {
  const [data, setData] = useState<AdminStatusResponse | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [isHydrated, setIsHydrated] = useState(false);

  useToastMessage(error, 'error');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const nextData = await getAdminStatus();

        if (!isCancelled) {
          setData(nextData);
          setError(null);
        }
      } catch {
        if (!isCancelled) {
          setError('상태 정보를 불러오지 못했습니다.');
        }
      }
    };

    if (!initialData) {
      void load();
    }

    const intervalId = window.setInterval(() => {
      void load();
    }, 60_000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [initialData]);

  const generalEntries = data
    ? Object.entries({
        dashboards_count: data.dashboards_count,
        queries_count: data.queries_count,
        query_results_count: data.query_results_count,
        redis_used_memory_human: data.redis_used_memory_human,
        unused_query_results_count: data.unused_query_results_count,
        version: data.version,
        widgets_count: data.widgets_count,
      })
    : [];
  const queueEntries = data ? Object.entries(data.manager.queues) : [];
  const databaseMetrics = data?.database_metrics.metrics ?? [];

  return (
    <div className="overflow-hidden">
      <div className="-m-[7.5px] flex flex-wrap items-stretch">
        <div className="w-full p-[7.5px] md:w-1/2 xl:w-1/4">
          <StatusCard title="General">
            {generalEntries.map(([key, value]) => (
              <ListItem key={key} label={toHuman(key)} value={String(value)} />
            ))}
          </StatusCard>
        </div>
        <div className="w-full p-[7.5px] md:w-1/2 xl:w-1/4">
          <StatusCard title="Manager">
            <ListItem
              label="Last Refresh"
              value={
                formatRelativeTimestamp(
                  toIsoFromEpochSeconds(data?.manager.last_refresh_at ?? null),
                  isHydrated,
                )
              }
            />
            <ListItem
              label="Started"
              value={
                formatRelativeTimestamp(
                  toIsoFromEpochSeconds(data?.manager.started_at ?? null),
                  isHydrated,
                )
              }
            />
            <ListItem
              label="Outdated Queries Count"
              value={String(data?.manager.outdated_queries_count ?? 0)}
            />
          </StatusCard>
        </div>
        <div className="w-full p-[7.5px] md:w-1/2 xl:w-1/4">
          <StatusCard title="Queues">
            {queueEntries.map(([key, value]) => (
              <ListItem key={key} label={key} value={String(value.size)} />
            ))}
          </StatusCard>
        </div>
        <div className="w-full p-[7.5px] md:w-1/2 xl:w-1/4">
          <StatusCard title="Redash Database">
            {databaseMetrics.map(([label, value]) => (
              <ListItem key={label} label={label} value={formatBytes(value)} />
            ))}
          </StatusCard>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex h-full w-full flex-col rounded-[2px] border border-[#e8e8e8] bg-white">
      <div className="border-b border-[#e8e8e8] px-[16px] py-[10px] text-[14px] font-medium text-[rgba(0,0,0,0.85)]">
        {title}
      </div>
      <div className="flex-1 px-[16px] py-[4px]">
        {children || (
          <div className="py-6 text-center text-[13px] text-[#8c8c8c]">No data</div>
        )}
      </div>
    </div>
  );
}

function ListItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#f0f0f0] py-[10px] text-[13px] text-[rgba(0,0,0,0.65)] last:border-b-0">
      <span>{label}</span>
      <span className="inline-flex min-w-[24px] items-center justify-center rounded-[10px] bg-[#2196F3] px-[8px] py-[2px] text-[12px] font-semibold text-white">
        {value}
      </span>
    </div>
  );
}

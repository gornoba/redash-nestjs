'use client';

import { useEffect, useMemo, useState } from 'react';

import { getAdminJobs } from '../api/adminClientApi';
import type {
  AdminJobsResponse,
  AdminStartedJob,
  AdminWorkerStatus,
} from '../types';
import { formatTimeAgo } from '@/features/users/utils/time';
import { useToastMessage } from '@/lib/toast';

type JobsTab = 'other' | 'queries' | 'queues' | 'workers';

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0s';
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function formatJobTime(value: string | null) {
  return value ? formatTimeAgo(value) : 'n/a';
}

const tabs: Array<{ key: JobsTab; label: string }> = [
  { key: 'queues', label: 'Queues' },
  { key: 'workers', label: 'Workers' },
  { key: 'queries', label: 'Queries' },
  { key: 'other', label: 'Other Jobs' },
];

export default function AdminJobsPage({
  initialData,
  initialError = null,
}: {
  initialData: AdminJobsResponse | null;
  initialError?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<JobsTab>(() => {
    if (typeof window === 'undefined') {
      return 'queues';
    }

    const hashValue = window.location.hash.replace('#', '');

    return hashValue === 'workers' ||
      hashValue === 'queries' ||
      hashValue === 'other'
      ? hashValue
      : 'queues';
  });
  const [data, setData] = useState<AdminJobsResponse | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);

  useToastMessage(error, 'error');

  useEffect(() => {
    window.history.replaceState(null, '', `#${activeTab}`);
  }, [activeTab]);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const nextData = await getAdminJobs();

        if (!isCancelled) {
          setData(nextData);
          setError(null);
        }
      } catch {
        if (!isCancelled) {
          setError('큐 상태를 불러오지 못했습니다.');
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

  const queueItems = useMemo(
    () => Object.values(data?.queues ?? {}).sort((left, right) => left.name.localeCompare(right.name)),
    [data],
  );
  const startedJobs = useMemo(
    () => queueItems.flatMap((queue) => queue.started),
    [queueItems],
  );
  const startedQueryJobs = useMemo(
    () => startedJobs.filter((job) => job.origin === 'queries'),
    [startedJobs],
  );
  const otherStartedJobs = useMemo(
    () => startedJobs.filter((job) => job.origin !== 'queries'),
    [startedJobs],
  );
  const overallCounters = useMemo(
    () =>
      queueItems.reduce(
        (accumulator, item) => ({
          queued: accumulator.queued + item.queued,
          started: accumulator.started + item.started.length,
        }),
        { queued: 0, started: 0 },
      ),
    [queueItems],
  );

  function handleChangeTab(nextTab: JobsTab) {
    setActiveTab(nextTab);
  }

  return (
    <div>
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <CounterCard title="Started Jobs" value={overallCounters.started} />
        <CounterCard title="Queued Jobs" value={overallCounters.queued} />
        <CounterCard title="Workers" value={data?.workers.length ?? 0} />
      </div>

      <div className="mb-4 flex overflow-x-auto border-b border-[#e8e8e8]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={[
              'border-b-2 px-4 py-2.5 text-[13px] whitespace-nowrap transition',
              activeTab === tab.key
                ? 'border-[#2196F3] text-[#2196F3]'
                : 'border-transparent text-[#8c8c8c] hover:text-[#2196F3]',
            ].join(' ')}
            onClick={() => handleChangeTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'queues' ? <QueuesTable items={queueItems} /> : null}
      {activeTab === 'workers' ? <WorkersTable items={data?.workers ?? []} /> : null}
      {activeTab === 'queries' ? <QueryJobsTable items={startedQueryJobs} /> : null}
      {activeTab === 'other' ? <OtherJobsTable items={otherStartedJobs} /> : null}
    </div>
  );
}

function CounterCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[2px] border border-[#e8e8e8] bg-white px-4 py-5 text-center">
      <div className="text-[12px] font-medium tracking-[0.08em] text-[#8c8c8c] uppercase">
        {title}
      </div>
      <div className="mt-2 text-[28px] font-semibold text-[#262626]">{value}</div>
    </div>
  );
}

function TableShell({
  children,
  emptyMessage,
}: {
  children: React.ReactNode;
  emptyMessage: string;
}) {
  if (!children) {
    return (
      <div className="rounded-[2px] border border-[#e8e8e8] bg-white px-4 py-10 text-center text-[13px] text-[#8c8c8c]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2px] border border-[#e8e8e8] bg-white">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function QueuesTable({ items }: { items: AdminJobsResponse['queues'][string][] }) {
  if (items.length === 0) {
    return <TableShell emptyMessage="등록된 queue 상태가 없습니다.">{null}</TableShell>;
  }

  return (
    <TableShell emptyMessage="등록된 queue 상태가 없습니다.">
      <table className="w-full min-w-[480px] border-collapse text-[13px] text-[#595959]">
        <thead>
          <tr>
            <th className="border-b border-[#e8e8e8] bg-[#fafafa] px-4 py-3 text-left font-medium">Name</th>
            <th className="border-b border-[#e8e8e8] bg-[#fafafa] px-4 py-3 text-right font-medium">Started</th>
            <th className="border-b border-[#e8e8e8] bg-[#fafafa] px-4 py-3 text-right font-medium">Queued</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.name}>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.name}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3 text-right">{item.started.length}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3 text-right">{item.queued}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function WorkersTable({ items }: { items: AdminWorkerStatus[] }) {
  if (items.length === 0) {
    return <TableShell emptyMessage="활성 worker 정보가 없습니다.">{null}</TableShell>;
  }

  return (
    <TableShell emptyMessage="활성 worker 정보가 없습니다.">
      <table className="w-full min-w-[960px] border-collapse text-[13px] text-[#595959]">
        <thead>
          <tr>
            {['State', 'Hostname', 'PID', 'Name', 'Queues', 'Current Job', 'Successful Jobs', 'Failed Jobs', 'Birth Date', 'Total Working Time'].map((label) => (
              <th
                key={label}
                className="border-b border-[#e8e8e8] bg-[#fafafa] px-4 py-3 text-left font-medium"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.name}>
              <td className="border-b border-[#f0f0f0] px-4 py-3">
                <span className="inline-flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      item.state === 'processing' ? 'bg-[#1890ff]' : 'bg-[#52c41a]'
                    }`}
                  />
                  {item.state}
                </span>
              </td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.hostname}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.pid}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.name}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.queues}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.current_job ?? 'n/a'}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.successful_jobs}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.failed_jobs}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{formatJobTime(item.birth_date)}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{formatDuration(item.total_working_time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function QueryJobsTable({ items }: { items: AdminStartedJob[] }) {
  if (items.length === 0) {
    return <TableShell emptyMessage="실행 중인 query job이 없습니다.">{null}</TableShell>;
  }

  return (
    <TableShell emptyMessage="실행 중인 query job이 없습니다.">
      <table className="w-full min-w-[860px] border-collapse text-[13px] text-[#595959]">
        <thead>
          <tr>
            {['Queue', 'Query ID', 'Org ID', 'Data Source ID', 'User ID', 'Scheduled', 'Start Time', 'Enqueue Time'].map((label) => (
              <th
                key={label}
                className="border-b border-[#e8e8e8] bg-[#fafafa] px-4 py-3 text-left font-medium"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.origin}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.meta.query_id ?? 'n/a'}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.meta.org_id ?? 'n/a'}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.meta.data_source_id ?? 'n/a'}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.meta.user_id ?? 'n/a'}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{String(Boolean(item.meta.scheduled))}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{formatJobTime(item.started_at)}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{formatJobTime(item.enqueued_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function OtherJobsTable({ items }: { items: AdminStartedJob[] }) {
  if (items.length === 0) {
    return <TableShell emptyMessage="실행 중인 기타 job이 없습니다.">{null}</TableShell>;
  }

  return (
    <TableShell emptyMessage="실행 중인 기타 job이 없습니다.">
      <table className="w-full min-w-[680px] border-collapse text-[13px] text-[#595959]">
        <thead>
          <tr>
            {['Queue', 'Job Name', 'Start Time', 'Enqueue Time'].map((label) => (
              <th
                key={label}
                className="border-b border-[#e8e8e8] bg-[#fafafa] px-4 py-3 text-left font-medium"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.origin}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{item.name}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{formatJobTime(item.started_at)}</td>
              <td className="border-b border-[#f0f0f0] px-4 py-3">{formatJobTime(item.enqueued_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

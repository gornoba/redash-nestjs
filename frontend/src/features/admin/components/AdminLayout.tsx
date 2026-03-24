import Link from 'next/link';

import { ApplicationLayout } from '@/features/application-layout';
import type { SessionResponse } from '@/features/home/types';

interface AdminLayoutProps {
  activeTab: 'system_status' | 'jobs' | 'outdated_queries';
  children: React.ReactNode;
  session: SessionResponse;
}

const tabs = [
  { key: 'system_status' as const, label: 'System Status', href: '/admin/status' },
  { key: 'jobs' as const, label: 'RQ Status', href: '/admin/queries/jobs' },
  { key: 'outdated_queries' as const, label: 'Outdated Queries', href: '/admin/queries/outdated' },
];

export default function AdminLayout({
  activeTab,
  children,
  session,
}: AdminLayoutProps) {
  return (
    <ApplicationLayout currentPath={`/admin/${activeTab}`} session={session}>
      <div className="pt-[15px]">
        <div className="w-full px-[15px] pb-10 max-md:px-3">
          <div className="mb-3 flex items-center">
            <h3 className="text-2xl font-medium leading-tight text-slate-800">
              Admin
            </h3>
          </div>

          <div className="overflow-hidden rounded-[3px] bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
            {/* Admin Tabs */}
            <div className="flex border-b border-slate-200">
              {tabs.map((tab) => (
                <Link
                  key={tab.key}
                  className={[
                    'border-b-2 px-5 py-3 text-[14px] transition',
                    activeTab === tab.key
                      ? 'border-[#2196F3] text-[#2196F3]'
                      : 'border-transparent text-slate-500 hover:text-[#2196F3]',
                  ].join(' ')}
                  href={tab.href}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
            {/* Tab Content */}
            <div className="p-[15px]">{children}</div>
          </div>
        </div>
      </div>
    </ApplicationLayout>
  );
}

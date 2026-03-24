import Image from 'next/image';
import Link from 'next/link';

import type {
  HomeVisibleGroup,
  HomeVisibleUser,
  OrganizationStatusCounters,
} from '../types';

interface HomeEmptyStateProps {
  objectCounters: OrganizationStatusCounters;
  isAdmin: boolean;
  visibleGroups: HomeVisibleGroup[];
  visibleUsers: HomeVisibleUser[];
}

function StepLink({
  href,
  text,
  completed,
}: {
  href: string;
  text: string;
  completed: boolean;
}) {
  return (
    <li className={completed ? 'text-slate-400 line-through' : 'text-slate-800'}>
      <Link href={href} className="text-[#2196F3]">
        {text}
      </Link>
    </li>
  );
}

export default function HomeEmptyState({
  objectCounters,
  isAdmin,
  visibleGroups,
  visibleUsers,
}: HomeEmptyStateProps) {
  const isCompleted = {
    dataSource: objectCounters.data_sources > 0,
    query: objectCounters.queries > 0,
    alert: objectCounters.alerts > 0,
    dashboard: objectCounters.dashboards > 0,
    inviteUsers: objectCounters.users > 1,
  };

  const shouldShow = Object.values(isCompleted).some((item) => !item);

  if (!shouldShow) {
    return null;
  }

  return (
    <section className="relative mb-2.5">
      <div className="mx-auto mb-2.5 flex w-full flex-col justify-between rounded border border-stone-200 bg-white text-sm leading-[21px] md:flex-row">
        <div className="w-full bg-[rgba(102,136,153,0.025)] px-[35px] pt-[35px] pb-[25px] text-center md:w-[48%]">
          <h4 className="mt-0 mb-[15px] text-base font-semibold text-slate-800">
            Welcome to Redash 👋
          </h4>
          <p>
            Connect to any data source, easily visualize and share your data
          </p>
          <Image
            alt="dashboard Illustration"
            className="mx-auto block h-auto w-3/4"
            height={240}
            priority
            src="/static/images/illustrations/dashboard.svg"
            width={360}
          />
        </div>
        <div className="w-full px-[35px] pt-[35px] pb-[25px] md:w-[48%] md:pl-0">
          <h4 className="mt-0 mb-[15px] text-base font-semibold text-slate-800">
            Let&apos;s get started
          </h4>
          <ol className="mb-[15px] list-decimal pl-[17px]">
            {isAdmin ? (
              <StepLink
                completed={isCompleted.dataSource}
                href="/data_sources/new"
                text="Connect a Data Source"
              />
            ) : (
              <li className={isCompleted.dataSource ? 'text-slate-400 line-through' : 'text-slate-800'}>
                Ask an account admin to connect a data source
              </li>
            )}
            <StepLink
              completed={isCompleted.query}
              href="/queries/new"
              text="Create your first Query"
            />
            <StepLink
              completed={isCompleted.alert}
              href="/alerts/new"
              text="Create your first Alert"
            />
            <StepLink
              completed={isCompleted.dashboard}
              href="/dashboards"
              text="Create your first Dashboard"
            />
            <StepLink
              completed={isCompleted.inviteUsers}
              href="/users/new"
              text="Invite your team members"
            />
          </ol>
          <p className="text-slate-500">
            Need more support? See our{' '}
            <Link className="text-[#2196F3]" href="https://redash.io/help">
              Help
            </Link>
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InfoListCard
              emptyText="No visible groups."
              items={visibleGroups.map((group) => group.name)}
              title="Groups"
            />
            <InfoListCard
              emptyText="No visible users."
              items={visibleUsers.map((user) => `${user.name} (${user.email})`)}
              title="Users"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoListCard({
  emptyText,
  items,
  title,
}: {
  emptyText: string;
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-4 py-4">
      <h5 className="mb-3 text-sm font-semibold text-slate-800">{title}</h5>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex rounded border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-600"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

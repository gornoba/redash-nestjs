import MenuOutlined from '@ant-design/icons/MenuOutlined';
import Image from 'next/image';
import Link from 'next/link';

import type { SessionResponse } from '@/features/home/types';
import LogoutButton from './LogoutButton';

interface MobileNavbarProps {
  session: SessionResponse;
}

export default function MobileNavbar({ session }: MobileNavbarProps) {
  const permissions = session.user.permissions;
  const canListDashboards = permissions.includes('list_dashboards');
  const canViewQuery = permissions.includes('view_query');
  const canListAlerts = permissions.includes('list_alerts');
  const canSuperAdmin = permissions.includes('super_admin');
  const settingsHref = session.client_config.settingsHomePath;

  return (
    <nav className="flex h-full items-center justify-between bg-[#001529] px-4 shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
      <div className="flex items-center">
        <Link href="/" aria-label="Redash">
          <Image
            alt="Redash"
            height={40}
            src="/static/images/redash_icon_small.png"
            unoptimized
            width={40}
          />
        </Link>
      </div>

      <details className="relative">
        <summary className="flex list-none cursor-pointer items-center justify-center border-0 bg-transparent text-white/75 [&::-webkit-details-marker]:hidden">
          <MenuOutlined />
        </summary>
        <div className="absolute top-[calc(100%+8px)] right-0 z-[1200] min-w-[220px] rounded-md bg-[#001529] py-2 shadow-[0_12px_24px_rgba(0,0,0,0.22)]">
          {canListDashboards ? (
            <Link className="block w-full px-4 py-2.5 text-left text-white/75 transition hover:text-white focus-visible:text-white" href="/dashboards">
              Dashboards
            </Link>
          ) : null}
          {canViewQuery ? (
            <Link className="block w-full px-4 py-2.5 text-left text-white/75 transition hover:text-white focus-visible:text-white" href="/queries">
              Queries
            </Link>
          ) : null}
          {canListAlerts ? (
            <Link className="block w-full px-4 py-2.5 text-left text-white/75 transition hover:text-white focus-visible:text-white" href="/alerts">
              Alerts
            </Link>
          ) : null}
          <Link className="block w-full px-4 py-2.5 text-left text-white/75 transition hover:text-white focus-visible:text-white" href="/users/me">
            Edit Profile
          </Link>
          <hr className="my-2 border-0 border-t border-white/50" />
          <Link className="block w-full px-4 py-2.5 text-left text-white/75 transition hover:text-white focus-visible:text-white" href={settingsHref}>
            Settings
          </Link>
          {canSuperAdmin ? (
            <Link className="block w-full px-4 py-2.5 text-left text-white/75 transition hover:text-white focus-visible:text-white" href="/admin/status">
              System Status
            </Link>
          ) : null}
          <hr className="my-2 border-0 border-t border-white/50" />
          <a
            className="block w-full px-4 py-2.5 text-left text-white/75 transition hover:text-white focus-visible:text-white"
            href="https://redash.io/help"
            rel="noreferrer"
            target="_blank"
          >
            Help
          </a>
          <LogoutButton className="block w-full px-4 py-2.5 text-left text-white/75 transition hover:text-white focus-visible:text-white" />
        </div>
      </details>
    </nav>
  );
}

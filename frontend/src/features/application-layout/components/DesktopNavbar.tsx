import AlertOutlined from "@ant-design/icons/AlertOutlined";
import CodeOutlined from "@ant-design/icons/CodeOutlined";
import DesktopOutlined from "@ant-design/icons/DesktopOutlined";
import PlusOutlined from "@ant-design/icons/PlusOutlined";
import QuestionCircleOutlined from "@ant-design/icons/QuestionCircleOutlined";
import SettingOutlined from "@ant-design/icons/SettingOutlined";
import Image from "next/image";
import Link from "next/link";

import type { SessionResponse } from "@/features/home/types";
import LogoutButton from "./LogoutButton";

interface DesktopNavbarProps {
  currentPath: string;
  session: SessionResponse;
}

function isActive(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function isSettingsPath(currentPath: string) {
  return (
    [
      "/data_sources",
      "/users",
      "/groups",
      "/destinations",
      "/query_snippets",
      "/settings/general",
    ].some(
      (path) => currentPath === path || currentPath.startsWith(`${path}/`),
    ) || currentPath === "/users/me"
  );
}

export default function DesktopNavbar({
  currentPath,
  session,
}: DesktopNavbarProps) {
  const permissions = session.user.permissions;
  const canListDashboards = permissions.includes("list_dashboards");
  const canViewQuery = permissions.includes("view_query");
  const canListAlerts = permissions.includes("list_alerts");
  const canCreateQuery = permissions.includes("create_query");
  const canCreateDashboard = permissions.includes("create_dashboard");
  const canCreateAlert = permissions.includes("list_alerts");
  const canSuperAdmin = permissions.includes("super_admin");
  const settingsHref = session.client_config.settingsHomePath;
  const navLinkBase =
    "flex h-[60px] w-full flex-col items-center justify-center text-[11px] font-medium transition focus-visible:text-white";
  const navLinkActive = "shadow-[inset_3px_0_0_#ff7964] text-white";
  const iconClass =
    "flex h-[26px] w-[26px] items-center justify-center text-[27px] leading-none";
  const submenuPanel =
    "invisible absolute top-0 left-full z-[1200] ml-2 min-w-[200px] rounded-md bg-[#001529] py-2 opacity-0 shadow-[0_12px_24px_rgba(0,0,0,0.22)] transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100";
  const submenuPanelBottom =
    "invisible absolute bottom-0 left-full z-[1200] ml-2 min-w-[200px] rounded-md bg-[#001529] py-2 opacity-0 shadow-[0_12px_24px_rgba(0,0,0,0.22)] transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100";
  const submenuItem =
    "block w-full px-4 py-2.5 text-left text-[13px] font-medium text-white/75 transition hover:text-white focus-visible:text-white";
  const solidWhiteStyle = { color: "rgba(255,255,255,0.75)" } as const;
  const createIconStyle = { color: "rgba(255,255,255,0.75)" } as const;
  const activeIconStyle = { color: "#ff7964" } as const;

  return (
    <nav className="flex h-full w-20 flex-col overflow-visible bg-[#001529]">
      <div className="flex justify-center py-5">
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

      <div className="flex flex-col">
        {canListDashboards ? (
          <Link
            className={`${navLinkBase} ${isActive(currentPath, "/dashboards") ? navLinkActive : ""}`}
            href="/dashboards"
            style={solidWhiteStyle}
          >
            <DesktopOutlined
              className={iconClass}
              style={
                isActive(currentPath, "/dashboards")
                  ? activeIconStyle
                  : solidWhiteStyle
              }
            />
            <span className="mt-1" style={solidWhiteStyle}>
              Dashboards
            </span>
          </Link>
        ) : null}

        {canViewQuery ? (
          <Link
            className={`${navLinkBase} ${isActive(currentPath, "/queries") ? navLinkActive : ""}`}
            href="/queries"
            style={solidWhiteStyle}
          >
            <CodeOutlined
              className={iconClass}
              style={
                isActive(currentPath, "/queries")
                  ? activeIconStyle
                  : solidWhiteStyle
              }
            />
            <span className="mt-1" style={solidWhiteStyle}>
              Queries
            </span>
          </Link>
        ) : null}

        {canListAlerts ? (
          <Link
            className={`${navLinkBase} ${isActive(currentPath, "/alerts") ? navLinkActive : ""}`}
            href="/alerts"
            style={solidWhiteStyle}
          >
            <AlertOutlined
              className={iconClass}
              style={
                isActive(currentPath, "/alerts")
                  ? activeIconStyle
                  : solidWhiteStyle
              }
            />
            <span className="mt-1" style={solidWhiteStyle}>
              Alerts
            </span>
          </Link>
        ) : null}

        {canCreateQuery || canCreateDashboard || canCreateAlert ? (
          <div className="group relative">
            <button
              className={navLinkBase}
              data-test="CreateButton"
              style={solidWhiteStyle}
              type="button"
            >
              <PlusOutlined className={iconClass} style={createIconStyle} />
              <span className="mt-1" style={solidWhiteStyle}>
                Create
              </span>
            </button>
            <div className={submenuPanel}>
              <div
                aria-hidden
                className="absolute top-0 right-full h-full w-2"
              />
              {canCreateQuery ? (
                <Link
                  className={submenuItem}
                  data-test="CreateQueryMenuItem"
                  href="/queries/new"
                  style={solidWhiteStyle}
                >
                  New Query
                </Link>
              ) : null}
              {canCreateDashboard ? (
                <Link
                  className={submenuItem}
                  data-test="CreateDashboardMenuItem"
                  href="/dashboards"
                  style={solidWhiteStyle}
                >
                  New Dashboard
                </Link>
              ) : null}
              {canCreateAlert ? (
                <Link
                  className={submenuItem}
                  data-test="CreateAlertMenuItem"
                  href="/alerts/new"
                  style={solidWhiteStyle}
                >
                  New Alert
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col">
        <a
          className={navLinkBase}
          href="https://redash.io/help"
          rel="noreferrer"
          style={solidWhiteStyle}
          target="_blank"
        >
          <QuestionCircleOutlined
            className={iconClass}
            style={solidWhiteStyle}
          />
          <span className="mt-1" style={solidWhiteStyle}>
            Help
          </span>
        </a>

        <Link
          className={`${navLinkBase} ${isSettingsPath(currentPath) ? navLinkActive : ""}`}
          href={settingsHref}
          style={solidWhiteStyle}
        >
          <SettingOutlined
            className={iconClass}
            style={
              isSettingsPath(currentPath) ? activeIconStyle : solidWhiteStyle
            }
          />
          <span className="mt-1" style={solidWhiteStyle}>
            Settings
          </span>
        </Link>
      </div>

      <div className="group relative">
        <button
          className="flex h-[60px] w-full flex-col items-center justify-center bg-transparent transition focus-visible:text-white"
          style={solidWhiteStyle}
          type="button"
        >
          <Image
            alt={session.user.name}
            className="rounded-full align-middle"
            height={26}
            src={session.user.profile_image_url}
            unoptimized
            width={26}
          />
        </button>
        <div className={submenuPanelBottom} style={solidWhiteStyle}>
          <div aria-hidden className="absolute top-0 right-full h-full w-2" />
          <Link className={submenuItem} href="/users/me">
            Profile
          </Link>
          {canSuperAdmin ? (
            <Link className={submenuItem} href="/admin/status">
              System Status
            </Link>
          ) : null}
          <hr className="my-2 border-0 border-t border-white/50" />
          <LogoutButton className={submenuItem} />
          <hr className="my-2 border-0 border-t border-white/50" />
          <div className="px-4 py-2.5 text-white/75">New Redash</div>
        </div>
      </div>
    </nav>
  );
}

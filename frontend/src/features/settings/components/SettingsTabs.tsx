import Link from 'next/link';

import type { SettingsMenuResponse } from '../types';

interface SettingsTabsProps {
  currentPath: string;
  menu: SettingsMenuResponse;
}

function isActive(currentPath: string, href: string) {
  if (href === '/users') {
    return currentPath.startsWith('/users') && currentPath !== '/users/me';
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export default function SettingsTabs({
  currentPath,
  menu,
}: SettingsTabsProps) {
  return (
    <div className="border-b border-slate-200">
      <div className="flex flex-wrap items-center px-4">
        {menu.items.map((item) => {
          const active = isActive(currentPath, item.path);

          return (
            <Link
              key={item.key}
              className={[
                'inline-flex min-h-[46px] items-center border-b-2 px-5 py-3 text-[14px] transition',
                active
                  ? 'border-[#2196F3] text-[#2196F3]'
                  : 'border-transparent text-slate-500 hover:text-[#2196F3]',
              ].join(' ')}
              data-test="SettingsScreenItem"
              href={item.path}
            >
              {item.title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

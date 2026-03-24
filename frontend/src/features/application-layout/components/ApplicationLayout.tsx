import type { ReactNode } from 'react';

import type { SessionResponse } from '@/features/home/types';
import DesktopNavbar from './DesktopNavbar';
import MobileNavbar from './MobileNavbar';
import PageTitleSync from './PageTitleSync';

interface ApplicationLayoutProps {
  children: ReactNode;
  contentBackgroundColor?: string;
  currentPath: string;
  session: SessionResponse;
}

export default function ApplicationLayout({
  children,
  contentBackgroundColor,
  currentPath,
  session,
}: ApplicationLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#edecec]">
      <PageTitleSync currentPath={currentPath} />
      <div className="relative hidden shrink-0 overflow-visible md:block">
        <DesktopNavbar currentPath={currentPath} session={session} />
      </div>
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pb-4 pt-[49px] md:pt-0"
        style={
          contentBackgroundColor
            ? { backgroundColor: contentBackgroundColor }
            : undefined
        }
      >
        <div className="fixed left-0 top-0 z-50 block h-[49px] w-full md:hidden">
          <MobileNavbar session={session} />
        </div>
        {children}
      </div>
    </div>
  );
}

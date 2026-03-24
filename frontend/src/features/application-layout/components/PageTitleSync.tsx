'use client';

import { useEffect } from 'react';

interface PageTitleSyncProps {
  currentPath: string;
}

function resolvePageTitle(currentPath: string) {
  if (currentPath === '/') {
    return 'Redash';
  }

  if (currentPath === '/queries/new') {
    return 'New Query';
  }

  if (currentPath.startsWith('/queries')) {
    return 'Queries';
  }

  if (currentPath.startsWith('/alerts')) {
    return 'Alerts';
  }

  if (currentPath.startsWith('/dashboards')) {
    return 'Dashboards';
  }

  if (currentPath.startsWith('/data_sources')) {
    return 'Data Sources';
  }

  if (currentPath.startsWith('/destinations')) {
    return 'Alert Destinations';
  }

  if (currentPath.startsWith('/groups')) {
    return 'Groups';
  }

  if (currentPath.startsWith('/query_snippets')) {
    return 'Query Snippets';
  }

  if (currentPath.startsWith('/settings')) {
    return 'Settings';
  }

  if (currentPath === '/users/me') {
    return 'Account';
  }

  if (currentPath.startsWith('/users')) {
    return 'Users';
  }

  if (currentPath.startsWith('/admin/status')) {
    return 'System Status';
  }

  if (currentPath.startsWith('/admin/queries/jobs')) {
    return 'RQ Status';
  }

  if (currentPath.startsWith('/login')) {
    return 'Login';
  }

  if (currentPath.startsWith('/invite')) {
    return 'Invite';
  }

  if (currentPath.startsWith('/reset')) {
    return 'Reset Password';
  }

  if (currentPath.startsWith('/verify')) {
    return 'Email Verification';
  }

  return 'Redash';
}

export default function PageTitleSync({
  currentPath,
}: PageTitleSyncProps) {
  useEffect(() => {
    document.title = resolvePageTitle(currentPath);
  }, [currentPath]);

  return null;
}

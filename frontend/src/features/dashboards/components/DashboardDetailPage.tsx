import { ApplicationLayout } from '@/features/application-layout';
import type { SessionResponse } from '@/features/home/types';
import type { DashboardDetail } from '@/features/dashboards/types';
import DashboardDetailScreen from './DashboardDetailScreen';

interface DashboardDetailPageProps {
  dashboard: DashboardDetail;
  session: SessionResponse;
}

export default function DashboardDetailPage({
  dashboard,
  session,
}: DashboardDetailPageProps) {
  return (
    <ApplicationLayout
      contentBackgroundColor="#f6f7f9"
      currentPath={`/dashboards/${dashboard.id}`}
      session={session}
    >
      <DashboardDetailScreen initialDashboard={dashboard} session={session} />
    </ApplicationLayout>
  );
}

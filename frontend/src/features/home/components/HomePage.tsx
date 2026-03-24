import { ApplicationLayout } from '@/features/application-layout';

import type { HomePageData } from '../types';
import EmailVerificationAlert from './EmailVerificationAlert';
import FavoriteList from './FavoriteList';
import HomeEmptyState from './HomeEmptyState';
import HomeInlineNoticeToast from './HomeInlineNoticeToast';

function hasMessage(messages: string[], target: string) {
  return messages.includes(target);
}

export default function HomePage({
  session,
  favoriteDashboards,
  favoriteQueries,
  organizationStatus,
}: HomePageData) {
  return (
    <ApplicationLayout currentPath="/" session={session}>
      <div className="pt-[15px]">
        <div className="w-full px-[15px] pb-10 max-md:px-3 max-md:pb-8">
          {hasMessage(session.messages, 'using-deprecated-embed-feature') ? (
            <HomeInlineNoticeToast
              message="You have enabled ALLOW_PARAMETERS_IN_EMBEDS. This setting is now deprecated and should be turned off. Parameters in embeds are supported by default."
              tone="warning"
            />
          ) : null}

          {hasMessage(session.messages, 'email-not-verified') ? (
            <EmailVerificationAlert />
          ) : null}

          <HomeEmptyState
            objectCounters={organizationStatus.object_counters}
            isAdmin={session.user.permissions.includes('admin')}
            visibleGroups={organizationStatus.visible_groups}
            visibleUsers={organizationStatus.visible_users}
          />

          <section className="rounded-[3px] bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
            <div className="px-[25px] py-[15px] max-md:px-4 max-md:py-[18px]">
              <div className="mt-[-20px] grid gap-0 md:grid-cols-2">
                <div className="mt-5 pr-[15px] max-md:pr-0">
                  <FavoriteList
                    title="Favorite Dashboards"
                    items={favoriteDashboards.results}
                    emptyHref="/dashboards"
                    emptyLabel="Dashboards"
                    buildHref={(dashboard) =>
                      dashboard.url ??
                      `/dashboards/${dashboard.id}${dashboard.slug ? `-${dashboard.slug}` : ''}`
                    }
                  />
                </div>
                <div className="mt-5 pl-[15px] max-md:pl-0">
                  <FavoriteList
                    title="Favorite Queries"
                    items={favoriteQueries.results}
                    emptyHref="/queries"
                    emptyLabel="Queries"
                    buildHref={(query) => `/queries/${query.id}`}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ApplicationLayout>
  );
}

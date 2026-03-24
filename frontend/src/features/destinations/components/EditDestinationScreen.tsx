import { ApplicationLayout } from '@/features/application-layout';
import type { SessionResponse } from '@/features/home/types';
import SettingsTabs from '@/features/settings/components/SettingsTabs';
import type { SettingsMenuResponse } from '@/features/settings/types';

import type { DestinationDetail, DestinationTypeDefinition } from '../types';
import EditDestinationEditor from './EditDestinationEditor';

interface EditDestinationScreenProps {
  destination: DestinationDetail;
  menu: SettingsMenuResponse;
  session: SessionResponse;
  types: DestinationTypeDefinition[];
}

export default function EditDestinationScreen({
  destination,
  menu,
  session,
  types,
}: EditDestinationScreenProps) {
  return (
    <ApplicationLayout currentPath={`/destinations/${destination.id}`} session={session}>
      <div className="w-full px-4 py-5 md:px-6">
        <div className="w-full">
          <div className="mb-3 flex items-center">
            <h3 className="text-2xl font-medium leading-tight text-slate-800">
              Settings
            </h3>
          </div>
          <div className="overflow-hidden rounded-[3px] bg-white shadow-[0_4px_9px_-3px_rgba(102,136,153,0.15)]">
            <SettingsTabs
              currentPath={`/destinations/${destination.id}`}
              menu={menu}
            />
            <div className="w-full min-w-0 overflow-x-clip p-[15px]">
              <EditDestinationEditor
                destination={destination}
                types={types}
              />
            </div>
          </div>
        </div>
      </div>
    </ApplicationLayout>
  );
}

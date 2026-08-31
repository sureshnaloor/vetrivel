import { Outlet } from 'react-router-dom';
import { LocationProvider } from '../contexts/LocationContext';
import { FriendsProvider } from '../contexts/FriendsContext';
import { CommunitiesProvider } from '../contexts/CommunitiesContext';
import { DivyaDesamProvider } from '../contexts/DivyaDesamContext';
import { DashboardPinnedProvider } from '../contexts/DashboardPinnedContext';

/** Shared providers for dashboard + Divya Desam pages — keeps sidebar state when navigating. */
export default function AppShellLayout() {
  return (
    <LocationProvider>
      <FriendsProvider>
        <CommunitiesProvider>
          <DashboardPinnedProvider>
            <DivyaDesamProvider>
              <Outlet />
            </DivyaDesamProvider>
          </DashboardPinnedProvider>
        </CommunitiesProvider>
      </FriendsProvider>
    </LocationProvider>
  );
}

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { UserPlace } from '../services/places';

type DashboardPinnedContextValue = {
  pinToAssign: UserPlace | null;
  setPinToAssign: (place: UserPlace | null) => void;
  pinnedListVersion: number;
  refreshPinnedList: () => void;
};

const DashboardPinnedContext = createContext<DashboardPinnedContextValue | undefined>(undefined);

export function DashboardPinnedProvider({ children }: { children: ReactNode }) {
  const [pinToAssign, setPinToAssign] = useState<UserPlace | null>(null);
  const [pinnedListVersion, setPinnedListVersion] = useState(0);
  const refreshPinnedList = useCallback(() => {
    setPinnedListVersion((v) => v + 1);
  }, []);

  return (
    <DashboardPinnedContext.Provider
      value={{ pinToAssign, setPinToAssign, pinnedListVersion, refreshPinnedList }}
    >
      {children}
    </DashboardPinnedContext.Provider>
  );
}

export function useDashboardPinned() {
  const ctx = useContext(DashboardPinnedContext);
  if (!ctx) {
    throw new Error('useDashboardPinned must be used within DashboardPinnedProvider');
  }
  return ctx;
}

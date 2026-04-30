import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface SelectedTemple {
  name: string;
  placeId?: string;
  coordinates: { lat: number; lng: number };
  vicinity?: string;
  rating?: number;
  userRatingsTotal?: number;
}

interface SelectedTempleContextType {
  selectedTemple: SelectedTemple | null;
  setSelectedTemple: (temple: SelectedTemple | null) => void;
  clearSelectedTemple: () => void;
}

const SelectedTempleContext = createContext<SelectedTempleContextType | undefined>(undefined);

export function SelectedTempleProvider({ children }: { children: ReactNode }) {
  const [selectedTemple, setSelectedTempleState] = useState<SelectedTemple | null>(null);

  const setSelectedTemple = useCallback((temple: SelectedTemple | null) => {
    setSelectedTempleState(temple);
  }, []);

  const clearSelectedTemple = useCallback(() => {
    setSelectedTempleState(null);
  }, []);

  return (
    <SelectedTempleContext.Provider value={{ selectedTemple, setSelectedTemple, clearSelectedTemple }}>
      {children}
    </SelectedTempleContext.Provider>
  );
}

export function useSelectedTemple() {
  const context = useContext(SelectedTempleContext);
  if (context === undefined) {
    throw new Error('useSelectedTemple must be used within a SelectedTempleProvider');
  }
  return context;
}

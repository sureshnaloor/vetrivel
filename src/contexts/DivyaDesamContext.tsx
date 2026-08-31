import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  fetchLists,
  createList,
  cloneList,
  updateList,
  deleteList,
} from '../services/divyadesam';
import type { DivyaDesamList } from '../services/divyadesam';
import { normalizeDocumentId, normalizeEmail } from '../lib/geo';

interface DivyaDesamContextType {
  lists: DivyaDesamList[];
  /** User-owned tracked lists (adopted copies + custom lists; excludes global templates). */
  myLists: DivyaDesamList[];
  /** Parent template ids the user has adopted — for Explore "Adopted" badges. */
  adoptedParentIds: Set<string>;
  loading: boolean;
  error: string | null;
  refreshLists: () => Promise<void>;
  createList: (data: Partial<DivyaDesamList>) => Promise<DivyaDesamList>;
  cloneList: (id: string) => Promise<DivyaDesamList>;
  updateList: (id: string, data: Partial<DivyaDesamList>) => Promise<DivyaDesamList>;
  deleteList: (id: string) => Promise<void>;
}

const DivyaDesamContext = createContext<DivyaDesamContextType | undefined>(undefined);

export const DivyaDesamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { session, loading: authLoading } = useAuth();
  const userEmail = normalizeEmail(session?.user?.email);
  const [lists, setLists] = useState<DivyaDesamList[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLists = useCallback(async () => {
    if (authLoading) return;
    if (!userEmail) {
      setLists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLists();
      setLists(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch Divya Desams lists';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [authLoading, userEmail]);

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  const myLists = useMemo(() => {
    if (!userEmail) return [];
    return lists.filter(
      (list) =>
        !list.isGlobalTemplate && normalizeEmail(list.creatorEmail) === userEmail
    );
  }, [lists, userEmail]);

  const adoptedParentIds = useMemo(() => {
    const ids = myLists
      .filter((list) => list.parentListId)
      .map((list) => normalizeDocumentId(list.parentListId))
      .filter((id): id is string => id != null);
    return new Set(ids);
  }, [myLists]);

  const handleCreateList = useCallback(
    async (data: Partial<DivyaDesamList>) => {
      const newList = await createList(data);
      await refreshLists();
      return newList;
    },
    [refreshLists]
  );

  const handleCloneList = useCallback(
    async (id: string) => {
      const clonedList = await cloneList(id);
      await refreshLists();
      return clonedList;
    },
    [refreshLists]
  );

  const handleUpdateList = useCallback(
    async (id: string, data: Partial<DivyaDesamList>) => {
      const updated = await updateList(id, data);
      await refreshLists();
      return updated;
    },
    [refreshLists]
  );

  const handleDeleteList = useCallback(
    async (id: string) => {
      await deleteList(id);
      await refreshLists();
    },
    [refreshLists]
  );

  return (
    <DivyaDesamContext.Provider
      value={{
        lists,
        myLists,
        adoptedParentIds,
        loading: authLoading || loading,
        error,
        refreshLists,
        createList: handleCreateList,
        cloneList: handleCloneList,
        updateList: handleUpdateList,
        deleteList: handleDeleteList,
      }}
    >
      {children}
    </DivyaDesamContext.Provider>
  );
};

export const useDivyaDesam = () => {
  const context = useContext(DivyaDesamContext);
  if (context === undefined) {
    throw new Error('useDivyaDesam must be used within a DivyaDesamProvider');
  }
  return context;
};

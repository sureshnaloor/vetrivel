import React, { createContext, useContext, useState, useEffect } from 'react';
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

interface DivyaDesamContextType {
  lists: DivyaDesamList[];
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
  const { session } = useAuth();
  const user = session?.user;
  const [lists, setLists] = useState<DivyaDesamList[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLists = async () => {
    if (!user) {
      setLists([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLists();
      setLists(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Divya Desams lists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreateList = async (data: Partial<DivyaDesamList>) => {
    const newList = await createList(data);
    await loadLists();
    return newList;
  };

  const handleCloneList = async (id: string) => {
    const clonedList = await cloneList(id);
    await loadLists();
    return clonedList;
  };

  const handleUpdateList = async (id: string, data: Partial<DivyaDesamList>) => {
    const updated = await updateList(id, data);
    await loadLists();
    return updated;
  };

  const handleDeleteList = async (id: string) => {
    await deleteList(id);
    await loadLists();
  };

  return (
    <DivyaDesamContext.Provider
      value={{
        lists,
        loading,
        error,
        refreshLists: loadLists,
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

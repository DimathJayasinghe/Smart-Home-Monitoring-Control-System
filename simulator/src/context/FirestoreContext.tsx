import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useFloors } from '../hooks/useFloors';
import { useDevices } from '../hooks/useDevices';
import type { Device, Floor } from '../types';

interface FirestoreContextValue {
  floors: Floor[];
  selectedFloorId: string | null;
  setSelectedFloorId: (id: string) => void;
  devices: Device[];
  loading: boolean;
}

const FirestoreContext = createContext<FirestoreContextValue | null>(null);

export function FirestoreProvider({ children }: { children: ReactNode }) {
  const { floors, loading: floorsLoading } = useFloors();
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFloorId && floors.length > 0) {
      setSelectedFloorId(floors[0].id);
    }
  }, [floors, selectedFloorId]);

  const { devices, loading: devicesLoading } = useDevices(selectedFloorId);

  const value: FirestoreContextValue = {
    floors,
    selectedFloorId,
    setSelectedFloorId,
    devices,
    loading: floorsLoading || devicesLoading,
  };

  return <FirestoreContext.Provider value={value}>{children}</FirestoreContext.Provider>;
}

export function useFirestoreContext(): FirestoreContextValue {
  const ctx = useContext(FirestoreContext);
  if (!ctx) throw new Error('useFirestoreContext must be used within a FirestoreProvider');
  return ctx;
}

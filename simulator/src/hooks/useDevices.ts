import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Device } from '../types';

const HOUSEHOLD_ID = 'demo-household';

export function useDevices(floorId: string | null): { devices: Device[]; loading: boolean } {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!floorId) {
      setDevices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, `households/${HOUSEHOLD_ID}/floors/${floorId}/devices`),
      (snapshot) => {
        setDevices(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Device, 'id'>) })));
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [floorId]);

  return { devices, loading };
}

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { Floor } from '../types';

const HOUSEHOLD_ID = 'demo-household';

export function useFloors(): { floors: Floor[]; loading: boolean } {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, `households/${HOUSEHOLD_ID}/floors`), orderBy('order'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFloors(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Floor, 'id'>) })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { floors, loading };
}

// simulator/src/hooks/useFloors.integration.test.tsx
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebase';
import { useFloors } from './useFloors';

async function ensureSignedIn() {
  try {
    await signInWithEmailAndPassword(auth, 'test@example.com', 'password123');
  } catch {
    await createUserWithEmailAndPassword(auth, 'test@example.com', 'password123');
  }
}

function FloorsList() {
  const { floors, loading } = useFloors();
  if (loading) return <div>Loading...</div>;
  return (
    <ul>
      {floors.map((f) => (
        <li key={f.id}>{f.name}</li>
      ))}
    </ul>
  );
}

describe('useFloors', () => {
  beforeAll(async () => {
    await ensureSignedIn();
    await setDoc(doc(db, 'households/demo-household/floors/floor-2'), {
      name: 'Second Floor', gridRows: 8, gridCols: 8, backgroundImageUrl: '', order: 1,
    });
    await setDoc(doc(db, 'households/demo-household/floors/floor-1'), {
      name: 'Ground Floor', gridRows: 8, gridCols: 8, backgroundImageUrl: '', order: 0,
    });
  });

  it('lists floors ordered by the order field', async () => {
    render(<FloorsList />);
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
    const items = screen.getAllByRole('listitem');
    expect(items[0].textContent).toBe('Ground Floor');
    expect(items[1].textContent).toBe('Second Floor');
  });
});

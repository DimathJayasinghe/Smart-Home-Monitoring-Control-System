// simulator/src/hooks/useFloors.integration.test.tsx
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFloors } from './useFloors';
import { ensureSignedIn } from '../testUtils/ensureSignedIn';

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

  afterAll(async () => {
    // useFloors queries the *entire* floors collection (no per-test
    // scoping), and other integration test files share this emulator
    // session under fileParallelism: false. Clean up our fixtures so we
    // don't leak floors into the shared `demo-household` collection for
    // whichever file runs next.
    await deleteDoc(doc(db, 'households/demo-household/floors/floor-1'));
    await deleteDoc(doc(db, 'households/demo-household/floors/floor-2'));
  });

  it('lists floors ordered by the order field', async () => {
    render(<FloorsList />);
    // Assert presence and relative order, not an exact collection count --
    // the collection is shared across integration test files, so other
    // files' fixtures (cleaned up or not) must not be able to break this
    // assertion.
    await waitFor(() => {
      const names = screen.getAllByRole('listitem').map((li) => li.textContent);
      expect(names).toContain('Ground Floor');
      expect(names).toContain('Second Floor');
    });
    const names = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(names.indexOf('Ground Floor')).toBeLessThan(names.indexOf('Second Floor'));
  });
});

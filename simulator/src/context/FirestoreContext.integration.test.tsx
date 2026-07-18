// simulator/src/context/FirestoreContext.integration.test.tsx
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FirestoreProvider, useFirestoreContext } from './FirestoreContext';
import { ensureSignedIn } from '../testUtils/ensureSignedIn';

function Consumer() {
  const { floors, selectedFloorId, setSelectedFloorId, devices } = useFirestoreContext();
  return (
    <div>
      <ul>
        {floors.map((f) => (
          <li key={f.id}>
            <button onClick={() => setSelectedFloorId(f.id)}>{f.name}</button>
          </li>
        ))}
      </ul>
      <div data-testid="selected">{selectedFloorId ?? 'none'}</div>
      <ul>
        {devices.map((d) => (
          <li key={d.id}>{d.name}</li>
        ))}
      </ul>
    </div>
  );
}

describe('FirestoreProvider', () => {
  beforeAll(async () => {
    await ensureSignedIn();
    await setDoc(doc(db, 'households/demo-household/floors/ctx-floor-1'), {
      name: 'Ctx Floor One', gridRows: 8, gridCols: 8, backgroundImageUrl: '', order: 0,
    });
    await setDoc(doc(db, 'households/demo-household/floors/ctx-floor-1/devices/ctx-dev-1'), {
      type: 'outlet', name: 'Ctx Device', row: 0, col: 0, status: 'OFF',
    });
  });

  afterAll(async () => {
    // The floors collection is queried in full by useFloors (no per-test
    // scoping), so other integration test files sharing this emulator
    // session assert exact counts against it. Clean up our fixtures so we
    // don't leak floors into the shared `demo-household` collection.
    await deleteDoc(doc(db, 'households/demo-household/floors/ctx-floor-1/devices/ctx-dev-1'));
    await deleteDoc(doc(db, 'households/demo-household/floors/ctx-floor-1'));
    await deleteDoc(doc(db, 'households/demo-household/floors/ctx-floor-2/devices/ctx-dev-2'));
    await deleteDoc(doc(db, 'households/demo-household/floors/ctx-floor-2'));
  });

  it('auto-selects the first floor and loads its devices', async () => {
    render(
      <FirestoreProvider>
        <Consumer />
      </FirestoreProvider>
    );

    await waitFor(() => expect(screen.getByTestId('selected').textContent).toBe('ctx-floor-1'));
    await waitFor(() => expect(screen.getByText('Ctx Device')).toBeInTheDocument());
  });

  it('switches devices when a different floor is selected', async () => {
    await setDoc(doc(db, 'households/demo-household/floors/ctx-floor-2'), {
      name: 'Ctx Floor Two', gridRows: 8, gridCols: 8, backgroundImageUrl: '', order: 1,
    });
    await setDoc(doc(db, 'households/demo-household/floors/ctx-floor-2/devices/ctx-dev-2'), {
      type: 'outlet', name: 'Second Ctx Device', row: 0, col: 0, status: 'OFF',
    });

    const user = userEvent.setup();
    render(
      <FirestoreProvider>
        <Consumer />
      </FirestoreProvider>
    );

    await waitFor(() => expect(screen.getByText('Ctx Floor Two')).toBeInTheDocument());
    await user.click(screen.getByText('Ctx Floor Two'));

    await waitFor(() => expect(screen.getByTestId('selected').textContent).toBe('ctx-floor-2'));
    await waitFor(() => expect(screen.getByText('Second Ctx Device')).toBeInTheDocument());
  });
});

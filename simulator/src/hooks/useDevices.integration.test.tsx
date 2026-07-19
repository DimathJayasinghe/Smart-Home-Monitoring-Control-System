// simulator/src/hooks/useDevices.integration.test.tsx
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useDevices } from './useDevices';
import { ensureSignedIn } from '../testUtils/ensureSignedIn';

function DevicesList({ floorId }: { floorId: string | null }) {
  const { devices, loading } = useDevices(floorId);
  if (loading) return <div>Loading...</div>;
  return (
    <ul>
      {devices.map((d) => (
        <li key={d.id}>{d.name}</li>
      ))}
    </ul>
  );
}

describe('useDevices', () => {
  beforeAll(async () => {
    await ensureSignedIn();
    await setDoc(doc(db, 'households/demo-household/floors/floor-x/devices/dev-1'), {
      type: 'outlet', name: 'Test Device 1', row: 0, col: 0, status: 'OFF',
    });
  });

  afterAll(async () => {
    await deleteDoc(doc(db, 'households/demo-household/floors/floor-x/devices/dev-1'));
  });

  it('lists devices for the given floor', async () => {
    render(<DevicesList floorId="floor-x" />);
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    expect(screen.getByText('Test Device 1')).toBeInTheDocument();
  });

  it('returns an empty list and stops loading when floorId is null', async () => {
    render(<DevicesList floorId={null} />);
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});

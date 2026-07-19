// simulator/src/lib/deviceWrites.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { updateDeviceStatus, toggleSwitch, cycleSnapshot } from './deviceWrites';
import { ensureSignedIn } from '../testUtils/ensureSignedIn';
import type { Device, SwitchState } from '../types';

const HOUSEHOLD_ID = 'demo-household';
const FLOOR_ID = 'floor-1';

function deviceRef(deviceId: string) {
  return doc(db, `households/${HOUSEHOLD_ID}/floors/${FLOOR_ID}/devices/${deviceId}`);
}

describe('deviceWrites', () => {
  beforeAll(async () => {
    await ensureSignedIn();
  });

  afterAll(async () => {
    // These docs live under floor-1, which useFloors.integration.test.tsx
    // also uses -- clean up so no device subcollection docs linger under a
    // floor id another file's assertions touch.
    await deleteDoc(deviceRef('outlet-test'));
    await deleteDoc(deviceRef('iron-test'));
    await deleteDoc(deviceRef('iron-test-2'));
    await deleteDoc(deviceRef('multiswitch-test'));
    await deleteDoc(deviceRef('camera-test'));
  });

  it('updateDeviceStatus flips a plain outlet status', async () => {
    const ref = deviceRef('outlet-test');
    await setDoc(ref, { type: 'outlet', name: 'Test Outlet', row: 0, col: 0, status: 'OFF' });

    const device: Device = { id: 'outlet-test', type: 'outlet', name: 'Test Outlet', row: 0, col: 0, status: 'OFF' };
    await updateDeviceStatus(FLOOR_ID, 'outlet-test', device, 'ON');

    const snap = await getDoc(ref);
    expect(snap.data()?.status).toBe('ON');
  });

  it('updateDeviceStatus sets turnedOnAt for a safety device flipped ON', async () => {
    const ref = deviceRef('iron-test');
    await setDoc(ref, { type: 'safety', name: 'Test Iron', row: 0, col: 0, status: 'OFF', maxOnDurationSec: 120, turnedOnAt: null });

    const device: Device = { id: 'iron-test', type: 'safety', name: 'Test Iron', row: 0, col: 0, status: 'OFF', maxOnDurationSec: 120, turnedOnAt: null };
    const before = Date.now();
    await updateDeviceStatus(FLOOR_ID, 'iron-test', device, 'ON');
    const after = Date.now();

    const snap = await getDoc(ref);
    expect(snap.data()?.status).toBe('ON');
    expect(snap.data()?.turnedOnAt).toBeGreaterThanOrEqual(before);
    expect(snap.data()?.turnedOnAt).toBeLessThanOrEqual(after);
  });

  it('updateDeviceStatus clears turnedOnAt for a safety device flipped OFF', async () => {
    const ref = deviceRef('iron-test-2');
    await setDoc(ref, { type: 'safety', name: 'Test Iron 2', row: 0, col: 0, status: 'ON', maxOnDurationSec: 120, turnedOnAt: Date.now() });

    const device: Device = { id: 'iron-test-2', type: 'safety', name: 'Test Iron 2', row: 0, col: 0, status: 'ON', maxOnDurationSec: 120, turnedOnAt: Date.now() };
    await updateDeviceStatus(FLOOR_ID, 'iron-test-2', device, 'OFF');

    const snap = await getDoc(ref);
    expect(snap.data()?.status).toBe('OFF');
    expect(snap.data()?.turnedOnAt).toBeNull();
  });

  it('toggleSwitch flips only the targeted sub-switch', async () => {
    const ref = deviceRef('multiswitch-test');
    const switches: SwitchState[] = [
      { id: 'sw1', label: 'Ceiling Light', status: 'OFF' },
      { id: 'sw2', label: 'Fan', status: 'OFF' },
    ];
    await setDoc(ref, { type: 'multiswitch', name: 'Test Gang Box', row: 0, col: 0, status: 'ON', switches });

    await toggleSwitch(FLOOR_ID, 'multiswitch-test', switches, 'sw2');

    const snap = await getDoc(ref);
    const updated = snap.data()?.switches as SwitchState[];
    expect(updated.find((s) => s.id === 'sw1')?.status).toBe('OFF');
    expect(updated.find((s) => s.id === 'sw2')?.status).toBe('ON');
  });

  it('cycleSnapshot wraps the index back to 0 at the end', async () => {
    const ref = deviceRef('camera-test');
    await setDoc(ref, {
      type: 'camera',
      name: 'Test Camera',
      row: 0,
      col: 0,
      status: 'ON',
      snapshotUrls: ['a.jpg', 'b.jpg', 'c.jpg'],
      currentSnapshotIndex: 2,
    });

    await cycleSnapshot(FLOOR_ID, 'camera-test', 2, 3);

    const snap = await getDoc(ref);
    expect(snap.data()?.currentSnapshotIndex).toBe(0);
  });
});

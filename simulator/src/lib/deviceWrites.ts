import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Device, DeviceStatus, SwitchState } from '../types';

const HOUSEHOLD_ID = 'demo-household';

function deviceRef(floorId: string, deviceId: string) {
  return doc(db, `households/${HOUSEHOLD_ID}/floors/${floorId}/devices/${deviceId}`);
}

export async function updateDeviceStatus(
  floorId: string,
  deviceId: string,
  device: Device,
  newStatus: DeviceStatus
): Promise<void> {
  const update: Record<string, unknown> = { status: newStatus };

  if (device.type === 'safety') {
    update.turnedOnAt = newStatus === 'ON' ? Date.now() : null;
  }

  await updateDoc(deviceRef(floorId, deviceId), update);
}

export async function toggleSwitch(
  floorId: string,
  deviceId: string,
  switches: SwitchState[],
  switchId: string
): Promise<void> {
  const updated = switches.map((sw) =>
    sw.id === switchId ? { ...sw, status: sw.status === 'ON' ? 'OFF' : ('ON' as DeviceStatus) } : sw
  );
  await updateDoc(deviceRef(floorId, deviceId), { switches: updated });
}

export async function cycleSnapshot(
  floorId: string,
  deviceId: string,
  currentIndex: number,
  total: number
): Promise<void> {
  const nextIndex = (currentIndex + 1) % total;
  await updateDoc(deviceRef(floorId, deviceId), { currentSnapshotIndex: nextIndex });
}

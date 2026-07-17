import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Device, UsageLog, Alert } from './types';

const HOUSEHOLD_ID = 'demo-household';

export interface CutoffResult {
  device: Device;
  usageLog: UsageLog;
  alert: Alert;
}

export function computeCutoffs(devices: Device[], nowMs: number): CutoffResult[] {
  const results: CutoffResult[] = [];

  for (const device of devices) {
    if (device.type !== 'safety') continue;
    if (device.status !== 'ON') continue;
    if (device.turnedOnAt == null || device.maxOnDurationSec == null) continue;

    const elapsedSec = (nowMs - device.turnedOnAt) / 1000;
    if (elapsedSec <= device.maxOnDurationSec) continue;

    const updatedDevice: Device = { ...device, status: 'OFF', turnedOnAt: null };

    const usageLog: UsageLog = {
      deviceId: device.id,
      floorId: '', // filled in by caller, which knows the floor context
      event: 'AUTO_CUTOFF',
      timestamp: nowMs,
    };

    const alert: Alert = {
      deviceId: device.id,
      floorId: '',
      message: `${device.name} exceeded its maximum on-duration (${device.maxOnDurationSec}s) and was switched off automatically.`,
      triggeredAt: nowMs,
      acknowledged: false,
    };

    results.push({ device: updatedDevice, usageLog, alert });
  }

  return results;
}

export async function runSafetyCutoffSweep(
  db: FirebaseFirestore.Firestore,
  messaging: admin.messaging.Messaging,
  nowMs: number
): Promise<number> {
  const snapshot = await db
    .collectionGroup('devices')
    .where('type', '==', 'safety')
    .where('status', '==', 'ON')
    .get();

  const devices: Device[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Device, 'id'>),
  }));

  const results = computeCutoffs(devices, nowMs);

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const doc = snapshot.docs[i];
    const floorId = doc.ref.parent.parent?.id ?? '';

    await doc.ref.update({ status: 'OFF', turnedOnAt: null });

    const householdRef = db.collection('households').doc(HOUSEHOLD_ID);
    await householdRef.collection('usageLogs').add({
      ...result.usageLog,
      floorId,
    });
    await householdRef.collection('alerts').add({
      ...result.alert,
      floorId,
    });

    await messaging.send({
      topic: 'household_alerts',
      notification: {
        title: 'Safety Cutoff Triggered',
        body: result.alert.message,
      },
    });
  }

  return results.length;
}

export const onSafetyCutoffSchedule = onSchedule('every 1 minutes', async () => {
  const db = admin.firestore();
  const messaging = admin.messaging();
  await runSafetyCutoffSweep(db, messaging, Date.now());
});

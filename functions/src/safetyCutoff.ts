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

  // collectionGroup('devices') queries every households/{id}/floors/{id}/devices
  // subcollection in the entire project, not just the demo household. Scope
  // defensively to HOUSEHOLD_ID so a stray/staging/test household document
  // elsewhere in Firestore can never have its devices cut off (or its usage
  // logs/alerts misfiled) under demo-household.
  const scopedDocs = snapshot.docs.filter(
    (doc) => doc.ref.parent.parent?.parent?.parent?.id === HOUSEHOLD_ID
  );

  const devices: Device[] = scopedDocs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Device, 'id'>),
  }));

  const results = computeCutoffs(devices, nowMs);

  for (const result of results) {
    // computeCutoffs filters out devices that didn't breach, so `results` is a
    // subsequence of `scopedDocs` — pair by device id, not by index.
    const doc = scopedDocs.find((d) => d.id === result.device.id)!;
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

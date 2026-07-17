import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Device, UsageLog } from './types';

const HOUSEHOLD_ID = 'demo-household';

export interface ScheduleAction {
  device: Device;
  usageLog: UsageLog;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function isWithinWindow(nowHHMM: string, startTime: string, endTime: string): boolean {
  const now = toMinutes(nowHHMM);
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  if (start <= end) {
    return now >= start && now < end;
  }
  // overnight window (e.g. 22:00 -> 06:00)
  return now >= start || now < end;
}

export function computeScheduleActions(devices: Device[], nowHHMM: string): ScheduleAction[] {
  const actions: ScheduleAction[] = [];

  for (const device of devices) {
    if (!device.schedule || !device.schedule.enabled) continue;

    const shouldBeOn = isWithinWindow(nowHHMM, device.schedule.startTime, device.schedule.endTime);
    const currentlyOn = device.status === 'ON';

    if (shouldBeOn === currentlyOn) continue;

    const newStatus = shouldBeOn ? 'ON' : 'OFF';
    const updatedDevice: Device = { ...device, status: newStatus };

    const usageLog: UsageLog = {
      deviceId: device.id,
      floorId: '', // filled in by caller
      event: shouldBeOn ? 'SCHEDULED_ON' : 'SCHEDULED_OFF',
      timestamp: Date.now(),
    };

    actions.push({ device: updatedDevice, usageLog });
  }

  return actions;
}

function currentHHMM(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export async function runScheduleSweep(
  db: FirebaseFirestore.Firestore,
  nowHHMM: string
): Promise<number> {
  const snapshot = await db
    .collectionGroup('devices')
    .where('schedule.enabled', '==', true)
    .get();

  // collectionGroup('devices') queries every households/{id}/floors/{id}/devices
  // subcollection in the entire project, not just the demo household. Scope
  // defensively to HOUSEHOLD_ID so a stray/staging/test household document
  // elsewhere in Firestore can never be flipped (or have its usage logs
  // misfiled) under demo-household.
  const scopedDocs = snapshot.docs.filter(
    (doc) => doc.ref.parent.parent?.parent?.parent?.id === HOUSEHOLD_ID
  );

  const devices: Device[] = scopedDocs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Device, 'id'>),
  }));

  const actions = computeScheduleActions(devices, nowHHMM);

  for (const action of actions) {
    // computeScheduleActions filters out devices already in the correct
    // ON/OFF state, so `actions` is a subsequence of `scopedDocs` — pair by
    // device id, not by index.
    const doc = scopedDocs.find((d) => d.id === action.device.id)!;
    const floorId = doc.ref.parent.parent?.id ?? '';

    await doc.ref.update({ status: action.device.status });

    const householdRef = db.collection('households').doc(HOUSEHOLD_ID);
    await householdRef.collection('usageLogs').add({
      ...action.usageLog,
      floorId,
    });
  }

  return actions.length;
}

export const onScheduleWorkerSchedule = onSchedule('every 1 minutes', async () => {
  const db = admin.firestore();
  await runScheduleSweep(db, currentHHMM());
});

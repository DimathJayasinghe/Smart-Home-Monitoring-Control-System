// tests/emulator-smoke.test.ts
import * as admin from 'firebase-admin';
import { runSafetyCutoffSweep } from '../functions/src/safetyCutoff';
import { runScheduleSweep } from '../functions/src/scheduleWorker';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

let app: admin.app.App;

beforeAll(() => {
  app = admin.initializeApp({ projectId: 'smart-home-mad-project' }, 'smoke-test-app');
});

afterAll(async () => {
  await app.delete();
});

describe('end-to-end safety cutoff via emulator', () => {
  it('flips a breached iron OFF, logs usage, and writes an alert', async () => {
    const db = app.firestore();
    const householdRef = db.collection('households').doc('demo-household');
    const floorRef = householdRef.collection('floors').doc('floor-1');
    await floorRef.set({ name: 'Ground Floor', gridRows: 8, gridCols: 8, backgroundImageUrl: '', order: 0 });

    const turnedOnAt = Date.now() - 200_000; // 200s ago
    await floorRef.collection('devices').doc('iron-test').set({
      type: 'safety',
      name: 'Test Iron',
      row: 0,
      col: 0,
      status: 'ON',
      maxOnDurationSec: 120,
      turnedOnAt,
    });

    const messaging = { send: jest.fn().mockResolvedValue('id') } as unknown as admin.messaging.Messaging;
    const count = await runSafetyCutoffSweep(db, messaging, Date.now());

    expect(count).toBe(1);

    const updated = await floorRef.collection('devices').doc('iron-test').get();
    expect(updated.data()?.status).toBe('OFF');

    const logs = await householdRef.collection('usageLogs').where('event', '==', 'AUTO_CUTOFF').get();
    expect(logs.empty).toBe(false);

    const alerts = await householdRef.collection('alerts').get();
    expect(alerts.empty).toBe(false);
  });

  it('turns a scheduled porch light ON when inside its window', async () => {
    const db = app.firestore();
    const floorRef = db.collection('households').doc('demo-household').collection('floors').doc('floor-1');

    await floorRef.collection('devices').doc('porch-test').set({
      type: 'outlet',
      name: 'Porch Test Light',
      row: 0,
      col: 0,
      status: 'OFF',
      schedule: { startTime: '00:00', endTime: '23:59', enabled: true },
    });

    const count = await runScheduleSweep(db, '12:00');
    expect(count).toBeGreaterThanOrEqual(1);

    const updated = await floorRef.collection('devices').doc('porch-test').get();
    expect(updated.data()?.status).toBe('ON');
  });
});

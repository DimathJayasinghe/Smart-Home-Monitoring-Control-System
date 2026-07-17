import { computeCutoffs, runSafetyCutoffSweep } from '../safetyCutoff';
import { Device } from '../types';
import * as admin from 'firebase-admin';

const baseDevice = (overrides: Partial<Device>): Device => ({
  id: 'd1',
  type: 'safety',
  name: 'Iron',
  row: 0,
  col: 0,
  status: 'ON',
  maxOnDurationSec: 120,
  turnedOnAt: 0,
  ...overrides,
});

describe('computeCutoffs', () => {
  it('flags a safety device that exceeded max on-duration', () => {
    const now = 121_000; // 121s after turnedOnAt=0
    const devices = [baseDevice({ turnedOnAt: 0, maxOnDurationSec: 120 })];
    const results = computeCutoffs(devices, now);
    expect(results).toHaveLength(1);
    expect(results[0].device.status).toBe('OFF');
    expect(results[0].device.turnedOnAt).toBeNull();
    expect(results[0].usageLog.event).toBe('AUTO_CUTOFF');
    expect(results[0].alert.deviceId).toBe('d1');
  });

  it('does not flag a device still within its max on-duration', () => {
    const now = 60_000; // 60s after turnedOnAt=0, limit is 120s
    const devices = [baseDevice({ turnedOnAt: 0, maxOnDurationSec: 120 })];
    expect(computeCutoffs(devices, now)).toHaveLength(0);
  });

  it('ignores devices that are already OFF', () => {
    const now = 500_000;
    const devices = [baseDevice({ status: 'OFF', turnedOnAt: null })];
    expect(computeCutoffs(devices, now)).toHaveLength(0);
  });

  it('ignores non-safety device types even if fields are present', () => {
    const now = 500_000;
    const devices = [
      baseDevice({ type: 'outlet', turnedOnAt: 0, maxOnDurationSec: 10 }),
    ];
    expect(computeCutoffs(devices, now)).toHaveLength(0);
  });

  it('handles multiple devices, only flagging the breached one', () => {
    const now = 200_000;
    const devices = [
      baseDevice({ id: 'a', turnedOnAt: 0, maxOnDurationSec: 120 }), // breached
      baseDevice({ id: 'b', turnedOnAt: 190_000, maxOnDurationSec: 120 }), // not breached
    ];
    const results = computeCutoffs(devices, now);
    expect(results).toHaveLength(1);
    expect(results[0].device.id).toBe('a');
  });
});

describe('runSafetyCutoffSweep', () => {
  it('writes OFF status, usage log, alert, and sends FCM push for a breached device', async () => {
    const breachedDoc = {
      id: 'iron-1',
      ref: {
        update: jest.fn().mockResolvedValue(undefined),
        parent: {
          parent: {
            id: 'floor-1',
            parent: { parent: { id: 'demo-household' } },
          },
        },
      },
      data: () => ({
        type: 'safety',
        name: 'Iron',
        row: 0,
        col: 0,
        status: 'ON',
        maxOnDurationSec: 120,
        turnedOnAt: 0,
      }),
    };

    const floorRef = { id: 'floor-1' };

    const devicesSnapshot = { docs: [breachedDoc] };
    const floorsSnapshot = { docs: [{ ref: floorRef, id: 'floor-1' }] };

    const collectionGroup = jest.fn().mockResolvedValue(devicesSnapshot);
    const addUsageLog = jest.fn().mockResolvedValue(undefined);
    const addAlert = jest.fn().mockResolvedValue(undefined);

    const db = {
      collectionGroup: () => ({ where: () => ({ where: () => ({ get: collectionGroup }) }) }),
      collection: (name: string) => ({
        doc: () => ({
          collection: (sub: string) => ({
            add: sub === 'usageLogs' ? addUsageLog : addAlert,
          }),
        }),
      }),
    } as unknown as FirebaseFirestore.Firestore;

    const send = jest.fn().mockResolvedValue('message-id');
    const messaging = { send } as unknown as admin.messaging.Messaging;

    const count = await runSafetyCutoffSweep(db, messaging, 121_000);

    expect(count).toBe(1);
    expect(breachedDoc.ref.update).toHaveBeenCalledWith({ status: 'OFF', turnedOnAt: null });
    expect(addUsageLog).toHaveBeenCalled();
    expect(addAlert).toHaveBeenCalled();
    expect(send).toHaveBeenCalled();
  });

  it('ignores breached safety devices belonging to a different household', async () => {
    const demoDoc = {
      id: 'iron-demo',
      ref: {
        update: jest.fn().mockResolvedValue(undefined),
        parent: {
          parent: {
            id: 'floor-1',
            parent: { parent: { id: 'demo-household' } },
          },
        },
      },
      data: () => ({
        type: 'safety',
        name: 'Demo Iron',
        row: 0,
        col: 0,
        status: 'ON',
        maxOnDurationSec: 120,
        turnedOnAt: 0,
      }),
    };

    const otherHouseholdDoc = {
      id: 'iron-other',
      ref: {
        update: jest.fn().mockResolvedValue(undefined),
        parent: {
          parent: {
            id: 'floor-9',
            parent: { parent: { id: 'other-household' } },
          },
        },
      },
      data: () => ({
        type: 'safety',
        name: 'Other Iron',
        row: 0,
        col: 0,
        status: 'ON',
        maxOnDurationSec: 120,
        turnedOnAt: 0,
      }),
    };

    const devicesSnapshot = { docs: [demoDoc, otherHouseholdDoc] };

    const collectionGroup = jest.fn().mockResolvedValue(devicesSnapshot);
    const addUsageLog = jest.fn().mockResolvedValue(undefined);
    const addAlert = jest.fn().mockResolvedValue(undefined);

    const db = {
      collectionGroup: () => ({ where: () => ({ where: () => ({ get: collectionGroup }) }) }),
      collection: (name: string) => ({
        doc: () => ({
          collection: (sub: string) => ({
            add: sub === 'usageLogs' ? addUsageLog : addAlert,
          }),
        }),
      }),
    } as unknown as FirebaseFirestore.Firestore;

    const send = jest.fn().mockResolvedValue('message-id');
    const messaging = { send } as unknown as admin.messaging.Messaging;

    const count = await runSafetyCutoffSweep(db, messaging, 121_000);

    expect(count).toBe(1);
    expect(demoDoc.ref.update).toHaveBeenCalledWith({ status: 'OFF', turnedOnAt: null });
    expect(otherHouseholdDoc.ref.update).not.toHaveBeenCalled();
    expect(addUsageLog).toHaveBeenCalledTimes(1);
    expect(addAlert).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

import { computeScheduleActions, runScheduleSweep } from '../scheduleWorker';
import { Device } from '../types';

const bulb = (overrides: Partial<Device>): Device => ({
  id: 'bulb-1',
  type: 'outlet',
  name: 'Porch Light',
  row: 0,
  col: 0,
  status: 'OFF',
  schedule: { startTime: '18:00', endTime: '23:00', enabled: true },
  ...overrides,
});

describe('computeScheduleActions', () => {
  it('turns ON a device inside its window that is currently OFF', () => {
    const devices = [bulb({ status: 'OFF' })];
    const actions = computeScheduleActions(devices, '19:30');
    expect(actions).toHaveLength(1);
    expect(actions[0].device.status).toBe('ON');
    expect(actions[0].usageLog.event).toBe('SCHEDULED_ON');
  });

  it('turns OFF a device outside its window that is currently ON', () => {
    const devices = [bulb({ status: 'ON' })];
    const actions = computeScheduleActions(devices, '23:30');
    expect(actions).toHaveLength(1);
    expect(actions[0].device.status).toBe('OFF');
    expect(actions[0].usageLog.event).toBe('SCHEDULED_OFF');
  });

  it('does nothing when device state already matches the window', () => {
    const insideAlreadyOn = [bulb({ status: 'ON' })];
    expect(computeScheduleActions(insideAlreadyOn, '19:30')).toHaveLength(0);

    const outsideAlreadyOff = [bulb({ status: 'OFF' })];
    expect(computeScheduleActions(outsideAlreadyOff, '23:30')).toHaveLength(0);
  });

  it('handles an overnight window that wraps past midnight', () => {
    const overnightBulb = bulb({
      status: 'OFF',
      schedule: { startTime: '22:00', endTime: '06:00', enabled: true },
    });
    expect(computeScheduleActions([overnightBulb], '23:00')).toHaveLength(1); // inside, should turn ON
    expect(computeScheduleActions([overnightBulb], '02:00')).toHaveLength(1); // inside, should turn ON
    const stillOff = bulb({
      status: 'OFF',
      schedule: { startTime: '22:00', endTime: '06:00', enabled: true },
    });
    expect(computeScheduleActions([stillOff], '12:00')).toHaveLength(0); // outside, already OFF
  });

  it('ignores devices with no schedule or a disabled schedule', () => {
    const noSchedule = bulb({ schedule: undefined });
    const disabled = bulb({ schedule: { startTime: '18:00', endTime: '23:00', enabled: false } });
    expect(computeScheduleActions([noSchedule, disabled], '19:00')).toHaveLength(0);
  });
});

describe('runScheduleSweep', () => {
  it('updates a device status and writes a usage log when the window changes', async () => {
    const doc = {
      id: 'bulb-1',
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
        type: 'outlet',
        name: 'Porch Light',
        row: 0,
        col: 0,
        status: 'OFF',
        schedule: { startTime: '18:00', endTime: '23:00', enabled: true },
      }),
    };
    const addUsageLog = jest.fn().mockResolvedValue(undefined);

    const db = {
      collectionGroup: () => ({ where: () => ({ get: async () => ({ docs: [doc] }) }) }),
      collection: () => ({ doc: () => ({ collection: () => ({ add: addUsageLog }) }) }),
    } as unknown as FirebaseFirestore.Firestore;

    const count = await runScheduleSweep(db, '19:30');

    expect(count).toBe(1);
    expect(doc.ref.update).toHaveBeenCalledWith({ status: 'ON' });
    expect(addUsageLog).toHaveBeenCalled();
  });

  it('ignores scheduled devices belonging to a different household', async () => {
    const demoDoc = {
      id: 'bulb-demo',
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
        type: 'outlet',
        name: 'Demo Porch Light',
        row: 0,
        col: 0,
        status: 'OFF',
        schedule: { startTime: '18:00', endTime: '23:00', enabled: true },
      }),
    };

    const otherHouseholdDoc = {
      id: 'bulb-other',
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
        type: 'outlet',
        name: 'Other Porch Light',
        row: 0,
        col: 0,
        status: 'OFF',
        schedule: { startTime: '18:00', endTime: '23:00', enabled: true },
      }),
    };

    const addUsageLog = jest.fn().mockResolvedValue(undefined);

    const db = {
      collectionGroup: () => ({
        where: () => ({ get: async () => ({ docs: [demoDoc, otherHouseholdDoc] }) }),
      }),
      collection: () => ({ doc: () => ({ collection: () => ({ add: addUsageLog }) }) }),
    } as unknown as FirebaseFirestore.Firestore;

    const count = await runScheduleSweep(db, '19:30');

    expect(count).toBe(1);
    expect(demoDoc.ref.update).toHaveBeenCalledWith({ status: 'ON' });
    expect(otherHouseholdDoc.ref.update).not.toHaveBeenCalled();
    expect(addUsageLog).toHaveBeenCalledTimes(1);
  });

  it('pairs actions back to the correct doc by device id, not by array index', async () => {
    // The first device is already ON inside its window (no action needed), so
    // computeScheduleActions returns a subsequence that skips it. If the sweep
    // paired actions back to docs by index instead of by device id, the second
    // device's ON action would be misapplied to the first (already-correct) doc.
    const alreadyOnDoc = {
      id: 'bulb-already-on',
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
        type: 'outlet',
        name: 'Already On Light',
        row: 0,
        col: 0,
        status: 'ON',
        schedule: { startTime: '18:00', endTime: '23:00', enabled: true },
      }),
    };

    const needsFlipDoc = {
      id: 'bulb-needs-flip',
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
        type: 'outlet',
        name: 'Needs Flip Light',
        row: 0,
        col: 0,
        status: 'OFF',
        schedule: { startTime: '18:00', endTime: '23:00', enabled: true },
      }),
    };

    const addUsageLog = jest.fn().mockResolvedValue(undefined);

    const db = {
      collectionGroup: () => ({
        where: () => ({ get: async () => ({ docs: [alreadyOnDoc, needsFlipDoc] }) }),
      }),
      collection: () => ({ doc: () => ({ collection: () => ({ add: addUsageLog }) }) }),
    } as unknown as FirebaseFirestore.Firestore;

    const count = await runScheduleSweep(db, '19:30');

    expect(count).toBe(1);
    expect(alreadyOnDoc.ref.update).not.toHaveBeenCalled();
    expect(needsFlipDoc.ref.update).toHaveBeenCalledWith({ status: 'ON' });
  });
});

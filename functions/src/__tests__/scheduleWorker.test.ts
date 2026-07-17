import { computeScheduleActions } from '../scheduleWorker';
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

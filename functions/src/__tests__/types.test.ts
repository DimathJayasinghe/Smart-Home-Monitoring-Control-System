import { Device, UsageLog, Alert } from '../types';

describe('shared types compile with valid literals', () => {
  it('accepts a valid safety device literal', () => {
    const device: Device = {
      id: 'iron-1',
      type: 'safety',
      name: 'Living Room Iron',
      row: 2,
      col: 3,
      status: 'ON',
      maxOnDurationSec: 120,
      turnedOnAt: Date.now(),
    };
    expect(device.type).toBe('safety');
  });

  it('accepts a valid usage log literal', () => {
    const log: UsageLog = {
      deviceId: 'iron-1',
      floorId: 'floor-1',
      event: 'AUTO_CUTOFF',
      timestamp: Date.now(),
    };
    expect(log.event).toBe('AUTO_CUTOFF');
  });

  it('accepts a valid alert literal', () => {
    const alert: Alert = {
      deviceId: 'iron-1',
      floorId: 'floor-1',
      message: 'Iron exceeded max on-duration',
      triggeredAt: Date.now(),
      acknowledged: false,
    };
    expect(alert.acknowledged).toBe(false);
  });
});

import { computeCutoffs } from '../safetyCutoff';
import { Device } from '../types';

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

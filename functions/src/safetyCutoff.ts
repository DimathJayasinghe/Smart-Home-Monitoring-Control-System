import { Device, UsageLog, Alert } from './types';

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

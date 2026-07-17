import { Device, UsageLog } from './types';

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

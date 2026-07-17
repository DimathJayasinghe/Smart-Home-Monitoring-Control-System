export type DeviceType = 'outlet' | 'multiswitch' | 'safety' | 'camera';
export type DeviceStatus = 'ON' | 'OFF' | 'ERROR' | 'DISCONNECTED';
export type UsageEvent = 'ON' | 'OFF' | 'AUTO_CUTOFF' | 'SCHEDULED_ON' | 'SCHEDULED_OFF';

export interface SwitchState {
  id: string;
  label: string;
  status: DeviceStatus;
}

export interface DeviceSchedule {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  enabled: boolean;
}

export interface Device {
  id: string;
  type: DeviceType;
  name: string;
  row: number;
  col: number;
  status: DeviceStatus;

  // safety-critical only
  maxOnDurationSec?: number;
  turnedOnAt?: number | null; // epoch millis

  // multi-switch only
  switches?: SwitchState[];

  // scheduled devices only (outlets acting as light bulbs, or safety devices)
  schedule?: DeviceSchedule;

  // camera only
  mockStreamUrl?: string;
  snapshotUrls?: string[];
  currentSnapshotIndex?: number;
}

export interface Floor {
  id: string;
  name: string;
  gridRows: number;
  gridCols: number;
  backgroundImageUrl: string;
  order: number;
}

export interface Household {
  id: string;
  name: string;
}

export interface Alert {
  deviceId: string;
  floorId: string;
  message: string;
  triggeredAt: number;
  acknowledged: boolean;
}

export interface UsageLog {
  deviceId: string;
  floorId: string;
  event: UsageEvent;
  timestamp: number;
}

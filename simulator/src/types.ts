export type DeviceType = 'outlet' | 'multiswitch' | 'safety' | 'camera';
export type DeviceStatus = 'ON' | 'OFF' | 'ERROR' | 'DISCONNECTED';

export interface SwitchState {
  id: string;
  label: string;
  status: DeviceStatus;
}

export interface DeviceSchedule {
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export interface Device {
  id: string;
  type: DeviceType;
  name: string;
  row: number;
  col: number;
  status: DeviceStatus;
  maxOnDurationSec?: number;
  turnedOnAt?: number | null;
  switches?: SwitchState[];
  schedule?: DeviceSchedule;
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

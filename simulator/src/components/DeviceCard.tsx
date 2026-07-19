import { updateDeviceStatus } from '../lib/deviceWrites';
import { MultiSwitchControls } from './MultiSwitchControls';
import { CameraControls } from './CameraControls';
import type { Device, DeviceStatus } from '../types';

const STATUSES: DeviceStatus[] = ['ON', 'OFF', 'ERROR', 'DISCONNECTED'];

export function DeviceCard({ floorId, device }: { floorId: string; device: Device }) {
  return (
    <div>
      <h3>{device.name}</h3>
      <p>{device.status}</p>
      {device.schedule && (
        <p>
          Schedule: {device.schedule.startTime}–{device.schedule.endTime} ({device.schedule.enabled ? 'enabled' : 'disabled'})
        </p>
      )}
      <div>
        {STATUSES.map((status) => (
          <button key={status} onClick={() => updateDeviceStatus(floorId, device.id, device, status)}>
            {status}
          </button>
        ))}
      </div>
      {device.type === 'multiswitch' && <MultiSwitchControls floorId={floorId} device={device} />}
      {device.type === 'camera' && <CameraControls floorId={floorId} device={device} />}
    </div>
  );
}

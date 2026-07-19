import { toggleSwitch } from '../lib/deviceWrites';
import type { Device } from '../types';

export function MultiSwitchControls({ floorId, device }: { floorId: string; device: Device }) {
  if (!device.switches) return null;

  return (
    <div>
      {device.switches.map((sw) => (
        <div key={sw.id}>
          <span>{sw.label}</span>
          <span>{sw.status}</span>
          <button onClick={() => toggleSwitch(floorId, device.id, device.switches!, sw.id)}>{sw.label} toggle</button>
        </div>
      ))}
    </div>
  );
}

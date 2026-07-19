import { cycleSnapshot } from '../lib/deviceWrites';
import type { Device } from '../types';

export function CameraControls({ floorId, device }: { floorId: string; device: Device }) {
  if (!device.snapshotUrls || device.currentSnapshotIndex === undefined) return null;

  const currentUrl = device.snapshotUrls[device.currentSnapshotIndex];

  return (
    <div>
      <img src={currentUrl} alt={`${device.name} snapshot`} />
      <button
        onClick={() => cycleSnapshot(floorId, device.id, device.currentSnapshotIndex!, device.snapshotUrls!.length)}
      >
        Cycle Snapshot
      </button>
    </div>
  );
}

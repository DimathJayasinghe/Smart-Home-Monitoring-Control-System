import { useFirestoreContext } from '../context/FirestoreContext';
import { DeviceCard } from './DeviceCard';

export function DeviceList() {
  const { devices, selectedFloorId } = useFirestoreContext();

  if (!selectedFloorId) return null;

  return (
    <div>
      {devices.map((device) => (
        <DeviceCard key={device.id} floorId={selectedFloorId} device={device} />
      ))}
    </div>
  );
}

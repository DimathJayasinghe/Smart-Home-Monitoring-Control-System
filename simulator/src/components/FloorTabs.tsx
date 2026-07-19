import { useFirestoreContext } from '../context/FirestoreContext';

export function FloorTabs() {
  const { floors, selectedFloorId, setSelectedFloorId } = useFirestoreContext();

  return (
    <div>
      {floors.map((floor) => (
        <button
          key={floor.id}
          onClick={() => setSelectedFloorId(floor.id)}
          aria-pressed={floor.id === selectedFloorId}
        >
          {floor.name}
        </button>
      ))}
    </div>
  );
}

import { LoginScreen } from './components/LoginScreen';
import { FirestoreProvider } from './context/FirestoreContext';
import { FloorTabs } from './components/FloorTabs';
import { DeviceList } from './components/DeviceList';

export default function App() {
  return (
    <LoginScreen>
      <FirestoreProvider>
        <h1>Smart Home Hardware Simulator</h1>
        <FloorTabs />
        <DeviceList />
      </FirestoreProvider>
    </LoginScreen>
  );
}

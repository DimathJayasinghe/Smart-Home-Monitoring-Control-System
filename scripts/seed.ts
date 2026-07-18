import * as admin from 'firebase-admin';

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080';
admin.initializeApp({ projectId: 'smart-home-mad-project' });

const db = admin.firestore();
const HOUSEHOLD_ID = 'demo-household';

async function seed() {
  const householdRef = db.collection('households').doc(HOUSEHOLD_ID);
  await householdRef.set({ name: 'Demo Household' });

  const floorRef = householdRef.collection('floors').doc('floor-1');
  await floorRef.set({
    name: 'Ground Floor',
    gridRows: 8,
    gridCols: 8,
    backgroundImageUrl: 'https://example.com/floorplans/ground-floor.png',
    order: 0,
  });

  const devices = floorRef.collection('devices');

  await devices.doc('outlet-1').set({
    type: 'outlet',
    name: 'TV Outlet',
    row: 1,
    col: 2,
    status: 'OFF',
  });

  await devices.doc('multiswitch-1').set({
    type: 'multiswitch',
    name: 'Kitchen Gang Box',
    row: 3,
    col: 1,
    status: 'ON',
    switches: [
      { id: 'sw1', label: 'Ceiling Light', status: 'ON' },
      { id: 'sw2', label: 'Extractor Fan', status: 'OFF' },
      { id: 'sw3', label: 'Under-Cabinet Light', status: 'OFF' },
    ],
  });

  await devices.doc('iron-1').set({
    type: 'safety',
    name: 'Clothes Iron',
    row: 5,
    col: 4,
    status: 'OFF',
    maxOnDurationSec: 120,
    turnedOnAt: null,
  });

  await devices.doc('porch-light-1').set({
    type: 'outlet',
    name: 'Porch Light',
    row: 0,
    col: 0,
    status: 'OFF',
    schedule: { startTime: '18:00', endTime: '23:00', enabled: true },
  });

  await devices.doc('camera-1').set({
    type: 'camera',
    name: 'Front Door Camera',
    row: 0,
    col: 7,
    status: 'ON',
    snapshotUrls: [
      'https://picsum.photos/seed/frontdoor1/400/300',
      'https://picsum.photos/seed/frontdoor2/400/300',
      'https://picsum.photos/seed/frontdoor3/400/300',
    ],
    currentSnapshotIndex: 0,
  });

  console.log('Seed complete.');
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

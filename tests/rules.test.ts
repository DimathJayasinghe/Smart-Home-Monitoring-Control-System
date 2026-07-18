// tests/rules.test.ts
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'smart-home-mad-project',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

describe('firestore.rules', () => {
  it('denies reads to an unauthenticated client', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      unauthedDb.doc('households/demo-household/floors/floor-1').get()
    );
  });

  it('allows reads to an authenticated client', async () => {
    const authedDb = testEnv.authenticatedContext('user-1').firestore();
    await assertSucceeds(
      authedDb.doc('households/demo-household/floors/floor-1').get()
    );
  });

  it('denies writes to an unauthenticated client', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      unauthedDb.doc('households/demo-household/floors/floor-1').set({ name: 'Hacked' })
    );
  });

  it('allows writes to an authenticated client', async () => {
    const authedDb = testEnv.authenticatedContext('user-1').firestore();
    await assertSucceeds(
      authedDb.doc('households/demo-household/floors/floor-1').set({ name: 'Ground Floor' })
    );
  });

  it('allows an authenticated client to read the household document itself', async () => {
    const authedDb = testEnv.authenticatedContext('user-1').firestore();
    await assertSucceeds(
      authedDb.doc('households/demo-household').get()
    );
  });
});

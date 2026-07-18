import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

export async function ensureSignedIn(): Promise<void> {
  try {
    await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
  } catch {
    try {
      await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    } catch {
      // Another integration test file's beforeAll created the user between
      // our sign-in attempt and this create attempt. Retry sign-in instead
      // of surfacing the create failure.
      await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    }
  }
}

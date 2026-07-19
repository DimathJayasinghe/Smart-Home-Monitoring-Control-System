import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

// Seeds the Auth emulator with the demo account LoginScreen signs in as
// (VITE_DEMO_EMAIL/PASSWORD), so its real sign-in flow has a user to
// authenticate against. Distinct from ensureSignedIn(), which signs the
// test itself in as an unrelated test@example.com user for fixture writes.
export async function ensureDemoUserExists(): Promise<void> {
  const email = import.meta.env.VITE_DEMO_EMAIL as string;
  const password = import.meta.env.VITE_DEMO_PASSWORD as string;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch {
    // already exists from a prior run in this same emulator session — fine
  }
}

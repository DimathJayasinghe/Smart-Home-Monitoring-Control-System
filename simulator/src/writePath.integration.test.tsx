// simulator/src/writePath.integration.test.tsx
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from './firebase';
import App from './App';

async function ensureDemoUserExists() {
  const email = import.meta.env.VITE_DEMO_EMAIL as string;
  const password = import.meta.env.VITE_DEMO_PASSWORD as string;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch {
    // already exists from a prior run in this same emulator session — fine
  }
}

describe('end-to-end write path', () => {
  beforeAll(async () => {
    await ensureDemoUserExists();

    // Sign in (as whichever account) so the fixture writes below satisfy the
    // `request.auth != null` Firestore rule, regardless of which prior
    // integration test file last touched the auth emulator's session state.
    const email = import.meta.env.VITE_DEMO_EMAIL as string;
    const password = import.meta.env.VITE_DEMO_PASSWORD as string;
    await signInWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, 'households/demo-household/floors/wp-floor-1'), {
      name: 'WP Floor', gridRows: 8, gridCols: 8, backgroundImageUrl: '', order: 0,
    });
    await setDoc(doc(db, 'households/demo-household/floors/wp-floor-1/devices/wp-dev-1'), {
      type: 'outlet', name: 'WP Test Outlet', row: 0, col: 0, status: 'OFF',
    });

    // Sign out before rendering `App` so `LoginScreen`'s own demo-user
    // sign-in effect actually runs, same as it does in production.
    await signOut(auth);
  });

  afterAll(async () => {
    await deleteDoc(doc(db, 'households/demo-household/floors/wp-floor-1/devices/wp-dev-1'));
    await deleteDoc(doc(db, 'households/demo-household/floors/wp-floor-1'));
  });

  it('clicking ON in the rendered app actually flips the device in Firestore', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => expect(screen.getByText('WP Test Outlet')).toBeInTheDocument());

    const card = screen.getByText('WP Test Outlet').closest('div')!;
    const onButton = Array.from(card.parentElement!.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'ON'
    )!;
    await user.click(onButton);

    await waitFor(async () => {
      const snap = await getDoc(doc(db, 'households/demo-household/floors/wp-floor-1/devices/wp-dev-1'));
      expect(snap.data()?.status).toBe('ON');
    });
  });
});

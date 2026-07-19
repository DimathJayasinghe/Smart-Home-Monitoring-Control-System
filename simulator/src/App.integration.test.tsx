// simulator/src/App.integration.test.tsx
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
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

describe('App', () => {
  beforeAll(async () => {
    await ensureDemoUserExists();

    // Sign in (as whichever account) so the fixture writes below satisfy the
    // `request.auth != null` Firestore rule, regardless of which prior
    // integration test file last touched the auth emulator's session state.
    const email = import.meta.env.VITE_DEMO_EMAIL as string;
    const password = import.meta.env.VITE_DEMO_PASSWORD as string;
    await signInWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, 'households/demo-household/floors/app-floor-1'), {
      name: 'App Floor One', gridRows: 8, gridCols: 8, backgroundImageUrl: '', order: 0,
    });
    await setDoc(doc(db, 'households/demo-household/floors/app-floor-1/devices/app-dev-1'), {
      type: 'outlet', name: 'App Device One', row: 0, col: 0, status: 'OFF',
    });
    await setDoc(doc(db, 'households/demo-household/floors/app-floor-2'), {
      name: 'App Floor Two', gridRows: 8, gridCols: 8, backgroundImageUrl: '', order: 1,
    });
    await setDoc(doc(db, 'households/demo-household/floors/app-floor-2/devices/app-dev-2'), {
      type: 'outlet', name: 'App Device Two', row: 0, col: 0, status: 'OFF',
    });

    // Sign out before rendering `App` so `LoginScreen`'s own demo-user
    // sign-in effect actually runs, same as it does in production.
    await signOut(auth);
  });

  afterAll(async () => {
    await deleteDoc(doc(db, 'households/demo-household/floors/app-floor-1/devices/app-dev-1'));
    await deleteDoc(doc(db, 'households/demo-household/floors/app-floor-1'));
    await deleteDoc(doc(db, 'households/demo-household/floors/app-floor-2/devices/app-dev-2'));
    await deleteDoc(doc(db, 'households/demo-household/floors/app-floor-2'));
  });

  it('signs in, shows the first floor devices, and switches floors on tab click', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => expect(screen.getByText('App Device One')).toBeInTheDocument());
    expect(screen.queryByText('App Device Two')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'App Floor Two' }));

    await waitFor(() => expect(screen.getByText('App Device Two')).toBeInTheDocument());
    expect(screen.queryByText('App Device One')).not.toBeInTheDocument();
  });
});

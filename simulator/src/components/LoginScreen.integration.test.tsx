// simulator/src/components/LoginScreen.integration.test.tsx
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { LoginScreen } from './LoginScreen';

async function ensureDemoUserExists() {
  const email = import.meta.env.VITE_DEMO_EMAIL as string;
  const password = import.meta.env.VITE_DEMO_PASSWORD as string;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch {
    // already exists from a prior run in this same emulator session — fine
  }
}

describe('LoginScreen', () => {
  beforeAll(async () => {
    await ensureDemoUserExists();
    if (auth.currentUser) await signOut(auth);
  });

  beforeEach(async () => {
    if (auth.currentUser) await signOut(auth);
  });

  it('shows a signing-in message, then renders children once authenticated', async () => {
    render(
      <LoginScreen>
        <div>Signed In Content</div>
      </LoginScreen>
    );

    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Signed In Content')).toBeInTheDocument());
  });

  it('shows an inline error if sign-in fails', async () => {
    vi.stubEnv('VITE_DEMO_EMAIL', 'wrong@example.com');
    vi.stubEnv('VITE_DEMO_PASSWORD', 'wrong-password');

    render(
      <LoginScreen>
        <div>Signed In Content</div>
      </LoginScreen>
    );

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText('Signed In Content')).not.toBeInTheDocument();

    vi.unstubAllEnvs();
  });
});

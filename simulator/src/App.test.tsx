import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

// App now renders behind the LoginScreen auth gate (Task 6), which requires
// a live Firebase Auth emulator to resolve sign-in and reveal the title.
// This unit test runs without the emulator, so it only asserts the
// synchronous initial render (the auth gate's "Signing in..." state).
// The full authenticated render (title appears) is covered by
// LoginScreen.integration.test.tsx against the real emulator.
describe('App', () => {
  it('renders the auth gate on initial mount', () => {
    render(<App />);
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });
});

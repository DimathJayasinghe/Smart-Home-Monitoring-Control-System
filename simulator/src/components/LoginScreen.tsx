import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, type User } from 'firebase/auth';
import { auth } from '../firebase';

export function LoginScreen({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) return;

    const email = import.meta.env.VITE_DEMO_EMAIL as string;
    const password = import.meta.env.VITE_DEMO_PASSWORD as string;

    signInWithEmailAndPassword(auth, email, password).catch((err: Error) => {
      setError(err.message);
    });
  }, [user]);

  if (error) {
    return <div role="alert">Sign-in failed: {error}</div>;
  }

  if (!user) {
    return <div>Signing in...</div>;
  }

  return <>{children}</>;
}

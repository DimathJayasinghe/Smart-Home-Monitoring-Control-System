# Smart Home Simulator

React web hardware simulator for the Smart Home Monitoring & Control System — a stand-in for
the physical devices, reading and writing the same Firestore schema the backend uses.

## Setup

```bash
npm install
cp .env.example .env   # fill in real values, never commit .env
```

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build (`dist/`)
- `npm run test:unit` — component tests, no emulator required
- `npm run test:integration` — hook/context/auth/write-path tests against the real Firestore/Auth emulator

## Integration test conventions

All `*.integration.test.{ts,tsx}` files share **one Firestore/Auth emulator instance** for the
whole `emulators:exec` run (`npm run test:integration`), not a fresh instance per file. Three
rules keep that safe:

1. **Every fixture ID needs a file-unique prefix.** Firestore paths are shared across every
   integration test file in the run — a bare `floor-1` in two files collides. Existing prefixes:
   `floor-1`/`floor-2` (`useFloors`), `floor-x` (`useDevices`), `ctx-floor-*` (`FirestoreContext`),
   `app-floor-*` (`App`), `wp-floor-*` (`writePath`). Pick your own prefix for new files.
2. **Clean up any real floor/device doc you create, in `afterAll`, child docs before parents.**
   `useFloors` and `FirestoreContext`'s tests query `households/demo-household/floors` (or a
   floor's `devices` subcollection) without per-test scoping — a doc left behind by one file can
   surface in another file's assertions. `deviceWrites.integration.test.ts` for the actual
   pattern, or any file with `afterAll`.
3. **`vitest.integration.config.ts` sets `fileParallelism: false` on purpose.** Integration files
   run one at a time, not in parallel workers — this was added after two files' `beforeAll` hooks
   raced to create the same test-auth-emulator user and intermittently failed. Don't remove it
   without re-solving that race some other way.

Two distinct test users exist, for two distinct reasons — don't mix them up:

- `ensureSignedIn()` (`src/testUtils/ensureSignedIn.ts`, user `test@example.com`) — signs the
  *test itself* in so its own `setDoc`/`deleteDoc` fixture calls satisfy `firestore.rules`
  (`request.auth != null`). Used by tests that only need to read/write fixtures, not exercise
  `LoginScreen`.
- `ensureDemoUserExists()` (`src/testUtils/ensureDemoUser.ts`) — seeds the Auth emulator with the
  *demo* account (`VITE_DEMO_EMAIL`/`VITE_DEMO_PASSWORD`) that `LoginScreen` itself signs in as
  when `<App />` renders. Tests that render the real `App` sign in as this account to seed
  fixtures, then explicitly `signOut` before `render(<App />)` — otherwise `LoginScreen`'s
  sign-in effect sees an already-authenticated user and never actually runs, silently skipping
  the auth flow the test is meant to exercise. See `App.integration.test.tsx` for the pattern.

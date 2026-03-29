import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator, type User } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

declare global {
  // eslint-disable-next-line no-var
  var __FIREBASE_EMULATORS_CONNECTED__: boolean | undefined;
}

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'asia-east1');

export function waitForAuth(): Promise<User> {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }
  return signInAnonymously(auth).then(
    () =>
      new Promise<User>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            unsubscribe();
            resolve(user);
          }
        });
      })
  );
}

if (import.meta.env.DEV && !globalThis.__FIREBASE_EMULATORS_CONNECTED__) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  globalThis.__FIREBASE_EMULATORS_CONNECTED__ = true;
}

import type { User, UserCredential } from 'firebase/auth';

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

type DemoCredential = {
  user: {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    getIdToken: () => Promise<string>;
  };
};

let currentFirebaseUser: User | null = null;

function firebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

async function authInstance() {
  const { getApp, getApps, initializeApp } = await import('firebase/app');
  const { browserLocalPersistence, getAuth, setPersistence } = await import('firebase/auth');
  const config = firebaseConfig();
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    throw new Error('Firebase Web não configurado. Preencha VITE_FIREBASE_* no apps/web/.env.');
  }
  const app = getApps().length ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  await setPersistence(auth, browserLocalPersistence);
  return auth;
}

export async function googleSignIn(): Promise<UserCredential | DemoCredential> {
  if (isDemoMode) {
    return {
      user: {
        uid: 'demo-user',
        displayName: 'Talisson Cleofas',
        email: 'talisson@example.com',
        photoURL: '',
        getIdToken: async () => 'demo-token',
      },
    };
  }
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(await authInstance(), provider);
}

export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  if (isDemoMode) return 'demo-token';
  if (currentFirebaseUser) return currentFirebaseUser.getIdToken(forceRefresh);
  const auth = await authInstance();
  return auth.currentUser ? auth.currentUser.getIdToken(forceRefresh) : null;
}

export async function observeAuthState(callback: (ready: boolean, hasUser: boolean) => void) {
  if (isDemoMode) {
    callback(true, Boolean(localStorage.getItem('colo:user')));
    return () => undefined;
  }
  const { onAuthStateChanged } = await import('firebase/auth');
  const auth = await authInstance();
  return onAuthStateChanged(auth, (user) => {
    currentFirebaseUser = user;
    callback(true, Boolean(user));
  });
}

export async function googleSignOut(): Promise<void> {
  if (isDemoMode) return;
  const { signOut } = await import('firebase/auth');
  await signOut(await authInstance());
  currentFirebaseUser = null;
}

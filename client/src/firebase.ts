import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCQEnQHIg8-f5oElWC-N-xeSNe7E2TTMRY',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'fusion-high-app.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'fusion-high-app',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'fusion-high-app.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '825969502693',
  appId: env.VITE_FIREBASE_APP_ID || '1:825969502693:web:0f41ab1d92631526'
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let auth: Auth | null = null;

const runtimeMode = String(env.MODE || env.NODE_ENV || '');
const isStagingMode = runtimeMode === 'staging' || String(env.VITE_STAGING_MODE || '') === 'true';

if (runtimeMode === 'test' && firebaseConfig.projectId === 'fusion-high-app' && env.VITE_FIREBASE_EMULATOR !== 'true') {
  throw new Error('Refusing to initialise the production Firebase project fusion-high-app during tests.');
}

if (isStagingMode && env.VITE_FIREBASE_EMULATOR !== 'true' && (!firebaseConfig.projectId || firebaseConfig.projectId === 'fusion-high-app' || firebaseConfig.projectId === 'geleza-staging-disabled')) {
  console.info('[FIREBASE STAGING GUARD] Production Firebase project fusion-high-app is disabled in staging mode.');
} else {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
  } catch (err: any) {
    console.warn('[FIREBASE CLIENT INIT NOTICE]:', err?.message || err);
  }
}

export { db, storage, auth };
export default app;

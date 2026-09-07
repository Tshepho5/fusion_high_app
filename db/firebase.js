const { initializeApp, getApps, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
const fs = require('fs');

let serviceAccount = null;

// Check for raw JSON string in environment variable (ideal for cloud hosts like Render)
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    console.log('[FIREBASE] Loaded service account credentials from FIREBASE_SERVICE_ACCOUNT_JSON environment variable.');
  } catch (err) {
    console.warn('[FIREBASE] Could not parse FIREBASE_SERVICE_ACCOUNT_JSON:', err.message);
  }
}

// Search for key file in root directory or custom path if not loaded from env
if (!serviceAccount) {
  const candidatePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    path.join(__dirname, '..', 'fusion-high-app-firebase-adminsdk-fbsvc-aad97ebe37.json'),
    path.join(__dirname, '..', 'serviceAccountKey.json'),
    path.join(__dirname, 'serviceAccountKey.json')
  ].filter(Boolean);

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        serviceAccount = require(p);
        console.log(`[FIREBASE] Loaded service account credentials from: ${path.basename(p)}`);
        break;
      } catch (err) {
        console.warn(`[FIREBASE] Failed to load key file at ${p}:`, err.message);
      }
    }
  }
}

let app;

if (!getApps().length) {
  try {
    const config = {
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'fusion-high-app.firebasestorage.app'
    };

    if (serviceAccount) {
      config.credential = cert(serviceAccount);
      config.projectId = serviceAccount.project_id || 'fusion-high-app';
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      config.credential = cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'fusion-high-app',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      });
    } else {
      config.credential = applicationDefault();
      config.projectId = 'fusion-high-app';
    }

    app = initializeApp(config);
    console.log('[FIREBASE] Admin SDK initialized successfully for project: fusion-high-app');
  } catch (err) {
    console.error('[FIREBASE] Initialization error:', err.message);
  }
} else {
  app = getApps()[0];
}

const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;
const storage = app ? getStorage(app) : null;
const bucket = storage ? storage.bucket() : null;

module.exports = {
  app,
  db,
  firestore: db,
  auth,
  storage,
  bucket
};

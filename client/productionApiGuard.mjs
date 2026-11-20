export const PRODUCTION_API_URL = 'https://fusion-high-backend.onrender.com';
export const PRODUCTION_FIREBASE_PROJECT = 'fusion-high-app';

export function assertProductionApiConfig(env) {
  const flag = String(env?.VITE_USE_LOCAL_BACKEND ?? '').trim();
  const apiUrl = String(env?.VITE_API_URL ?? '').trim();
  const problems = [];
  if (flag === 'true') {
    problems.push('VITE_USE_LOCAL_BACKEND=true would send authentication to the hosting origin');
  }
  if (apiUrl && (apiUrl !== PRODUCTION_API_URL || /localhost|127\.0\.0\.1/i.test(apiUrl))) {
    problems.push(`VITE_API_URL must be unset or ${PRODUCTION_API_URL}`);
  }
  if (problems.length > 0) {
    throw new Error(`Production build rejected: ${problems.join('; ')}.`);
  }
}

export function assertStagingApiConfig(env) {
  const apiUrl = String(env?.VITE_API_URL ?? '').trim();
  const firebaseProject = String(env?.VITE_FIREBASE_PROJECT_ID ?? '').trim();
  const emulator = String(env?.VITE_FIREBASE_EMULATOR ?? '').trim() === 'true';
  const problems = [];
  if (apiUrl && (apiUrl.startsWith(PRODUCTION_API_URL) || !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(apiUrl))) {
    problems.push(`VITE_API_URL must be unset or a loopback staging URL (got "${apiUrl}")`);
  }
  if (!emulator && firebaseProject === PRODUCTION_FIREBASE_PROJECT) {
    problems.push(`VITE_FIREBASE_PROJECT_ID cannot be ${PRODUCTION_FIREBASE_PROJECT} in staging mode`);
  }
  if (problems.length > 0) {
    throw new Error(`Staging build/dev rejected: ${problems.join('; ')}.`);
  }
}

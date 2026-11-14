export const PRODUCTION_API_URL = 'https://fusion-high-backend.onrender.com';

export function assertProductionApiConfig(env) {
  const flag = String(env?.VITE_USE_LOCAL_BACKEND ?? '').trim();
  const apiUrl = String(env?.VITE_API_URL ?? '').trim();
  const problems = [];
  if (flag === 'true') {
    problems.push('VITE_USE_LOCAL_BACKEND=true would send authentication to the hosting origin');
  }
  if (apiUrl !== PRODUCTION_API_URL || /localhost|127\.0\.0\.1/i.test(apiUrl)) {
    problems.push(`VITE_API_URL must be ${PRODUCTION_API_URL}`);
  }
  if (problems.length > 0) {
    throw new Error(`Production build rejected: ${problems.join('; ')}.`);
  }
}

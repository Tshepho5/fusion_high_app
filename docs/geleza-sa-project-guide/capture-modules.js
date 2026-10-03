/**
 * Capture role module screenshots for the project PDF.
 * Requires API :4000 and Vite :5173 running.
 * Run: node docs/geleza-sa-project-guide/capture-modules.js
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = __dirname;
const SHOTS = path.join(ROOT, 'screenshots');
const PLAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'module-capture-plan.json'), 'utf8'));
const BASE = process.env.GSA_BASE || 'http://localhost:3000';
const API = process.env.GSA_API || 'http://localhost:4000';
const PASSWORD = process.env.GSA_PASSWORD || 'password123';
const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ONLY = (process.env.GSA_ROLES || 'learner,parent,teacher,principal')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

fs.mkdirSync(SHOTS, { recursive: true });

async function waitForServer(url, label, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok || res.status < 500) {
        console.log(`[ok] ${label}`);
        return;
      }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${label} not reachable at ${url}`);
}

async function loginViaApi(page, email) {
  // Prefer Vite proxy (same-origin) so cookies + CORS are not an issue.
  const result = await page.evaluate(
    async ({ email, password }) => {
      localStorage.setItem('fusion_terms_accepted_v2_1', '1');
      localStorage.setItem('app_theme', 'dark');
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: email, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, status: res.status, data };
      }
      const token = data.token || data.accessToken || data.jwt;
      const user = data.user || null;
      const role = (data.role || user?.role || '').toLowerCase();
      if (token) localStorage.setItem('token', token);
      if (user) localStorage.setItem('user', JSON.stringify(user));
      if (role) localStorage.setItem('userRole', role);
      if (data.school) {
        localStorage.setItem('active_school_profile', JSON.stringify(data.school));
        if (data.school.id != null) localStorage.setItem('active_school_id', String(data.school.id));
      } else if (data.school_id || user?.school_id) {
        localStorage.setItem('active_school_id', String(data.school_id || user.school_id));
      }
      return { ok: true, role, hasToken: !!token };
    },
    { email, password: PASSWORD }
  );
  if (!result.ok) {
    // Fallback: Node-side login against API, then inject storage.
    const res = await fetch(`${API}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email, password: PASSWORD })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Login failed for ${email}: ${JSON.stringify({ page: result, api: { status: res.status, data } })}`);
    }
    await page.evaluate((payload) => {
      localStorage.setItem('fusion_terms_accepted_v2_1', '1');
      localStorage.setItem('app_theme', 'dark');
      if (payload.token) localStorage.setItem('token', payload.token);
      if (payload.user) localStorage.setItem('user', JSON.stringify(payload.user));
      const role = (payload.role || payload.user?.role || '').toLowerCase();
      if (role) localStorage.setItem('userRole', role);
      if (payload.school) {
        localStorage.setItem('active_school_profile', JSON.stringify(payload.school));
        if (payload.school.id != null) localStorage.setItem('active_school_id', String(payload.school.id));
      }
    }, data);
    console.log(`  logged in ${email} via API fallback (${data.role || data.user?.role})`);
    return { ok: true, role: data.role || data.user?.role };
  }
  console.log(`  logged in ${email} (${result.role || 'role?'})`);
  return result;
}

async function dismissOverlays(page) {
  await page.evaluate(() => {
    localStorage.setItem('fusion_terms_accepted_v2_1', '1');
    // close common modals if present
    document.querySelectorAll('[aria-label="Close"], button').forEach((btn) => {
      const t = (btn.textContent || '').trim().toLowerCase();
      if (t === 'accept' || t === 'i agree' || t === 'continue' || t === 'got it' || t === 'stay') {
        try {
          btn.click();
        } catch (_) {}
      }
    });
  }).catch(() => {});
}

async function captureModule(page, dashboard, mod) {
  const url = `${BASE}${dashboard}?tab=${encodeURIComponent(mod.tab)}`;
  console.log(`  → ${mod.file}  ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(async () => {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  });
  await new Promise((r) => setTimeout(r, 2200));
  await dismissOverlays(page);
  await new Promise((r) => setTimeout(r, 600));
  const out = path.join(SHOTS, mod.file);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`    saved ${out}`);
}

async function captureRole(browser, roleKey, cfg) {
  console.log(`\n=== ${roleKey.toUpperCase()} ===`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await loginViaApi(page, cfg.email);
  await page.goto(`${BASE}${cfg.dashboard}`, { waitUntil: 'networkidle2', timeout: 60000 }).catch(async () => {
    await page.goto(`${BASE}${cfg.dashboard}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  });
  await new Promise((r) => setTimeout(r, 2500));
  await dismissOverlays(page);

  for (const mod of cfg.modules) {
    try {
      await captureModule(page, cfg.dashboard, mod);
    } catch (err) {
      console.error(`    FAIL ${mod.file}: ${err.message}`);
    }
  }
  await page.close();
}

async function main() {
  await waitForServer(`${API}/api/health`, 'API').catch(async () => {
    // health may not exist — try root
    await waitForServer(API, 'API root');
  });
  await waitForServer(BASE, 'Vite');

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: null,
    args: ['--window-size=1440,900', '--disable-dev-shm-usage']
  });

  try {
    for (const roleKey of ONLY) {
      const cfg = PLAN[roleKey];
      if (!cfg) {
        console.warn(`Unknown role ${roleKey}`);
        continue;
      }
      await captureRole(browser, roleKey, cfg);
    }
  } finally {
    await browser.close();
  }
  console.log('\nDone. Screenshots in', SHOTS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

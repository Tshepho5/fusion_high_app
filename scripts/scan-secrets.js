/**
 * Lightweight secrets hygiene scan for CI / pre-commit.
 * Fails if tracked files look like they contain private keys or service accounts.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DANGEROUS_NAME = /(firebase-adminsdk|\.pem$|id_rsa$|credentials\.json$|\.env$|\.env\.(local|production)$)/i;
const CONTENT_PATTERNS = [
  /BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY/,
  /"type"\s*:\s*"service_account"/,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[A-Za-z0-9]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/
];

function listTrackedFiles() {
  try {
    const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
    return out.split(/\r?\n/).filter(Boolean);
  } catch {
    // Fallback: shallow walk excluding node_modules
    const files = [];
    const walk = (dir) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'dist' || ent.name === 'uploads') continue;
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p);
        else files.push(path.relative(ROOT, p).replace(/\\/g, '/'));
      }
    };
    walk(ROOT);
    return files;
  }
}

const failures = [];
for (const rel of listTrackedFiles()) {
  if (rel.startsWith('scripts/scan-secrets.js')) continue;
  if (DANGEROUS_NAME.test(rel)) {
    failures.push(`Dangerous filename tracked: ${rel}`);
    continue;
  }
  const abs = path.join(ROOT, rel);
  let stat;
  try {
    stat = fs.statSync(abs);
  } catch {
    continue;
  }
  if (!stat.isFile() || stat.size > 1_500_000) continue;
  if (!/\.(js|ts|tsx|json|md|yml|yaml|env|txt|sh|ps1)$/i.test(rel)) continue;
  let text;
  try {
    text = fs.readFileSync(abs, 'utf8');
  } catch {
    continue;
  }
  for (const re of CONTENT_PATTERNS) {
    if (re.test(text)) {
      failures.push(`Possible secret content in ${rel} (matched ${re})`);
      break;
    }
  }
}

if (failures.length) {
  console.error('Secrets scan FAILED:');
  failures.forEach((f) => console.error(' -', f));
  process.exit(1);
}
console.log('Secrets scan OK — no obvious credentials in tracked files.');

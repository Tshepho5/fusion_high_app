const fs = require('fs');

function replaceUrl(file, pattern, replacement) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(pattern, replacement);
  if (after === before) {
    console.log('NO_CHANGE', file);
    return;
  }
  if (/postgres(?:ql)?:\/\//.test(after)) {
    console.log('STILL_HAS_URL', file);
  }
  fs.writeFileSync(file, after);
  console.log('updated', file);
}

replaceUrl(
  'db/seed_cloud_db.js',
  /const connectionString = process\.env\.DATABASE_URL \|\| '[^']+';/,
  `const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Set DATABASE_URL before running this script.');
  process.exit(1);
}`
);

replaceUrl(
  'db/sync_local_to_cloud.js',
  /connectionString: '[^']+',/,
  `connectionString: process.env.DATABASE_URL,`
);

replaceUrl(
  'scripts/migrate_supabase_presence.js',
  /const supabaseConnectionString = process\.env\.SUPABASE_DATABASE_URL \|\|[\s\S]*?;/,
  `const supabaseConnectionString = process.env.SUPABASE_DATABASE_URL;
if (!supabaseConnectionString) {
  console.error('Set SUPABASE_DATABASE_URL before running this script.');
  process.exit(1);
}`
);

fs.writeFileSync('scripts/fix_cloud_passwords.js', `require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL before running this script. Passwords are not stored in this file.');
  process.exit(1);
}

console.error('This script no longer resets account passwords.');
process.exit(1);
`);
console.log('updated scripts/fix_cloud_passwords.js');

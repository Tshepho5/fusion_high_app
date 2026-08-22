const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let errors = 0;
function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') checkDir(full);
    } else if (f.endsWith('.js')) {
      try {
        execSync(`node -c "${full}"`);
      } catch (err) {
        console.error('SYNTAX ERROR IN:', full);
        errors++;
      }
    }
  }
}

checkDir(path.join(__dirname, '..', 'public', 'src'));
checkDir(path.join(__dirname, '..', 'db'));
execSync('node -c server.js', { cwd: path.join(__dirname, '..') });

if (errors === 0) {
  console.log('✅ ALL BACKEND JAVASCRIPT FILES COMPILE WITH 0 SYNTAX ERRORS!');
} else {
  console.error(`❌ Found ${errors} syntax errors.`);
  process.exit(1);
}

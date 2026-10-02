require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL before running this script. Passwords are not stored in this file.');
  process.exit(1);
}

console.error('This script no longer resets account passwords.');
process.exit(1);

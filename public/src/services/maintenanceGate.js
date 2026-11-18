const crypto = require('crypto');

function maintenanceAuthorized(headerValue) {
  const expected = String(process.env.MAINTENANCE_TOKEN || '').trim();
  const provided = String(headerValue || '').trim();
  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  const providedHash = crypto.createHash('sha256').update(provided).digest();
  const matches = crypto.timingSafeEqual(expectedHash, providedHash);
  return expected.length >= 24 && matches;
}

module.exports = { maintenanceAuthorized };

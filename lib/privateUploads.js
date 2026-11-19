'use strict';

const PRIVATE_UPLOADS = new Set(['applications', 'pfp', 'messages', 'assignments', 'submissions', 'textbooks']);

function privateUploadFolder(requestPath) {
  let rel = String(requestPath || '');
  try {
    rel = decodeURIComponent(rel);
  } catch (_) {
    return 'invalid';
  }
  if (rel.includes('\0') || rel.includes('..') || rel.includes('\\')) return 'invalid';
  const top = rel.split('/').filter(Boolean)[0];
  if (PRIVATE_UPLOADS.has(top)) return top;
  return null;
}

module.exports = { privateUploadFolder };

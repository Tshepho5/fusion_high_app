'use strict';

const crypto = require('crypto');
const fs = require('fs');
const db = require('../../../db/db');

function checksumOf(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  } catch (_) {
    return null;
  }
}

async function registerDocument(entry) {
  try {
    await db.query(
      `INSERT INTO stored_files
        (school_id, category, original_name, storage_path, mime_type, size_bytes, checksum, uploaded_by, academic_year, child_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        entry.schoolId || null,
        entry.category,
        String(entry.originalName || 'document').slice(0, 255),
        entry.storagePath,
        entry.mimeType || null,
        Number.isInteger(entry.sizeBytes) ? entry.sizeBytes : null,
        entry.checksum || null,
        entry.uploadedBy || null,
        entry.academicYear || null,
        entry.childId || null
      ]
    );
  } catch (err) {
    console.warn('[DOCUMENTS] register skipped:', err.message);
  }
}

module.exports = { registerDocument, checksumOf };

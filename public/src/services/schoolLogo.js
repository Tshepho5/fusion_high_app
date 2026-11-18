const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const logoDirectory = path.join(process.cwd(), 'storage', 'school-logos');
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 4096;
const STORED_NAME = /^[0-9]+-[a-f0-9]{32}\.(png|jpe?g|webp)$/;

function ensureLogoDirectory() {
  if (!fs.existsSync(logoDirectory)) fs.mkdirSync(logoDirectory, { recursive: true });
}

function sniffLogo(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) return null;
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

function pngSize(buffer) {
  if (buffer.length < 24 || buffer.slice(12, 16).toString('ascii') !== 'IHDR') return null;
  if (!buffer.includes(Buffer.from('IEND'))) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegSize(buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      if (buffer[buffer.length - 2] !== 0xff || buffer[buffer.length - 1] !== 0xd9) return null;
      return { height, width };
    }
    offset += 2 + length;
  }
  return null;
}

function webpSize(buffer) {
  if (buffer.length < 30) return null;
  const chunk = buffer.slice(12, 16).toString('ascii');
  if (chunk === 'VP8X' && buffer.length >= 30) {
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return { width, height };
  }
  if (chunk === 'VP8 ' && buffer.length >= 30) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  return null;
}

function inspectLogo(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { ok: false, error: 'Choose a school logo before submitting.' };
  }
  if (buffer.length > MAX_LOGO_BYTES) {
    return { ok: false, error: 'The school logo must be 2 MB or smaller.' };
  }
  const kind = sniffLogo(buffer);
  if (!kind) {
    return { ok: false, error: 'The school logo must be a PNG, JPEG, or WebP image.' };
  }
  const size = kind === 'png' ? pngSize(buffer) : kind === 'jpeg' ? jpegSize(buffer) : webpSize(buffer);
  if (!size || !size.width || !size.height) {
    return { ok: false, error: 'That image could not be read. Use a PNG, JPEG, or WebP logo.' };
  }
  if (size.width > MAX_DIMENSION || size.height > MAX_DIMENSION) {
    return { ok: false, error: 'The school logo must be 4096 pixels or smaller on each side.' };
  }
  return { ok: true, kind, width: size.width, height: size.height };
}

function extensionFor(kind) {
  if (kind === 'png') return 'png';
  if (kind === 'webp') return 'webp';
  return 'jpg';
}

function contentTypeFor(name) {
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function safeLogoName(name) {
  const base = path.basename(String(name || ''));
  return STORED_NAME.test(base) ? base : null;
}

function logoPublicPath(storedName) {
  const safe = safeLogoName(storedName);
  return safe ? `/api/schools/logos/${safe}` : null;
}

function writeLogo(buffer, kind) {
  const inspected = inspectLogo(buffer);
  if (!inspected.ok) {
    const error = new Error(inspected.error);
    error.status = 400;
    throw error;
  }
  ensureLogoDirectory();
  const storedName = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}.${extensionFor(kind || inspected.kind)}`;
  fs.writeFileSync(path.join(logoDirectory, storedName), buffer);
  return storedName;
}

function logoFilePath(storedName) {
  const safe = safeLogoName(storedName);
  if (!safe) return null;
  const full = path.join(logoDirectory, safe);
  return fs.existsSync(full) ? full : null;
}

function removeLogo(storedName) {
  const full = logoFilePath(storedName);
  if (!full) return;
  fs.unlinkSync(full);
}

module.exports = {
  MAX_LOGO_BYTES,
  logoDirectory,
  inspectLogo,
  contentTypeFor,
  safeLogoName,
  logoPublicPath,
  writeLogo,
  logoFilePath,
  removeLogo
};

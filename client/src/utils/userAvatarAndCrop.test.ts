import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatUserDisplayName,
  getUserInitials,
  resolveRawAvatarPath,
} from './userAvatarModel.ts';
import {
  MAX_PROFILE_IMAGE_BYTES,
  clampCropOffset,
  computeSourceCropRect,
  validateProfileImageFile,
} from './profilePhotoCrop.ts';

describe('user avatar identity model', () => {
  test('generates initials strictly from the displayed user name without duplicating surname', () => {
    assert.equal(formatUserDisplayName({ full_name: 'Bontle', surname: 'Mothopeng' }), 'Bontle Mothopeng');
    assert.equal(formatUserDisplayName({ full_name: 'Bontle Mothopeng', surname: 'Mothopeng' }), 'Bontle Mothopeng');
    assert.equal(getUserInitials({ full_name: 'Bontle', surname: 'Mothopeng' }), 'BM');
    assert.equal(getUserInitials({ full_name: 'Lerato', surname: 'Ndlovu' }), 'LN');
    assert.equal(getUserInitials({ full_name: 'Kagiso' }), 'KA');
  });

  test('resolves profile_picture or profile_picture_path per user and returns empty string when absent', () => {
    assert.equal(resolveRawAvatarPath({ id: 1, profile_picture: 'data:image/jpeg;base64,abc' }), 'data:image/jpeg;base64,abc');
    assert.equal(resolveRawAvatarPath({ id: 2, profile_picture: null, profile_picture_path: '/uploads/pfp/2.jpg' }), '/uploads/pfp/2.jpg');
    assert.equal(resolveRawAvatarPath({ id: 3, profile_picture: null, profile_picture_path: null }), '');
  });
});

describe('profile photo crop validation and geometry', () => {
  test('accepts JPEG, PNG, and WebP within 5 MB and rejects unsupported or oversized files', () => {
    assert.equal(validateProfileImageFile({ type: 'image/jpeg', size: 120_000 }).valid, true);
    assert.equal(validateProfileImageFile({ type: 'image/png', size: 500_000 }).valid, true);
    assert.equal(validateProfileImageFile({ type: 'image/webp', size: 250_000 }).valid, true);

    const svg = validateProfileImageFile({ type: 'image/svg+xml', size: 1024 });
    assert.equal(svg.valid, false);
    assert.match(svg.error || '', /Unsupported image format/);

    const pdf = validateProfileImageFile({ type: 'application/pdf', size: 1024 });
    assert.equal(pdf.valid, false);

    const oversized = validateProfileImageFile({ type: 'image/jpeg', size: MAX_PROFILE_IMAGE_BYTES + 1 });
    assert.equal(oversized.valid, false);
    assert.match(oversized.error || '', /5 MB/);

    const empty = validateProfileImageFile({ type: 'image/png', size: 0 });
    assert.equal(empty.valid, false);
  });

  test('clamps pan offset within image bounds and computes centered square crop rect', () => {
    const dims = { naturalWidth: 1200, naturalHeight: 800, viewportSize: 272, zoom: 1 };
    const centered = computeSourceCropRect({ x: 0, y: 0 }, dims);
    assert.equal(Math.round(centered.sw), 800);
    assert.equal(Math.round(centered.sh), 800);
    assert.equal(Math.round(centered.sx), 200);
    assert.equal(Math.round(centered.sy), 0);

    // Extreme pan gets clamped so crop never escapes image bounds
    const clamped = clampCropOffset({ x: 9999, y: -9999 }, dims);
    assert.equal(clamped.y, 0);
    const zoomed = computeSourceCropRect({ x: 0, y: 0 }, { ...dims, zoom: 2 });
    assert.equal(Math.round(zoomed.sw), 400);
    assert.equal(Math.round(zoomed.sh), 400);
  });
});

describe('local server vs live hosting environment separation', () => {
  test('built bundle served from http://localhost:4000 stays on local same-origin backend instead of production Render', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const apiSource = fs.readFileSync(path.resolve('src/services/api.ts'), 'utf8');
    const imageSource = fs.readFileSync(path.resolve('src/utils/imageUrl.ts'), 'utf8');
    const firebaseSource = fs.readFileSync(path.resolve('src/firebase.ts'), 'utf8');

    // Verify localhost loopback check runs BEFORE env.PROD fallback to Render
    const localIdx = apiSource.indexOf('if (onLocalHost)');
    const prodIdx = apiSource.indexOf('if (env.PROD)');
    assert.ok(localIdx > 0 && prodIdx > 0 && localIdx < prodIdx, 'api.ts must check onLocalHost before env.PROD');

    const imgLocalIdx = imageSource.indexOf("window.location.hostname === 'localhost'");
    const imgProdIdx = imageSource.indexOf('if (env.PROD)');
    assert.ok(imgLocalIdx > 0 && imgProdIdx > 0 && imgLocalIdx < imgProdIdx, 'imageUrl.ts must check localhost before env.PROD');

    assert.match(firebaseSource, /onLocalLoopback/, 'firebase.ts must block production Firebase on localhost/127.0.0.1');
  });
});

const { bucket } = require('../../../db/firebase');
const path = require('path');
const fs = require('fs');

/**
 * Service for managing file assets with Firebase Cloud Storage,
 * including seamless local-disk fallback if cloud bucket is not yet provisioned.
 */
class FirebaseStorageService {
  /**
   * Uploads an in-memory file buffer to Firebase Cloud Storage.
   * Gracefully falls back to local disk if cloud bucket is pending activation.
   * @param {Object} params
   * @param {Buffer} params.buffer - The file buffer.
   * @param {string} params.destination - Storage path (e.g. 'applications/APP-2026/id.pdf').
   * @param {string} params.contentType - MIME type.
   * @param {boolean} [params.isPublic=true]
   * @returns {Promise<{ url: string, path: string, storageType: 'cloud' | 'local' }>}
   */
  static async uploadBuffer({ buffer, destination, contentType, isPublic = true }) {
    const cleanPath = destination.replace(/^\/+/, '');

    if (bucket) {
      try {
        const file = bucket.file(cleanPath);
        await file.save(buffer, {
          metadata: {
            contentType: contentType || 'application/octet-stream',
            metadata: {
              uploadedAt: new Date().toISOString(),
              source: 'Fusion High School Management System'
            }
          },
          resumable: false
        });

        let publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURI(cleanPath)}`;

        if (isPublic) {
          try {
            await file.makePublic();
          } catch (_) {
            // Uniform bucket-level access uses direct URL
          }
        }

        return {
          url: publicUrl,
          path: cleanPath,
          storageType: 'cloud'
        };
      } catch (err) {
        console.warn(`[FIREBASE STORAGE] Cloud upload fallback to local disk (${err.message}).`);
      }
    }

    // Local fallback: save to uploads/
    const localTarget = path.join(process.cwd(), 'uploads', cleanPath);
    const localDir = path.dirname(localTarget);
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.writeFileSync(localTarget, buffer);

    return {
      url: `/uploads/${cleanPath.replace(/\\/g, '/')}`,
      path: localTarget,
      storageType: 'local'
    };
  }

  /**
   * Uploads a local file from disk.
   */
  static async uploadLocalFile({ localPath, destination, contentType, isPublic = true }) {
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local file not found at: ${localPath}`);
    }

    const buffer = fs.readFileSync(localPath);
    return await this.uploadBuffer({
      buffer,
      destination,
      contentType: contentType || 'application/octet-stream',
      isPublic
    });
  }

  /**
   * Deletes a file from Firebase Cloud Storage or local disk.
   */
  static async deleteFile(destination) {
    if (!destination) return false;
    const cleanPath = destination.replace(/^\/+/, '');

    if (bucket) {
      try {
        const file = bucket.file(cleanPath);
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
          return true;
        }
      } catch (_) {}
    }

    const localTarget = path.join(process.cwd(), 'uploads', cleanPath);
    if (fs.existsSync(localTarget)) {
      try {
        fs.unlinkSync(localTarget);
        return true;
      } catch (_) {}
    }

    return false;
  }
}

module.exports = FirebaseStorageService;

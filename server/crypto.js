// server/crypto.js – AES-256-GCM envelope encryption for OAuth tokens
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getMasterKey() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY or JWT_SECRET must be set to derive the token encryption key.'
    );
  }
  return crypto.createHash('sha256').update(String(secret)).digest(); // 32 bytes
}

/**
 * Encrypt a plaintext OAuth token.
 * Returns { ciphertext, iv, tag } as hex strings.
 */
export function encryptToken(plaintext) {
  if (!plaintext) return { ciphertext: null, iv: null, tag: null };

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypt a previously encrypted token.
 * - Missing iv/tag => legacy plaintext row (pre-encryption), returned as-is.
 * - Failed decryption => throws. Never silently return ciphertext as plaintext;
 *   a corrupt/foreign token must surface as an error so the account can be
 *   re-authorized instead of feeding garbage tokens to Google.
 */
export function decryptToken(ciphertext, iv, tag) {
  if (!ciphertext) return null;
  if (!iv || !tag) {
    // Legacy plaintext token stored before encryption was enabled
    return ciphertext;
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getMasterKey(),
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export { KEY_LENGTH };
export default { encryptToken, decryptToken, sha256 };

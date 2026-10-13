import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const KEY_PATH = path.resolve(process.cwd(), 'data', '.encryption_key');

// Derive or fetch 32-byte key
function getMasterKey(): Buffer {
  if (process.env.MASTER_ENCRYPTION_KEY && process.env.MASTER_ENCRYPTION_KEY.length >= 16) {
    return crypto.scryptSync(process.env.MASTER_ENCRYPTION_KEY, 'vendplus_salt_2026', 32);
  }

  // Fallback to persisted key file in data directory
  try {
    if (fs.existsSync(KEY_PATH)) {
      const stored = fs.readFileSync(KEY_PATH, 'utf-8').trim();
      return Buffer.from(stored, 'hex');
    }
  } catch {
    // ignore
  }

  const generatedKey = crypto.randomBytes(32);
  try {
    const dir = path.dirname(KEY_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(KEY_PATH, generatedKey.toString('hex'), { mode: 0o600 });
  } catch (err) {
    console.error('Failed to persist encryption key to disk:', err);
  }
  return generatedKey;
}

let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (!cachedKey) {
    cachedKey = getMasterKey();
  }
  return cachedKey;
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 */
export function encryptValue(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt ciphertext encrypted with encryptValue
 */
export function decryptValue(encryptedPayload: string): string {
  if (!encryptedPayload) return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    // Plaintext fallback if previously stored unencrypted
    return encryptedPayload;
  }
  const [ivHex, authTagHex, cipherHex] = parts;
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed, possible key rotation or invalid data:', err);
    return '';
  }
}

/**
 * Safely mask sensitive credentials for frontend/API responses.
 * Never outputs raw secret values.
 */
export function maskSecret(secret: string): string {
  if (!secret) return '';
  const len = secret.length;
  if (len <= 4) return '••••';
  const lastFour = secret.slice(-4);
  return `••••••••${lastFour}`;
}

/**
 * Sanitizes an integration config before sending to frontend,
 * ensuring no private tokens/secrets are exposed.
 */
export function sanitizeCredentials(credentials: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (!value) {
      sanitized[key] = '';
      continue;
    }
    const lowerKey = key.toLowerCase();
    const isSensitive =
      lowerKey.includes('secret') ||
      lowerKey.includes('key') ||
      lowerKey.includes('token') ||
      lowerKey.includes('pass') ||
      lowerKey.includes('cipher');

    if (isSensitive) {
      sanitized[key] = maskSecret(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

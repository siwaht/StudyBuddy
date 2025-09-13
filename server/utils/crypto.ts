import crypto from 'crypto';

// In production, use a secure key management service
// For development, we'll use a simple encryption method
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-characters';
const ALGORITHM = 'aes-256-cbc';

// Ensure key is 32 bytes
function getKey(): Buffer {
  const hash = crypto.createHash('sha256');
  hash.update(ENCRYPTION_KEY);
  return hash.digest();
}

export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return iv + encrypted data
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    // In development, fallback to base64 encoding
    return Buffer.from(text).toString('base64');
  }
}

export function decrypt(encryptedText: string): string {
  try {
    // Check if it's in the expected format
    if (!encryptedText.includes(':')) {
      // Fallback for base64 encoded text
      return Buffer.from(encryptedText, 'base64').toString('utf8');
    }
    
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Fallback for base64 encoded text
    try {
      return Buffer.from(encryptedText, 'base64').toString('utf8');
    } catch {
      return encryptedText; // Return as-is if all decryption attempts fail
    }
  }
}

// Simple hash function for non-reversible data
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
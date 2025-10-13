// tests/unit/encryptionService.test.ts
import { encrypt, decrypt, isEncrypted } from '../../src/services/encryptionService';

describe('EncryptionService Unit Tests', () => {
  describe('encrypt()', () => {
    it('should encrypt a string successfully', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext);

      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain('encryptedData');
      expect(encrypted).toContain('iv');
      expect(encrypted).toContain('tag');
      expect(encrypted).toContain('salt');
    });

    it('should return null for null input', () => {
      expect(encrypt(null)).toBeNull();
    });

    it('should return empty string for empty input', () => {
      expect(encrypt('')).toBe('');
    });

    it('should return whitespace for whitespace-only input', () => {
      expect(encrypt('   ')).toBe('   ');
    });

    it('should produce different encrypted values for same input (random IV/salt)', () => {
      const plaintext = 'Same message';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2); // Different due to random IV and salt
    });

    it('should encrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encrypt(plaintext);

      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe(plaintext);
    });

    it('should encrypt unicode characters', () => {
      const plaintext = '你好世界 🌍 Привет';
      const encrypted = encrypt(plaintext);

      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe(plaintext);
    });

    it('should encrypt long strings', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encrypt(plaintext);

      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe(plaintext);
    });
  });

  describe('decrypt()', () => {
    it('should decrypt encrypted data back to original', () => {
      const plaintext = 'Secret data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should return null for null input', () => {
      expect(decrypt(null)).toBeNull();
    });

    it('should return empty string for empty input', () => {
      expect(decrypt('')).toBe('');
    });

    it('should handle unencrypted data gracefully (backward compatibility)', () => {
      const unencryptedText = 'This is plain text';
      const result = decrypt(unencryptedText);

      expect(result).toBe(unencryptedText);
    });

    it('should decrypt special characters correctly', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt unicode characters correctly', () => {
      const plaintext = '你好世界 🌍 Привет';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt long strings correctly', () => {
      const plaintext = 'Long string: ' + 'B'.repeat(5000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle malformed encrypted data gracefully', () => {
      const malformed = '{"encryptedData": "invalid"}';
      const result = decrypt(malformed);

      // Should return original data if decryption fails
      expect(result).toBe(malformed);
    });
  });

  describe('isEncrypted()', () => {
    it('should return true for encrypted data', () => {
      const plaintext = 'Test data';
      const encrypted = encrypt(plaintext);

      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(isEncrypted('Plain text')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isEncrypted(null)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });

    it('should return false for JSON without encryptedData field', () => {
      expect(isEncrypted('{"other": "data"}')).toBe(false);
    });

    it('should return true only when both conditions met', () => {
      // Starts with { but no encryptedData
      expect(isEncrypted('{"foo": "bar"}')).toBe(false);

      // Has encryptedData but doesn't start with {
      expect(isEncrypted('not json "encryptedData"')).toBe(false);
    });
  });

  describe('encrypt/decrypt round trip', () => {
    it('should maintain data integrity through multiple encrypt/decrypt cycles', () => {
      const plaintext = 'Sensitive information';

      // First cycle
      const encrypted1 = encrypt(plaintext);
      const decrypted1 = decrypt(encrypted1);
      expect(decrypted1).toBe(plaintext);

      // Second cycle
      const encrypted2 = encrypt(decrypted1);
      const decrypted2 = decrypt(encrypted2);
      expect(decrypted2).toBe(plaintext);
    });

    it('should handle edge case strings', () => {
      const edgeCases = [
        'single char: a',
        'numbers: 1234567890',
        'newlines:\ntest\n',
        'tabs:\ttest\t',
        'quotes: "test" \'test\'',
        'backslash: \\test\\',
      ];

      edgeCases.forEach(testCase => {
        const encrypted = encrypt(testCase);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(testCase);
      });
    });
  });
});

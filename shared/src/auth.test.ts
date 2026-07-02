import { describe, it, expect } from 'vitest';
import { isValidEmail, normalizeEmail } from './auth';

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmail('wanderer@example.com')).toBe(true);
    expect(isValidEmail('a.b+tag@sub.domain.io')).toBe(true);
  });

  it('rejects garbage', () => {
    for (const bad of [
      '',
      'no-at',
      'two@@at.com',
      'space @x.com',
      'x@nodot',
      '@x.com',
      'x@.com',
      42,
    ]) {
      expect(isValidEmail(bad as unknown)).toBe(false);
    }
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases for case-insensitive linking', () => {
    expect(normalizeEmail('  Wanderer@Example.COM ')).toBe('wanderer@example.com');
  });
});

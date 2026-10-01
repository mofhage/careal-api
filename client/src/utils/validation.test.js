import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validatePasswordReset,
  validateContactForm,
  validateInviteForm,
  validatePrice,
} from './validation.js';

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe('Property 1: Short passwords are always rejected', () => {
  it('rejects any password shorter than 8 characters', () => {
    // Feature: careal-frontend-integration, Property 1: Short passwords are always rejected
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 7 }),
        (shortPassword) => {
          const result = validatePasswordReset({
            newPassword: shortPassword,
            confirmPassword: shortPassword,
          });
          return result !== null && result.field === 'newPassword';
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 2: Mismatched passwords are always rejected', () => {
  it('rejects when newPassword and confirmPassword differ (both >= 8 chars)', () => {
    // Feature: careal-frontend-integration, Property 2: Mismatched passwords are always rejected
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 128 }),
        fc.string({ minLength: 8, maxLength: 128 }),
        (a, b) => {
          fc.pre(a !== b);
          const result = validatePasswordReset({ newPassword: a, confirmPassword: b });
          return result !== null && result.field === 'confirmPassword';
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 7: Contact form validation enforces all length constraints', () => {
  it('rejects subjects > 120 chars, messages < 10 chars, and messages > 2000 chars', () => {
    // Feature: careal-frontend-integration, Property 7: Contact form validation enforces all length constraints
    fc.assert(
      fc.property(
        fc.oneof(
          // subject too long
          fc.record({
            subject: fc.string({ minLength: 121, maxLength: 200 }),
            message: fc.string({ minLength: 10, maxLength: 2000 }),
          }),
          // message too short (0–9 chars)
          fc.record({
            subject: fc.string({ minLength: 1, maxLength: 120 }),
            message: fc.string({ minLength: 0, maxLength: 9 }),
          }),
          // message too long
          fc.record({
            subject: fc.string({ minLength: 1, maxLength: 120 }),
            message: fc.string({ minLength: 2001, maxLength: 2200 }),
          })
        ),
        ({ subject, message }) => validateContactForm({ subject, message }) !== null
      ),
      { numRuns: 100 }
    );
  });

  it('accepts valid subject (1–120 chars) and message (10–2000 chars)', () => {
    // Feature: careal-frontend-integration, Property 7: Contact form validation enforces all length constraints
    fc.assert(
      fc.property(
        fc.record({
          subject: fc.string({ minLength: 1, maxLength: 120 }),
          message: fc.string({ minLength: 10, maxLength: 2000 }),
        }),
        ({ subject, message }) => {
          // Only valid if subject trims to non-empty and message trims to >= 10 chars
          fc.pre(subject.trim().length > 0);
          fc.pre(message.trim().length >= 10);
          return validateContactForm({ subject, message }) === null;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests — validatePasswordReset
// ---------------------------------------------------------------------------

describe('validatePasswordReset', () => {
  it('returns null for a valid 8-char password that matches confirm', () => {
    const result = validatePasswordReset({
      newPassword: 'abcdefgh',
      confirmPassword: 'abcdefgh',
    });
    expect(result).toBeNull();
  });

  it('returns error on newPassword when password is 7 chars', () => {
    const result = validatePasswordReset({
      newPassword: 'abcdefg',
      confirmPassword: 'abcdefg',
    });
    expect(result).not.toBeNull();
    expect(result.field).toBe('newPassword');
  });

  it('returns error on newPassword when password is 129 chars', () => {
    const longPassword = 'a'.repeat(129);
    const result = validatePasswordReset({
      newPassword: longPassword,
      confirmPassword: longPassword,
    });
    expect(result).not.toBeNull();
    expect(result.field).toBe('newPassword');
  });

  it('returns null for a valid 128-char password (boundary)', () => {
    const maxPassword = 'a'.repeat(128);
    const result = validatePasswordReset({
      newPassword: maxPassword,
      confirmPassword: maxPassword,
    });
    expect(result).toBeNull();
  });

  it('returns error on confirmPassword when passwords do not match (both >= 8 chars)', () => {
    const result = validatePasswordReset({
      newPassword: 'password1',
      confirmPassword: 'password2',
    });
    expect(result).not.toBeNull();
    expect(result.field).toBe('confirmPassword');
  });
});

// ---------------------------------------------------------------------------
// Unit tests — validateInviteForm
// ---------------------------------------------------------------------------

describe('validateInviteForm', () => {
  const validBase = {
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    role: 'contact_agent',
  };

  it('returns null for a fully valid invite form', () => {
    expect(validateInviteForm(validBase)).toBeNull();
  });

  it('returns error on email when email format is invalid', () => {
    const result = validateInviteForm({ ...validBase, email: 'not-an-email' });
    expect(result).not.toBeNull();
    expect(result.field).toBe('email');
  });

  it('returns error on email when email is missing @', () => {
    const result = validateInviteForm({ ...validBase, email: 'userexample.com' });
    expect(result).not.toBeNull();
    expect(result.field).toBe('email');
  });

  it('returns error on role when role is unrecognised', () => {
    const result = validateInviteForm({ ...validBase, role: 'super_admin' });
    expect(result).not.toBeNull();
    expect(result.field).toBe('role');
  });

  it('accepts field_agent as a valid role', () => {
    const result = validateInviteForm({ ...validBase, role: 'field_agent' });
    expect(result).toBeNull();
  });

  it('returns error on first_name when it is empty', () => {
    const result = validateInviteForm({ ...validBase, first_name: '   ' });
    expect(result).not.toBeNull();
    expect(result.field).toBe('first_name');
  });

  it('returns error on last_name when it is empty', () => {
    const result = validateInviteForm({ ...validBase, last_name: '' });
    expect(result).not.toBeNull();
    expect(result.field).toBe('last_name');
  });
});

// ---------------------------------------------------------------------------
// Unit tests — validatePrice
// ---------------------------------------------------------------------------

describe('validatePrice', () => {
  it('returns error for 0', () => {
    expect(validatePrice(0)).not.toBeNull();
  });

  it('returns error for -1', () => {
    expect(validatePrice(-1)).not.toBeNull();
  });

  it('returns error for "abc"', () => {
    expect(validatePrice('abc')).not.toBeNull();
  });

  it('returns null for 1', () => {
    expect(validatePrice(1)).toBeNull();
  });

  it('returns null for 0.5', () => {
    expect(validatePrice(0.5)).toBeNull();
  });

  it('returns null for a large positive number', () => {
    expect(validatePrice(15000)).toBeNull();
  });
});

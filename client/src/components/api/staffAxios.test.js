import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import staffAxios from './staffAxios';

// Runs the registered request interceptor against a plain config object
// so we can inspect what headers it would attach — no real network call needed.
function getInterceptedConfig(staffToken, userToken) {
  if (staffToken !== undefined) localStorage.setItem('staff_token', staffToken);
  else localStorage.removeItem('staff_token');

  if (userToken !== undefined) localStorage.setItem('careal_token', userToken);
  else localStorage.removeItem('careal_token');

  const config = { headers: {} };
  const handler = staffAxios.interceptors.request.handlers[0];
  return handler.fulfilled(config);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Property-based test
// ---------------------------------------------------------------------------

describe('staffAxios interceptor — property tests', () => {
  // Feature: careal-frontend-integration, Property 8: Staff token interceptor never attaches user token
  it('Property 8: staff interceptor always uses staff_token, never careal_token', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // staffToken
        fc.string({ minLength: 1 }), // userToken (careal_token)
        (staffToken, userToken) => {
          fc.pre(staffToken !== userToken); // ensure they are distinct

          const config = getInterceptedConfig(staffToken, userToken);

          return (
            config.headers.Authorization === `Bearer ${staffToken}` &&
            config.headers.Authorization !== `Bearer ${userToken}`
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('staffAxios interceptor — unit tests', () => {
  it('attaches no Authorization header when staff_token is absent', () => {
    localStorage.removeItem('staff_token');
    localStorage.setItem('careal_token', 'user-token-123');

    const config = { headers: {} };
    const handler = staffAxios.interceptors.request.handlers[0];
    const result = handler.fulfilled(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('attaches Authorization: Bearer <staff_token> when staff_token is present', () => {
    localStorage.setItem('staff_token', 'staff-jwt-abc');

    const config = { headers: {} };
    const handler = staffAxios.interceptors.request.handlers[0];
    const result = handler.fulfilled(config);

    expect(result.headers.Authorization).toBe('Bearer staff-jwt-abc');
  });

  it('never uses careal_token in the Authorization header', () => {
    localStorage.removeItem('staff_token');
    localStorage.setItem('careal_token', 'user-jwt-xyz');

    const config = { headers: {} };
    const handler = staffAxios.interceptors.request.handlers[0];
    const result = handler.fulfilled(config);

    expect(result.headers.Authorization).not.toBe('Bearer user-jwt-xyz');
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('uses staff_token even when both tokens are present', () => {
    localStorage.setItem('staff_token', 'staff-token-999');
    localStorage.setItem('careal_token', 'user-token-000');

    const config = { headers: {} };
    const handler = staffAxios.interceptors.request.handlers[0];
    const result = handler.fulfilled(config);

    expect(result.headers.Authorization).toBe('Bearer staff-token-999');
    expect(result.headers.Authorization).not.toContain('user-token-000');
  });
});

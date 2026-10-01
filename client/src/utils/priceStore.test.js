import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { getPrices, isValidPriceResponse, _resetCache } from './priceStore.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchMock(priceData, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => priceData,
  });
}

beforeEach(() => {
  _resetCache();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Property 3: Displayed prices always equal stored prices
// Feature: careal-frontend-integration, Property 3: Displayed prices always equal stored prices
// ---------------------------------------------------------------------------
describe('Property 3 — getPrices() returns stored values and issues only one network request', () => {
  it('holds for 100 randomised valid price objects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          licence: fc.record({ price: fc.integer({ min: 1 }) }),
          road_worthiness: fc.record({ price: fc.integer({ min: 1 }) }),
          insurance: fc.record({ price: fc.integer({ min: 1 }) }),
        }),
        async (priceData) => {
          // Reset cache so each run starts fresh
          _resetCache();

          globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => priceData,
          });

          const result1 = await getPrices();
          const result2 = await getPrices(); // second call — must use cache

          return (
            result1.licence.price === priceData.licence.price &&
            result1.road_worthiness.price === priceData.road_worthiness.price &&
            result1.insurance.price === priceData.insurance.price &&
            // Returned objects are the exact same reference (cached)
            result1 === result2 &&
            // Only one network request was ever issued
            globalThis.fetch.mock.calls.length === 1
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Invalid price responses are always rejected
// Feature: careal-frontend-integration, Property 4: Invalid price responses are always rejected
// ---------------------------------------------------------------------------
describe('Property 4 — isValidPriceResponse() rejects every invalid shape', () => {
  it('holds for 100 randomised invalid price objects', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Missing the `insurance` key entirely
          fc.record({
            licence: fc.record({ price: fc.integer({ min: 1 }) }),
            road_worthiness: fc.record({ price: fc.integer({ min: 1 }) }),
          }),
          // Missing the `road_worthiness` key
          fc.record({
            licence: fc.record({ price: fc.integer({ min: 1 }) }),
            insurance: fc.record({ price: fc.integer({ min: 1 }) }),
          }),
          // Missing the `licence` key
          fc.record({
            road_worthiness: fc.record({ price: fc.integer({ min: 1 }) }),
            insurance: fc.record({ price: fc.integer({ min: 1 }) }),
          }),
          // `licence.price` is zero or negative
          fc.record({
            licence: fc.record({
              price: fc.oneof(fc.constant(0), fc.integer({ max: -1 })),
            }),
            road_worthiness: fc.record({ price: fc.integer({ min: 1 }) }),
            insurance: fc.record({ price: fc.integer({ min: 1 }) }),
          }),
          // `road_worthiness.price` is zero or negative
          fc.record({
            licence: fc.record({ price: fc.integer({ min: 1 }) }),
            road_worthiness: fc.record({
              price: fc.oneof(fc.constant(0), fc.integer({ max: -1 })),
            }),
            insurance: fc.record({ price: fc.integer({ min: 1 }) }),
          }),
          // `insurance.price` is zero or negative
          fc.record({
            licence: fc.record({ price: fc.integer({ min: 1 }) }),
            road_worthiness: fc.record({ price: fc.integer({ min: 1 }) }),
            insurance: fc.record({
              price: fc.oneof(fc.constant(0), fc.integer({ max: -1 })),
            }),
          }),
          // Price is a string (non-numeric)
          fc.record({
            licence: fc.record({ price: fc.string() }),
            road_worthiness: fc.record({ price: fc.integer({ min: 1 }) }),
            insurance: fc.record({ price: fc.integer({ min: 1 }) }),
          }),
          // Entire data is null / undefined
          fc.constant(null),
          fc.constant(undefined),
        ),
        (invalidData) => !isValidPriceResponse(invalidData),
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests — Task 2.4
// ---------------------------------------------------------------------------
describe('getPrices() — unit tests', () => {
  it('cache hit: a second call skips the fetch entirely (fetch called exactly once)', async () => {
    const priceData = {
      licence: { price: 2500 },
      road_worthiness: { price: 13000 },
      insurance: { price: 15000 },
    };

    globalThis.fetch = makeFetchMock(priceData);

    await getPrices();
    await getPrices();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('failed fetch (res.ok = false): throws and leaves cache null so next call retries', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });

    await expect(getPrices()).rejects.toThrow('prices_fetch_failed');

    // Cache must still be null — a subsequent call should attempt fetch again
    const priceData = {
      licence: { price: 2500 },
      road_worthiness: { price: 13000 },
      insurance: { price: 15000 },
    };
    globalThis.fetch = makeFetchMock(priceData);

    const result = await getPrices();
    expect(result.licence.price).toBe(2500);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('network error: throws and leaves cache null', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network unreachable'));

    await expect(getPrices()).rejects.toThrow('prices_network_error');

    // Confirm cache is still null by doing a successful retry
    const priceData = {
      licence: { price: 100 },
      road_worthiness: { price: 200 },
      insurance: { price: 300 },
    };
    globalThis.fetch = makeFetchMock(priceData);
    const result = await getPrices();
    expect(result.insurance.price).toBe(300);
  });

  it('_resetCache() forces a re-fetch on the next getPrices() call', async () => {
    const first = {
      licence: { price: 100 },
      road_worthiness: { price: 200 },
      insurance: { price: 300 },
    };
    const second = {
      licence: { price: 999 },
      road_worthiness: { price: 888 },
      insurance: { price: 777 },
    };

    globalThis.fetch = makeFetchMock(first);
    const result1 = await getPrices();
    expect(result1.licence.price).toBe(100);

    _resetCache();

    globalThis.fetch = makeFetchMock(second);
    const result2 = await getPrices();
    expect(result2.licence.price).toBe(999);

    // Each getPrices() call after a reset should have fetched exactly once
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Unit tests — isValidPriceResponse()
// ---------------------------------------------------------------------------
describe('isValidPriceResponse() — unit tests', () => {
  it('returns true for a fully valid response', () => {
    expect(
      isValidPriceResponse({
        licence: { price: 2500 },
        road_worthiness: { price: 13000 },
        insurance: { price: 15000 },
      }),
    ).toBe(true);
  });

  it('returns false when a key is missing', () => {
    expect(
      isValidPriceResponse({ licence: { price: 1 }, road_worthiness: { price: 1 } }),
    ).toBe(false);
  });

  it('returns false when a price is 0', () => {
    expect(
      isValidPriceResponse({
        licence: { price: 0 },
        road_worthiness: { price: 1 },
        insurance: { price: 1 },
      }),
    ).toBe(false);
  });

  it('returns false when a price is negative', () => {
    expect(
      isValidPriceResponse({
        licence: { price: -5 },
        road_worthiness: { price: 1 },
        insurance: { price: 1 },
      }),
    ).toBe(false);
  });

  it('returns false for null input', () => {
    expect(isValidPriceResponse(null)).toBe(false);
  });

  it('returns false for undefined input', () => {
    expect(isValidPriceResponse(undefined)).toBe(false);
  });
});

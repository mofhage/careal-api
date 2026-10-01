const API_BASE = import.meta.env.VITE_API_BASE || '/api';

let _cache = null;

/**
 * Returns true only when all three service keys are present
 * and each has a price that is a positive number (> 0).
 * @param {unknown} data
 * @returns {boolean}
 */
export function isValidPriceResponse(data) {
  const keys = ['licence', 'road_worthiness', 'insurance'];
  return keys.every((k) => {
    const price = data?.[k]?.price;
    return typeof price === 'number' && price > 0;
  });
}

/**
 * Returns the cached price data, fetching from the API on first call.
 * Throws if the network request fails or the response shape is invalid.
 * @returns {Promise<{ licence: { price: number }, road_worthiness: { price: number }, insurance: { price: number } }>}
 */
export async function getPrices() {
  if (_cache !== null) return _cache;

  let res;
  try {
    res = await fetch(`${API_BASE}/prices`);
  } catch (err) {
    throw new Error(`prices_network_error: ${err.message}`);
  }

  if (!res.ok) {
    throw new Error(`prices_fetch_failed: HTTP ${res.status}`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('prices_invalid_json');
  }

  if (!isValidPriceResponse(data)) {
    throw new Error('prices_invalid_shape');
  }

  _cache = data;
  return _cache;
}

/**
 * Resets the module-level cache. For test isolation only.
 */
export function _resetCache() {
  _cache = null;
}

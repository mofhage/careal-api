// services/servicePriceService.js
// Prices are now Super-Admin-editable (service_prices table) instead of
// hardcoded. Falls back to the original ServicePrice.js defaults for any
// key missing from the DB (e.g. migration not run yet), so checkout never
// breaks — it just won't reflect an admin price change until the row exists.
import pool from '../db.js';
import ServicePrice from '../ServicePrice.js';

let cache = null;
let cacheAt = 0;
const CACHE_TTL_MS = 60 * 1000; // prices change rarely; 1 min cache keeps checkout fast

export async function getServicePrices({ bypassCache = false } = {}) {
  if (!bypassCache && cache && Date.now() - cacheAt < CACHE_TTL_MS) {
    return cache;
  }

  const result = await pool.query('SELECT * FROM service_prices');
  const byKey = {};
  for (const row of result.rows) {
    byKey[row.service_key] = {
      name: row.name,
      code: row.code,
      price: Number(row.price),
      currency: row.currency,
      updated_at: row.updated_at,
    };
  }

  for (const key of Object.keys(ServicePrice)) {
    if (!byKey[key]) {
      byKey[key] = { ...ServicePrice[key] };
    }
  }

  cache = byKey;
  cacheAt = Date.now();
  return cache;
}

// Call this after any admin price update so the next read (anywhere in the
// app, including a different request) picks up the new value immediately
// instead of waiting out the TTL.
export function invalidateServicePriceCache() {
  cache = null;
}

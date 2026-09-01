// routes/prices.js
import express from 'express';
import pool from '../db.js';
import { protectStaff, requireRole } from '../src/middleware/staffAuth.js';
import { getServicePrices, invalidateServicePriceCache } from '../services/servicePriceService.js';

const router = express.Router();

// ─────────────────────────────────────────────
// GET /api/prices — public, no auth.
// Every page that shows a price (Services, checkout, dashboards) should
// call this instead of hardcoding a number, so a Super Admin price change
// reflects everywhere on next load with no frontend deploy needed.
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const prices = await getServicePrices();
    res.json(prices);
  } catch (err) {
    console.error('GET /prices error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────
// PUT /api/prices/:service_key — super_admin only
// service_key: licence | road_worthiness | insurance
// body: { price, name? }
// ─────────────────────────────────────────────
router.put('/:service_key', protectStaff, requireRole('super_admin'), async (req, res) => {
  const { service_key } = req.params;
  const { price, name } = req.body;

  if (!['licence', 'road_worthiness', 'insurance'].includes(service_key)) {
    return res.status(400).json({ message: 'Unknown service_key' });
  }
  if (price === undefined || Number.isNaN(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({ message: 'price must be a positive number' });
  }

  try {
    const result = await pool.query(
      `UPDATE service_prices
          SET price = $1, name = COALESCE($2, name), updated_by = $3, updated_at = now()
        WHERE service_key = $4
        RETURNING *`,
      [price, name || null, req.staff.id, service_key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Price row not found — has migrations/003_service_prices.sql been run?' });
    }

    invalidateServicePriceCache();
    res.json({ message: 'Price updated', service: result.rows[0] });
  } catch (err) {
    console.error('PUT /prices/:service_key error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;

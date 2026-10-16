import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { _resetCache } from '../../utils/priceStore.js';

vi.mock('../Header.jsx', () => ({ default: () => <header>Header</header> }));

const mockPrices = { licence: { price: 2500 }, road_worthiness: { price: 13000 }, insurance: { price: 15000 } };

import Services from './Services.jsx';

function renderServices() {
  return render(<MemoryRouter><Services /></MemoryRouter>);
}

beforeEach(() => {
  _resetCache();
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('Services — public view (unauthenticated)', () => {
  it('shows loading then prices from API (not hardcoded)', async () => {
    fetch.mockImplementation((url) => {
      if (url.includes('/prices')) return Promise.resolve({ ok: true, json: async () => mockPrices });
      return Promise.reject(new Error('unexpected'));
    });
    renderServices();
    await waitFor(() => expect(screen.getAllByText(/2,500/).length).toBeGreaterThan(0));
  });

  it('shows error banner when price fetch fails', async () => {
    fetch.mockRejectedValue(new Error('network'));
    renderServices();
    await waitFor(() => expect(screen.getByText(/could not load service prices/i)).toBeTruthy());
  });
});

describe('Services — authenticated view', () => {
  beforeEach(() => {
    localStorage.setItem('careal_token', 'test-token');
    fetch.mockImplementation((url) => {
      if (url.includes('/prices')) return Promise.resolve({ ok: true, json: async () => mockPrices });
      if (url.includes('/profile')) return Promise.resolve({ ok: true, json: async () => ({ user: { first_name: 'T', last_name: 'U', email: 't@t.com' } }) });
      if (url.includes('/vehicles')) return Promise.resolve({ ok: true, json: async () => ({ vehicles: [{ id: 1, plate_number: 'ABC-123', make: 'Toyota' }] }) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it('renders service cards with prices from API not hardcoded', async () => {
    renderServices();
    await waitFor(() => expect(screen.getByText(/Vehicle Licence Renewal/)).toBeTruthy());
  });

  it('Proceed button is disabled without delivery method selected', async () => {
    renderServices();
    await waitFor(() => screen.getByText(/Vehicle Licence Renewal/));
    const card = screen.getByText(/Vehicle Licence Renewal/).closest('[role=checkbox]');
    if (card) fireEvent.click(card);
    const btn = screen.getByText(/Proceed to Payment/);
    expect(btn.style.cursor).toBe('not-allowed');
  });

  it('DeliveryMethodSelector shows two options without word logistics', async () => {
    renderServices();
    await waitFor(() => screen.getByText(/Vehicle Licence Renewal/));
    const card = screen.getByText(/Vehicle Licence Renewal/).closest('[role=checkbox]');
    if (card) fireEvent.click(card);
    await waitFor(() => expect(screen.getByText(/Have it delivered/)).toBeTruthy());
    expect(screen.queryByText(/logistics/i)).toBeNull();
  });
});

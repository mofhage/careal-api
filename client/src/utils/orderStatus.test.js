import * as fc from 'fast-check';
import { statusToStage, getDeliveryLabel, getBadgeVariant } from './orderStatus.js';

// --- Property-Based Tests ────────────────────────────────────────────────────

describe('Property 5: Order status mapping is total and bounded', () => {
  // Feature: careal-frontend-integration, Property 5: Order status mapping is total and bounded
  const knownStatuses = [
    'paid',
    'assigned',
    'in_progress',
    'ready_for_delivery',
    'ready_for_pickup',
    'delivered',
    'collected',
  ];

  it('always returns a value in {1,2,3,4} for known statuses and exactly 1 for unknown strings', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const stage = statusToStage(s);
        if (!knownStatuses.includes(s)) return stage === 1;
        return stage >= 1 && stage <= 4;
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 6: Delivery label is exhaustive and correct', () => {
  // Feature: careal-frontend-integration, Property 6: Delivery label is exhaustive and correct
  it('returns the correct label for all possible delivery method values', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('agent_delivery'),
          fc.constant('personal_collection'),
          fc.string(),
          fc.constant(undefined),
          fc.constant(null)
        ),
        (method) => {
          const label = getDeliveryLabel(method);
          if (method === 'agent_delivery') return label === 'Delivered';
          if (method === 'personal_collection') return label === 'Collected';
          return label === 'Delivered / Collected';
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Unit Tests ──────────────────────────────────────────────────────────────

describe('statusToStage — every known status maps to the expected stage', () => {
  it("maps 'paid' to stage 1", () => {
    expect(statusToStage('paid')).toBe(1);
  });

  it("maps 'assigned' to stage 2", () => {
    expect(statusToStage('assigned')).toBe(2);
  });

  it("maps 'in_progress' to stage 2", () => {
    expect(statusToStage('in_progress')).toBe(2);
  });

  it("maps 'ready_for_delivery' to stage 3", () => {
    expect(statusToStage('ready_for_delivery')).toBe(3);
  });

  it("maps 'ready_for_pickup' to stage 3", () => {
    expect(statusToStage('ready_for_pickup')).toBe(3);
  });

  it("maps 'delivered' to stage 4", () => {
    expect(statusToStage('delivered')).toBe(4);
  });

  it("maps 'collected' to stage 4", () => {
    expect(statusToStage('collected')).toBe(4);
  });

  it("maps an unknown status string to stage 1", () => {
    expect(statusToStage('unknown_status')).toBe(1);
  });

  it("maps empty string to stage 1", () => {
    expect(statusToStage('')).toBe(1);
  });

  it("maps undefined to stage 1", () => {
    expect(statusToStage(undefined)).toBe(1);
  });
});

describe('getDeliveryLabel — unit tests', () => {
  it("returns 'Delivered' for 'agent_delivery'", () => {
    expect(getDeliveryLabel('agent_delivery')).toBe('Delivered');
  });

  it("returns 'Collected' for 'personal_collection'", () => {
    expect(getDeliveryLabel('personal_collection')).toBe('Collected');
  });

  it("returns 'Delivered / Collected' for an unknown string", () => {
    expect(getDeliveryLabel('other')).toBe('Delivered / Collected');
  });

  it("returns 'Delivered / Collected' for undefined", () => {
    expect(getDeliveryLabel(undefined)).toBe('Delivered / Collected');
  });

  it("returns 'Delivered / Collected' for null", () => {
    expect(getDeliveryLabel(null)).toBe('Delivered / Collected');
  });

  it("returns 'Delivered / Collected' for empty string", () => {
    expect(getDeliveryLabel('')).toBe('Delivered / Collected');
  });
});

describe('getBadgeVariant — all three branches', () => {
  it("returns 'complete' for 'Delivered'", () => {
    expect(getBadgeVariant('Delivered')).toBe('complete');
  });

  it("returns 'complete' for 'Done'", () => {
    expect(getBadgeVariant('Done')).toBe('complete');
  });

  it("returns 'na' for 'N/A'", () => {
    expect(getBadgeVariant('N/A')).toBe('na');
  });

  it("returns 'pending' for 'Pending'", () => {
    expect(getBadgeVariant('Pending')).toBe('pending');
  });

  it("returns 'pending' for any unrecognised status", () => {
    expect(getBadgeVariant('In Progress')).toBe('pending');
    expect(getBadgeVariant('')).toBe('pending');
    expect(getBadgeVariant(undefined)).toBe('pending');
  });
});

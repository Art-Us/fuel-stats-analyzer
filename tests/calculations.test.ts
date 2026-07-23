import { describe, it, expect } from 'vitest';
import { calculateRefuelingStats } from '../src/utils/calculations.js';
import { Refueling } from '../src/types/refueling.js';

describe('calculateRefuelingStats', () => {
  it('powinien zwrócić null dla pierwszego tankowania (brak poprzedniego rekordu)', () => {
    const current: Refueling = {
      id: 1,
      date: '2026-07-23T10:00:00Z',
      cost: 200.0,
      liters: 30.0,
      price_per_liter: 6.67,
      mileage: 100000,
      receipt_image_url: null,
      dashboard_image_url: null,
      created_at: '2026-07-23 10:00:00'
    };

    const stats = calculateRefuelingStats(current, null);

    expect(stats.distance).toBeNull();
    expect(stats.fuel_consumption_l_per_100km).toBeNull();
    expect(stats.cost_per_km).toBeNull();
  });

  it('powinien poprawnie obliczyć dystans, spalanie l/100km oraz koszt za km', () => {
    const previous: Refueling = {
      id: 1,
      date: '2026-07-10T10:00:00Z',
      cost: 200.0,
      liters: 30.0,
      price_per_liter: 6.67,
      mileage: 100000,
      receipt_image_url: null,
      dashboard_image_url: null,
      created_at: '2026-07-10 10:00:00'
    };

    const current: Refueling = {
      id: 2,
      date: '2026-07-20T10:00:00Z',
      cost: 260.0,
      liters: 40.0,
      price_per_liter: 6.5,
      mileage: 100500, // 500 km przejechane
      receipt_image_url: null,
      dashboard_image_url: null,
      created_at: '2026-07-20 10:00:00'
    };

    const stats = calculateRefuelingStats(current, previous);

    // 500 km
    expect(stats.distance).toBe(500);
    // (40 litrów / 500 km) * 100 = 8.0 l/100km
    expect(stats.fuel_consumption_l_per_100km).toBe(8.0);
    // 260 PLN / 500 km = 0.52 PLN/km
    expect(stats.cost_per_km).toBe(0.52);
  });

  it('powinien obsłużyć ujemny lub zerowy dystans', () => {
    const previous: Refueling = {
      id: 1,
      date: '2026-07-10T10:00:00Z',
      cost: 200.0,
      liters: 30.0,
      price_per_liter: 6.67,
      mileage: 100000,
      receipt_image_url: null,
      dashboard_image_url: null,
      created_at: '2026-07-10 10:00:00'
    };

    const current: Refueling = {
      id: 2,
      date: '2026-07-20T10:00:00Z',
      cost: 260.0,
      liters: 40.0,
      price_per_liter: 6.5,
      mileage: 100000, // Błędny licznik (brak przyrostu)
      receipt_image_url: null,
      dashboard_image_url: null,
      created_at: '2026-07-20 10:00:00'
    };

    const stats = calculateRefuelingStats(current, previous);

    expect(stats.distance).toBe(0);
    expect(stats.fuel_consumption_l_per_100km).toBeNull();
    expect(stats.cost_per_km).toBeNull();
  });
});

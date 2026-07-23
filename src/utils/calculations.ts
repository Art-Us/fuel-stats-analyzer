import { Refueling, RefuelingStats } from '../types/refueling.js';

/**
 * Wylicza wskaźniki (dystans, zużycie l/100km, koszt/km) na podstawie aktualnego i poprzedniego tankowania.
 */
export function calculateRefuelingStats(
  current: Refueling,
  previous: Refueling | null
): RefuelingStats {
  if (!previous) {
    return {
      distance: null,
      fuel_consumption_l_per_100km: null,
      cost_per_km: null
    };
  }

  const distance = current.mileage - previous.mileage;

  if (distance <= 0) {
    return {
      distance: distance > 0 ? distance : 0,
      fuel_consumption_l_per_100km: null,
      cost_per_km: null
    };
  }

  // Zużycie paliwa: (litry z obecnego tankowania / dystans od ostatniego tankowania) * 100
  const fuel_consumption_l_per_100km = Number(((current.liters / distance) * 100).toFixed(2));
  // Koszt za 1 km: koszt obecnego tankowania / dystans
  const cost_per_km = Number((current.cost / distance).toFixed(2));

  return {
    distance: Number(distance.toFixed(1)),
    fuel_consumption_l_per_100km,
    cost_per_km
  };
}

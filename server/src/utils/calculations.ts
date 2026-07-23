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
  // Koszt za 1 km: bazujący na cenie paliwa z poprzedniego tankowania (gdyż to paliwo spalone na tym dystansie pochodziło z poprzedniego tankowania)
  const effectivePricePerLiter = previous.price_per_liter || (previous.liters > 0 ? previous.cost / previous.liters : current.price_per_liter);
  const cost_per_km = Number(((current.liters * effectivePricePerLiter) / distance).toFixed(2));

  return {
    distance: Number(distance.toFixed(1)),
    fuel_consumption_l_per_100km,
    cost_per_km
  };
}

import { getDatabase } from './db.js';

interface SeedRefueling {
  date: string;
  cost: number;
  liters: number;
  price_per_liter: number;
  mileage: number;
  receipt_image_url?: string | null;
  dashboard_image_url?: string | null;
}

const sampleRefuelings: SeedRefueling[] = [
  {
    date: '2025-01-15T08:30:00Z',
    cost: 199.26,
    liters: 32.40,
    price_per_liter: 6.15,
    mileage: 188500,
    receipt_image_url: null,
    dashboard_image_url: null
  },
  {
    date: '2025-02-20T17:45:00Z',
    cost: 263.50,
    liters: 42.50,
    price_per_liter: 6.20,
    mileage: 189120,
    receipt_image_url: null,
    dashboard_image_url: null
  },
  {
    date: '2025-04-02T12:10:00Z',
    cost: 270.67,
    liters: 43.10,
    price_per_liter: 6.28,
    mileage: 189750,
    receipt_image_url: null,
    dashboard_image_url: null
  },
  {
    date: '2025-05-18T16:30:00Z',
    cost: 287.02,
    liters: 45.20,
    price_per_liter: 6.35,
    mileage: 190410,
    receipt_image_url: null,
    dashboard_image_url: null
  },
  {
    date: '2025-06-30T09:20:00Z',
    cost: 308.80,
    liters: 48.10,
    price_per_liter: 6.42,
    mileage: 191150,
    receipt_image_url: null,
    dashboard_image_url: null
  },
  {
    date: '2025-08-12T14:15:00Z',
    cost: 309.74,
    liters: 47.80,
    price_per_liter: 6.48,
    mileage: 191890,
    receipt_image_url: null,
    dashboard_image_url: null
  },
  {
    date: '2025-09-25T11:40:00Z',
    cost: 282.44,
    liters: 44.20,
    price_per_liter: 6.39,
    mileage: 192550,
    receipt_image_url: null,
    dashboard_image_url: null
  },
  {
    date: '2025-11-08T15:00:00Z',
    cost: 287.11,
    liters: 45.50,
    price_per_liter: 6.31,
    mileage: 193200,
    receipt_image_url: null,
    dashboard_image_url: null
  },
  {
    date: '2025-12-20T18:10:00Z',
    cost: 280.00,
    liters: 44.80,
    price_per_liter: 6.25,
    mileage: 193820,
    receipt_image_url: null,
    dashboard_image_url: null
  },
  {
    date: '2026-02-10T10:05:00Z',
    cost: 272.54,
    liters: 44.10,
    price_per_liter: 6.18,
    mileage: 194450,
    receipt_image_url: null,
    dashboard_image_url: null
  },
  {
    date: '2026-04-04T09:15:00Z',
    cost: 170.84,
    liters: 27.51,
    price_per_liter: 6.21,
    mileage: 194947,
    receipt_image_url: null,
    dashboard_image_url: null
  },
  {
    date: '2026-05-06T14:30:00Z',
    cost: 123.91,
    liters: 19.89,
    price_per_liter: 6.23,
    mileage: 195153,
    receipt_image_url: null,
    dashboard_image_url: null
  },
  {
    date: '2026-06-25T10:00:00Z',
    cost: 155.96,
    liters: 27.17,
    price_per_liter: 5.74,
    mileage: 195439,
    receipt_image_url: null,
    dashboard_image_url: null
  },
  {
    date: '2026-07-18T16:45:00Z',
    cost: 137.97,
    liters: 23.87,
    price_per_liter: 5.78,
    mileage: 195780,
    receipt_image_url: null,
    dashboard_image_url: null
  }
];

async function seed() {
  try {
    console.log('Inicjalizacja połączenia z bazą danych...');
    const db = await getDatabase();

    console.log('Czyszczenie istniejących rekordów w tabeli refuelings...');
    await db.run('DELETE FROM refuelings');

    console.log(`Wstawianie ${sampleRefuelings.length} realistycznych rekordów tankowania...`);
    for (const item of sampleRefuelings) {
      await db.run(
        `INSERT INTO refuelings (date, cost, liters, price_per_liter, mileage, receipt_image_url, dashboard_image_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          item.date,
          item.cost,
          item.liters,
          item.price_per_liter,
          item.mileage,
          item.receipt_image_url || null,
          item.dashboard_image_url || null
        ]
      );
    }

    const count = await db.get<{ total: number }>('SELECT COUNT(*) as total FROM refuelings');
    console.log(`Sukces! W bazie znajduje się obecnie łącznie ${count?.total} wpisów tankowań.`);
    process.exit(0);
  } catch (error) {
    console.error('Błąd podczas zasilania bazy danymi:', error);
    process.exit(1);
  }
}

seed();

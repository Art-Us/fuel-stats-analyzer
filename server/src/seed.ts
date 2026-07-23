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
    date: '2026-06-25T10:00:00Z',
    cost: 155.96,
    liters: 27.17,
    price_per_liter: 5.74,
    mileage: 195439,
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
    date: '2026-04-04T09:15:00Z',
    cost: 170.84,
    liters: 27.51,
    price_per_liter: 6.21,
    mileage: 194947,
    receipt_image_url: null,
    dashboard_image_url: null
  },
  // {
  //   date: '2026-03-01T17:45:00Z',
  //   cost: 275.00,
  //   liters: 43.10,
  //   price_per_liter: 6.38,
  //   mileage: 121980,
  //   receipt_image_url: null,
  //   dashboard_image_url: null
  // },
  // {
  //   date: '2026-04-02T11:20:00Z',
  //   cost: 265.00,
  //   liters: 41.41,
  //   price_per_liter: 6.40,
  //   mileage: 122600,
  //   receipt_image_url: null,
  //   dashboard_image_url: null
  // },
  // {
  //   date: '2026-05-03T16:10:00Z',
  //   cost: 290.00,
  //   liters: 44.82,
  //   price_per_liter: 6.47,
  //   mileage: 123300,
  //   receipt_image_url: null,
  //   dashboard_image_url: null
  // },
  // {
  //   date: '2026-06-05T08:50:00Z',
  //   cost: 270.00,
  //   liters: 41.54,
  //   price_per_liter: 6.50,
  //   mileage: 123950,
  //   receipt_image_url: null,
  //   dashboard_image_url: null
  // },
  // {
  //   date: '2026-06-25T13:00:00Z',
  //   cost: 285.00,
  //   liters: 43.64,
  //   price_per_liter: 6.53,
  //   mileage: 124620,
  //   receipt_image_url: null,
  //   dashboard_image_url: null
  // },
  // {
  //   date: '2026-07-10T15:20:00Z',
  //   cost: 278.00,
  //   liters: 42.44,
  //   price_per_liter: 6.55,
  //   mileage: 125280,
  //   receipt_image_url: null,
  //   dashboard_image_url: null
  // },
  // {
  //   date: '2026-07-22T18:40:00Z',
  //   cost: 260.00,
  //   liters: 39.51,
  //   price_per_liter: 6.58,
  //   mileage: 125900,
  //   receipt_image_url: null,
  //   dashboard_image_url: null
  // }
];

async function seed() {
  try {
    console.log('Inicjalizacja połączenia z bazą danych...');
    const db = await getDatabase();

    console.log('Czyszczenie istniejących rekordów w tabeli refuelings (opcjonalnie)...');
    // await db.run('DELETE FROM refuelings');

    console.log('Wstawianie 10 przykładowych rekordów tankowania...');
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

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import * as archiverModule from 'archiver';
import { getDatabase } from '../db.js';
import { Refueling } from '../types/refueling.js';

function createZipArchive(options?: any) {
  const mod: any = archiverModule;
  if (typeof mod === 'function') {
    return mod('zip', options);
  }
  if (typeof mod.default === 'function') {
    return mod.default('zip', options);
  }
  if (mod.ZipArchive) {
    return new mod.ZipArchive(options);
  }
  if (mod.Archiver) {
    return new mod.Archiver('zip', options);
  }
  throw new Error('Nie udało się zainicjalizować archivera ZIP');
}

export async function exportBackupController(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = await getDatabase();

    // 1. Pobranie danych samochodu
    const nameSetting = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['car_name']);
    const carName = nameSetting ? nameSetting.value : 'Mój Samochód';

    // 2. Pobranie wszystkich tankowań z bazy
    const refuelings = await db.all<Refueling[]>('SELECT * FROM refuelings ORDER BY date ASC, mileage ASC, id ASC');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const zipFilename = `fuel_app_backup_${timestamp}.zip`;

    // 3. Budowanie manifestu JSON
    const manifest = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      car: {
        name: carName,
      },
      summary: {
        total_refuelings: refuelings.length,
        total_cost: refuelings.reduce((sum, r) => sum + (r.cost || 0), 0),
        total_liters: refuelings.reduce((sum, r) => sum + (r.liters || 0), 0),
      },
      refuelings: refuelings.map((r) => {
        const receiptRel = r.receipt_image_url
          ? r.receipt_image_url.replace(/^\/?inputs\//, '')
          : null;
        const dashboardRel = r.dashboard_image_url
          ? r.dashboard_image_url.replace(/^\/?inputs\//, '')
          : null;

        return {
          id: r.id,
          date: r.date,
          cost: r.cost,
          liters: r.liters,
          price_per_liter: r.price_per_liter,
          mileage: r.mileage,
          receipt_image: receiptRel ? `photos/${receiptRel}` : null,
          dashboard_image: dashboardRel ? `photos/${dashboardRel}` : null,
          created_at: r.created_at,
        };
      }),
    };

    // 4. Budowanie czytelnego dokumentu tekstowego (raport txt)
    let textReport = `====================================================\n`;
    textReport += `RAPORT EKSPORTU DANYCH TANKOWAŃ - FUEL TRACKER APP\n`;
    textReport += `Data wygenerowania: ${new Date().toLocaleString('pl-PL')}\n`;
    textReport += `Samochód: ${carName}\n`;
    textReport += `Łączna liczba tankowań: ${manifest.summary.total_refuelings}\n`;
    textReport += `Łączny koszt: ${manifest.summary.total_cost.toFixed(2)} PLN\n`;
    textReport += `Łączna ilość paliwa: ${manifest.summary.total_liters.toFixed(2)} L\n`;
    textReport += `====================================================\n\n`;
    textReport += `LISTA TANKOWAŃ:\n`;
    textReport += `----------------------------------------------------\n`;

    refuelings.forEach((r, idx) => {
      const d = new Date(r.date).toISOString().split('T')[0];
      textReport += `[#${idx + 1}] ID: ${r.id} | Data: ${d} | Kwota: ${r.cost.toFixed(2)} PLN | Litry: ${r.liters.toFixed(2)} L | Cena/L: ${r.price_per_liter.toFixed(2)} PLN | Przebieg: ${r.mileage} km\n`;
      if (r.receipt_image_url) {
        textReport += `     Zdjęcie paragonu: photos/${r.receipt_image_url.replace(/^\/?inputs\//, '')}\n`;
      }
      if (r.dashboard_image_url) {
        textReport += `     Zdjęcie licznika: photos/${r.dashboard_image_url.replace(/^\/?inputs\//, '')}\n`;
      }
      textReport += `\n`;
    });

    // 5. Konfiguracja archiwum ZIP i nagłówków odpowiedzi
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    const archive = createZipArchive({
      zlib: { level: 9 }, // Maksymalny stopień kompresji
    });

    archive.on('error', (err) => {
      console.error('[BACKUP ERROR] Błąd podczas tworzenia archiwum ZIP:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Nie udało się wygenerować archiwum ZIP' });
      }
    });

    archive.pipe(res);

    // Dodanie plików tekstowych i JSON do archiwum
    archive.append(JSON.stringify(manifest, null, 2), { name: 'backup.json' });
    archive.append(textReport, { name: 'dane_tankowan.txt' });

    // 6. Dołączenie wszystkich fizycznych zdjęć z folderu inputs/ (z pominięciem temp/)
    const inputsDir = path.resolve(process.cwd(), 'inputs');
    if (fs.existsSync(inputsDir)) {
      const items = fs.readdirSync(inputsDir);
      for (const item of items) {
        if (item === 'temp') continue;
        const itemPath = path.join(inputsDir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          // Podfolder (np. inputs/2026-08-14_10-00-00/)
          const files = fs.readdirSync(itemPath);
          for (const file of files) {
            const filePath = path.join(itemPath, file);
            if (fs.statSync(filePath).isFile()) {
              archive.file(filePath, { name: `photos/${item}/${file}` });
            }
          }
        } else if (stat.isFile() && item !== '.gitkeep') {
          archive.file(itemPath, { name: `photos/${item}` });
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    next(error);
  }
}

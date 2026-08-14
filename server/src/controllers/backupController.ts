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

import AdmZipPkg from 'adm-zip';
const AdmZip = (AdmZipPkg as any).default || AdmZipPkg;

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

export async function importBackupController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  let uploadedFilePath: string | null = null;
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Nie przesłano pliku archiwum ZIP (pole "backup").' });
      return;
    }

    uploadedFilePath = req.file.path;
    const zip = new AdmZip(uploadedFilePath);
    const zipEntries = zip.getEntries();

    // 1. Odnalezienie pliku backup.json
    const backupEntry = zipEntries.find(
      (entry: any) => entry.entryName.toLowerCase() === 'backup.json' || entry.name.toLowerCase() === 'backup.json'
    );

    if (!backupEntry) {
      res.status(400).json({ error: 'Nieprawidłowy plik ZIP: brak pliku backup.json w archiwum.' });
      return;
    }

    const jsonText = zip.readAsText(backupEntry);
    let manifest: any;
    try {
      manifest = JSON.parse(jsonText);
    } catch (_) {
      res.status(400).json({ error: 'Nieprawidłowy format JSON w pliku backup.json.' });
      return;
    }

    const db = await getDatabase();

    // 2. Przywrócenie nazwy samochodu
    if (manifest.car?.name && typeof manifest.car.name === 'string') {
      await db.run(
        `INSERT INTO settings (key, value) VALUES ('car_name', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [manifest.car.name.trim()]
      );
    }

    // 3. Wypakowanie wszystkich zdjęć z folderu photos/ do inputs/
    const inputsDir = path.resolve(process.cwd(), 'inputs');
    if (!fs.existsSync(inputsDir)) {
      fs.mkdirSync(inputsDir, { recursive: true });
    }

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      const normName = entry.entryName.replace(/\\/g, '/');
      if (normName.startsWith('photos/')) {
        const relativePath = normName.replace(/^photos\//, '');
        const targetPath = path.join(inputsDir, relativePath);
        const targetDir = path.dirname(targetPath);

        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        fs.writeFileSync(targetPath, entry.getData());
      }
    }

    // 4. Przywrócenie wpisów tankowań do bazy danych
    let importedCount = 0;
    if (Array.isArray(manifest.refuelings)) {
      for (const r of manifest.refuelings) {
        if (!r.date || r.cost === undefined || r.liters === undefined || r.mileage === undefined) {
          continue;
        }

        // Mapowanie ścieżek zdjęć
        const receiptUrl = r.receipt_image
          ? `/${r.receipt_image.replace(/^photos\//, 'inputs/')}`
          : r.receipt_image_url || null;

        const dashboardUrl = r.dashboard_image
          ? `/${r.dashboard_image.replace(/^photos\//, 'inputs/')}`
          : r.dashboard_image_url || null;

        // Sprawdzenie czy takie tankowanie już istnieje w bazie
        const existing = await db.get(
          'SELECT id FROM refuelings WHERE date = ? AND mileage = ? AND cost = ?',
          [r.date, r.mileage, r.cost]
        );

        if (!existing) {
          await db.run(
            `INSERT INTO refuelings (date, cost, liters, price_per_liter, mileage, receipt_image_url, dashboard_image_url, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              r.date,
              r.cost,
              r.liters,
              r.price_per_liter || (r.liters > 0 ? r.cost / r.liters : 0),
              r.mileage,
              receiptUrl,
              dashboardUrl,
              r.created_at || new Date().toISOString(),
            ]
          );
          importedCount++;
        }
      }
    }

    res.status(200).json({
      message: 'Kopia zapasowa została pomyślnie zaimportowana.',
      imported_refuelings: importedCount,
      total_in_backup: Array.isArray(manifest.refuelings) ? manifest.refuelings.length : 0,
      car_name: manifest.car?.name || null,
    });
  } catch (error) {
    next(error);
  } finally {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
      } catch (_) {}
    }
  }
}

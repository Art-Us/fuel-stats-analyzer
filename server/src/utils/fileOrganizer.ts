import fs from 'fs';
import path from 'path';

export interface OrganizePhotosResult {
  receipt_image_url: string | null;
  dashboard_image_url: string | null;
  subfolder: string | null;
}

/**
 * Sanityzuje nazwę pliku, usuwając niedozwolone znaki w systemie plików (Windows/Linux)
 * przy jednoczesnym zachowaniu oryginalnej nazwy i rozszerzenia.
 */
export function sanitizeFilename(rawName: string): string {
  const base = path.basename(rawName).trim();
  const safe = base.replace(/[\\/:*?"<>|\r\n\t]/g, '_');
  return safe || `photo_${Date.now()}.jpg`;
}

/**
 * Ekstrahuje oryginalną nazwę pliku z tymczasowej nazwy przesyłanej przez Multer
 * (np. 1723625400000_12345___IMG_20260814_100856.jpg -> IMG_20260814_100856.jpg)
 */
export function extractOriginalFilename(filename: string): string {
  if (filename.includes('___')) {
    const parts = filename.split('___');
    return sanitizeFilename(parts.slice(1).join('___'));
  }
  return sanitizeFilename(filename);
}

/**
 * Organizuje zdjęcia tankowania przenosząc je z tymczasowych ścieżek
 * do dedykowanego podfolderu w inputs/YYYY-MM-DD_HH-mm-ss/
 * zachowując oryginalne nazwy plików z urządzenia.
 */
export function organizeRefuelingPhotos(
  dateIsoStr: string,
  receiptUrl?: string | null,
  dashboardUrl?: string | null,
  existingSubfolder?: string | null
): OrganizePhotosResult {
  const inputsBaseDir = path.resolve(process.cwd(), 'inputs');
  if (!fs.existsSync(inputsBaseDir)) {
    fs.mkdirSync(inputsBaseDir, { recursive: true });
  }

  // Generujemy unikalną nazwę podfolderu ze stemplami czasowymi (YYYY-MM-DD_HH-mm-ss w momencie zapisu)
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  const baseName = `${YYYY}-${MM}-${DD}_${hh}-${mm}-${ss}`;
  let targetSubfolder = baseName;
  let index = 1;
  while (fs.existsSync(path.join(inputsBaseDir, targetSubfolder))) {
    targetSubfolder = `${baseName}_${index}`;
    index++;
  }

  let newReceiptUrl = receiptUrl || null;
  let newDashboardUrl = dashboardUrl || null;

  // Jeżeli tankowanie miało już dotychczasowy podfolder w inputs/, zmień nazwę folderu na nowy stempel czasowy
  if (existingSubfolder) {
    const oldFolderPath = path.join(inputsBaseDir, existingSubfolder);
    if (fs.existsSync(oldFolderPath) && existingSubfolder !== targetSubfolder) {
      const newFolderPath = path.join(inputsBaseDir, targetSubfolder);
      try {
        fs.renameSync(oldFolderPath, newFolderPath);
        console.log(`[FILE ORGANIZER] 📂 Zaktualizowano nazwę folderu tankowania: ${existingSubfolder} -> ${targetSubfolder}`);

        if (newReceiptUrl && newReceiptUrl.startsWith(`/inputs/${existingSubfolder}/`)) {
          newReceiptUrl = newReceiptUrl.replace(`/inputs/${existingSubfolder}/`, `/inputs/${targetSubfolder}/`);
        }
        if (newDashboardUrl && newDashboardUrl.startsWith(`/inputs/${existingSubfolder}/`)) {
          newDashboardUrl = newDashboardUrl.replace(`/inputs/${existingSubfolder}/`, `/inputs/${targetSubfolder}/`);
        }
      } catch (err) {
        console.error(`[FILE ORGANIZER Error] Błąd podczas zmiany nazwy folderu:`, err);
        targetSubfolder = existingSubfolder;
      }
    }
  }

  const targetDirPath = path.join(inputsBaseDir, targetSubfolder);
  if (!fs.existsSync(targetDirPath)) {
    fs.mkdirSync(targetDirPath, { recursive: true });
  }

  const usedNamesInThisRefueling = new Set<string>();

  // Jeśli istnieją już pliki w docelowym folderze, dodaj ich nazwy do zajętych
  if (newReceiptUrl && newReceiptUrl.startsWith(`/inputs/${targetSubfolder}/`)) {
    usedNamesInThisRefueling.add(path.basename(newReceiptUrl));
  }
  if (newDashboardUrl && newDashboardUrl.startsWith(`/inputs/${targetSubfolder}/`)) {
    usedNamesInThisRefueling.add(path.basename(newDashboardUrl));
  }

  const getTargetFilename = (originalName: string): string => {
    let targetName = originalName;
    const parsed = path.parse(originalName);
    let collisionIdx = 2;
    while (
      usedNamesInThisRefueling.has(targetName) ||
      fs.existsSync(path.join(targetDirPath, targetName))
    ) {
      targetName = `${parsed.name}_${collisionIdx}${parsed.ext}`;
      collisionIdx++;
    }
    usedNamesInThisRefueling.add(targetName);
    return targetName;
  };

  // Przenoszenie zdjęcia 1 (paragon/zdjęcie 1) z /uploads do /inputs/YYYY-MM-DD_HH-mm-ss/
  if (receiptUrl && receiptUrl.startsWith('/uploads/')) {
    const rawFilename = path.basename(receiptUrl);
    const oldPath = path.resolve(process.cwd(), 'uploads', rawFilename);
    if (fs.existsSync(oldPath)) {
      const originalName = extractOriginalFilename(rawFilename);
      const targetFilename = getTargetFilename(originalName);
      const newPath = path.join(targetDirPath, targetFilename);
      fs.renameSync(oldPath, newPath);
      newReceiptUrl = `/inputs/${targetSubfolder}/${targetFilename}`;
      console.log(`[FILE ORGANIZER] 📸 Zapisano zdjęcie 1: ${targetFilename} w folderze ${targetSubfolder}`);
    }
  }

  // Przenoszenie zdjęcia 2 (licznik/zdjęcie 2) z /uploads do /inputs/YYYY-MM-DD_HH-mm-ss/
  if (dashboardUrl && dashboardUrl.startsWith('/uploads/')) {
    const rawFilename = path.basename(dashboardUrl);
    const oldPath = path.resolve(process.cwd(), 'uploads', rawFilename);
    if (fs.existsSync(oldPath)) {
      const originalName = extractOriginalFilename(rawFilename);
      const targetFilename = getTargetFilename(originalName);
      const newPath = path.join(targetDirPath, targetFilename);
      fs.renameSync(oldPath, newPath);
      newDashboardUrl = `/inputs/${targetSubfolder}/${targetFilename}`;
      console.log(`[FILE ORGANIZER] 📸 Zapisano zdjęcie 2: ${targetFilename} w folderze ${targetSubfolder}`);
    }
  }

  // Czyszczenie nieużywanych/usuniętych plików z podfolderu tankowania w inputs/
  if (fs.existsSync(targetDirPath)) {
    const activeFilenames = new Set<string>();
    if (newReceiptUrl && newReceiptUrl.startsWith(`/inputs/${targetSubfolder}/`)) {
      activeFilenames.add(path.basename(newReceiptUrl));
    }
    if (newDashboardUrl && newDashboardUrl.startsWith(`/inputs/${targetSubfolder}/`)) {
      activeFilenames.add(path.basename(newDashboardUrl));
    }

    const existingFiles = fs.readdirSync(targetDirPath);
    for (const file of existingFiles) {
      if (!activeFilenames.has(file)) {
        const fileToRemove = path.join(targetDirPath, file);
        try {
          fs.unlinkSync(fileToRemove);
          console.log(`[FILE ORGANIZER] 🗑️ Usunięto nieużywany plik z folderu tankowania: ${fileToRemove}`);
        } catch (unlinkErr) {
          console.error(`[FILE ORGANIZER Error] Błąd usuwania pliku ${fileToRemove}:`, unlinkErr);
        }
      }
    }

    // Jeśli po czyszczeniu podfolder jest pusty, usuń go z dysku
    const remainingFiles = fs.readdirSync(targetDirPath);
    if (remainingFiles.length === 0) {
      try {
        fs.rmdirSync(targetDirPath);
        console.log(`[FILE ORGANIZER] 🗑️ Usunięto pusty podfolder: ${targetDirPath}`);
      } catch (_) {}
    }
  }

  return {
    receipt_image_url: newReceiptUrl,
    dashboard_image_url: newDashboardUrl,
    subfolder: targetSubfolder,
  };
}

/**
 * Usuwa plik zdjęcia z dysku pod podaną ścieżką (np. /inputs/2026-08-06_1/paragon.jpg)
 */
export function removePhotoFile(relativeUrl?: string | null): void {
  if (!relativeUrl) return;
  try {
    const cleanPath = relativeUrl.replace(/^\/+/, '');
    const absolutePath = path.resolve(process.cwd(), cleanPath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      console.log(`[FILE ORGANIZER] 🗑️ Usunięto plik z dysku: ${absolutePath}`);

      // Jeśli podfolder stał się pusty, usuń pusty folder
      const dirPath = path.dirname(absolutePath);
      const inputsBaseDir = path.resolve(process.cwd(), 'inputs');
      if (dirPath.startsWith(inputsBaseDir) && dirPath !== inputsBaseDir) {
        if (fs.existsSync(dirPath)) {
          const remaining = fs.readdirSync(dirPath);
          if (remaining.length === 0) {
            fs.rmdirSync(dirPath);
            console.log(`[FILE ORGANIZER] 🗑️ Usunięto pusty podfolder: ${dirPath}`);
          }
        }
      }
    }
  } catch (err) {
    console.error(`[FILE ORGANIZER Error] Błąd podczas usuwania pliku ${relativeUrl}:`, err);
  }
}

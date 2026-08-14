import { describe, it, expect } from 'vitest';
import { extractExifDate } from '../src/services/photoAnalysisService.js';
import { sanitizeFilename, extractOriginalFilename } from '../src/utils/fileOrganizer.js';

describe('fileOrganizer & photoAnalysisService', () => {
  describe('sanitizeFilename', () => {
    it('powinien usunąć niedozwolone znaki i zachować rozszerzenie', () => {
      const sanitized = sanitizeFilename('photo:name*?.jpg');
      expect(sanitized).toBe('photo_name__.jpg');
    });

    it('powinien usunąć ścieżki nadrzędne i zachować bezpieczną nazwę', () => {
      const sanitized = sanitizeFilename('folder/sub/photo.jpg');
      expect(sanitized).toBe('photo.jpg');
    });

    it('powinien poprawnie obsłużyć standardową nazwę z telefonu', () => {
      const sanitized = sanitizeFilename('IMG_20260814_100856.jpg');
      expect(sanitized).toBe('IMG_20260814_100856.jpg');
    });
  });

  describe('extractOriginalFilename', () => {
    it('powinien wyciągnąć oryginalną nazwę pliku po separatorze ___', () => {
      const original = extractOriginalFilename('1723625400000_123456___IMG_20260814_100856.jpg');
      expect(original).toBe('IMG_20260814_100856.jpg');
    });

    it('powinien zwrócić oczyszczoną nazwę jeśli brak separatora', () => {
      const original = extractOriginalFilename('paragon_orlen.png');
      expect(original).toBe('paragon_orlen.png');
    });
  });

  describe('extractExifDate', () => {
    it('powinien zwrócić null dla nieistniejącego pliku', async () => {
      const date = await extractExifDate('/path/does/not/exist.jpg');
      expect(date).toBeNull();
    });
  });
});

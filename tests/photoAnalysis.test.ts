import { describe, it, expect, vi } from 'vitest';
import { analyzeTextWithOllama, extractExifDate } from '../src/services/photoAnalysisService.js';
import axios from 'axios';

vi.mock('axios');

describe('photoAnalysisService', () => {
  describe('analyzeTextWithOllama', () => {
    it('powinien poprawnie przetworzyć JSON zwrócony przez Ollamę', async () => {
      const mockOllamaResponse = {
        data: {
          response: '```json\n{\n  "cost": 185.50,\n  "liters": 28.75,\n  "price_per_liter": 6.45,\n  "mileage": 134200\n}\n```'
        }
      };

      vi.mocked(axios.post).mockResolvedValueOnce(mockOllamaResponse);

      const result = await analyzeTextWithOllama('ORLEN SUMA 185.50 PLN', 'DESKA 134200 km');

      expect(result.cost).toBe(185.50);
      expect(result.liters).toBe(28.75);
      expect(result.price_per_liter).toBe(6.45);
      expect(result.mileage).toBe(134200);
    });

    it('powinien obsłużyć błąd serwera Ollama i zwrócić domyślne zera', async () => {
      vi.mocked(axios.post).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await analyzeTextWithOllama('brak', 'brak');

      expect(result.cost).toBe(0);
      expect(result.liters).toBe(0);
      expect(result.price_per_liter).toBe(0);
      expect(result.mileage).toBe(0);
    });
  });

  describe('extractExifDate', () => {
    it('powinien zwrócić null dla nieistniejącego pliku', async () => {
      const date = await extractExifDate('/path/does/not/exist.jpg');
      expect(date).toBeNull();
    });
  });
});

# ⛽ Fuel App Backend - API Śledzenia i Analizy Kosztów Paliwa

Kompletny, produkcyjny backend dla aplikacji do śledzenia kosztów paliwa, zużycia oraz analizy zdjęć paragonów i liczników samochodowych przy użyciu AI (Ollama + Tesseract OCR + EXIF). Napisany w 100% w **TypeScript** przy użyciu **Node.js**, **Express** oraz bazy danych **SQLite**.

Aplikacja posiada pełną dokumentację OpenAPI dostępną pod adresem **`http://localhost:3000/api-docs`** oraz pakiet testów jednostkowych i integracyjnych (**Vitest** + **Supertest**).

---

## 🚀 Główny Stos Technologiczny

* **Język:** TypeScript (Strict Mode)
* **Środowisko:** Node.js (Moduły ES / NodeNext)
* **Framework:** Express.js
* **Baza Danych:** SQLite (`sqlite` + `sqlite3`)
* **Dokumentacja API:** Swagger UI (`swagger-ui-express` + `swagger-jsdoc`)
* **AI & OCR:** Ollama (`qwen2.5:3b`), Tesseract.js, `exifr`
* **Upload Plików:** Multer
* **Testowanie:** Vitest, Supertest

---

## ✨ Kluczowe Funkcjonalności

1. **Zarządzanie Tankowaniami (CRUD):**
   * Dodawanie, edycja, usuwanie i pobieranie tankowań.
   * Dynamiczne wyliczanie wskaźników w locie względem poprzedniego tankowania:
     * Dystans od poprzedniego tankowania ($km$).
     * Średnie zużycie paliwa ($l/100km$).
     * Koszt przejechania 1 kilometra ($PLN/km$).

2. **Dwa Tryby Filtrowania Dat:**
   * **Okresy Kroczące (Relative Rolling Periods):** `week` (ostatnie 7 dni), `month` (ostatnie 30 dni), `year` (ostatnie 365 dni), `all` (cała historia).
   * **Okresy Kalendarzowe (Absolute Calendar Ranges):** Wybór konkretnego roku (np. `2024`, `2026`), konkretnego miesiąca (np. `month=5` dla maja) oraz konkretnego tygodnia miesiąca (`week=1..5`).

3. **Zaawansowana Analiza Zdjęć przez AI (`POST /api/analyze-photos`):**
   * Przesyłanie 2 zdjęć naraz: paragonu (`receipt`) oraz licznika samochodowego (`dashboard`).
   * Ekstrakcja daty wykonania zdjęcia z metadanych **EXIF**.
   * Podwójny **OCR** przy użyciu **Tesseract.js**.
   * Analiza tekstów i ekstrakcja danych (`cost`, `liters`, `price_per_liter`, `mileage`) przy użyciu lokalnego modelu **Ollama** (`qwen2.5:3b`).

4. **Zasilanie Bazy Danymi Testowymi (`npm run seed`):**
   * Gotowy skrypt zasilający bazę 10 przykładowymi tankowaniami do testowania statystyk.

---

## 🛠️ Instrukcja Instalacji i Uruchomienia

### Wymagania wstępne
* Node.js v18+ oraz npm
* (Opcjonalnie dla analizy AI) Uruchomiona usługa **Ollama** z modelem `qwen2.5:3b`:
  ```bash
  ollama run qwen2.5:3b
  ```

### 1. Instalacja zależności
```bash
npm install
```

### 2. Konfiguracja środowiska (.env)
Utwórz plik `.env` (lub skopiuj `.env.example`):
```env
PORT=3000
NODE_ENV=development
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=qwen2.5:3b
```

### 3. Uruchomienie serwera deweloperskiego (Live Reload)
```bash
npm run dev
```
Serwer uruchomi się pod adresem `http://localhost:3000`.
Dokumentacja Swagger UI dostępna pod adresem `http://localhost:3000/api-docs`.

### 4. Zasilenie bazy testowymi danymi
```bash
npm run seed
```

### 5. Uruchomienie testów (Vitest)
```bash
# Jednorazowe uruchomienie testów:
npm test

# Tryb obserwatora (watch mode):
npm run test:watch
```

### 6. Kompilacja i uruchomienie produkcyjne
```bash
npm run build
npm start
```

---

## 📌 Przegląd Endpointów API

### 🚗 Tankowania (`Refuelings`)
| Metoda | Endpoint | Opis |
| :--- | :--- | :--- |
| `POST` | `/api/refuelings` | Dodaje nowe tankowanie |
| `GET` | `/api/refuelings?period=week\|month\|year\|all` | Pobiera historię z wyliczonymi wskaźnikami |
| `GET` | `/api/refuelings/calendar?year=2026&month=5&week=1` | Pobiera tankowania dla konkretnego okresu kalendarzowego |
| `GET` | `/api/refuelings/:id` | Szczegóły pojedynczego tankowania |
| `PUT` | `/api/refuelings/:id` | Aktualizuje wpis tankowania |
| `DELETE` | `/api/refuelings/:id` | Usuwa wpis tankowania |

### 📊 Statystyki (`Statistics`)
| Metoda | Endpoint | Opis |
| :--- | :--- | :--- |
| `GET` | `/api/stats?period=week\|month\|year\|all` | Statystyki zbiorcze dla okresu kroczącego |
| `GET` | `/api/stats/calendar?year=2026&month=5&week=2` | Statystyki zbiorcze dla konkretnego okresu kalendarzowego |

### 🤖 Analiza AI i OCR (`Analysis`)
| Metoda | Endpoint | Opis |
| :--- | :--- | :--- |
| `POST` | `/api/analyze-photos` | Przetwarza zdjęcia paragonu i licznika (EXIF + OCR + Ollama AI) |

---

## 🧪 Struktura Testów

Aplikacja zawiera 18 testów jednostkowych i integracyjnych (`tests/`):
* `tests/calculations.test.ts`: Testy wyliczania wskaźników spalania i dystansu.
* `tests/photoAnalysis.test.ts`: Testy serwisu OCR/EXIF oraz mockowania serwera Ollama.
* `tests/api.test.ts`: Testy integracyjne endpointów REST z bazą SQLite.

---

## 📄 Licencja

ISC

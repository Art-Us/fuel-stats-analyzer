import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import refuelingsRouter from './routes/refuelings.js';
import { setupSwagger } from './swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getDatabase } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Tworzenie katalogu na przesłane pliki (zdjęcia paragonów/liczników)
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Globalne Middlewares
app.use(cors());
app.use(express.json());

// Statyczne serwowanie plików z folderu /uploads
app.use('/uploads', express.static(uploadsDir));

// Konfiguracja Swagger UI
setupSwagger(app);

// Rejestracja endpointów API
app.use('/api/refuelings', refuelingsRouter);

// Główna trasa informacyjna
app.get('/', (_req, res) => {
  res.json({
    message: 'Witaj w API Fuel Cost Tracker',
    documentation: `http://localhost:${PORT}/api-docs`
  });
});

// Centralna obsługa błędów
app.use(errorHandler);

// Inicjalizacja bazy danych i uruchomienie serwera
async function bootstrap() {
  try {
    await getDatabase();
    console.log('Baza danych SQLite została pomyślnie zainicjalizowana.');

    app.listen(PORT, () => {
      console.log(`Serwer działa na porcie ${PORT}`);
      console.log(`Dokumentacja Swagger UI dostępna pod adresem: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Błąd podczas uruchamiania serwera:', error);
    process.exit(1);
  }
}

bootstrap();

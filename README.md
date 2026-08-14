# Fuel Stats Analyzer ⛽📱💻

A modern, full-stack vehicle fuel and expense tracking platform. Includes an **AI-powered REST API Backend**, an **Interactive Web Dashboard**, and a **Cross-Platform Mobile Application (iOS & Android)**.

---

## 🌟 Key Features

### 🤖 AI-Powered Photo Analysis (Google Gemini & Vision)
- **Automatic Receipt & Dashboard Extraction**: Upload photos of receipts, fuel dispensers, or car dashboard/odometer to automatically extract:
  - Date and time of refueling
  - Total cost (PLN)
  - Liters pumped
  - Price per liter
  - Odometer mileage (km)
- **Customizable Gemini API Key**: Users can provide their own Google Gemini API key in the in-app Settings modal (stored securely in SQLite) or rely on server `.env` defaults.
- **Fallbacks**: EXIF metadata timestamp extraction (`exifr`) and OCR recognition (`tesseract.js`).

### 📦 Complete Backup & Restore (ZIP Export / Import)
- **Export (⬆️)**: Generates a complete standalone archive (`fuel_app_backup_*.zip`) containing:
  - `backup.json`: JSON manifest with car metadata, summaries, and photo mappings.
  - `dane_tankowan.txt`: Human-readable formatted text report with tables and totals.
  - `photos/`: Full resolution copies of all receipt and dashboard photos.
- **Import (⬇️)**: Restores data on a new or reset device with one click:
  - Unpacks photos into server storage (`inputs/`).
  - Restores car name and inserts refuelings into SQLite.
  - **Smart Duplicate Prevention**: Skips already existing records to prevent data duplication.

### 🖼️ Smart File Organization & Duplicate Photo Prevention
- **Structured Storage**: Photos organized into date-based subdirectories (`inputs/YYYY-MM-DD_HH-MM-SS/`).
- **SHA-256 Hash Verification**: Deep scan across all folders in `inputs/` prevents saving duplicate photos across refuelings or within the same refueling.
- **Automated Temp Cleanup**: `inputs/temp/` is automatically purged upon successful creation or update of refuelings.

### 📊 Advanced Fuel Statistics & Calendar Analytics
- **Flexible Time Periods**: Filter stats by Week, Month, Year, or All-time.
- **Calendar Drill-down**: Detailed calendar breakdown by year, month, or specific week (`/calendar` endpoints).
- **Key Metrics**: Average consumption ($L/100\text{ km}$), cost per km, total expenses, total fuel, total mileage, and expense distributions.

### 🌓 Premium UI & Dark Mode
- **Animated Theme Switching**: Circular reveal theme transition animation (Dark / Light mode).
- **Responsive Web & Mobile**: Glassmorphic styling, intuitive forms, and interactive charts (Recharts on web, native components on mobile).

---

## 🏗️ Architecture & Project Structure

This monorepo consists of three main packages:

```
FuelAppForAndroid/
├── server/   # Node.js + Express + TypeScript + SQLite Backend API
├── client/   # React 18 + Vite + TypeScript Web Client
└── mobile/   # React Native + Expo (SDK 54) + TypeScript Mobile App
```

### 1. ⚙️ Backend (`server/`)
- **Runtime & Framework**: Node.js, Express.js (ES Modules), TypeScript
- **Database**: SQLite (via `sqlite` / `sqlite3`)
- **AI & Processing**: `@google/genai` (Gemini API), `archiver`, `adm-zip`, `exifr`, `tesseract.js`, `multer`
- **Testing**: Vitest & Supertest (26 unit and integration tests)
- **API Documentation**: Swagger UI (`/api-docs`)

### 2. 💻 Web Dashboard (`client/`)
- **Framework**: React 18, Vite, TypeScript, React Router
- **Icons & Styling**: Lucide React, modern custom CSS design system
- **Data Visualization**: Recharts (Fuel consumption trends, monthly expenses)

### 3. 📱 Mobile Application (`mobile/`)
- **Framework**: React Native, Expo SDK 54, TypeScript
- **Navigation**: React Navigation (Bottom Tabs)
- **File Management**: `expo-image-picker`, `expo-document-picker`
- **Animations**: `react-native-theme-switch-animation` with custom `CircularThemeMask`

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)
- [Expo Go](https://expo.dev/go) app (for running on physical mobile devices)

---

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Art-Us/fuel-stats-analyzer.git
   cd fuel-stats-analyzer
   ```

2. **Install dependencies for all components:**
   ```bash
   # Install server dependencies
   cd server && npm install && cd ..

   # Install web client dependencies
   cd client && npm install && cd ..

   # Install mobile dependencies
   cd mobile && npm install --legacy-peer-deps && cd ..
   ```

3. **Configure Environment Variables:**
   Create a `server/.env` file with your optional server-wide Gemini API key:
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Seed the database (Optional):**
   ```bash
   npm run seed
   ```

---

## ⚙️ Available Scripts

Run commands from the root directory:

| Command | Description |
|---|---|
| `npm run dev:server` | Starts Express backend in watch mode (`http://localhost:3000`) |
| `npm run dev:client` | Starts Vite web development server (`http://localhost:5173`) |
| `npm run dev:mobile` | Starts Expo development server for React Native |
| `npm run test:server` | Executes backend Vitest suite (26 tests) |
| `npm run build:server` | Compiles TypeScript backend to `server/dist/` |
| `npm run build:client` | Builds production bundle for the web client |

---

## 📖 API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/refuelings` | Get all refuelings (supports `?period=week\|month\|year\|all`) |
| `POST` | `/api/refuelings` | Add a new refueling entry with optional photos |
| `GET` | `/api/refuelings/:id` | Get details of a single refueling |
| `PUT` | `/api/refuelings/:id` | Update refueling entry and photos |
| `DELETE` | `/api/refuelings/:id` | Delete refueling and associated photo files |
| `GET` | `/api/refuelings/calendar` | Filter refuelings by `year`, `month`, and `week` |
| `GET` | `/api/stats` | Get fuel analytics and cost summaries |
| `GET` | `/api/stats/calendar` | Get period statistics for specific calendar dates |
| `POST` | `/api/analysis/upload-and-analyze` | Analyze receipt & dashboard photos using Google Gemini AI |
| `GET` | `/api/car` | Get vehicle info (name, latest mileage, API key status) |
| `PUT` | `/api/car` | Update vehicle name and optional custom Gemini API key |
| `GET` | `/api/backup/export` | Download full backup ZIP (photos, JSON manifest, text report) |
| `POST` | `/api/backup/import` | Upload backup ZIP and restore all data & photos |

Interactive Swagger documentation is available at:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

---

## 📄 License

This project is licensed under the ISC License.

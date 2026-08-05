# Fuel Stats Analyzer ⛽📱💻

A comprehensive monorepo application for tracking vehicle refuelings, fuel costs, consumption analytics, and statistics. Includes a **REST API Backend**, a **Web Dashboard**, and a **Mobile Application**.

---

## 🏗️ Architecture & Project Structure

This repository is structured as a monorepo containing three main components:

```
FuelAppForAndroid/
├── server/   # Node.js + Express + TypeScript + SQLite Backend API
├── client/   # React + Vite Web Dashboard
└── mobile/   # React Native + Expo Mobile Application
```

### 1. ⚙️ Backend (`server/`)
- **Framework**: Express.js with TypeScript
- **Database**: SQLite (via `sqlite` / `sqlite3`)
- **Documentation**: Swagger UI (`/api-docs`)
- **Features**:
  - RESTful endpoints for refuelings, statistics, and analytics
  - OCR integration (`tesseract.js`) for reading receipt images
  - EXIF metadata extraction (`exifr`)
  - Database seeding & Vitest suite

### 2. 💻 Web Dashboard (`client/`)
- **Framework**: React 18 + Vite + TypeScript
- **Styling & UI**: Lucide React Icons & custom CSS
- **Data Visualization**: Recharts (fuel consumption trends, monthly expenses)

### 3. 📱 Mobile App (`mobile/`)
- **Framework**: React Native + Expo (SDK 54) + TypeScript
- **Navigation**: React Navigation (Bottom Tabs)
- **Features**: Mobile UI for quickly adding refuelings, viewing history, and analyzing stats on iOS & Android

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)
- [Expo Go](https://expo.dev/go) app (if testing the mobile app on a physical device)

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

   # Install client dependencies
   cd client && npm install && cd ..

   # Install mobile dependencies
   cd mobile && npm install && cd ..
   ```

3. **Seed the database (Optional):**
   ```bash
   npm run seed
   ```

---

## ⚙️ Running the Project

You can run individual parts of the application using the root scripts:

| Command | Description |
|---|---|
| `npm run dev:server` | Starts the Express backend API in watch mode (`http://localhost:3000`) |
| `npm run dev:client` | Starts the Vite web client (`http://localhost:5173`) |
| `npm run dev:mobile` | Starts the Expo dev server for React Native |
| `npm run build:server` | Compiles TypeScript backend to `dist/` |
| `npm run build:client` | Builds production bundle for the web client |
| `npm run test:server` | Runs backend unit tests with Vitest |

---

## 📖 API Documentation

When the server is running (`npm run dev:server`), Swagger API documentation is available at:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

---

## 📄 License

This project is licensed under the ISC License.

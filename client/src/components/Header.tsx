import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Fuel, Settings, Save, AlertCircle, Sun, Moon, Eye, EyeOff, Download, Upload, CheckCircle2 } from 'lucide-react';
import { getCarInfo, updateCarInfo, getExportBackupUrl, importBackup } from '../services/api';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Statystyki Paliwa' }) => {
  const location = useLocation();

  const [carName, setCarName] = useState<string>('Mój Samochód');
  const [latestMileage, setLatestMileage] = useState<number | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');

  // Theme State (Dark / Light Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Settings Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isClosingModal, setIsClosingModal] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCarData = async () => {
    try {
      const data = await getCarInfo();
      setCarName(data.name || 'Mój Samochód');
      setLatestMileage(data.latest_mileage);
      setGeminiApiKey(data.gemini_api_key || '');
    } catch (err) {
      console.error('Błąd podczas pobierania danych samochodu:', err);
    }
  };

  useEffect(() => {
    fetchCarData();
  }, [location.pathname]);

  // Lock body scroll when settings modal is open
  useEffect(() => {
    if (isSettingsOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSettingsOpen]);

  const handleOpenSettings = () => {
    setNameInput(carName);
    setApiKeyInput(geminiApiKey);
    setShowApiKey(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSettingsOpen(true);
  };

  const closeModal = (callback?: () => void) => {
    setIsClosingModal(true);
    setTimeout(() => {
      setIsSettingsOpen(false);
      setIsClosingModal(false);
      if (callback) callback();
    }, 200);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const result = await importBackup(file);
      setSuccessMsg(`Pomyślnie zaimportowano ${result.imported_refuelings} tankowań!`);
      await fetchCarData();
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      console.error('Błąd podczas importu archiwum ZIP:', err);
      setErrorMsg(err?.response?.data?.error || err?.message || 'Nie udało się zaimportować pliku ZIP.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setErrorMsg('Nazwa samochodu nie może być pusta.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const updated = await updateCarInfo(nameInput.trim(), apiKeyInput.trim());
      setCarName(updated.name);
      setLatestMileage(updated.latest_mileage);
      setGeminiApiKey(updated.gemini_api_key || '');
      closeModal();
    } catch (err: any) {
      console.error('Błąd podczas zapisu ustawień:', err);
      setErrorMsg('Nie udało się zapisać ustawień.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <header className="app-header">
      <div className="header-top">
        <h1 className="header-title">{title}</h1>
        <button
          className="header-icon-btn"
          aria-label="Przełącz motyw (ciemny/jasny)"
          title={theme === 'dark' ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={22} color="#f59e0b" /> : <Moon size={22} />}
        </button>
      </div>

      <div className="vehicle-card">
        <div className="vehicle-info">
          <div className="vehicle-avatar">
            <Fuel size={20} />
          </div>
          <div className="vehicle-details">
            <h4>{carName}</h4>
            <p>
              {latestMileage != null
                ? `${latestMileage.toLocaleString('pl-PL')} km`
                : 'Brak tankowań w bazie'}
            </p>
          </div>
        </div>

        <button
          className="vehicle-settings-btn"
          aria-label="Ustawienia samochodu"
          onClick={handleOpenSettings}
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Modal Ustawień Samochodu */}
      {isSettingsOpen && createPortal(
        <div
          className={`modal-overlay ${isClosingModal ? 'closing' : ''}`}
          onClick={() => closeModal()}
        >
          <div
            className={`modal-sheet ${isClosingModal ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Ustawienia aplikacji
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={getExportBackupUrl()}
                  download
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card-secondary)',
                    color: 'var(--color-primary)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                  title="Pobierz kopię zapasową w archiwum ZIP"
                >
                  <Upload size={14} />
                  <span>Eksport</span>
                </a>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".zip,application/zip,application/x-zip-compressed"
                  style={{ display: 'none' }}
                  onChange={handleFileImport}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-card-secondary)',
                    color: '#16a34a',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Wczytaj kopię zapasową z pliku ZIP"
                >
                  <Download size={14} />
                  <span>{isImporting ? 'Import...' : 'Import'}</span>
                </button>
              </div>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Dostosuj dane pojazdu, klucz API lub wykonaj kopię zapasową / import danych.
            </p>

            {errorMsg && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', color: '#991b1b', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', color: '#16a34a', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="form-container">
              <div className="form-group">
                <label htmlFor="car-name-input">Nazwa samochodu</label>
                <input
                  id="car-name-input"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '14px' }}
                  placeholder="np. Toyota Corolla, Audi A4..."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label htmlFor="gemini-key-input">Klucz Gemini API (opcjonalnie)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="gemini-key-input"
                    type={showApiKey ? 'text' : 'password'}
                    className="form-input"
                    style={{ paddingLeft: '14px', paddingRight: '42px', width: '100%' }}
                    placeholder="Wklej swój klucz API Gemini (AI Studio)"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                    }}
                    onClick={() => setShowApiKey((prev) => !prev)}
                    title={showApiKey ? 'Ukryj klucz API' : 'Pokaż klucz API'}
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  Jeśli podasz własny klucz, zostanie on użyty do analizy zdjęć przez AI.
                </small>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                      Zapisywanie...
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Zapisz
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => closeModal()}
                >
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};

export default Header;

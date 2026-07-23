import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Fuel, Settings, Save, AlertCircle, Sun, Moon } from 'lucide-react';
import { getCarInfo, updateCarInfo } from '../services/api';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Statystyki Paliwa' }) => {
  const location = useLocation();

  const [carName, setCarName] = useState<string>('Mój Samochód');
  const [latestMileage, setLatestMileage] = useState<number | null>(null);

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
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchCarData = async () => {
    try {
      const data = await getCarInfo();
      setCarName(data.name || 'Mój Samochód');
      setLatestMileage(data.latest_mileage);
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
    setErrorMsg(null);
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

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setErrorMsg('Nazwa samochodu nie może być pusta.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      const updated = await updateCarInfo(nameInput.trim());
      setCarName(updated.name);
      setLatestMileage(updated.latest_mileage);
      closeModal();
    } catch (err: any) {
      console.error('Błąd podczas zapisu nazwy samochodu:', err);
      setErrorMsg('Nie udało się zapisać nowej nazwy.');
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
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Ustawienia samochodu
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Wprowadź nową nazwę samochodu. Przebieg odświeża się automatycznie z ostatniego tankowania.
            </p>

            {errorMsg && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', color: '#991b1b', marginBottom: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveName} className="form-container">
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
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
                      <Save size={18} /> Zapisz nazwę
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

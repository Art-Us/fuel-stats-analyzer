import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Camera, Image as ImageIcon, Calendar, DollarSign, Fuel, Gauge, Save, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { analyzePhotos, createRefueling } from '../services/api';

export const AddRefuelingView: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cost, setCost] = useState<string>('');
  const [liters, setLiters] = useState<string>('');
  const [pricePerLiter, setPricePerLiter] = useState<string>('');
  const [mileage, setMileage] = useState<string>('');
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [dashboardImageUrl, setDashboardImageUrl] = useState<string | null>(null);

  // Photo files & modal state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [dashboardFile, setDashboardFile] = useState<File | null>(null);
  const [activePhotoModal, setActivePhotoModal] = useState<'receipt' | 'dashboard' | null>(null);
  const [isClosingModal, setIsClosingModal] = useState<boolean>(false);

  const closeModal = (callback?: () => void) => {
    setIsClosingModal(true);
    setTimeout(() => {
      setActivePhotoModal(null);
      setIsClosingModal(false);
      if (callback) callback();
    }, 200);
  };

  // Refs for hidden inputs
  const receiptCameraRef = useRef<HTMLInputElement>(null);
  const receiptGalleryRef = useRef<HTMLInputElement>(null);
  const dashboardCameraRef = useRef<HTMLInputElement>(null);
  const dashboardGalleryRef = useRef<HTMLInputElement>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (activePhotoModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activePhotoModal]);

  // Loading & Error States
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Funkcja wyliczająca cenę za litr
  const handleCostOrLitersChange = (newCost: string, newLiters: string) => {
    const numCost = parseFloat(newCost);
    const numLiters = parseFloat(newLiters);
    if (!isNaN(numCost) && !isNaN(numLiters) && numLiters > 0) {
      setPricePerLiter((numCost / numLiters).toFixed(2));
    }
  };

  // Obsługa analizy zdjęć przez AI (POST /api/analyze-photos)
  const processPhotosWithAI = async (rFile: File | null, dFile: File | null) => {
    if (!rFile && !dFile) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      setAiSuccessMsg(null);

      const result = await analyzePhotos(rFile, dFile);

      // Auto-wypełnianie formularza pobranymi danymi
      if (result.date) {
        // Konwersja formatu daty do YYYY-MM-DD
        const formattedDate = new Date(result.date).toISOString().split('T')[0];
        setDate(formattedDate);
      }
      if (result.cost != null) {
        setCost(result.cost.toString());
      }
      if (result.liters != null) {
        setLiters(result.liters.toString());
      }
      if (result.price_per_liter != null) {
        setPricePerLiter(result.price_per_liter.toString());
      } else if (result.cost != null && result.liters != null && result.liters > 0) {
        setPricePerLiter((result.cost / result.liters).toFixed(2));
      }
      if (result.mileage != null) {
        setMileage(result.mileage.toString());
      }
      if (result.receipt_image_url) {
        setReceiptImageUrl(result.receipt_image_url);
      }
      if (result.dashboard_image_url) {
        setDashboardImageUrl(result.dashboard_image_url);
      }

      setAiSuccessMsg('Dane ze zdjęć zostały automatycznie odczytane przez AI!');
    } catch (err: any) {
      console.error('Błąd podczas analizy AI:', err);
      setErrorMsg('Nie udało się przeanalizować zdjęć. Uzupełnij dane ręcznie.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setReceiptFile(selected);
      processPhotosWithAI(selected, dashboardFile);
    }
  };

  const handleDashboardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setDashboardFile(selected);
      processPhotosWithAI(receiptFile, selected);
    }
  };

  // Wysyłka formularza (POST /api/refuelings)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numCost = parseFloat(cost);
    const numLiters = parseFloat(liters);
    const numMileage = parseFloat(mileage);
    const numPrice = parseFloat(pricePerLiter);

    if (isNaN(numCost) || isNaN(numLiters) || isNaN(numMileage)) {
      setErrorMsg('Wypełnij wymagane pola: Kwota, Litry oraz Aktualny przebieg.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createRefueling({
        date: new Date(date).toISOString(),
        cost: numCost,
        liters: numLiters,
        price_per_liter: !isNaN(numPrice) ? numPrice : numCost / numLiters,
        mileage: numMileage,
        receipt_image_url: receiptImageUrl,
        dashboard_image_url: dashboardImageUrl,
      });

      // Powrót do historii po pomyślnym zapisie
      navigate('/');
    } catch (err: any) {
      console.error('Błąd zapisu tankowania:', err);
      setErrorMsg('Nie udało się zapisać tankowania. Sprawdź poprawność danych.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-content" style={{ paddingTop: '16px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-main)' }}>
        Dodaj nowe tankowanie
      </h2>

      {/* Ukryte pola wyboru plików (Aparat vs Galeria) */}
      <input
        ref={receiptCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleReceiptChange}
      />
      <input
        ref={receiptGalleryRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleReceiptChange}
      />
      <input
        ref={dashboardCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleDashboardChange}
      />
      <input
        ref={dashboardGalleryRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleDashboardChange}
      />

      {/* Pojedyncze przyciski dla zdjęć AI */}
      <div className="photo-buttons-grid">
        <button
          type="button"
          className="photo-upload-btn"
          onClick={() => setActivePhotoModal('receipt')}
          disabled={isAnalyzing || isSubmitting}
        >
          <Camera size={24} />
          <span>{receiptFile ? '✓ Paragon dodany' : 'Zdjęcie: Paragon'}</span>
        </button>

        <button
          type="button"
          className="photo-upload-btn"
          onClick={() => setActivePhotoModal('dashboard')}
          disabled={isAnalyzing || isSubmitting}
        >
          <Camera size={24} />
          <span>{dashboardFile ? '✓ Licznik dodany' : 'Zdjęcie: Licznik'}</span>
        </button>
      </div>

      {/* Modal wyboru źródła zdjęcia (Aparat vs Galeria) z animacją zamykania */}
      {activePhotoModal && createPortal(
        <div
          className={`modal-overlay ${isClosingModal ? 'closing' : ''}`}
          onClick={() => closeModal()}
        >
          <div
            className={`modal-sheet ${isClosingModal ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {activePhotoModal === 'receipt' ? 'Zdjęcie paragonu' : 'Zdjęcie licznika'}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Wybierz opcję dodania zdjęcia do automatycznej analizy AI:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                className="btn-modal-option"
                onClick={() => {
                  const targetModal = activePhotoModal;
                  closeModal(() => {
                    if (targetModal === 'receipt') {
                      receiptCameraRef.current?.click();
                    } else {
                      dashboardCameraRef.current?.click();
                    }
                  });
                }}
              >
                <Camera size={22} color="var(--primary)" />
                <span>Zrób zdjęcie (Aparat)</span>
              </button>

              <button
                type="button"
                className="btn-modal-option"
                onClick={() => {
                  const targetModal = activePhotoModal;
                  closeModal(() => {
                    if (targetModal === 'receipt') {
                      receiptGalleryRef.current?.click();
                    } else {
                      dashboardGalleryRef.current?.click();
                    }
                  });
                }}
              >
                <ImageIcon size={22} color="var(--primary)" />
                <span>Wybierz gotowe zdjęcie (Galeria)</span>
              </button>

              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => closeModal()}
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Stan ładowania AI */}
      {isAnalyzing && (
        <div className="ai-loading-banner" style={{ marginTop: '16px' }}>
          <div className="spinner" />
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={18} /> Analiza zdjęć przez AI...
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Odczytywanie kwoty, litrów i przebiegu z obrazu
            </p>
          </div>
        </div>
      )}

      {/* Powiadomienia sukcesu/błędu */}
      {aiSuccessMsg && !isAnalyzing && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '12px 14px', color: '#065f46', fontSize: '0.85rem', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <CheckCircle2 size={18} color="#059669" />
          {aiSuccessMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 14px', color: '#991b1b', fontSize: '0.85rem', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <AlertTriangle size={18} color="#dc2626" />
          {errorMsg}
        </div>
      )}

      {/* Formularz wprowadzania danych */}
      <form onSubmit={handleSubmit} className="form-container" style={{ marginTop: '20px' }}>
        <fieldset disabled={isAnalyzing || isSubmitting} style={{ border: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Data */}
          <div className="form-group">
            <label>Data tankowania</label>
            <div className="input-wrapper">
              <Calendar className="input-icon" size={18} />
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Kwota */}
          <div className="form-group">
            <label>Całkowita Kwota (PLN)</label>
            <div className="input-wrapper">
              <DollarSign className="input-icon" size={18} />
              <input
                type="number"
                step="0.01"
                placeholder="np. 185.50"
                className="form-input"
                value={cost}
                onChange={(e) => {
                  setCost(e.target.value);
                  handleCostOrLitersChange(e.target.value, liters);
                }}
                required
              />
            </div>
          </div>

          {/* Litry */}
          <div className="form-group">
            <label>Ilość litrów (l)</label>
            <div className="input-wrapper">
              <Fuel className="input-icon" size={18} />
              <input
                type="number"
                step="0.01"
                placeholder="np. 28.75"
                className="form-input"
                value={liters}
                onChange={(e) => {
                  setLiters(e.target.value);
                  handleCostOrLitersChange(cost, e.target.value);
                }}
                required
              />
            </div>
          </div>

          {/* Cena za litr */}
          <div className="form-group">
            <label>Cena za litr (PLN/l)</label>
            <div className="input-wrapper">
              <DollarSign className="input-icon" size={18} />
              <input
                type="number"
                step="0.01"
                placeholder="np. 6.45"
                className="form-input"
                value={pricePerLiter}
                onChange={(e) => setPricePerLiter(e.target.value)}
              />
            </div>
          </div>

          {/* Aktualny przebieg */}
          <div className="form-group">
            <label>Aktualny przebieg (km)</label>
            <div className="input-wrapper">
              <Gauge className="input-icon" size={18} />
              <input
                type="number"
                placeholder="np. 195439"
                className="form-input"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Przycisk Zapisz */}
          <button
            type="submit"
            className="btn-primary"
            disabled={isAnalyzing || isSubmitting}
            style={{ marginTop: '10px' }}
          >
            {isSubmitting ? (
              <>
                <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                <span>Zapisywanie...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>Zapisz tankowanie</span>
              </>
            )}
          </button>
        </fieldset>
      </form>
    </div>
  );
};

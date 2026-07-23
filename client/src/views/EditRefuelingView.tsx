import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Fuel,
  Gauge,
  Save,
  Trash2,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { getRefuelingById, updateRefueling, deleteRefueling, analyzePhotos } from '../services/api';

export const EditRefuelingView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [date, setDate] = useState<string>('');
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

  // UI States
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Lock body scroll when modal or delete dialog is open
  useEffect(() => {
    if (activePhotoModal || showDeleteConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activePhotoModal, showDeleteConfirm]);

  useEffect(() => {
    if (!id) return;
    const fetchRefueling = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await getRefuelingById(Number(id));

        const formattedDate = new Date(data.date).toISOString().split('T')[0];
        setDate(formattedDate);
        setCost(data.cost ? data.cost.toString() : '');
        setLiters(data.liters ? data.liters.toString() : '');
        setPricePerLiter(data.price_per_liter ? data.price_per_liter.toString() : '');
        setMileage(data.mileage ? data.mileage.toString() : '');
        setReceiptImageUrl(data.receipt_image_url || null);
        setDashboardImageUrl(data.dashboard_image_url || null);
      } catch (err: any) {
        console.error('Błąd podczas pobierania wpisu:', err);
        setErrorMsg('Nie udało się pobrać szczegółów tankowania.');
      } finally {
        setLoading(false);
      }
    };

    fetchRefueling();
  }, [id]);

  // Recalculate price per liter automatically
  const handleCostOrLitersChange = (newCost: string, newLiters: string) => {
    const numCost = parseFloat(newCost);
    const numLiters = parseFloat(newLiters);
    if (!isNaN(numCost) && !isNaN(numLiters) && numLiters > 0) {
      setPricePerLiter((numCost / numLiters).toFixed(2));
    }
  };

  // Process photos with AI
  const processPhotosWithAI = async (rFile: File | null, dFile: File | null) => {
    if (!rFile && !dFile) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const result = await analyzePhotos(rFile, dFile);

      if (result.date) {
        const formattedDate = new Date(result.date).toISOString().split('T')[0];
        setDate(formattedDate);
      }
      if (result.cost != null) setCost(result.cost.toString());
      if (result.liters != null) setLiters(result.liters.toString());
      if (result.price_per_liter != null) {
        setPricePerLiter(result.price_per_liter.toString());
      } else if (result.cost != null && result.liters != null && result.liters > 0) {
        setPricePerLiter((result.cost / result.liters).toFixed(2));
      }
      if (result.mileage != null) setMileage(result.mileage.toString());
      if (result.receipt_image_url) setReceiptImageUrl(result.receipt_image_url);
      if (result.dashboard_image_url) setDashboardImageUrl(result.dashboard_image_url);

      setSuccessMsg('Dane zostały zaktualizowane ze zdjęć przez AI!');
    } catch (err: any) {
      console.error('Błąd analizy AI:', err);
      setErrorMsg('Nie udało się przeanalizować zdjęć. Wprowadź dane ręcznie.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

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
      await updateRefueling(Number(id), {
        date: new Date(date).toISOString(),
        cost: numCost,
        liters: numLiters,
        price_per_liter: !isNaN(numPrice) ? numPrice : numCost / numLiters,
        mileage: numMileage,
        receipt_image_url: receiptImageUrl,
        dashboard_image_url: dashboardImageUrl,
      });

      navigate('/');
    } catch (err: any) {
      console.error('Błąd aktualizacji tankowania:', err);
      setErrorMsg('Nie udało się zapisać zmian. Sprawdź dane.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteRefueling(Number(id));
      navigate('/');
    } catch (err: any) {
      console.error('Błąd usuwania tankowania:', err);
      setErrorMsg('Nie udało się usunąć tankowania z bazy.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
        <div className="spinner" />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ładowanie danych...</span>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ paddingTop: '16px' }}>
      {/* Nagłówek */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '8px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
            fontSize: '0.85rem',
            color: 'var(--text-main)'
          }}
        >
          <ArrowLeft size={18} /> Powrót
        </button>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Edycja tankowania
        </h2>
      </div>

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
      <div className="photo-buttons-grid" style={{ marginBottom: '20px' }}>
        <button
          type="button"
          className="photo-upload-btn"
          onClick={() => setActivePhotoModal('receipt')}
          disabled={isAnalyzing || isSubmitting}
        >
          <Camera size={24} />
          <span>{receiptFile ? '✓ Paragon zmieniony' : 'Zmień zdjęcie: Paragon'}</span>
        </button>

        <button
          type="button"
          className="photo-upload-btn"
          onClick={() => setActivePhotoModal('dashboard')}
          disabled={isAnalyzing || isSubmitting}
        >
          <Camera size={24} />
          <span>{dashboardFile ? '✓ Licznik zmieniony' : 'Zmień zdjęcie: Licznik'}</span>
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

      {/* Baner analizy AI */}
      {isAnalyzing && (
        <div className="ai-loading-banner" style={{ marginBottom: '20px' }}>
          <div className="spinner" />
          <div>
            <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
              Analizowanie ze zdjęć...
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Model AI odczytuje nowe dane z paragonu / licznika...
            </p>
          </div>
        </div>
      )}

      {successMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 16px', color: '#166534', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 16px', color: '#991b1b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formularz edycji */}
      <form onSubmit={handleSubmit} className="form-container">
        <div className="form-group">
          <label htmlFor="edit-date">Data tankowania</label>
          <div className="input-wrapper">
            <Calendar className="input-icon" size={18} />
            <input
              id="edit-date"
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="edit-cost">Kwota zapłacona (PLN)</label>
          <div className="input-wrapper">
            <DollarSign className="input-icon" size={18} />
            <input
              id="edit-cost"
              type="number"
              step="0.01"
              placeholder="np. 250.00"
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

        <div className="form-group">
          <label htmlFor="edit-liters">Ilość litrów (l)</label>
          <div className="input-wrapper">
            <Fuel className="input-icon" size={18} />
            <input
              id="edit-liters"
              type="number"
              step="0.01"
              placeholder="np. 40.5"
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

        <div className="form-group">
          <label htmlFor="edit-price">Cena za 1 litr (PLN/l)</label>
          <div className="input-wrapper">
            <DollarSign className="input-icon" size={18} />
            <input
              id="edit-price"
              type="number"
              step="0.01"
              placeholder="np. 6.17"
              className="form-input"
              value={pricePerLiter}
              onChange={(e) => setPricePerLiter(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="edit-mileage">Aktualny przebieg (km)</label>
          <div className="input-wrapper">
            <Gauge className="input-icon" size={18} />
            <input
              id="edit-mileage"
              type="number"
              placeholder="np. 125000"
              className="form-input"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              required
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting || isAnalyzing}
          >
            {isSubmitting ? (
              <>
                <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                Zapisywanie...
              </>
            ) : (
              <>
                <Save size={20} /> Zapisz zmiany
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            disabled={isDeleting || isSubmitting}
          >
            <Trash2 size={20} /> Usuń tankowanie z bazy
          </button>
        </div>
      </form>

      {/* Modal Potwierdzenia Usunięcia */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626' }}>
              <AlertTriangle size={28} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Potwierdzenie usunięcia
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Czy na pewno chcesz usunąć to tankowanie z bazy danych? Ta operacja jest nieodwracalna.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isDeleting ? 'Usuwanie...' : 'Usuń'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditRefuelingView;

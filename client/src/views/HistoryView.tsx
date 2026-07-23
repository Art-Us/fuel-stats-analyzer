import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Fuel, AlertCircle, RefreshCw } from 'lucide-react';
import { getRefuelings } from '../services/api';
import { Refueling } from '../types/api';
import { RefuelingCard } from '../components/RefuelingCard';

export const HistoryView: React.FC = () => {
  const [refuelings, setRefuelings] = useState<Refueling[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRefuelings('all');
      setRefuelings(data);
    } catch (err: any) {
      console.error('Błąd podczas pobierania historii:', err);
      setError('Nie udało się pobrać historii tankowań.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Grupowanie tankowań według roku i miesiąca (np. "Lipiec 2026")
  const groupedRefuelings = refuelings.reduce((acc, item) => {
    const d = new Date(item.date);
    const monthYear = d.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(item);
    return acc;
  }, {} as Record<string, Refueling[]>);

  return (
    <div className="main-content">
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
          <div className="spinner" />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ładowanie historii...</span>
        </div>
      ) : error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '14px', padding: '16px', color: '#991b1b', marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={24} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700 }}>Błąd</p>
            <p style={{ fontSize: '0.85rem' }}>{error}</p>
          </div>
          <button onClick={fetchHistory} style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={14} /> Odśwież
          </button>
        </div>
      ) : refuelings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e0e7ff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Fuel size={32} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Brak wpisów tankowania</h3>
          <p style={{ fontSize: '0.85rem' }}>Kliknij przycisk poniżej, aby dodać pierwsze tankowanie ręcznie lub ze zdjęcia.</p>
        </div>
      ) : (
        Object.entries(groupedRefuelings).map(([groupTitle, items]) => (
          <div key={groupTitle} className="card-group">
            <h3 className="group-title">{groupTitle}</h3>
            {items.map((item) => (
              <RefuelingCard key={item.id} refueling={item} />
            ))}
          </div>
        ))
      )}

      {/* Floating Action Button */}
      <button
        className="fab-btn"
        aria-label="Dodaj tankowanie"
        onClick={() => navigate('/add')}
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

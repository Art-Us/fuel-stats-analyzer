import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import { DollarSign, Droplet, TrendingUp, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

import 'swiper/css';
import 'swiper/css/pagination';

import { getStats, getRefuelings } from '../services/api';
import { StatsResponse, PeriodType, Refueling } from '../types/api';

export const StatsView: React.FC = () => {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [history, setHistory] = useState<Refueling[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsData, historyData] = await Promise.all([
          getStats(period),
          getRefuelings(period)
        ]);

        setStats(statsData);
        setHistory(historyData);
      } catch (err: any) {
        console.error('Błąd podczas pobierania statystyk:', err);
        setError('Nie udało się pobrać statystyk.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  // Przygotowanie danych do wykresu (posortowane po dacie rosnąco)
  const chartData = history
    .slice()
    .reverse()
    .map((item) => ({
      date: new Date(item.date).toLocaleDateString('pl-PL', { month: 'numeric', day: 'numeric' }),
      cost: item.cost,
      l100km: item.stats?.fuel_consumption_l_per_100km || 0,
      pricePerKm: item.stats?.cost_per_km || 0,
    }));

  return (
    <div className="main-content" style={{ paddingTop: '16px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-main)' }}>
        Statystyki i Analiza
      </h2>

      {/* Zakładki wyboru okresu (Miesiąc / Rok / Wszystko) */}
      <div className="period-tabs">
        <button
          className={`tab-btn ${period === 'month' ? 'active' : ''}`}
          onClick={() => setPeriod('month')}
        >
          Miesiąc
        </button>
        <button
          className={`tab-btn ${period === 'year' ? 'active' : ''}`}
          onClick={() => setPeriod('year')}
        >
          Rok
        </button>
        <button
          className={`tab-btn ${period === 'all' ? 'active' : ''}`}
          onClick={() => setPeriod('all')}
        >
          Wszystko
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '260px', gap: '12px' }}>
          <div className="spinner" />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Obliczanie podsumowania...</span>
        </div>
      ) : error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '14px', padding: '16px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={24} />
          <span>{error}</span>
        </div>
      ) : stats ? (
        <>
          {/* Slider Swiper z kartami KPI */}
          <Swiper
            modules={[Pagination]}
            pagination={{ clickable: true }}
            spaceBetween={16}
            slidesPerView={1}
            className="stats-swiper"
          >
            {/* Slajd 1: Całkowity Koszt */}
            <SwiperSlide>
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-title">Całkowity Koszt</span>
                  <DollarSign color="#2563eb" size={24} />
                </div>
                <div className="kpi-value">{stats.total_cost.toFixed(2)} PLN</div>
                <div className="kpi-sub-grid">
                  <div className="kpi-sub-item">
                    <span>Średnia cena/l</span>
                    <strong>{stats.average_price_per_liter.toFixed(2)} PLN</strong>
                  </div>
                  <div className="kpi-sub-item">
                    <span>Liczba tankowań</span>
                    <strong>{stats.total_refuelings}</strong>
                  </div>
                </div>
              </div>
            </SwiperSlide>

            {/* Slajd 2: Średnie Spalanie i Koszt/km */}
            <SwiperSlide>
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-title">Efektywność i Zużycie</span>
                  <TrendingUp color="#10b981" size={24} />
                </div>
                <div className="kpi-value">
                  {stats.average_fuel_consumption != null
                    ? `${stats.average_fuel_consumption.toFixed(2)} l/100km`
                    : 'b/d'}
                </div>
                <div className="kpi-sub-grid">
                  <div className="kpi-sub-item">
                    <span>Średni koszt / 1 km</span>
                    <strong>
                      {stats.average_price_per_km != null
                        ? `${stats.average_price_per_km.toFixed(2)} PLN`
                        : 'b/d'}
                    </strong>
                  </div>
                  <div className="kpi-sub-item">
                    <span>Pokonany dystans</span>
                    <strong>{stats.period_distance.toLocaleString('pl-PL')} km</strong>
                  </div>
                </div>
              </div>
            </SwiperSlide>

            {/* Slajd 3: Łączne Litry i Dystans */}
            <SwiperSlide>
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-title">Łączne Litry Paliwa</span>
                  <Droplet color="#3b82f6" size={24} />
                </div>
                <div className="kpi-value">{stats.total_liters.toFixed(2)} l</div>
                <div className="kpi-sub-grid">
                  <div className="kpi-sub-item">
                    <span>Dystans w okresie</span>
                    <strong>{stats.period_distance.toLocaleString('pl-PL')} km</strong>
                  </div>
                  <div className="kpi-sub-item">
                    <span>Średnie zatankowanie</span>
                    <strong>
                      {stats.total_refuelings > 0
                        ? (stats.total_liters / stats.total_refuelings).toFixed(1)
                        : 0}{' '}
                      l
                    </strong>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          </Swiper>

          {/* Wykres Recharts (Trendy wydatków) */}
          <div className="chart-card">
            <h3 className="chart-title">Trend Wydatków (PLN)</h3>
            {chartData.length > 0 ? (
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', borderRadius: '10px', color: '#fff', border: 'none', fontSize: '0.85rem' }}
                      formatter={(val: any) => [`${val} PLN`, 'Koszt']}
                    />
                    <Area type="monotone" dataKey="cost" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                Brak danych do wygenerowania wykresu dla wskazanego okresu.
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import {
  DollarSign,
  Droplet,
  TrendingUp,
  AlertCircle,
  Fuel,
  Gauge,
  Navigation,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ComposedChart,
} from 'recharts';

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
          getRefuelings(period),
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

  // Przygotowanie danych do wykresów (posortowane chronologicznie)
  const chartData = history
    .slice()
    .reverse()
    .map((item) => ({
      date: new Date(item.date).toLocaleDateString('pl-PL', { month: 'numeric', day: 'numeric' }),
      fullDate: new Date(item.date).toLocaleDateString('pl-PL', { year: 'numeric', month: 'short', day: 'numeric' }),
      cost: item.cost,
      liters: item.liters,
      pricePerLiter: item.price_per_liter,
      mileage: item.mileage,
      l100km: item.stats?.fuel_consumption_l_per_100km ?? null,
      pricePerKm: item.stats?.cost_per_km ?? null,
      distance: item.stats?.distance ?? null,
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

          {chartData.length === 0 ? (
            <div className="chart-card">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                Brak wystarczających danych do wygenerowania wykresów dla wskazanego okresu.
              </p>
            </div>
          ) : (
            /* Slider Swiper ze wszystkimi 5 wykresami */
            <Swiper
              modules={[Pagination]}
              pagination={{ clickable: true }}
              spaceBetween={16}
              slidesPerView={1}
              className="charts-swiper"
            >
              {/* Slajd 1: Trend Wydatków (PLN) */}
              <SwiperSlide>
                <div className="chart-card" style={{ marginTop: 0 }}>
                  <div className="chart-card-header">
                    <div className="chart-title-wrapper">
                      <div className="chart-icon-box" style={{ color: '#2563eb' }}>
                        <DollarSign size={18} />
                      </div>
                      <div>
                        <h3 className="chart-title">Trend Wydatków</h3>
                        <span className="chart-subtitle">Koszt poszczególnych tankowań</span>
                      </div>
                    </div>
                    <span className="chart-badge">{stats.total_cost.toFixed(2)} PLN</span>
                  </div>

                  <div style={{ width: '100%', height: 210 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-md)',
                            fontSize: '0.85rem',
                          }}
                          labelFormatter={(label, items) => items[0]?.payload?.fullDate || label}
                          formatter={(val: any) => [`${Number(val).toFixed(2)} PLN`, 'Koszt tankowania']}
                        />
                        <Area type="monotone" dataKey="cost" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </SwiperSlide>

              {/* Slajd 2: Średnie Zużycie Paliwa (l/100km) */}
              <SwiperSlide>
                <div className="chart-card" style={{ marginTop: 0 }}>
                  <div className="chart-card-header">
                    <div className="chart-title-wrapper">
                      <div className="chart-icon-box" style={{ color: '#10b981' }}>
                        <Gauge size={18} />
                      </div>
                      <div>
                        <h3 className="chart-title">Efektywność Paliwowa</h3>
                        <span className="chart-subtitle">Zużycie paliwa w l/100km</span>
                      </div>
                    </div>
                    <span className="chart-badge" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                      {stats.average_fuel_consumption != null
                        ? `${stats.average_fuel_consumption.toFixed(2)} l/100km`
                        : 'b/d'}
                    </span>
                  </div>

                  <div style={{ width: '100%', height: 210 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorL100km" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-md)',
                            fontSize: '0.85rem',
                          }}
                          labelFormatter={(label, items) => items[0]?.payload?.fullDate || label}
                          formatter={(val: any) => [val != null ? `${Number(val).toFixed(2)} l/100km` : 'b/d', 'Spalanie']}
                        />
                        {stats.average_fuel_consumption != null && (
                          <ReferenceLine
                            y={stats.average_fuel_consumption}
                            stroke="#059669"
                            strokeDasharray="4 4"
                            label={{ value: 'Średnia', fill: '#059669', fontSize: 10, position: 'insideTopRight' }}
                          />
                        )}
                        <Area type="monotone" dataKey="l100km" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorL100km)" connectNulls />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </SwiperSlide>

              {/* Slajd 3: Cena Paliwa za Litr (PLN/l) */}
              <SwiperSlide>
                <div className="chart-card" style={{ marginTop: 0 }}>
                  <div className="chart-card-header">
                    <div className="chart-title-wrapper">
                      <div className="chart-icon-box" style={{ color: '#f59e0b' }}>
                        <Fuel size={18} />
                      </div>
                      <div>
                        <h3 className="chart-title">Cena Paliwa na Stacji</h3>
                        <span className="chart-subtitle">Zmienność ceny za 1 litr (PLN/l)</span>
                      </div>
                    </div>
                    <span className="chart-badge" style={{ color: '#d97706', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                      Śr: {stats.average_price_per_liter.toFixed(2)} PLN/l
                    </span>
                  </div>

                  <div style={{ width: '100%', height: 210 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-md)',
                            fontSize: '0.85rem',
                          }}
                          labelFormatter={(label, items) => items[0]?.payload?.fullDate || label}
                          formatter={(val: any) => [`${Number(val).toFixed(2)} PLN/l`, 'Cena za litr']}
                        />
                        <Line
                          type="monotone"
                          dataKey="pricePerLiter"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </SwiperSlide>

              {/* Slajd 4: Koszt Przejechania 1 km (PLN/km) */}
              <SwiperSlide>
                <div className="chart-card" style={{ marginTop: 0 }}>
                  <div className="chart-card-header">
                    <div className="chart-title-wrapper">
                      <div className="chart-icon-box" style={{ color: '#8b5cf6' }}>
                        <Zap size={18} />
                      </div>
                      <div>
                        <h3 className="chart-title">Koszt Przejechania 1 km</h3>
                        <span className="chart-subtitle">Wydatek na kilometr (PLN/km)</span>
                      </div>
                    </div>
                    <span className="chart-badge" style={{ color: '#7c3aed', borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                      {stats.average_price_per_km != null
                        ? `${stats.average_price_per_km.toFixed(2)} PLN/km`
                        : 'b/d'}
                    </span>
                  </div>

                  <div style={{ width: '100%', height: 210 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorKmCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-md)',
                            fontSize: '0.85rem',
                          }}
                          labelFormatter={(label, items) => items[0]?.payload?.fullDate || label}
                          formatter={(val: any) => [val != null ? `${Number(val).toFixed(2)} PLN/km` : 'b/d', 'Koszt na 1 km']}
                        />
                        <Area type="monotone" dataKey="pricePerKm" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorKmCost)" connectNulls />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </SwiperSlide>

              {/* Slajd 5: Objętość Paliwa i Przejechany Dystans */}
              <SwiperSlide>
                <div className="chart-card" style={{ marginTop: 0 }}>
                  <div className="chart-card-header">
                    <div className="chart-title-wrapper">
                      <div className="chart-icon-box" style={{ color: '#06b6d4' }}>
                        <Navigation size={18} />
                      </div>
                      <div>
                        <h3 className="chart-title">Litry i Dystans Między Tankowaniami</h3>
                        <span className="chart-subtitle">Zatankowane litry (l) vs dystans (km)</span>
                      </div>
                    </div>
                    <span className="chart-badge" style={{ color: '#0891b2', borderColor: 'rgba(6, 182, 212, 0.2)' }}>
                      {stats.total_liters.toFixed(1)} l
                    </span>
                  </div>

                  <div style={{ width: '100%', height: 210 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-md)',
                            fontSize: '0.85rem',
                          }}
                          labelFormatter={(label, items) => items[0]?.payload?.fullDate || label}
                          formatter={(val: any, name: any) => {
                            if (name === 'liters' || name === 'Zatankowano') return [`${Number(val).toFixed(1)} l`, 'Zatankowano'];
                            if (name === 'distance' || name === 'Dystans') return [val != null ? `${Number(val).toFixed(0)} km` : 'b/d', 'Dystans'];
                            return [val, name];
                          }}
                        />
                        <Bar yAxisId="left" dataKey="liters" name="Zatankowano" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={30} />
                        <Line yAxisId="right" type="monotone" dataKey="distance" name="Dystans" stroke="#06b6d4" strokeWidth={3} dot={{ r: 3, fill: '#06b6d4' }} connectNulls />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </SwiperSlide>
            </Swiper>
          )}
        </>
      ) : null}
    </div>
  );
};



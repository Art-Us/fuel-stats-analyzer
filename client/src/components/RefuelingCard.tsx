import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Fuel, Droplet, TrendingUp, Coins, Info } from 'lucide-react';
import { Refueling } from '../types/api';

interface RefuelingCardProps {
  refueling: Refueling;
}

export const RefuelingCard: React.FC<RefuelingCardProps> = ({ refueling }) => {
  const navigate = useNavigate();
  const { id, date, cost, liters, price_per_liter, mileage, stats } = refueling;

  // Format date to YYYY-MM-DD
  const formattedDate = new Date(date).toISOString().split('T')[0];

  const hasStats = stats?.fuel_consumption_l_per_100km != null || stats?.cost_per_km != null;

  return (
    <div className="refueling-card clickable-card" onClick={() => navigate(`/edit/${id}`)}>
      <div className="card-header-row">
        <div className="card-icon-circle">
          <Fuel size={22} />
        </div>
        <div className="card-main-info">
          <div className="card-left-col">
            <span className="card-date">{formattedDate}</span>
            <span className="card-cost">{cost.toFixed(2)} PLN</span>
          </div>
          <div className="card-right-col">
            <span className="card-mileage">{mileage.toLocaleString('pl-PL')} km</span>
            {stats?.distance && stats.distance > 0 && (
              <span className="card-delta">+{stats.distance} km</span>
            )}
          </div>
        </div>
      </div>

      <div className="card-details-row">
        <Droplet size={16} color="#2563eb" />
        <span>
          {liters.toFixed(2)} l &rarr; {price_per_liter ? `${price_per_liter.toFixed(2)} PLN/l` : ''}
        </span>
      </div>

      <div className="card-divider" />
      <div className="card-stats-row">
        {hasStats ? (
          <>
            {stats?.fuel_consumption_l_per_100km != null && (
              <div className="card-stat-item">
                <TrendingUp size={15} color="#475569" />
                <span>l/100km: <strong>{stats.fuel_consumption_l_per_100km.toFixed(2)}</strong></span>
              </div>
            )}
            {stats?.cost_per_km != null && (
              <div className="card-stat-item">
                <Coins size={15} color="#475569" />
                <span><strong>{stats.cost_per_km.toFixed(2)} PLN/km</strong></span>
              </div>
            )}
          </>
        ) : (
          <div className="card-stat-item first-refueling-info">
            <Info size={15} color="#64748b" />
            <span>Pierwsze tankowanie</span>
          </div>
        )}
      </div>
    </div>
  );
};

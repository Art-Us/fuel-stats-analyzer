import React from 'react';
import { NavLink } from 'react-router-dom';
import { Fuel, PlusCircle, BarChart3 } from 'lucide-react';

export const BottomNav: React.FC = () => {
  return (
    <nav className="bottom-nav">
      <NavLink
        to="/"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        end
      >
        <div className="nav-icon-wrapper">
          <Fuel size={20} />
        </div>
        <span>Historia</span>
      </NavLink>

      <NavLink
        to="/add"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <div className="nav-icon-wrapper">
          <PlusCircle size={20} />
        </div>
        <span>Dodaj</span>
      </NavLink>

      <NavLink
        to="/stats"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <div className="nav-icon-wrapper">
          <BarChart3 size={20} />
        </div>
        <span>Statystyki</span>
      </NavLink>
    </nav>
  );
};

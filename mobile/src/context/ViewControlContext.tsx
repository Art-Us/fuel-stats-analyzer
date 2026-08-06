import React, { createContext, useContext, useState } from 'react';
import { PeriodType, StatsResponse, Refueling } from '../types/api';

interface ViewControlContextType {
  statsPeriod: PeriodType;
  setStatsPeriod: (period: PeriodType) => void;
  cachedStats: StatsResponse | null;
  setCachedStats: (stats: StatsResponse | null) => void;
  cachedStatsHistory: Refueling[];
  setCachedStatsHistory: (history: Refueling[]) => void;
  cachedHistory: Refueling[];
  setCachedHistory: (history: Refueling[]) => void;
}

const ViewControlContext = createContext<ViewControlContextType>({
  statsPeriod: 'month',
  setStatsPeriod: () => { },
  cachedStats: null,
  setCachedStats: () => { },
  cachedStatsHistory: [],
  setCachedStatsHistory: () => { },
  cachedHistory: [],
  setCachedHistory: () => { },
});

export const ViewControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [statsPeriod, setStatsPeriod] = useState<PeriodType>('month');
  const [cachedStats, setCachedStats] = useState<StatsResponse | null>(null);
  const [cachedStatsHistory, setCachedStatsHistory] = useState<Refueling[]>([]);
  const [cachedHistory, setCachedHistory] = useState<Refueling[]>([]);

  return (
    <ViewControlContext.Provider
      value={{
        statsPeriod,
        setStatsPeriod,
        cachedStats,
        setCachedStats,
        cachedStatsHistory,
        setCachedStatsHistory,
        cachedHistory,
        setCachedHistory,
      }}
    >
      {children}
    </ViewControlContext.Provider>
  );
};

export const useViewControl = () => useContext(ViewControlContext);


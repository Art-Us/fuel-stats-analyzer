import React, { createContext, useContext, useState } from 'react';
import { PeriodType, StatsResponse, Refueling } from '../types/api';

export interface CarInfoCache {
  name: string;
  latest_mileage: number | null;
}

interface ViewControlContextType {
  statsPeriod: PeriodType;
  setStatsPeriod: (period: PeriodType) => void;
  cachedStats: StatsResponse | null;
  setCachedStats: (stats: StatsResponse | null) => void;
  cachedStatsHistory: Refueling[];
  setCachedStatsHistory: (history: Refueling[]) => void;
  cachedHistory: Refueling[];
  setCachedHistory: (history: Refueling[]) => void;
  cachedCarInfo: CarInfoCache | null;
  setCachedCarInfo: (info: CarInfoCache | null) => void;
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
  cachedCarInfo: null,
  setCachedCarInfo: () => { },
});

export const ViewControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [statsPeriod, setStatsPeriod] = useState<PeriodType>('month');
  const [cachedStats, setCachedStats] = useState<StatsResponse | null>(null);
  const [cachedStatsHistory, setCachedStatsHistory] = useState<Refueling[]>([]);
  const [cachedHistory, setCachedHistory] = useState<Refueling[]>([]);
  const [cachedCarInfo, setCachedCarInfo] = useState<CarInfoCache | null>(null);

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
        cachedCarInfo,
        setCachedCarInfo,
      }}
    >
      {children}
    </ViewControlContext.Provider>
  );
};

export const useViewControl = () => useContext(ViewControlContext);


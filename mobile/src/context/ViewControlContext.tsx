import React, { createContext, useContext, useState } from 'react';
import { PeriodType, StatsResponse, Refueling } from '../types/api';
import { MobileImageFile } from '../services/api';

export interface CarInfoCache {
  name: string;
  latest_mileage: number | null;
  gemini_api_key?: string | null;
}

export interface AddFormDraft {
  date: string;
  cost: string;
  liters: string;
  pricePerLiter: string;
  mileage: string;
  photos: MobileImageFile[];
  receiptImageUrl: string | null;
  dashboardImageUrl: string | null;
  hasAnalyzedCurrentPhotos: boolean;
}

export const getInitialAddFormDraft = (): AddFormDraft => ({
  date: new Date().toISOString().split('T')[0],
  cost: '',
  liters: '',
  pricePerLiter: '',
  mileage: '',
  photos: [],
  receiptImageUrl: null,
  dashboardImageUrl: null,
  hasAnalyzedCurrentPhotos: false,
});

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
  addFormDraft: AddFormDraft;
  setAddFormDraft: React.Dispatch<React.SetStateAction<AddFormDraft>>;
  resetAddFormDraft: () => void;
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
  addFormDraft: getInitialAddFormDraft(),
  setAddFormDraft: () => { },
  resetAddFormDraft: () => { },
});

export const ViewControlProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [statsPeriod, setStatsPeriod] = useState<PeriodType>('month');
  const [cachedStats, setCachedStats] = useState<StatsResponse | null>(null);
  const [cachedStatsHistory, setCachedStatsHistory] = useState<Refueling[]>([]);
  const [cachedHistory, setCachedHistory] = useState<Refueling[]>([]);
  const [cachedCarInfo, setCachedCarInfo] = useState<CarInfoCache | null>(null);
  const [addFormDraft, setAddFormDraft] = useState<AddFormDraft>(getInitialAddFormDraft());

  const resetAddFormDraft = () => {
    setAddFormDraft(getInitialAddFormDraft());
  };

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
        addFormDraft,
        setAddFormDraft,
        resetAddFormDraft,
      }}
    >
      {children}
    </ViewControlContext.Provider>
  );
};

export const useViewControl = () => useContext(ViewControlContext);


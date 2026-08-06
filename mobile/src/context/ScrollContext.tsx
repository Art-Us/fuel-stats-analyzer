import React, { createContext, useContext, useRef } from 'react';

interface ScrollContextType {
  getScrollY: (viewKey?: string) => number;
  setScrollY: (y: number, viewKey?: string) => void;
  getKpiScrollX: () => number;
  setKpiScrollX: (x: number) => void;
  getChartScrollX: () => number;
  setChartScrollX: (x: number) => void;
}

const ScrollContext = createContext<ScrollContextType>({
  getScrollY: () => 0,
  setScrollY: () => {},
  getKpiScrollX: () => 0,
  setKpiScrollX: () => {},
  getChartScrollX: () => 0,
  setChartScrollX: () => {},
});

export const ScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scrollYMap = useRef<Record<string, number>>({});
  const kpiScrollXRef = useRef(0);
  const chartScrollXRef = useRef(0);

  const setScrollY = (y: number, viewKey: string = 'default') => {
    scrollYMap.current[viewKey] = y;
  };

  const getScrollY = (viewKey: string = 'default') => {
    return scrollYMap.current[viewKey] || 0;
  };

  const setKpiScrollX = (x: number) => {
    kpiScrollXRef.current = x;
  };

  const getKpiScrollX = () => kpiScrollXRef.current;

  const setChartScrollX = (x: number) => {
    chartScrollXRef.current = x;
  };

  const getChartScrollX = () => chartScrollXRef.current;

  return (
    <ScrollContext.Provider
      value={{
        getScrollY,
        setScrollY,
        getKpiScrollX,
        setKpiScrollX,
        getChartScrollX,
        setChartScrollX,
      }}
    >
      {children}
    </ScrollContext.Provider>
  );
};

export const useScroll = () => useContext(ScrollContext);


import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme, Dimensions } from 'react-native';
import { ThemeColors, lightColors, darkColors } from '../theme/colors';
import { safeSwitchTheme } from '../utils/themeAnimation';
import { CircularThemeMask } from '../components/CircularThemeMask';

interface ThemeContextType {
  theme: 'light' | 'dark';
  colors: ThemeColors;
  toggleTheme: (options?: { cx?: number; cy?: number }) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  colors: lightColors,
  toggleTheme: () => { },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoaded, setIsLoaded] = useState(false);
  const [transitionState, setTransitionState] = useState<{
    cx: number;
    cy: number;
    toTheme: 'light' | 'dark';
  } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('user_theme').then((savedTheme) => {
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      } else if (systemColorScheme === 'dark') {
        setTheme('dark');
      }
      setIsLoaded(true);
    });
  }, [systemColorScheme]);

  const toggleTheme = (options?: { cx?: number; cy?: number }) => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    const { width } = Dimensions.get('window');

    const cx = options?.cx ?? width - 40;
    const cy = options?.cy ?? 40;

    const performThemeChange = () => {
      setTheme(nextTheme);
      AsyncStorage.setItem('user_theme', nextTheme);
    };

    const nativeHandled = safeSwitchTheme({
      switchThemeFunction: performThemeChange,
      animationConfig: {
        type: 'circular',
        duration: 500,
        startingPoint: { cx, cy },
      },
    });

    if (!nativeHandled) {
      setTransitionState({ cx, cy, toTheme: nextTheme });
    }
  };

  const colors = theme === 'dark' ? darkColors : lightColors;
  const toColors = transitionState?.toTheme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}

      {transitionState && (
        <CircularThemeMask
          cx={transitionState.cx}
          cy={transitionState.cy}
          onComplete={() => {
            const nextTheme = transitionState.toTheme;
            setTheme(nextTheme);
            AsyncStorage.setItem('user_theme', nextTheme);
            setTransitionState(null);
          }}
        >
          <ThemeContext.Provider
            value={{
              theme: transitionState.toTheme,
              colors: toColors,
              toggleTheme,
            }}
          >
            {children}
          </ThemeContext.Provider>
        </CircularThemeMask>
      )}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { ThemeColors, lightColors, darkColors } from '../theme/colors';

interface ThemeContextType {
  theme: 'light' | 'dark';
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  colors: lightColors,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoaded, setIsLoaded] = useState(false);

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

  const toggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem('user_theme', nextTheme);
      return nextTheme;
    });
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

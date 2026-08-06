interface ThemeAnimationConfig {
  type?: 'circular' | 'inverted-circular' | 'fade';
  duration?: number;
  startingPoint?: { cx: number; cy: number } | { cxRatio: number; cyRatio: number };
  captureType?: 'layer' | 'view';
}

export interface SwitchThemeOptions {
  switchThemeFunction: () => void;
  animationConfig?: ThemeAnimationConfig;
}

let switchThemeFn: ((options: SwitchThemeOptions) => void) | null = null;

try {
  const themeSwitchModule = require('react-native-theme-switch-animation');
  switchThemeFn = themeSwitchModule.default || themeSwitchModule;
} catch (error) {
  // Native module unavailable in Expo Go or Web environment
}

/**
 * Returns true if native switchTheme ran successfully, or false if native module is unavailable.
 */
export const safeSwitchTheme = (options: SwitchThemeOptions): boolean => {
  if (typeof switchThemeFn === 'function') {
    try {
      switchThemeFn(options);
      return true;
    } catch (err) {
      // Fall through if native execution fails
    }
  }
  return false;
};
